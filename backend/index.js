const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
  user: 'postgres',         // แก้เป็น user ของคุณ
  host: 'localhost',
  database: 'face_recognition_db',
  password: '1234', // แก้เป็นรหัสผ่านของคุณ
  port: 5432,
});

// API ลงทะเบียนพนักงาน (เก็บ face_embedding)
app.post('/register', async (req, res) => {
  try {
    const { name, email, face_embedding } = req.body;

    const query = `
      INSERT INTO guest (name, email, face_embedding) 
      VALUES ($1, $2, $3) RETURNING *`;

    // สมมติ face_embedding เป็น base64 string แปลงเป็น Buffer ก่อนเก็บ
    const values = [name, email, Buffer.from(face_embedding, 'base64')];

    const result = await pool.query(query, values);
    res.json({ status: 'success', guest: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// backend/index.js (เพิ่มโค้ดนี้ต่อจากเดิม)
app.post('/attendance', async (req, res) => {
  try {
    const { face_embedding } = req.body;

    // แปลง base64 เป็น Buffer
    const inputEmbedding = Buffer.from(face_embedding, 'base64');

    // ดึง guest ทั้งหมดจาก DB
    const guestsResult = await pool.query('SELECT * FROM guest');
    const guests = guestsResult.rows;

    // หา guest ที่ face_embedding ใกล้เคียงที่สุด (เช็คด้วย Euclidean distance)
    const threshold = 0.6; // ปรับได้
    let minDistance = Number.MAX_VALUE;
    let matchedGuest = null;

    const euclideanDistance = (vec1, vec2) => {
      let sum = 0;
      for (let i = 0; i < vec1.length; i++) {
        const diff = vec1[i] - vec2[i];
        sum += diff * diff;
      }
      return Math.sqrt(sum);
    };

    // แปลง face_embedding จาก Buffer เป็น Float32Array
    const bufferToFloat32Array = (buffer) => {
      return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Float32Array.BYTES_PER_ELEMENT);
    };

    const inputArray = bufferToFloat32Array(inputEmbedding);

    for (const guest of guests) {
      const guestArray = bufferToFloat32Array(guest.face_embedding);
      const dist = euclideanDistance(inputArray, guestArray);
      if (dist < minDistance && dist < threshold) {
        minDistance = dist;
        matchedGuest = guest;
      }
    }

    if (!matchedGuest) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้ในระบบ' });
    }

    // ตรวจสอบว่า guest คนนี้เคยเช็คอินวันนี้หรือยัง
    const today = new Date();
    const todayDateString = today.toISOString().slice(0, 10);

    const attendanceResult = await pool.query(
      `SELECT * FROM attendance WHERE guest_id = $1 AND attendance_date = $2`,
      [matchedGuest.id, todayDateString]
    );

    let attendance = attendanceResult.rows[0];

    if (!attendance) {
      // ยังไม่เคยเช็คอินวันนี้ -> บันทึก check_in
      const insertResult = await pool.query(
        `INSERT INTO attendance (guest_id, check_in, attendance_date) VALUES ($1, NOW(), $2) RETURNING *`,
        [matchedGuest.id, todayDateString]
      );
      attendance = insertResult.rows[0];

      // เช็คเวลาเข้างานสายไหม (เช็ค 8:30)
      const checkInTime = new Date(attendance.check_in);
      const lateThreshold = new Date(todayDateString + 'T08:30:00');
      const isLate = checkInTime > lateThreshold;

      return res.json({
        message: 'เช็คอินเรียบร้อย',
        guest: matchedGuest,
        attendance,
        isLate,
      });
    } else if (!attendance.check_out) {
      // เคยเช็คอินวันนี้แล้วแต่ยังไม่เช็คเอาท์ -> บันทึก check_out
      const updateResult = await pool.query(
        `UPDATE attendance SET check_out = NOW() WHERE id = $1 RETURNING *`,
        [attendance.id]
      );
      attendance = updateResult.rows[0];
      return res.json({
        message: 'เช็คเอาท์เรียบร้อย',
        guest: matchedGuest,
        attendance,
      });
    } else {
      // เช็คอินและเช็คเอาท์ครบแล้ววันนี้
      return res.status(400).json({ message: 'เช็คเอาท์วันนี้แล้ว ไม่สามารถลงเวลาเพิ่มได้' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/attendance/all', async (req, res) => {
  try {
    const query = `
      SELECT a.*, g.name AS guest_name
      FROM attendance a
      LEFT JOIN guest g ON a.guest_id = g.id
      ORDER BY a.id ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/attendance/list', async (req, res) => {
  try {
    const { date } = req.query;
    const query = `
      SELECT a.*, g.name AS guest_name
      FROM attendance a
      JOIN guest g ON a.guest_id = g.id
      WHERE attendance_date = $1
      ORDER BY check_in ASC
    `;
    const result = await pool.query(query, [date]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ดึงจำนวนพนักงานทั้งหมด
app.get('/guest/count', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM guest');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ดึงจำนวนพนักงานที่เช็คอินในวันนั้น
app.get('/attendance/count', async (req, res) => {
  try {
    const { date } = req.query;
    const result = await pool.query(
      `SELECT COUNT(DISTINCT guest_id) FROM attendance WHERE attendance_date = $1 AND check_in IS NOT NULL`,
      [date]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});

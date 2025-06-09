const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const { parseISO, startOfWeek, startOfMonth, startOfYear, endOfDay } = require('date-fns');
const nodemailer = require('nodemailer');

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

// Nodemailer setup for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'thana.chaiy@ku.th',  // เปลี่ยนเป็นอีเมลที่คุณใช้
    pass: 'uvyv ncpg tkdt ujxu',   // ใช้รหัสผ่านหรือรหัสแอปจาก Gmail
  },
});

// Function to send verification email
function sendVerificationEmail(userEmail, verificationCode) {
  const mailOptions = {
    from: 'thana.chaiy@ku.th',
    to: userEmail,
    subject: 'ยืนยันการสมัครสมาชิก',
    text: `กรุณากรอกรหัสยืนยัน: ${verificationCode} เพื่อยืนยันการสมัครสมาชิกของคุณ`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending verification email:', error);
    } else {
      console.log('Verification email sent:', info.response);
    }
  });
}

// Function to send attendance email (check-in/check-out)
function sendAttendanceEmail(userEmail, status, timestamp, isLate) {
  const mailOptions = {
    from: 'thana.chaiy@ku.th',
    to: userEmail,
    subject: status === 'check-in' ? 'เช็คอินสำเร็จ' : 'เช็คเอาท์สำเร็จ',
    text: `
      คุณได้ทำการ ${status === 'check-in' ? 'เช็คอิน' : 'เช็คเอาท์'} เวลา: ${timestamp}
      ${isLate ? '\nสถานะ: สาย' : '\nสถานะ: ตรงเวลา'}
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending attendance email:', error);
    } else {
      console.log('Attendance email sent:', info.response);
    }
  });
}

// Function to check the status based on check-in time
function checkLateStatus(checkIn, checkOut) {
  const checkInTime = new Date(checkIn);
  const checkOutTime = new Date(checkOut);

  // เช็คเวลาเข้า ว่าเกิน 10 โมงเช้าหรือไม่
  const isLate = checkInTime.getHours() >= 10; // ถ้าเกิน 10 โมงเช้า ถือว่าสาย

  // คำนวณ OT โดยการหักเวลาทำงานปกติ (เช่น 8 ชั่วโมง)
  const workedHours = (checkOutTime - checkInTime) / (1000 * 60 * 60); // จำนวนชั่วโมงที่ทำงาน
  const otHours = workedHours > 8 ? workedHours - 8 : 0; // ถ้าทำงานเกิน 8 ชั่วโมงให้ OT

  return { isLate, otHours };
}
// API สำหรับการลงทะเบียนพนักงาน (เก็บ face_embedding)
app.post('/register', async (req, res) => {
  try {
    const { name, email, face_embedding } = req.body;

    const query = `
      INSERT INTO guest (name, email, face_embedding) 
      VALUES ($1, $2, $3) RETURNING *`;

    const values = [name, email, Buffer.from(face_embedding, 'base64')];

    const result = await pool.query(query, values);
    const newGuest = result.rows[0];

    // ส่งอีเมลยืนยันการสมัคร
    const verificationCode = '123456';  // รหัสยืนยันที่คุณสร้างขึ้น
    sendVerificationEmail(email, verificationCode);

    res.json({ status: 'success', guest: newGuest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// API สำหรับเช็คอิน/เช็คเอาท์
app.post('/attendance', async (req, res) => {
  try {
    const { face_embedding } = req.body;
    const inputEmbedding = Buffer.from(face_embedding, 'base64');

    const guestsResult = await pool.query('SELECT * FROM guest');
    const guests = guestsResult.rows;

    let minDistance = Number.MAX_VALUE;
    let matchedGuest = null;

    // ใช้ Euclidean distance ในการเปรียบเทียบใบหน้า
    const euclideanDistance = (vec1, vec2) => {
      let sum = 0;
      for (let i = 0; i < vec1.length; i++) {
        const diff = vec1[i] - vec2[i];
        sum += diff * diff;
      }
      return Math.sqrt(sum);
    };

    const bufferToFloat32Array = (buffer) => {
      return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Float32Array.BYTES_PER_ELEMENT);
    };

    const inputArray = bufferToFloat32Array(inputEmbedding);

    for (const guest of guests) {
      const guestArray = bufferToFloat32Array(guest.face_embedding);
      const dist = euclideanDistance(inputArray, guestArray);
      if (dist < minDistance && dist < 0.6) {
        minDistance = dist;
        matchedGuest = guest;
      }
    }

    if (!matchedGuest) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้ในระบบ' });
    }

    const today = new Date();
    const todayDateString = today.toISOString().slice(0, 10);

    const attendanceResult = await pool.query(
      `SELECT * FROM attendance WHERE guest_id = $1 AND attendance_date = $2`,
      [matchedGuest.id, todayDateString]
    );

    let attendance = attendanceResult.rows[0];

    if (!attendance) {
      const insertResult = await pool.query(
        `INSERT INTO attendance (guest_id, check_in, attendance_date) VALUES ($1, NOW(), $2) RETURNING *`,
        [matchedGuest.id, todayDateString]
      );
      attendance = insertResult.rows[0];

      const timestamp = new Date().toLocaleString();
      const { isLate, otHours } = checkLateStatus(attendance.check_in, attendance.check_out);  // คำนวณ OT
      sendAttendanceEmail(matchedGuest.email, 'check-in', timestamp, isLate);

      return res.json({
        message: 'เช็คอินเรียบร้อย',
        guest: matchedGuest,
        attendance,
        otHours, // ส่ง OT กลับไปด้วย
      });
    } else if (!attendance.check_out) {
      const updateResult = await pool.query(
        `UPDATE attendance SET check_out = NOW() WHERE id = $1 RETURNING *`,
        [attendance.id]
      );
      attendance = updateResult.rows[0];

      const timestamp = new Date().toLocaleString();
      const { isLate, otHours } = checkLateStatus(attendance.check_in, attendance.check_out);  // คำนวณ OT
      sendAttendanceEmail(matchedGuest.email, 'check-out', timestamp, isLate);

      return res.json({
        message: 'เช็คเอาท์เรียบร้อย',
        guest: matchedGuest,
        attendance,
        otHours, // ส่ง OT กลับไปด้วย
      });
    } else {
      return res.status(400).json({ message: 'เช็คเอาท์วันนี้แล้ว ไม่สามารถลงเวลาเพิ่มได้' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// API อื่นๆ สำหรับดึงข้อมูลการเช็คอิน/เช็คเอาท์ และข้อมูลพนักงาน
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

// ฟังก์ชันการดึงจำนวนพนักงานทั้งหมด
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

app.get('/attendance/summary', async (req, res) => {
  try {
    const { range } = req.query;
    let query = `
      SELECT a.*, g.name AS guest_name
      FROM attendance a
      LEFT JOIN guest g ON a.guest_id = g.id
    `;

    const now = new Date();
    let startDate;

    if (range === 'week') {
      const day = now.getDay(); // Sunday = 0
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day);
    } else if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      // Default = day
      startDate = new Date(now.toISOString().slice(0, 10)); // only yyyy-mm-dd
    }

    query += ` WHERE attendance_date >= $1 ORDER BY check_in ASC`;
    const result = await pool.query(query, [startDate.toISOString().slice(0, 10)]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/attendance/filter', async (req, res) => {
  try {
    const { type, date } = req.query;
    const parsedDate = parseISO(date);

    let start, end;

    if (type === 'day') {
      start = parsedDate;
      end = endOfDay(parsedDate);
    } else if (type === 'week') {
      start = startOfWeek(parsedDate, { weekStartsOn: 1 }); // เริ่มวันจันทร์
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else if (type === 'month') {
      start = startOfMonth(parsedDate);
      end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      end.setDate(end.getDate() - 1);
    } else if (type === 'year') {
      start = startOfYear(parsedDate);
      end = new Date(start);
      end.setFullYear(start.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
    } else {
      return res.status(400).json({ message: 'Invalid type. ใช้ day, week, month, year เท่านั้น' });
    }

    const result = await pool.query(
      `SELECT a.*, g.name AS guest_name
       FROM attendance a
       JOIN guest g ON a.guest_id = g.id
       WHERE attendance_date BETWEEN $1 AND $2
       ORDER BY check_in ASC`,
      [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/attendance/count/filter', async (req, res) => {
  try {
    const { type, date } = req.query;
    const parsedDate = parseISO(date);

    let start, end;

    if (type === 'day') {
      start = parsedDate;
      end = endOfDay(parsedDate);
    } else if (type === 'week') {
      start = startOfWeek(parsedDate, { weekStartsOn: 1 });
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else if (type === 'month') {
      start = startOfMonth(parsedDate);
      end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      end.setDate(end.getDate() - 1);
    } else if (type === 'year') {
      start = startOfYear(parsedDate);
      end = new Date(start);
      end.setFullYear(start.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
    } else {
      return res.status(400).json({ message: 'Invalid type. ใช้ day, week, month, year เท่านั้น' });
    }

    const result = await pool.query(
      `SELECT COUNT(DISTINCT guest_id) 
       FROM attendance 
       WHERE attendance_date BETWEEN $1 AND $2 AND check_in IS NOT NULL`,
      [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// API สำหรับการส่งอีเมลยืนยัน
app.post('/send-verification-email', async (req, res) => {
  try {
    const { email } = req.body;

    const verificationCode = '123456';  // รหัสยืนยันที่คุณสร้างขึ้น

    // ส่งอีเมลยืนยัน
    sendVerificationEmail(email, verificationCode);

    res.json({ message: 'ส่งอีเมลยืนยันแล้ว' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ดึงข้อมูลการเช็คอิน
app.get('/attendance/checkin-time', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT EXTRACT(HOUR FROM check_in) AS time_slot, COUNT(*) AS count
      FROM attendance
      WHERE check_in IS NOT NULL
      GROUP BY time_slot
      ORDER BY time_slot
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});


app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});

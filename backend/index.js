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

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ตั้งค่า MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+07:00"
});

// ฟังก์ชันทดสอบการเชื่อมต่อฐานข้อมูล
(async function testMySQL() {
  try {
    const conn = await pool.getConnection();
    console.log('Connected to MySQL:', process.env.DB_NAME);
    conn.release();
  } catch (err) {
    console.error('MySQL Failed:', err.message);
    process.exit(1);
  }
})();

// API Endpoint สำหรับดึงข้อมูลสินค้าทั้งหมด
app.get('/api/products', async (req, res) => {
  try {
    // คิวรีข้อมูลจากตาราง products 
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    console.error('Products Error:', e.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// API Default เช็คสถานะเซิร์ฟเวอร์
app.get('/api', (req, res) => {
  res.send('API is running');
});

// สั่งให้ Server เริ่มทำงาน
app.listen(port, '0.0.0.0', () => {
  console.log(`API running on port ${port}`);
});
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3000;

// เปิด CORS ให้รองรับการเรียกจากแอปทุกช่องทาง
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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

// ==========================================
// 1. ระบบ Login (เชื่อมตาราง users ใน MySQL)
// ==========================================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
    const [rows] = await pool.query(sql, [username, password]);

    if (rows.length > 0) {
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (err) {
    console.error('Login Database Error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// ==========================================
// 2. ระบบเปลี่ยนรหัสผ่าน (อัปเดตลงตาราง users ใน MySQL)
// ==========================================
app.post('/api/change-password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    // เช็ครหัสผ่านเดิมก่อน
    const checkSql = "SELECT * FROM users WHERE username = 'admin' AND password = ?";
    const [rows] = await pool.query(checkSql, [oldPassword]);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' });
    }

    // ถ้ารหัสเดิมถูก อัปเดตรหัสใหม่
    const updateSql = "UPDATE users SET password = ? WHERE username = 'admin'";
    await pool.query(updateSql, [newPassword]);
    res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (err) {
    console.error('Change Password Error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// ==========================================
// 3. ดึงข้อมูลสินค้าทั้งหมด (GET)
// ==========================================
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    console.error('Products Error:', e.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ==========================================
// 4. เพิ่มข้อมูลสินค้าใหม่ (POST)
// ==========================================
app.post('/api/products', async (req, res) => {
  try {
    const {
      name, price, stock, image, badge_status, category, location_text
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const safePrice = Number(price) || 0;
    const safeStock = Number(stock) || 0;
    const stockText = safeStock > 0 ? `${safeStock} in stock` : 'Out of Stock';

    const sql = `
      INSERT INTO products 
      (NAME, price, stock, stock_text, category, location_count, location_text, badge_status, image_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      name, safePrice, safeStock, stockText,
      category || 'T-shirts', 1, location_text || '1 stores', 
      badge_status || (safeStock > 0 ? 'Active' : 'Low in stock'), image || null 
    ];

    const [result] = await pool.query(sql, params);
    return res.status(201).json({ success: true, productId: result.insertId });

  } catch (err) {
    console.error('Create Product Error:', err.message);
    return res.status(500).json({ error: 'Failed to create product' });
  }
});

// ==========================================
// 5. แก้ไขข้อมูลสินค้า (PUT)
// ==========================================
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, price, stock, image, badge_status, category, location_text
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const safePrice = Number(price) || 0;
    const safeStock = Number(stock) || 0;
    const stockText = safeStock > 0 ? `${safeStock} in stock` : 'Out of Stock';

    const sql = `
      UPDATE products 
      SET NAME = ?, price = ?, stock = ?, stock_text = ?, category = ?, location_text = ?, badge_status = ?, image_url = ?
      WHERE id = ?
    `;

    const params = [
      name, safePrice, safeStock, stockText,
      category || 'T-shirts', location_text || '1 stores', 
      badge_status || (safeStock > 0 ? 'Active' : 'Low in stock'), image || null, id
    ];

    const [result] = await pool.query(sql, params);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true });

  } catch (err) {
    console.error('Update Product Error:', err.message);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// ==========================================
// 6. ลบข้อมูลสินค้า (DELETE)
// ==========================================
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = 'DELETE FROM products WHERE id = ?';
    const [result] = await pool.query(sql, [id]);

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, message: 'Deleted successfully' });

  } catch (err) {
    console.error('Delete Product Error:', err.message);
    res.status(500).json({ error: 'Failed to delete product' });
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
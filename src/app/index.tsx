require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10
});

// ==========================================
// AUTO SETUP DATABASE (จัดการฐานข้อมูลอัตโนมัติ)
// ==========================================
(async function setupDatabase() {
  try {
    const conn = await pool.getConnection();
    console.log('Connected to Database. Auto-checking tables...');
    
    // 1. สร้างตาราง users อัตโนมัติ
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
      )
    `);

    // 2. เพิ่มแอดมินเริ่มต้น (admin/1234) เผื่อไว้ให้เลย
    try {
      await conn.query(`INSERT IGNORE INTO users (username, password) VALUES ('admin', '1234')`);
    } catch(e) {}

    // 3. แทรกคอลัมน์ detail เข้าตาราง products อัตโนมัติ
    try {
      await conn.query('ALTER TABLE products ADD COLUMN detail TEXT');
    } catch (e) {} // ปล่อยผ่านถ้ามีคอลัมน์นี้อยู่แล้ว

    // 4. แก้คอลัมน์รูปให้รับข้อมูลได้ไม่จำกัดอัตโนมัติ
    try {
      await conn.query('ALTER TABLE products MODIFY COLUMN image_url LONGTEXT');
    } catch (e) {}

    conn.release();
    console.log('Database Ready!');
  } catch (err) {
    console.error('DB Setup Error:', err.message);
  }
})();

// ==========================================
// API ระบบบัญชี (Register, Login, Change Password)
// ==========================================
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });

    const [existing] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (existing.length > 0) return res.status(400).json({ error: 'Username นี้ถูกใช้แล้ว' });

    await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);
    res.status(201).json({ success: true, message: 'สร้างบัญชีสำเร็จ' });
  } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
    if (rows.length > 0) res.json({ success: true, username: rows[0].username });
    else res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านผิด' });
  } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

app.post('/api/change-password', async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, oldPassword]);
    if (rows.length === 0) return res.status(400).json({ error: 'รหัสผ่านเดิมผิด' });
    await pool.query('UPDATE users SET password = ? WHERE username = ?', [newPassword, username]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// ==========================================
// API สินค้า (CRUD)
// ==========================================
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, price, stock, image, detail } = req.body;
    const safeStock = Number(stock)||0;
    const sql = `INSERT INTO products (NAME, price, stock, stock_text, category, location_count, location_text, badge_status, image_url, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, Number(price)||0, safeStock, safeStock > 0 ? `${safeStock} in stock` : 'Out of Stock', 'Gadgets', 1, 'Main Store', safeStock > 0 ? 'Active' : 'Low stock', image || null, detail || ''];
    const [result] = await pool.query(sql, params);
    res.status(201).json({ success: true, productId: result.insertId });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, price, stock, image, detail } = req.body;
    const safeStock = Number(stock)||0;
    const sql = `UPDATE products SET NAME = ?, price = ?, stock = ?, stock_text = ?, badge_status = ?, image_url = ?, detail = ? WHERE id = ?`;
    const params = [name, Number(price)||0, safeStock, safeStock > 0 ? `${safeStock} in stock` : 'Out of Stock', safeStock > 0 ? 'Active' : 'Low stock', image || null, detail || '', req.params.id];
    await pool.query(sql, params);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

app.listen(port, '0.0.0.0', () => console.log(`API running on port ${port}`));
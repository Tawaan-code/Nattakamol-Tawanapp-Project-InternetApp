require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json({ limit: '5mb' }));

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
// ระบบบัญชีผู้ใช้งาน (Register, Login, Change Password)
// ==========================================
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });

    const [existing] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (existing.length > 0) return res.status(400).json({ error: 'Username นี้มีผู้ใช้งานแล้ว' });

    await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);
    res.status(201).json({ success: true, message: 'สร้างบัญชีสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);

    if (rows.length > 0) {
      res.json({ success: true, message: 'Login successful', username: rows[0].username });
    } else {
      res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/change-password', async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, oldPassword]);
    
    if (rows.length === 0) return res.status(400).json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' });

    await pool.query('UPDATE users SET password = ? WHERE username = ?', [newPassword, username]);
    res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ==========================================
// ระบบจัดการสินค้า (CRUD)
// ==========================================
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, price, stock, image, badge_status, category, location_text } = req.body;
    const sql = `INSERT INTO products (NAME, price, stock, stock_text, category, location_count, location_text, badge_status, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, Number(price)||0, Number(stock)||0, (Number(stock)||0) > 0 ? `${Number(stock)||0} in stock` : 'Out of Stock', category || 'T-shirts', 1, location_text || '1 stores', badge_status || ((Number(stock)||0) > 0 ? 'Active' : 'Low in stock'), image || null];
    const [result] = await pool.query(sql, params);
    res.status(201).json({ success: true, productId: result.insertId });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, price, stock, image, badge_status, category, location_text } = req.body;
    const sql = `UPDATE products SET NAME = ?, price = ?, stock = ?, stock_text = ?, category = ?, location_text = ?, badge_status = ?, image_url = ? WHERE id = ?`;
    const params = [name, Number(price)||0, Number(stock)||0, (Number(stock)||0) > 0 ? `${Number(stock)||0} in stock` : 'Out of Stock', category || 'T-shirts', location_text || '1 stores', badge_status || ((Number(stock)||0) > 0 ? 'Active' : 'Low in stock'), image || null, req.params.id];
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
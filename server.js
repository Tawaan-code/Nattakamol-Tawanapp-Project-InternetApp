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
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+07:00"
});

// ==========================================
// ระบบ Login
// ==========================================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  // เพื่อความรวดเร็วในการส่งงาน ตั้งรหัสผ่านฮาร์ดโค้ดสำหรับแอดมิน
  if (username === 'admin' && password === '1234') {
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

// ดึงข้อมูล (GET)
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// เพิ่มข้อมูล (POST)
app.post('/api/products', async (req, res) => {
  try {
    const { name, price, stock, image, badge_status, category, location_text } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const safePrice = Number(price) || 0;
    const safeStock = Number(stock) || 0;
    const sql = `INSERT INTO products (NAME, price, stock, stock_text, category, location_count, location_text, badge_status, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, safePrice, safeStock, safeStock > 0 ? `${safeStock} in stock` : 'Out of Stock', category || 'T-shirts', 1, location_text || '1 stores', badge_status || (safeStock > 0 ? 'Active' : 'Low in stock'), image || null];
    const [result] = await pool.query(sql, params);
    res.status(201).json({ success: true, productId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// แก้ไขข้อมูล (PUT)
app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, price, stock, image, badge_status, category, location_text } = req.body;
    const safePrice = Number(price) || 0;
    const safeStock = Number(stock) || 0;
    const sql = `UPDATE products SET NAME = ?, price = ?, stock = ?, stock_text = ?, category = ?, location_text = ?, badge_status = ?, image_url = ? WHERE id = ?`;
    const params = [name, safePrice, safeStock, safeStock > 0 ? `${safeStock} in stock` : 'Out of Stock', category || 'T-shirts', location_text || '1 stores', badge_status || (safeStock > 0 ? 'Active' : 'Low in stock'), image || null, req.params.id];
    const [result] = await pool.query(sql, params);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// ลบข้อมูล (DELETE)
app.delete('/api/products/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.listen(port, '0.0.0.0', () => console.log(`API running on port ${port}`));
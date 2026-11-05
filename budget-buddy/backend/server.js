/**
 * BudgetBuddy - Production Express & SQLite Backend Server
 * Complete multi-device API for community deployment.
 * Run with: npm install && node server.js
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'budgetbuddy_community_secret_key_892347';

app.use(cors());
app.use(express.json());

// Initialize SQLite database file
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
    // Execute Schema
    const schema = fs.readFileSync(path.resolve(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema, (execErr) => {
      if (execErr) console.error('Schema initialization error:', execErr.message);
      else console.log('Database tables verified and ready.');
    });
  }
});

// Middleware: Authenticate JWT Token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired session. Please log in again.' });
    req.user = user;
    next();
  });
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), mode: 'production' });
});

// 2. Register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, currency, monthlyTarget } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const id = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  const hash = bcrypt.hashSync(password, 10);
  const cur = currency || '₱';
  const target = parseFloat(monthlyTarget) || 0;

  const sql = `INSERT INTO users (id, name, email, password_hash, currency, monthly_target) VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(sql, [id, name.trim(), cleanEmail, hash, cur, target], function (err) {
    if (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      return res.status(500).json({ error: err.message });
    }

    const token = jwt.sign({ id, email: cleanEmail, name: name.trim() }, JWT_SECRET, { expiresIn: '60d' });
    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id, name: name.trim(), email: cleanEmail, currency: cur, monthlyTarget: target, role: 'Personal account' }
    });
  });
});

// 3. Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const cleanEmail = email.trim().toLowerCase();
  db.get(`SELECT * FROM users WHERE email = ?`, [cleanEmail], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '60d' });
    res.json({
      message: 'Signed in successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency || '₱',
        monthlyTarget: user.monthly_target || 0,
        role: user.role || 'Personal account'
      }
    });
  });
});

// 4. Get Current User Profile (Session check)
app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get(`SELECT id, name, email, currency, monthly_target as monthlyTarget, role, avatar FROM users WHERE id = ?`, [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  });
});

// 5. Update Profile
app.put('/api/user/profile', authenticateToken, (req, res) => {
  const { name, currency, monthlyTarget } = req.body;
  const sql = `UPDATE users SET name = COALESCE(?, name), currency = COALESCE(?, currency), monthly_target = COALESCE(?, monthly_target) WHERE id = ?`;
  db.run(sql, [name, currency, monthlyTarget !== undefined ? parseFloat(monthlyTarget) : null, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Profile updated successfully' });
  });
});

// 6. Get Transactions for Logged-In User
app.get('/api/transactions', authenticateToken, (req, res) => {
  db.all(`SELECT id, user_id as userId, type, amount, category, description, date, note FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC`, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ transactions: rows });
  });
});

// 7. Add Transaction
app.post('/api/transactions', authenticateToken, (req, res) => {
  const { type, amount, category, description, date, note } = req.body;
  if (!type || !amount || !description || !date) {
    return res.status(400).json({ error: 'Type, amount, description and date are required.' });
  }

  const id = 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  const sql = `INSERT INTO transactions (id, user_id, type, amount, category, description, date, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [id, req.user.id, type, parseFloat(amount), category, description, date, note || ''], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      message: 'Transaction saved',
      transaction: { id, userId: req.user.id, type, amount: parseFloat(amount), category, description, date, note }
    });
  });
});

// 8. Delete Transaction
app.delete('/api/transactions/:id', authenticateToken, (req, res) => {
  db.run(`DELETE FROM transactions WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Transaction deleted' });
  });
});

// Serve frontend static files
app.use(express.static(path.resolve(__dirname, '..')));

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 BudgetBuddy Central Community Server Running!`);
  console.log(`📍 Web App & API available at: http://localhost:${PORT}`);
  console.log(`🗄️  Database: SQLite (${dbPath})`);
  console.log(`=======================================================`);
});

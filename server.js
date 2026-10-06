// server.js
require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Aiven MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql-14d78de5-recipebox.l.aivencloud.com',
  port: Number(process.env.DB_PORT) || 27123,
  user: process.env.DB_USER || 'avnadmin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'defaultdb',
  ssl: {
    rejectUnauthorized: false // Required for Aiven TLS/SSL
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test Endpoint: Database Connection Status
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 2 AS result');
    res.json({
      success: true,
      message: 'Successfully connected to Aiven MySQL!',
      data: rows[0]
    });
  } catch (err) {
    console.error('Database query failed:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Example API Route: Fetch All Tables
app.get('/api/tables', async (req, res) => {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    res.json({ success: true, tables });
  } catch (err) {
    console.error('Error fetching tables:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Express Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
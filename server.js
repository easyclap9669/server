require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();

app.use(cors());
app.use(express.json());

const requiredEnv = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: {
    rejectUnauthorized: false,
  },

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 20000,
});

// Test Aiven connection
async function testDatabase() {
  try {
    const connection = await pool.getConnection();

    await connection.ping();

    console.log("=================================");
    console.log("✅ AIVEN MYSQL CONNECTED");
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Port: ${process.env.DB_PORT}`);
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log("=================================");

    connection.release();
  } catch (error) {
    console.error("=================================");
    console.error("❌ AIVEN MYSQL CONNECTION FAILED");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Address:", error.address);
    console.error("Port:", error.port);
    console.error("=================================");
  }
}

// Home
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "RecipeBox API is running",
  });
});

// Health check
app.get("/health", async (req, res) => {
  try {
    const connection = await pool.getConnection();

    await connection.ping();

    connection.release();

    res.json({
      success: true,
      server: "online",
      database: "connected",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      server: "online",
      database: "disconnected",
      error: error.message,
      code: error.code,
      sqlState: error.sqlState || null,
      address: error.address || null,
      port: error.port || null,
    });
  }
});

// Test database
app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS test");

    res.json({
      success: true,
      database: "connected",
      result: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
    });
  }
});

// Get all recipes
app.get("/api/recipes", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM recipes
      ORDER BY id ASC
    `);

    res.json({
      success: true,
      recipes: rows,
    });
  } catch (error) {
    console.error("Get recipes error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
    });
  }
});

// Get recipe by ID
app.get("/api/recipes/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM recipes WHERE id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Recipe not found",
      });
    }

    res.json({
      success: true,
      recipe: rows[0],
    });
  } catch (error) {
    console.error("Get recipe error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
    });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 RecipeBox API running on port ${PORT}`);

  await testDatabase();
});
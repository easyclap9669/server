
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();

// =========================
// Middleware
// =========================
app.use(cors());
app.use(express.json());

// =========================
// Aiven MySQL Connection
// =========================
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: {
    rejectUnauthorized: false
  },

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// =========================
// Root API
// =========================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "RecipeBox API is running",
    database: "Aiven MySQL"
  });
});

// =========================
// Test Database
// =========================
app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 2 AS result");

    res.json({
      success: true,
      message: "Successfully connected to Aiven MySQL!",
      data: rows[0]
    });
  } catch (err) {
    console.error("Database query failed:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// =========================
// Get Tables
// =========================
app.get("/api/tables", async (req, res) => {
  try {
    const [tables] = await pool.query("SHOW TABLES");

    res.json({
      success: true,
      tables
    });
  } catch (err) {
    console.error("Error fetching tables:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// =========================
// Get Recipes
// =========================
app.get("/api/recipes", async (req, res) => {
  try {
    const [recipes] = await pool.query(
      "SELECT * FROM recipes ORDER BY id DESC"
    );

    res.json({
      success: true,
      recipes
    });
  } catch (err) {
    console.error("Error fetching recipes:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// =========================
// Get Single Recipe
// =========================
app.get("/api/recipes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [recipes] = await pool.query(
      "SELECT * FROM recipes WHERE id = ?",
      [id]
    );

    if (recipes.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found"
      });
    }

    res.json({
      success: true,
      recipe: recipes[0]
    });
  } catch (err) {
    console.error("Error fetching recipe:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// =========================
// Health Check
// =========================
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      success: true,
      server: "online",
      database: "connected"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      server: "online",
      database: "disconnected"
    });
  }
});

// =========================
// Start Server
// =========================
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`RecipeBox API running on port ${PORT}`);
});


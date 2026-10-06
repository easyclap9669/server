require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();

app.use(cors());
app.use(express.json());

/* ================================
   ENVIRONMENT VARIABLES
================================ */

const DB_HOST = process.env.DB_HOST;
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

console.log("=================================");
console.log("RecipeBox API");
console.log("DB_HOST:", DB_HOST ? "SET" : "MISSING");
console.log("DB_PORT:", DB_PORT);
console.log("DB_USER:", DB_USER ? "SET" : "MISSING");
console.log("DB_PASSWORD:", DB_PASSWORD ? "SET" : "MISSING");
console.log("DB_NAME:", DB_NAME ? "SET" : "MISSING");
console.log("=================================");

/* ================================
   MYSQL POOL
================================ */

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,

  ssl: {
    rejectUnauthorized: false,
  },

  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,

  connectTimeout: 30000,
});

/* ================================
   DATABASE TEST
================================ */

async function testDatabase() {
  let connection;

  try {
    connection = await pool.getConnection();

    await connection.query("SELECT 1");

    console.log("=================================");
    console.log("✅ MYSQL DATABASE CONNECTED");
    console.log("Host:", DB_HOST);
    console.log("Port:", DB_PORT);
    console.log("Database:", DB_NAME);
    console.log("=================================");

    return true;
  } catch (error) {
    console.error("=================================");
    console.error("❌ MYSQL CONNECTION FAILED");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("=================================");

    return false;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/* ================================
   HOME
================================ */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "RecipeBox API is running",
    database: "Aiven MySQL",
  });
});

/* ================================
   HEALTH CHECK
================================ */

app.get("/health", async (req, res) => {
  let connection;

  try {
    connection = await pool.getConnection();

    await connection.query("SELECT 1");

    res.json({
      success: true,
      server: "online",
      database: "connected",
    });
  } catch (error) {
    console.error("Health database error:", error);

    res.status(500).json({
      success: false,
      server: "online",
      database: "disconnected",
      error: error.message,
      code: error.code || null,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/* ================================
   TEST DATABASE
================================ */

app.get("/test-db", async (req, res) => {
  let connection;

  try {
    connection = await pool.getConnection();

    const [rows] = await connection.query(`
      SELECT
        1 AS test,
        DATABASE() AS database_name,
        NOW() AS server_time
    `);

    res.json({
      success: true,
      database: "connected",
      result: rows[0],
    });
  } catch (error) {
    console.error("Database test error:", error);

    res.status(500).json({
      success: false,
      database: "disconnected",
      error: error.message,
      code: error.code || null,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/* ================================
   GET ALL RECIPES
================================ */

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
      code: error.code || null,
    });
  }
});

/* ================================
   GET RECIPE BY ID
================================ */

app.get("/api/recipes/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT *
      FROM recipes
      WHERE id = ?
      `,
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
      code: error.code || null,
    });
  }
});

/* ================================
   404
================================ */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
  });
});

/* ================================
   START SERVER
================================ */

const PORT = Number(process.env.PORT || 10000);

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 RecipeBox API running on port ${PORT}`);

  await testDatabase();
});

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());

// =====================================================
// DATABASE CONFIGURATION
// =====================================================

const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 27123),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "defaultdb",

  ssl: {
    rejectUnauthorized: false,
  },

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 20000,
};

// Create MySQL pool
const pool = mysql.createPool(dbConfig);

// =====================================================
// INITIALIZE DATABASE
// =====================================================

async function initializeDatabase() {
  try {
    console.log("Connecting to Aiven MySQL...");

    const connection = await pool.getConnection();

    console.log("MySQL connection successful.");

    await connection.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id INT NOT NULL AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        imageUrl TEXT,
        servings INT DEFAULT 1,
        cookingTime INT DEFAULT 0,
        tags VARCHAR(500),
        PRIMARY KEY (id)
      )
    `);

    connection.release();

    console.log("Recipes table is ready.");
  } catch (error) {
    console.error("DATABASE INITIALIZATION ERROR");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("SQL State:", error.sqlState);
  }
}

// =====================================================
// ROOT
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "RecipeBox API is running",
    database: "Aiven MySQL",
  });
});

// =====================================================
// HEALTH
// =====================================================

app.get("/health", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS result");

    res.json({
      success: true,
      server: "online",
      database: "connected",
      result: rows[0].result,
    });
  } catch (error) {
    console.error("HEALTH ERROR:", error);

    res.status(500).json({
      success: false,
      server: "online",
      database: "disconnected",
      error: error.message || "Database connection failed",
      code: error.code || null,
      sqlState: error.sqlState || null,
    });
  }
});

// =====================================================
// DATABASE TEST
// =====================================================

app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 2 AS result");

    res.json({
      success: true,
      message: "Successfully connected to Aiven MySQL",
      data: rows[0],
    });
  } catch (error) {
    console.error("TEST DB ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message || "Database query failed",
      code: error.code || null,
      sqlState: error.sqlState || null,
    });
  }
});

// =====================================================
// TABLES
// =====================================================

app.get("/api/tables", async (req, res) => {
  try {
    const [tables] = await pool.query("SHOW TABLES");

    res.json({
      success: true,
      tables,
    });
  } catch (error) {
    console.error("TABLE ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message || "Unable to get tables",
      code: error.code || null,
    });
  }
});

// =====================================================
// GET ALL RECIPES
// =====================================================

app.get("/api/recipes", async (req, res) => {
  try {
    const [recipes] = await pool.query(`
      SELECT
        id,
        title,
        description,
        imageUrl,
        servings,
        cookingTime,
        tags
      FROM recipes
      ORDER BY id ASC
    `);

    res.json({
      success: true,
      count: recipes.length,
      recipes: recipes,
    });
  } catch (error) {
    console.error("GET RECIPES ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message || "Unable to load recipes",
      code: error.code || null,
      sqlState: error.sqlState || null,
    });
  }
});

// =====================================================
// GET ONE RECIPE
// =====================================================

app.get("/api/recipes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid recipe ID",
      });
    }

    const [recipes] = await pool.query(
      `
      SELECT
        id,
        title,
        description,
        imageUrl,
        servings,
        cookingTime,
        tags
      FROM recipes
      WHERE id = ?
      `,
      [id]
    );

    if (recipes.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found",
      });
    }

    res.json({
      success: true,
      recipe: recipes[0],
    });
  } catch (error) {
    console.error("GET RECIPE ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message || "Unable to load recipe",
      code: error.code || null,
      sqlState: error.sqlState || null,
    });
  }
});

// =====================================================
// CREATE RECIPE
// =====================================================

app.post("/api/recipes", async (req, res) => {
  try {
    const {
      title,
      description,
      imageUrl,
      servings,
      cookingTime,
      tags,
    } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const [result] = await pool.query(
      `
      INSERT INTO recipes
      (
        title,
        description,
        imageUrl,
        servings,
        cookingTime,
        tags
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        title.trim(),
        description || "",
        imageUrl || "",
        Number(servings) || 1,
        Number(cookingTime) || 0,
        tags || "",
      ]
    );

    const [newRecipe] = await pool.query(
      "SELECT * FROM recipes WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Recipe created successfully",
      recipe: newRecipe[0],
    });
  } catch (error) {
    console.error("CREATE RECIPE ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message || "Unable to create recipe",
      code: error.code || null,
      sqlState: error.sqlState || null,
    });
  }
});

// =====================================================
// UPDATE RECIPE
// =====================================================

app.put("/api/recipes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      title,
      description,
      imageUrl,
      servings,
      cookingTime,
      tags,
    } = req.body;

    const [existing] = await pool.query(
      "SELECT * FROM recipes WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found",
      });
    }

    await pool.query(
      `
      UPDATE recipes
      SET
        title = ?,
        description = ?,
        imageUrl = ?,
        servings = ?,
        cookingTime = ?,
        tags = ?
      WHERE id = ?
      `,
      [
        title ?? existing[0].title,
        description ?? existing[0].description,
        imageUrl ?? existing[0].imageUrl,
        servings ?? existing[0].servings,
        cookingTime ?? existing[0].cookingTime,
        tags ?? existing[0].tags,
        id,
      ]
    );

    const [updated] = await pool.query(
      "SELECT * FROM recipes WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      message: "Recipe updated successfully",
      recipe: updated[0],
    });
  } catch (error) {
    console.error("UPDATE RECIPE ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message || "Unable to update recipe",
      code: error.code || null,
      sqlState: error.sqlState || null,
    });
  }
});

// =====================================================
// DELETE RECIPE
// =====================================================

app.delete("/api/recipes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [result] = await pool.query(
      "DELETE FROM recipes WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found",
      });
    }

    res.json({
      success: true,
      message: "Recipe deleted successfully",
    });
  } catch (error) {
    console.error("DELETE RECIPE ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message || "Unable to delete recipe",
      code: error.code || null,
      sqlState: error.sqlState || null,
    });
  }
});

// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    path: req.originalUrl,
  });
});

// =====================================================
// START SERVER
// =====================================================

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  await initializeDatabase();

  app.listen(PORT, "0.0.0.0", () => {
    console.log("--------------------------------------");
    console.log("RecipeBox API");
    console.log("--------------------------------------");
    console.log("Server running on port ${PORT}");
    console.log("Host: 0.0.0.0");
    console.log("Database: Aiven MySQL");
    console.log("--------------------------------------");
  });
}

startServer();


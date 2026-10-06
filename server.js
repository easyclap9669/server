require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();

app.use(cors());
app.use(express.json());

// ===============================
// AIVEN MYSQL CONNECTION
// ===============================

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "defaultdb",

    ssl: {
        rejectUnauthorized: false
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ===============================
// ROOT
// ===============================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "RecipeBox API is running",
        database: process.env.DB_NAME || "defaultdb"
    });
});

// ===============================
// HEALTH CHECK
// ===============================

app.get("/api/health", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT 1 AS connected");

        res.json({
            success: true,
            server: "online",
            database: "connected",
            databaseName: process.env.DB_NAME || "defaultdb",
            result: rows
        });
    } catch (error) {
        console.error("Database connection error:", error);

        res.status(500).json({
            success: false,
            server: "online",
            database: "disconnected",
            databaseName: process.env.DB_NAME || "defaultdb",
            error: error.message,
            code: error.code || null,
            sqlState: error.sqlState || null
        });
    }
});

// ===============================
// GET ALL RECIPES
// ===============================

app.get("/api/recipes", async (req, res) => {
    try {
        const [recipes] = await pool.query(`
            SELECT *
            FROM recipes
            ORDER BY id DESC
        `);

        res.json({
            success: true,
            count: recipes.length,
            recipes: recipes
        });
    } catch (error) {
        console.error("Get recipes error:", error);

        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code || null
        });
    }
});

// ===============================
// GET RECIPE BY ID
// ===============================

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
    } catch (error) {
        console.error("Get recipe error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================
// CREATE RECIPE
// ===============================

app.post("/api/recipes", async (req, res) => {
    try {
        const {
            title,
            description,
            imageUrl,
            servings,
            cookingTime,
            tags
        } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: "Title is required"
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
                title,
                description || "",
                imageUrl || "",
                servings || 1,
                cookingTime || 0,
                tags || ""
            ]
        );

        res.status(201).json({
            success: true,
            message: "Recipe created",
            recipeId: result.insertId
        });
    } catch (error) {
        console.error("Create recipe error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================
// UPDATE RECIPE
// ===============================

app.put("/api/recipes/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            title,
            description,
            imageUrl,
            servings,
            cookingTime,
            tags
        } = req.body;

        const [result] = await pool.query(
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
                title,
                description || "",
                imageUrl || "",
                servings || 1,
                cookingTime || 0,
                tags || "",
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Recipe not found"
            });
        }

        res.json({
            success: true,
            message: "Recipe updated"
        });
    } catch (error) {
        console.error("Update recipe error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================
// DELETE RECIPE
// ===============================

app.delete("/api/recipes/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            "DELETE FROM recipes WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Recipe not found"
            });
        }

        res.json({
            success: true,
            message: "Recipe deleted"
        });
    } catch (error) {
        console.error("Delete recipe error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("=================================");
    console.log("RecipeBox API");
    console.log("=================================");
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`Database: ${process.env.DB_NAME || "defaultdb"}`);
    console.log("=================================");
});
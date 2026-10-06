require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();

app.use(cors());
app.use(express.json());

// =====================================
// AIVEN MYSQL CONNECTION
// =====================================

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: "defaultdb",

    ssl: {
        rejectUnauthorized: false
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// =====================================
// HOME
// =====================================

app.get("/", async (req, res) => {
    res.json({
        success: true,
        server: "online",
        database: "defaultdb",
        message: "RecipeBox server is running"
    });
});

// =====================================
// DATABASE TEST
// =====================================

app.get("/health", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT 1 AS connected");

        res.json({
            success: true,
            server: "online",
            database: "connected",
            databaseName: "defaultdb",
            result: rows
        });
    } catch (error) {
        console.error("Aiven MySQL error:", error);

        res.status(500).json({
            success: false,
            server: "online",
            database: "disconnected",
            databaseName: "defaultdb",
            error: error.message,
            code: error.code || null
        });
    }
});

// =====================================
// GET ALL RECIPES
// =====================================

app.get("/recipes", async (req, res) => {
    try {
        const [recipes] = await db.query(
            "SELECT * FROM recipes ORDER BY id DESC"
        );

        res.json({
            success: true,
            recipes
        });
    } catch (error) {
        console.error("Recipes error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =====================================
// GET ONE RECIPE
// =====================================

app.get("/recipes/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [recipes] = await db.query(
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
        console.error("Recipe error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =====================================
// CREATE RECIPE
// =====================================

app.post("/recipes", async (req, res) => {
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

        const [result] = await db.query(
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
            id: result.insertId
        });
    } catch (error) {
        console.error("Create recipe error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =====================================
// UPDATE RECIPE
// =====================================

app.put("/recipes/:id", async (req, res) => {
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

        const [result] = await db.query(
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

// =====================================
// DELETE RECIPE
// =====================================

app.delete("/recipes/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
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

// =====================================
// START SERVER
// =====================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("====================================");
    console.log("RecipeBox Server Started");
    console.log("====================================");
    console.log(`Port: ${PORT}`);
    console.log("Database: defaultdb");
    console.log("Aiven MySQL: configured");
    console.log("====================================");
});
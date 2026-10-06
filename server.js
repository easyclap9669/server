require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();

app.use(cors());
app.use(express.json());

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
    connectionLimit: 5,
    queueLimit: 0
});

// Test database
app.get("/api/health", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT 1 AS connected");

        res.json({
            success: true,
            server: "online",
            database: "connected",
            result: rows
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            server: "online",
            database: "disconnected",
            error: error.message,
            code: error.code || null
        });
    }
});

// Get recipes
app.get("/api/recipes", async (req, res) => {
    try {
        const [recipes] = await pool.query(`
            SELECT *
            FROM recipes
            ORDER BY id DESC
        `);

        res.json({
            success: true,
            recipes
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
});
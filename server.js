// ======================================================
// RECIPEBOX API SERVER
// Node.js + Express + MySQL
// ======================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

// ======================================================
// APP
// ======================================================

const app = express();

const PORT = Number(process.env.PORT) || 3000;

// ======================================================
// DATABASE CONFIGURATION
// ======================================================

const DB_HOST = process.env.DB_HOST || "mysql-14d78de5-recipebox.l.aivencloud.com";
const DB_PORT = Number(process.env.DB_PORT) || 27123;
const DB_USER = process.env.DB_USER || "avnadmin";
const dbPassword = process.env.AIVEN_DB_PASSWORD;
const DB_NAME = process.env.DB_NAME || "defaultdb";

// ======================================================
// DATABASE CONFIG LOG
// ======================================================

console.log("====================================");
console.log("RecipeBox Database Configuration");
console.log("====================================");
console.log("DB_HOST:", DB_HOST);
console.log("DB_PORT:", DB_PORT);
console.log("DB_USER:", DB_USER);
console.log("DB_NAME:", DB_NAME);
console.log(
    "DB_PASSWORD:",
    DB_PASSWORD ? "****** (loaded)" : "NOT SET"
);
console.log("====================================");

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true,
}));

// ======================================================
// MYSQL CONNECTION POOL
// ======================================================

const pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0,

    connectTimeout: 10000,
});

// ======================================================
// JSON HELPER
// ======================================================

function parseJson(value, fallback = []) {

    if (value === null || value === undefined) {
        return fallback;
    }

    if (
        Array.isArray(value) ||
        typeof value === "object"
    ) {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        return fallback;
    }
}

// ======================================================
// FORMAT RECIPE
// ======================================================

function formatRecipe(recipe) {

    return {
        id: recipe.id,

        title: recipe.title,

        description: recipe.description || "",

        imageUrl: recipe.imageUrl || "",

        servings: Number(recipe.servings || 1),

        cookingTime: Number(recipe.cookingTime || 0),

        tags: parseJson(recipe.tags, []),

        ingredients: parseJson(
            recipe.ingredients,
            []
        ),

        steps: parseJson(
            recipe.steps,
            []
        ),

        favorite: Boolean(recipe.favorite),

        created_at: recipe.created_at,

        updated_at: recipe.updated_at,
    };
}

// ======================================================
// FORMAT SHOPPING ITEM
// ======================================================

function formatShoppingItem(item) {

    return {
        id: item.id,

        name: item.name,

        amount: item.amount || "",

        checked: Boolean(item.checked),

        created_at: item.created_at,
    };
}

// ======================================================
// CREATE DATABASE TABLES
// ======================================================

async function initializeDatabase() {

    try {

        console.log("Connecting to MySQL...");

        const connection = await pool.getConnection();

        console.log("MySQL connection successful");

        connection.release();

        // ==================================================
        // RECIPES TABLE
        // ==================================================

        await pool.query(`
            CREATE TABLE IF NOT EXISTS recipes (

                id INT AUTO_INCREMENT PRIMARY KEY,

                title VARCHAR(255) NOT NULL,

                description TEXT,

                imageUrl TEXT,

                servings INT DEFAULT 1,

                cookingTime INT DEFAULT 0,

                tags JSON,

                ingredients JSON,

                steps JSON,

                favorite BOOLEAN DEFAULT FALSE,

                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP,

                updated_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP

            )
        `);

        // ==================================================
        // SHOPPING LIST TABLE
        // ==================================================

        await pool.query(`
            CREATE TABLE IF NOT EXISTS shopping_list (

                id INT AUTO_INCREMENT PRIMARY KEY,

                name VARCHAR(255) NOT NULL,

                amount VARCHAR(255) DEFAULT '',

                checked BOOLEAN DEFAULT FALSE,

                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP

            )
        `);

        console.log("MySQL tables ready");

    } catch (error) {

        console.error("");
        console.error("====================================");
        console.error("MYSQL DATABASE ERROR");
        console.error("====================================");
        console.error(error.message);
        console.error("====================================");
        console.error("");

        throw error;
    }
}

// ======================================================
// HOME
// ======================================================

app.get("/", async (req, res) => {

    try {

        await pool.query("SELECT 1");

        res.json({

            success: true,

            message: "RecipeBox API is running",

            version: "2.0.0",

            database: "MySQL connected",

            endpoints: {

                recipes: "/recipes",

                favorites: "/favorites",

                shoppingList: "/shopping-list",

                health: "/health",

            },

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message:
                "RecipeBox API is running but MySQL is not connected",

            database: "offline",

            error: error.message,

        });
    }
});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/health", async (req, res) => {

    try {

        await pool.query("SELECT 1");

        res.json({

            success: true,

            server: "online",

            database: "online",

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            server: "online",

            database: "offline",

            error: error.message,

        });
    }
});

// ======================================================
// GET ALL RECIPES
//
// GET /recipes
//
// GET /recipes?q=chicken
//
// GET /recipes?tag=Asian
//
// GET /recipes?q=chicken&tag=Asian
// ======================================================

app.get("/recipes", async (req, res) => {

    try {

        const search = req.query.q;

        const tag = req.query.tag;

        const [rows] = await pool.query(`
            SELECT *
            FROM recipes
            ORDER BY id DESC
        `);

        let recipes = rows.map(formatRecipe);

        // ==================================================
        // SEARCH
        // ==================================================

        if (search) {

            const searchText =
                String(search).toLowerCase();

            recipes = recipes.filter(recipe => {

                const title =
                    String(recipe.title || "")
                        .toLowerCase();

                const description =
                    String(recipe.description || "")
                        .toLowerCase();

                return (
                    title.includes(searchText) ||
                    description.includes(searchText)
                );
            });
        }

        // ==================================================
        // TAG FILTER
        // ==================================================

        if (tag) {

            const tagText =
                String(tag).toLowerCase();

            recipes = recipes.filter(recipe => {

                if (!Array.isArray(recipe.tags)) {
                    return false;
                }

                return recipe.tags.some(recipeTag =>
                    String(recipeTag)
                        .toLowerCase() === tagText
                );
            });
        }

        res.json({

            success: true,

            count: recipes.length,

            recipes: recipes,

        });

    } catch (error) {

        console.error(
            "GET /recipes error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Failed to load recipes",

            error: error.message,

        });
    }
});

// ======================================================
// GET RECIPE BY ID
//
// GET /recipes/1
// ======================================================

app.get("/recipes/:id", async (req, res) => {

    try {

        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {

            return res.status(400).json({

                success: false,

                message: "Invalid recipe ID",

            });
        }

        const [rows] = await pool.query(
            `
            SELECT *
            FROM recipes
            WHERE id = ?
            `,
            [id]
        );

        if (rows.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Recipe not found",

            });
        }

        res.json({

            success: true,

            recipe: formatRecipe(rows[0]),

        });

    } catch (error) {

        console.error(
            "GET /recipes/:id error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Failed to load recipe",

            error: error.message,

        });
    }
});

// ======================================================
// CREATE RECIPE
//
// POST /recipes
// ======================================================

app.post("/recipes", async (req, res) => {

    try {

        const {

            title,

            description = "",

            imageUrl = "",

            servings = 1,

            cookingTime = 0,

            tags = [],

            ingredients = [],

            steps = [],

        } = req.body;

        // ==================================================
        // VALIDATION
        // ==================================================

        if (
            !title ||
            String(title).trim() === ""
        ) {

            return res.status(400).json({

                success: false,

                message: "Recipe title is required",

            });
        }

        // ==================================================
        // INSERT
        // ==================================================

        const [result] = await pool.query(
            `
            INSERT INTO recipes
            (
                title,
                description,
                imageUrl,
                servings,
                cookingTime,
                tags,
                ingredients,
                steps,
                favorite
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [

                String(title).trim(),

                description,

                imageUrl,

                Number(servings) || 1,

                Number(cookingTime) || 0,

                JSON.stringify(tags),

                JSON.stringify(ingredients),

                JSON.stringify(steps),

                false,

            ]
        );

        // ==================================================
        // GET CREATED RECIPE
        // ==================================================

        const [rows] = await pool.query(
            `
            SELECT *
            FROM recipes
            WHERE id = ?
            `,
            [result.insertId]
        );

        res.status(201).json({

            success: true,

            message:
                "Recipe created successfully",

            recipe: formatRecipe(rows[0]),

        });

    } catch (error) {

        console.error(
            "POST /recipes error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Failed to create recipe",

            error: error.message,

        });
    }
});

// ======================================================
// UPDATE RECIPE
//
// PUT /recipes/:id
// ======================================================

app.put("/recipes/:id", async (req, res) => {

    try {

        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {

            return res.status(400).json({

                success: false,

                message: "Invalid recipe ID",

            });
        }

        // ==================================================
        // GET EXISTING
        // ==================================================

        const [existingRows] = await pool.query(
            `
            SELECT *
            FROM recipes
            WHERE id = ?
            `,
            [id]
        );

        if (existingRows.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Recipe not found",

            });
        }

        const oldRecipe =
            formatRecipe(existingRows[0]);

        // ==================================================
        // VALUES
        // ==================================================

        const title =
            req.body.title ??
            oldRecipe.title;

        const description =
            req.body.description ??
            oldRecipe.description;

        const imageUrl =
            req.body.imageUrl ??
            oldRecipe.imageUrl;

        const servings =
            req.body.servings ??
            oldRecipe.servings;

        const cookingTime =
            req.body.cookingTime ??
            oldRecipe.cookingTime;

        const tags =
            req.body.tags ??
            oldRecipe.tags;

        const ingredients =
            req.body.ingredients ??
            oldRecipe.ingredients;

        const steps =
            req.body.steps ??
            oldRecipe.steps;

        const favorite =
            req.body.favorite ??
            oldRecipe.favorite;

        // ==================================================
        // UPDATE
        // ==================================================

        await pool.query(
            `
            UPDATE recipes
            SET

                title = ?,

                description = ?,

                imageUrl = ?,

                servings = ?,

                cookingTime = ?,

                tags = ?,

                ingredients = ?,

                steps = ?,

                favorite = ?

            WHERE id = ?
            `,
            [

                title,

                description,

                imageUrl,

                Number(servings) || 1,

                Number(cookingTime) || 0,

                JSON.stringify(tags),

                JSON.stringify(ingredients),

                JSON.stringify(steps),

                Boolean(favorite),

                id,

            ]
        );

        // ==================================================
        // GET UPDATED
        // ==================================================

        const [rows] = await pool.query(
            `
            SELECT *
            FROM recipes
            WHERE id = ?
            `,
            [id]
        );

        res.json({

            success: true,

            message:
                "Recipe updated successfully",

            recipe:
                formatRecipe(rows[0]),

        });

    } catch (error) {

        console.error(
            "PUT /recipes/:id error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Failed to update recipe",

            error: error.message,

        });
    }
});

// ======================================================
// DELETE RECIPE
//
// DELETE /recipes/:id
// ======================================================

app.delete("/recipes/:id", async (req, res) => {

    try {

        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {

            return res.status(400).json({

                success: false,

                message: "Invalid recipe ID",

            });
        }

        const [rows] = await pool.query(
            `
            SELECT *
            FROM recipes
            WHERE id = ?
            `,
            [id]
        );

        if (rows.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Recipe not found",

            });
        }

        const deletedRecipe =
            formatRecipe(rows[0]);

        await pool.query(
            `
            DELETE FROM recipes
            WHERE id = ?
            `,
            [id]
        );

        res.json({

            success: true,

            message:
                "Recipe deleted successfully",

            recipe: deletedRecipe,

        });

    } catch (error) {

        console.error(
            "DELETE /recipes/:id error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Failed to delete recipe",

            error: error.message,

        });
    }
});

// ======================================================
// TOGGLE FAVORITE
//
// POST /recipes/:id/favorite
// ======================================================

app.post(
    "/recipes/:id/favorite",
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);

            if (!Number.isInteger(id)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid recipe ID",

                });
            }

            const [rows] = await pool.query(
                `
                SELECT *
                FROM recipes
                WHERE id = ?
                `,
                [id]
            );

            if (rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Recipe not found",

                });
            }

            const currentFavorite =
                Boolean(rows[0].favorite);

            const newFavorite =
                !currentFavorite;

            await pool.query(
                `
                UPDATE recipes
                SET favorite = ?
                WHERE id = ?
                `,
                [
                    newFavorite,
                    id,
                ]
            );

            const [updatedRows] =
                await pool.query(
                    `
                    SELECT *
                    FROM recipes
                    WHERE id = ?
                    `,
                    [id]
                );

            res.json({

                success: true,

                favorite: newFavorite,

                recipe:
                    formatRecipe(
                        updatedRows[0]
                    ),

            });

        } catch (error) {

            console.error(
                "Favorite error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to update favorite",

                error: error.message,

            });
        }
    }
);

// ======================================================
// GET FAVORITES
//
// GET /favorites
// ======================================================

app.get("/favorites", async (req, res) => {

    try {

        const [rows] = await pool.query(
            `
            SELECT *
            FROM recipes
            WHERE favorite = TRUE
            ORDER BY id DESC
            `
        );

        const favorites =
            rows.map(formatRecipe);

        res.json({

            success: true,

            count: favorites.length,

            recipes: favorites,

        });

    } catch (error) {

        console.error(
            "GET /favorites error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load favorites",

            error: error.message,

        });
    }
});

// ======================================================
// GET SHOPPING LIST
//
// GET /shopping-list
// ======================================================

app.get(
    "/shopping-list",
    async (req, res) => {

        try {

            const [rows] =
                await pool.query(
                    `
                    SELECT *
                    FROM shopping_list
                    ORDER BY id DESC
                    `
                );

            res.json({

                success: true,

                count: rows.length,

                items:
                    rows.map(
                        formatShoppingItem
                    ),

            });

        } catch (error) {

            console.error(
                "GET /shopping-list error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to load shopping list",

                error: error.message,

            });
        }
    }
);

// ======================================================
// ADD SHOPPING ITEM
//
// POST /shopping-list
// ======================================================

app.post(
    "/shopping-list",
    async (req, res) => {

        try {

            const {

                name,

                amount = "",

            } = req.body;

            if (
                !name ||
                String(name).trim() === ""
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Item name is required",

                });
            }

            const [result] =
                await pool.query(
                    `
                    INSERT INTO shopping_list
                    (
                        name,
                        amount,
                        checked
                    )
                    VALUES (?, ?, ?)
                    `,
                    [

                        String(name).trim(),

                        amount,

                        false,

                    ]
                );

            const [rows] =
                await pool.query(
                    `
                    SELECT *
                    FROM shopping_list
                    WHERE id = ?
                    `,
                    [result.insertId]
                );

            res.status(201).json({

                success: true,

                message:
                    "Shopping item added",

                item:
                    formatShoppingItem(
                        rows[0]
                    ),

            });

        } catch (error) {

            console.error(
                "POST /shopping-list error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to add shopping item",

                error: error.message,

            });
        }
    }
);

// ======================================================
// UPDATE SHOPPING ITEM
//
// PUT /shopping-list/:id
// ======================================================

app.put(
    "/shopping-list/:id",
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);

            if (!Number.isInteger(id)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid shopping item ID",

                });
            }

            const [rows] =
                await pool.query(
                    `
                    SELECT *
                    FROM shopping_list
                    WHERE id = ?
                    `,
                    [id]
                );

            if (rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Shopping item not found",

                });
            }

            const oldItem =
                formatShoppingItem(
                    rows[0]
                );

            const name =
                req.body.name ??
                oldItem.name;

            const amount =
                req.body.amount ??
                oldItem.amount;

            const checked =
                req.body.checked ??
                oldItem.checked;

            await pool.query(
                `
                UPDATE shopping_list

                SET
                    name = ?,
                    amount = ?,
                    checked = ?

                WHERE id = ?
                `,
                [

                    name,

                    amount,

                    Boolean(checked),

                    id,

                ]
            );

            const [updatedRows] =
                await pool.query(
                    `
                    SELECT *
                    FROM shopping_list
                    WHERE id = ?
                    `,
                    [id]
                );

            res.json({

                success: true,

                message:
                    "Shopping item updated",

                item:
                    formatShoppingItem(
                        updatedRows[0]
                    ),

            });

        } catch (error) {

            console.error(
                "PUT /shopping-list/:id error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to update shopping item",

                error: error.message,

            });
        }
    }
);

// ======================================================
// DELETE SHOPPING ITEM
//
// DELETE /shopping-list/:id
// ======================================================

app.delete(
    "/shopping-list/:id",
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);

            if (!Number.isInteger(id)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid shopping item ID",

                });
            }

            const [rows] =
                await pool.query(
                    `
                    SELECT *
                    FROM shopping_list
                    WHERE id = ?
                    `,
                    [id]
                );

            if (rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Shopping item not found",

                });
            }

            const deletedItem =
                formatShoppingItem(
                    rows[0]
                );

            await pool.query(
                `
                DELETE FROM shopping_list
                WHERE id = ?
                `,
                [id]
            );

            res.json({

                success: true,

                message:
                    "Shopping item deleted",

                item: deletedItem,

            });

        } catch (error) {

            console.error(
                "DELETE /shopping-list/:id error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to delete shopping item",

                error: error.message,

            });
        }
    }
);

// ======================================================
// ADD RECIPE INGREDIENTS TO SHOPPING LIST
//
// POST /shopping-list/recipe/:id
// ======================================================

app.post(
    "/shopping-list/recipe/:id",
    async (req, res) => {

        try {

            const recipeId =
                Number(req.params.id);

            if (!Number.isInteger(recipeId)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid recipe ID",

                });
            }

            const [rows] =
                await pool.query(
                    `
                    SELECT *
                    FROM recipes
                    WHERE id = ?
                    `,
                    [recipeId]
                );

            if (rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Recipe not found",

                });
            }

            const recipe =
                formatRecipe(rows[0]);

            const ingredients =
                Array.isArray(
                    recipe.ingredients
                )
                    ? recipe.ingredients
                    : [];

            // ==================================================
            // ADD EACH INGREDIENT
            // ==================================================

            for (
                const ingredient
                of ingredients
            ) {

                await pool.query(
                    `
                    INSERT INTO shopping_list
                    (
                        name,
                        amount,
                        checked
                    )
                    VALUES (?, ?, ?)
                    `,
                    [

                        ingredient.name || "",

                        ingredient.amount || "",

                        false,

                    ]
                );
            }

            // ==================================================
            // GET SHOPPING LIST
            // ==================================================

            const [shoppingRows] =
                await pool.query(
                    `
                    SELECT *
                    FROM shopping_list
                    ORDER BY id DESC
                    `
                );

            res.json({

                success: true,

                message:
                    "Recipe ingredients added to shopping list",

                items:
                    shoppingRows.map(
                        formatShoppingItem
                    ),

            });

        } catch (error) {

            console.error(
                "Add recipe ingredients error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to add recipe ingredients",

                error: error.message,

            });
        }
    }
);

// ======================================================
// DELETE ALL SHOPPING ITEMS
//
// DELETE /shopping-list
// ======================================================

app.delete(
    "/shopping-list",
    async (req, res) => {

        try {

            await pool.query(
                "DELETE FROM shopping_list"
            );

            res.json({

                success: true,

                message:
                    "Shopping list cleared",

            });

        } catch (error) {

            console.error(
                "DELETE /shopping-list error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to clear shopping list",

                error: error.message,

            });
        }
    }
);

// ======================================================
// 404 HANDLER
// ======================================================

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message:
            "API endpoint not found",

        path: req.originalUrl,

    });
});

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use((error, req, res, next) => {

    console.error(
        "Unhandled server error:",
        error
    );

    res.status(500).json({

        success: false,

        message:
            "Internal server error",

        error: error.message,

    });
});

// ======================================================
// START SERVER
// ======================================================

async function startServer() {

    try {

        await initializeDatabase();

        app.listen(
            PORT,
            "0.0.0.0",
            () => {

                console.log("");
                console.log(
                    "===================================="
                );

                console.log(
                    "       RecipeBox API Server"
                );

                console.log(
                    "===================================="
                );

                console.log(
                    `Server running on port ${PORT}`
                );

                console.log(
                    `Local URL: http://localhost:${PORT}`
                );

                console.log(
                    `Health URL: http://localhost:${PORT}/health`
                );

                console.log(
                    `Recipes URL: http://localhost:${PORT}/recipes`
                );

                console.log(
                    "MySQL database enabled"
                );

                console.log(
                    "===================================="
                );

            }
        );

    } catch (error) {

        console.error("");
        console.error(
            "===================================="
        );

        console.error(
            "RecipeBox server failed to start"
        );

        console.error(
            "===================================="
        );

        console.error(
            error.message
        );

        console.error(
            "===================================="
        );

        process.exit(1);
    }
}

// ======================================================
// START
// ======================================================

startServer();
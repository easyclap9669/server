require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

// ================================
// CONFIG
// ================================
const PORT = process.env.PORT || 3000;
const RECIPES_FILE = path.join(__dirname, "recipes.json");

// ================================
// MIDDLEWARE
// ================================
app.use(cors());
app.use(express.json());

// ================================
// LOAD RECIPES
// ================================
function loadRecipes() {
    try {
        const file = fs.readFileSync(RECIPES_FILE, "utf8");
        const json = JSON.parse(file);

        // Support:
// {
//   "success": true,
//   "data": [...]
//
// OR
// [
//   {...},
//   {...}
// ]

        if (Array.isArray(json)) {
            return json;
        }

        if (Array.isArray(json.data)) {
            return json.data;
        }

        console.error("recipes.json does not contain a valid data array.");
        return [];
    } catch (error) {
        console.error("Failed to load recipes.json:", error.message);
        return [];
    }
}

// ================================
// HOME
// ================================
app.get("/", (req, res) => {
    const recipes = loadRecipes();

    res.json({
        success: true,
        server: "online",
        database: false,
        source: "recipes.json",
        message: "RecipeBox API is running",
        version: "1.0.0",
        recipeCount: recipes.length,
        endpoints: {
            allRecipes: "GET /recipes",
            recipeById: "GET /recipes/:id",
            search: "GET /recipes?q=chicken",
            tag: "GET /recipes?tag=dinner",
            tags: "GET /tags",
            health: "GET /health"
        }
    });
});

// ================================
// HEALTH
// ================================
app.get("/health", (req, res) => {
    const recipes = loadRecipes();

    res.json({
        success: true,
        server: "online",
        database: false,
        source: "recipes.json",
        recipes: recipes.length
    });
});

// ================================
// GET ALL RECIPES
// GET /recipes
// ================================
app.get("/recipes", (req, res) => {
    try {
        let recipes = loadRecipes();

        const { q, tag } = req.query;

        // ============================
        // SEARCH
        // /recipes?q=chicken
        // ============================
        if (q) {
            const search = q.toLowerCase().trim();

            recipes = recipes.filter((recipe) => {
                const title =
                    recipe.title?.toLowerCase() || "";

                const description =
                    recipe.description?.toLowerCase() || "";

                const recipeTags =
                    Array.isArray(recipe.tags)
                        ? recipe.tags.join(" ").toLowerCase()
                        : "";

                const ingredients =
                    Array.isArray(recipe.ingredients)
                        ? recipe.ingredients
                            .map((ingredient) => {
                                if (typeof ingredient === "string") {
                                    return ingredient;
                                }

                                return ingredient.name || "";
                            })
                            .join(" ")
                            .toLowerCase()
                        : "";

                return (
                    title.includes(search) ||
                    description.includes(search) ||
                    recipeTags.includes(search) ||
                    ingredients.includes(search)
                );
            });
        }

        // ============================
        // FILTER BY TAG
        // /recipes?tag=dinner
        // ============================
        if (tag) {
            const searchTag = tag.toLowerCase().trim();

            recipes = recipes.filter((recipe) => {
                return (
                    Array.isArray(recipe.tags) &&
                    recipe.tags.some(
                        (recipeTag) =>
                            String(recipeTag)
                                .toLowerCase()
                                .trim() === searchTag
                    )
                );
            });
        }

        res.json({
            success: true,
            count: recipes.length,
            data: recipes
        });

    } catch (error) {
        console.error("GET /recipes error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get recipes",
            error: error.message
        });
    }
});

// ================================
// GET RECIPE BY ID
// GET /recipes/1
// ================================
app.get("/recipes/:id", (req, res) => {
    try {
        const recipes = loadRecipes();
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Recipe ID must be a number"
            });
        }

        const recipe = recipes.find(
            (item) => Number(item.id) === id
        );

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: "Recipe not found",
                id
            });
        }

        res.json({
            success: true,
            data: recipe
        });

    } catch (error) {
        console.error("GET /recipes/:id error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get recipe",
            error: error.message
        });
    }
});

// ================================
// GET ALL TAGS
// GET /tags
// ================================
app.get("/tags", (req, res) => {
    try {
        const recipes = loadRecipes();

        const tagSet = new Set();

        recipes.forEach((recipe) => {
            if (Array.isArray(recipe.tags)) {
                recipe.tags.forEach((tag) => {
                    tagSet.add(String(tag));
                });
            }
        });

        const tags = [...tagSet].sort();

        res.json({
            success: true,
            count: tags.length,
            data: tags
        });

    } catch (error) {
        console.error("GET /tags error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get tags",
            error: error.message
        });
    }
});

// ================================
// 404
// ================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
        path: req.originalUrl
    });
});

// ================================
// ERROR HANDLER
// ================================
app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message
    });
});

// ================================
// START SERVER
// ================================
app.listen(PORT, "0.0.0.0", () => {
    console.log("=================================");
    console.log("RecipeBox API Server");
    console.log("=================================");
    console.log(`Server running on port ${PORT}`);
    console.log(`Recipes: http://localhost:${PORT}/recipes`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log("Data source: recipes.json");
    console.log("Database: NONE");
    console.log("=================================");
});
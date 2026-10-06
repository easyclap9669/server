require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

// ================================
// CONFIG
// ================================
const PORT = process.env.PORT || 3000;

// ================================
// MIDDLEWARE
// ================================
app.use(cors());
app.use(express.json());

// ================================
// LOAD RECIPES JSON
// ================================
let recipesData;

try {
    recipesData = require("./recipes.json");

    console.log("Recipes JSON loaded successfully.");
    console.log(`Total recipes: ${recipesData.data.length}`);
} catch (error) {
    console.error("Failed to load recipes.json:", error.message);

    recipesData = {
        success: false,
        data: []
    };
}

// ================================
// HOME
// ================================
app.get("/", (req, res) => {
    res.json({
        success: true,
        server: "online",
        message: "RecipeBox API is running",
        version: "1.0.0",
        endpoints: {
            allRecipes: "GET /recipes",
            recipeById: "GET /recipes/:id",
            search: "GET /recipes?q=chicken",
            tag: "GET /recipes?tag=dinner",
            health: "GET /health"
        }
    });
});

// ================================
// HEALTH CHECK
// ================================
app.get("/health", (req, res) => {
    res.json({
        success: true,
        server: "online",
        recipes: recipesData.data.length
    });
});

// ================================
// GET ALL RECIPES
// GET /recipes
// ================================
app.get("/recipes", (req, res) => {
    try {
        let recipes = [...recipesData.data];

        const { q, tag } = req.query;

        // ----------------------------
        // SEARCH
        // /recipes?q=chicken
        // ----------------------------
        if (q) {
            const search = q.toLowerCase().trim();

            recipes = recipes.filter((recipe) => {
                const title = recipe.title?.toLowerCase() || "";
                const description = recipe.description?.toLowerCase() || "";

                const recipeTags = Array.isArray(recipe.tags)
                    ? recipe.tags.join(" ").toLowerCase()
                    : "";

                const ingredients = Array.isArray(recipe.ingredients)
                    ? recipe.ingredients
                        .map((ingredient) => ingredient.name)
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

        // ----------------------------
        // FILTER BY TAG
        // /recipes?tag=Dinner
        // ----------------------------
        if (tag) {
            const searchTag = tag.toLowerCase().trim();

            recipes = recipes.filter((recipe) => {
                return Array.isArray(recipe.tags) &&
                    recipe.tags.some(
                        (recipeTag) =>
                            recipeTag.toLowerCase() === searchTag
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
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Recipe ID must be a number"
            });
        }

        const recipe = recipesData.data.find(
            (item) => item.id === id
        );

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: "Recipe not found",
                id: id
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
        const tags = [];

        recipesData.data.forEach((recipe) => {
            if (Array.isArray(recipe.tags)) {
                recipe.tags.forEach((tag) => {
                    if (!tags.includes(tag)) {
                        tags.push(tag);
                    }
                });
            }
        });

        tags.sort();

        res.json({
            success: true,
            count: tags.length,
            data: tags
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to get tags",
            error: error.message
        });
    }
});

// ================================
// 404 ROUTE
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
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Recipes: http://localhost:${PORT}/recipes`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log("=================================");
});
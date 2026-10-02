const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

// Render provides PORT automatically
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, "recipes.json");

app.use(cors());
app.use(express.json());


// ======================================================
// READ RECIPES
// ======================================================

function readRecipes() {
    try {
        const data = fs.readFileSync(DATA_FILE, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading recipes.json:", error);

        return {
            recipes: []
        };
    }
}


// ======================================================
// WRITE RECIPES
// ======================================================

function writeRecipes(data) {
    try {
        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(data, null, 2),
            "utf8"
        );

        return true;
    } catch (error) {
        console.error("Error writing recipes.json:", error);
        return false;
    }
}


// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "RecipeBox API is running",
        version: "1.0.0"
    });
});


// ======================================================
// GET RECIPES
// ======================================================

app.get("/recipes", (req, res) => {

    const data = readRecipes();

    let recipes = data.recipes || [];

    const search = req.query.q;
    const tag = req.query.tag;

    // Search
    if (search) {

        const searchText = search.toLowerCase();

        recipes = recipes.filter(recipe =>
            String(recipe.title || "")
                .toLowerCase()
                .includes(searchText) ||

            String(recipe.description || "")
                .toLowerCase()
                .includes(searchText)
        );
    }

    // Tag filter
    if (tag) {

        const tagText = tag.toLowerCase();

        recipes = recipes.filter(recipe =>
            Array.isArray(recipe.tags) &&
            recipe.tags.some(recipeTag =>
                String(recipeTag)
                    .toLowerCase() === tagText
            )
        );
    }

    res.json({
        success: true,
        count: recipes.length,
        recipes: recipes
    });
});


// ======================================================
// GET RECIPE BY ID
// ======================================================

app.get("/recipes/:id", (req, res) => {

    const data = readRecipes();

    const id = Number(req.params.id);

    const recipe = (data.recipes || []).find(
        recipe => recipe.id === id
    );

    if (!recipe) {
        return res.status(404).json({
            success: false,
            message: "Recipe not found"
        });
    }

    res.json({
        success: true,
        recipe: recipe
    });
});


// ======================================================
// CREATE RECIPE
// ======================================================

app.post("/recipes", (req, res) => {

    const data = readRecipes();

    const recipes = data.recipes || [];

    const newRecipe = req.body;

    if (!newRecipe.title) {
        return res.status(400).json({
            success: false,
            message: "Recipe title is required"
        });
    }

    const newId =
        recipes.length > 0
            ? Math.max(...recipes.map(recipe => recipe.id)) + 1
            : 1;

    const recipe = {
        id: newId,
        title: newRecipe.title,
        description: newRecipe.description || "",
        imageUrl: newRecipe.imageUrl || "",
        servings: newRecipe.servings || 1,
        cookingTime: newRecipe.cookingTime || 0,
        tags: newRecipe.tags || [],
        ingredients: newRecipe.ingredients || [],
        steps: newRecipe.steps || [],
        favorite: false
    };

    recipes.push(recipe);

    data.recipes = recipes;

    writeRecipes(data);

    res.status(201).json({
        success: true,
        message: "Recipe created successfully",
        recipe: recipe
    });
});


// ======================================================
// UPDATE RECIPE
// ======================================================

app.put("/recipes/:id", (req, res) => {

    const data = readRecipes();

    const id = Number(req.params.id);

    const recipes = data.recipes || [];

    const index = recipes.findIndex(
        recipe => recipe.id === id
    );

    if (index === -1) {
        return res.status(404).json({
            success: false,
            message: "Recipe not found"
        });
    }

    recipes[index] = {
        ...recipes[index],
        ...req.body,
        id: id
    };

    data.recipes = recipes;

    writeRecipes(data);

    res.json({
        success: true,
        message: "Recipe updated successfully",
        recipe: recipes[index]
    });
});


// ======================================================
// DELETE RECIPE
// ======================================================

app.delete("/recipes/:id", (req, res) => {

    const data = readRecipes();

    const id = Number(req.params.id);

    const recipes = data.recipes || [];

    const index = recipes.findIndex(
        recipe => recipe.id === id
    );

    if (index === -1) {
        return res.status(404).json({
            success: false,
            message: "Recipe not found"
        });
    }

    const deletedRecipe = recipes[index];

    recipes.splice(index, 1);

    data.recipes = recipes;

    writeRecipes(data);

    res.json({
        success: true,
        message: "Recipe deleted successfully",
        recipe: deletedRecipe
    });
});


// ======================================================
// FAVORITE
// ======================================================

app.post("/recipes/:id/favorite", (req, res) => {

    const data = readRecipes();

    const id = Number(req.params.id);

    const recipes = data.recipes || [];

    const recipe = recipes.find(
        recipe => recipe.id === id
    );

    if (!recipe) {
        return res.status(404).json({
            success: false,
            message: "Recipe not found"
        });
    }

    recipe.favorite = !recipe.favorite;

    data.recipes = recipes;

    writeRecipes(data);

    res.json({
        success: true,
        favorite: recipe.favorite,
        recipe: recipe
    });
});


// ======================================================
// FAVORITES
// ======================================================

app.get("/favorites", (req, res) => {

    const data = readRecipes();

    const favorites = (data.recipes || []).filter(
        recipe => recipe.favorite === true
    );

    res.json({
        success: true,
        count: favorites.length,
        recipes: favorites
    });
});


// ======================================================
// SHOPPING LIST
// ======================================================

let shoppingList = [];


// GET SHOPPING LIST

app.get("/shopping-list", (req, res) => {

    res.json({
        success: true,
        count: shoppingList.length,
        items: shoppingList
    });
});


// ADD SHOPPING ITEM

app.post("/shopping-list", (req, res) => {

    const item = req.body;

    if (!item.name) {
        return res.status(400).json({
            success: false,
            message: "Item name is required"
        });
    }

    const newItem = {
        id:
            shoppingList.length > 0
                ? Math.max(
                    ...shoppingList.map(item => item.id)
                ) + 1
                : 1,

        name: item.name,

        amount: item.amount || "",

        checked: false
    };

    shoppingList.push(newItem);

    res.status(201).json({
        success: true,
        message: "Shopping item added",
        item: newItem
    });
});


// UPDATE SHOPPING ITEM

app.put("/shopping-list/:id", (req, res) => {

    const id = Number(req.params.id);

    const index = shoppingList.findIndex(
        item => item.id === id
    );

    if (index === -1) {
        return res.status(404).json({
            success: false,
            message: "Shopping item not found"
        });
    }

    shoppingList[index] = {
        ...shoppingList[index],
        ...req.body,
        id: id
    };

    res.json({
        success: true,
        item: shoppingList[index]
    });
});


// DELETE SHOPPING ITEM

app.delete("/shopping-list/:id", (req, res) => {

    const id = Number(req.params.id);

    const index = shoppingList.findIndex(
        item => item.id === id
    );

    if (index === -1) {
        return res.status(404).json({
            success: false,
            message: "Shopping item not found"
        });
    }

    const deletedItem = shoppingList[index];

    shoppingList.splice(index, 1);

    res.json({
        success: true,
        message: "Shopping item deleted",
        item: deletedItem
    });
});


// ======================================================
// ADD RECIPE INGREDIENTS TO SHOPPING LIST
// ======================================================

app.post("/shopping-list/recipe/:id", (req, res) => {

    const data = readRecipes();

    const id = Number(req.params.id);

    const recipe = (data.recipes || []).find(
        recipe => recipe.id === id
    );

    if (!recipe) {
        return res.status(404).json({
            success: false,
            message: "Recipe not found"
        });
    }

    const ingredients = recipe.ingredients || [];

    ingredients.forEach(ingredient => {

        const newItem = {
            id:
                shoppingList.length > 0
                    ? Math.max(
                        ...shoppingList.map(item => item.id)
                    ) + 1
                    : 1,

            name: ingredient.name || "",

            amount: ingredient.amount || "",

            checked: false
        };

        shoppingList.push(newItem);
    });

    res.json({
        success: true,
        message: "Recipe ingredients added to shopping list",
        items: shoppingList
    });
});


// ======================================================
// 404
// ======================================================

app.use((req, res) => {

    res.status(404).json({
        success: false,
        message: "API endpoint not found",
        path: req.originalUrl
    });
});


// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, "0.0.0.0", () => {

    console.log("====================================");
    console.log("       RecipeBox API Server");
    console.log("====================================");
    console.log(`Server running on port ${PORT}`);
    console.log("====================================");
});
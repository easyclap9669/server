
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

// =====================================================
// CONFIGURATION
// =====================================================

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "recipebox.json");

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// =====================================================
// INITIAL RECIPES
// =====================================================

const initialRecipes = [
  {
    id: 1,
    title: "Chicken Fried Rice",
    description: "A delicious and easy chicken fried rice recipe.",
    imageUrl: "https://nourishingniki.com/wp-content/uploads/2024/08/shrimp-and-chicken-fried-rice-3-scaled.jpg",
    servings: 2,
    cookingTime: 25,
    tags: ["chicken", "rice", "quick", "asian"],
    ingredients: [
      { id: 1, name: "Chicken breast", amount: "200g" },
      { id: 2, name: "Cooked rice", amount: "2 cups" },
      { id: 3, name: "Eggs", amount: "2" },
      { id: 4, name: "Soy sauce", amount: "2 tbsp" },
      { id: 5, name: "Cooking oil", amount: "1 tbsp" },
      { id: 6, name: "Garlic", amount: "2 cloves" }
    ],
    steps: [
      { id: 1, description: "Cut the chicken into small pieces." },
      { id: 2, description: "Heat oil in a large pan." },
      { id: 3, description: "Cook the chicken until fully cooked." },
      { id: 4, description: "Add garlic and cook for 30 seconds." },
      { id: 5, description: "Add the cooked rice and stir well." },
      { id: 6, description: "Add eggs and mix everything together." },
      { id: 7, description: "Add soy sauce and stir-fry for several minutes." },
      { id: 8, description: "Serve hot." }
    ],
    favorite: false
  },
  {
    id: 2,
    title: "Spaghetti Carbonara",
    description: "Creamy Italian-style spaghetti carbonara.",
    imageUrl: "https://images.unsplash.com/photo-1612874742237-6526221588e3",
    servings: 2,
    cookingTime: 20,
    tags: ["pasta", "italian", "quick"],
    ingredients: [
      { id: 1, name: "Spaghetti", amount: "200g" },
      { id: 2, name: "Eggs", amount: "2" },
      { id: 3, name: "Parmesan cheese", amount: "50g" },
      { id: 4, name: "Bacon", amount: "100g" },
      { id: 5, name: "Black pepper", amount: "1 tsp" }
    ],
    steps: [
      { id: 1, description: "Cook spaghetti according to package instructions." },
      { id: 2, description: "Cook bacon in a pan until crispy." },
      { id: 3, description: "Mix eggs and Parmesan cheese in a bowl." },
      { id: 4, description: "Drain spaghetti, reserving some pasta water." },
      { id: 5, description: "Mix hot spaghetti with bacon." },
      { id: 6, description: "Remove from heat and add the egg mixture." },
      { id: 7, description: "Add pasta water if needed and mix until creamy." },
      { id: 8, description: "Add black pepper and serve." }
    ],
    favorite: false
  },
  {
    id: 3,
    title: "Beef Burger",
    description: "Juicy homemade beef burger with fresh vegetables.",
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
    servings: 2,
    cookingTime: 30,
    tags: ["beef", "burger", "american"],
    ingredients: [
      { id: 1, name: "Ground beef", amount: "300g" },
      { id: 2, name: "Burger buns", amount: "2" },
      { id: 3, name: "Cheese", amount: "2 slices" },
      { id: 4, name: "Lettuce", amount: "2 leaves" },
      { id: 5, name: "Tomato", amount: "1" },
      { id: 6, name: "Salt", amount: "1 tsp" },
      { id: 7, name: "Black pepper", amount: "1/2 tsp" }
    ],
    steps: [
      { id: 1, description: "Form ground beef into burger patties." },
      { id: 2, description: "Season both sides with salt and pepper." },
      { id: 3, description: "Heat a pan or grill." },
      { id: 4, description: "Cook patties until fully cooked." },
      { id: 5, description: "Add cheese during the final minute." },
      { id: 6, description: "Toast the burger buns." },
      { id: 7, description: "Add lettuce and tomato." },
      { id: 8, description: "Place the patty inside the bun and serve." }
    ],
    favorite: false
  }
];

// =====================================================
// PERSISTENT JSON STORAGE
// =====================================================

let recipes = [];
let shoppingList = [];
let feedbackItems = [];
let reviews = [];
let nextFeedbackId = 1;
let nextReviewId = 1;

function normalizeState(data) {
  return {
    recipes: Array.isArray(data.recipes)
      ? data.recipes
      : JSON.parse(JSON.stringify(initialRecipes)),
    shoppingList: Array.isArray(data.shoppingList)
      ? data.shoppingList
      : [],
    feedback: Array.isArray(data.feedback) ? data.feedback : [],
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
    nextFeedbackId: Number(data.nextFeedbackId) || 1,
    nextReviewId: Number(data.nextReviewId) || 1
  };
}

function loadData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(DATA_FILE)) {
    recipes = JSON.parse(JSON.stringify(initialRecipes));
    shoppingList = [];
    feedbackItems = [];
    reviews = [];
    saveData();
    console.log("Created initial RecipeBox data.");
    return;
  }

  const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  const data = normalizeState(parsed);

  recipes = data.recipes;
  shoppingList = data.shoppingList;
  feedbackItems = data.feedback;
  reviews = data.reviews;
  nextFeedbackId = data.nextFeedbackId;
  nextReviewId = data.nextReviewId;

  console.log(`Loaded ${recipes.length} recipes.`);
  console.log(`Loaded ${reviews.length} reviews.`);
}

function saveData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const data = {
    recipes,
    shoppingList,
    feedback: feedbackItems,
    reviews,
    nextFeedbackId,
    nextReviewId
  };

  const tempFile = `${DATA_FILE}.tmp`;

  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempFile, DATA_FILE);
}

function persist(res, statusCode, payload) {
  try {
    saveData();
    return res.status(statusCode).json(payload);
  } catch (error) {
    console.error("Storage write failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not save data. Check storage permissions."
    });
  }
}

// =====================================================
// HELPERS
// =====================================================

function cleanText(value, maxLength = 5000) {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function validId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function nextRecipeId() {
  return recipes.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function nextShoppingId() {
  return shoppingList.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];

  return [...new Set(
    tags
      .filter(tag => typeof tag === "string")
      .map(tag => tag.trim().slice(0, 50))
      .filter(Boolean)
  )].slice(0, 30);
}

function normalizeIngredients(items) {
  if (!Array.isArray(items)) return [];

  return items.slice(0, 200)
    .map((item, index) => ({
      id: index + 1,
      name: cleanText(item?.name, 150),
      amount: cleanText(item?.amount, 100)
    }))
    .filter(item => item.name);
}

function normalizeSteps(items) {
  if (!Array.isArray(items)) return [];

  return items.slice(0, 200)
    .map((item, index) => ({
      id: index + 1,
      description: cleanText(item?.description, 2000)
    }))
    .filter(item => item.description);
}

function normalizeRecipeInput(body, oldRecipe = {}) {
  const title = body.title === undefined
    ? oldRecipe.title || ""
    : cleanText(body.title, 150);

  if (!title) throw new Error("Recipe title is required.");

  const servings = body.servings === undefined
    ? oldRecipe.servings ?? 1
    : Number(body.servings);

  const cookingTime = body.cookingTime === undefined
    ? oldRecipe.cookingTime ?? 0
    : Number(body.cookingTime);

  if (!Number.isInteger(servings) || servings < 1 || servings > 1000) {
    throw new Error("Servings must be between 1 and 1000.");
  }

  if (!Number.isInteger(cookingTime) || cookingTime < 0 || cookingTime > 100000) {
    throw new Error("Cooking time must be a non-negative integer.");
  }

  const imageUrl = body.imageUrl === undefined
    ? oldRecipe.imageUrl || ""
    : cleanText(body.imageUrl, 2048);

  if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) {
    throw new Error("Image URL must start with http:// or https://.");
  }

  return {
    title,
    description: body.description === undefined
      ? oldRecipe.description || ""
      : cleanText(body.description, 5000),
    imageUrl,
    servings,
    cookingTime,
    tags: body.tags === undefined ? oldRecipe.tags || [] : normalizeTags(body.tags),
    ingredients: body.ingredients === undefined
      ? oldRecipe.ingredients || []
      : normalizeIngredients(body.ingredients),
    steps: body.steps === undefined ? oldRecipe.steps || [] : normalizeSteps(body.steps)
  };
}

function getRecipeRating(recipeId) {
  const recipeReviews = reviews.filter(review => review.recipeId === recipeId);
  const total = recipeReviews.reduce((sum, review) => sum + review.rating, 0);

  return {
    averageRating: recipeReviews.length
      ? Number((total / recipeReviews.length).toFixed(1))
      : 0,
    reviewCount: recipeReviews.length
  };
}

function recipeWithRating(recipe) {
  return { ...recipe, ...getRecipeRating(recipe.id) };
}

function findRecipe(req, res, next) {
  const id = validId(req.params.id);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Invalid recipe ID."
    });
  }

  const recipe = recipes.find(item => Number(item.id) === id);

  if (!recipe) {
    return res.status(404).json({
      success: false,
      message: "Recipe not found."
    });
  }

  req.recipe = recipe;
  next();
}

// =====================================================
// API HOME AND HEALTH
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "RecipeBox API is running",
    version: "3.0.0",
    storage: "JSON file",
    endpoints: {
      health: "/health",
      recipes: "/recipes",
      recipe: "/recipes/:id",
      favorites: "/favorites",
      favorite: "/recipes/:id/favorite",
      reviews: "/recipes/:id/reviews",
      shoppingList: "/shopping-list",
      recipeIngredients: "/shopping-list/recipe/:id",
      feedback: "/feedback"
    }
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    recipes: recipes.length,
    shoppingItems: shoppingList.length,
    reviews: reviews.length
  });
});

// =====================================================
// RECIPES: SEARCH, FILTER, READ, CREATE, UPDATE, DELETE
// =====================================================

app.get("/recipes", (req, res) => {
  const q = cleanText(req.query.q, 150).toLowerCase();
  const tag = cleanText(req.query.tag, 50).toLowerCase();

  const result = recipes.filter(recipe => {
    const ingredients = (recipe.ingredients || [])
      .map(item => `${item.name} ${item.amount}`)
      .join(" ")
      .toLowerCase();

    const matchesQuery = !q || [
      recipe.title,
      recipe.description,
      ...(recipe.tags || []),
      ingredients
    ].some(value => String(value || "").toLowerCase().includes(q));

    const matchesTag = !tag ||
      (recipe.tags || []).some(item => item.toLowerCase() === tag);

    return matchesQuery && matchesTag;
  });

  res.json({
    success: true,
    count: result.length,
    recipes: result.map(recipeWithRating)
  });
});

app.get("/recipes/:id", findRecipe, (req, res) => {
  res.json({
    success: true,
    recipe: recipeWithRating(req.recipe)
  });
});

app.post("/recipes", (req, res) => {
  try {
    const input = normalizeRecipeInput(req.body);
    const now = new Date().toISOString();

    const recipe = {
      id: nextRecipeId(),
      ...input,
      favorite: false,
      createdAt: now,
      updatedAt: now
    };

    recipes.push(recipe);

    return persist(res, 201, {
      success: true,
      message: "Recipe created successfully.",
      recipe: recipeWithRating(recipe)
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.put("/recipes/:id", findRecipe, (req, res) => {
  try {
    const old = req.recipe;
    const input = normalizeRecipeInput(req.body, old);

    const updated = {
      ...old,
      ...input,
      id: old.id,
      favorite: old.favorite === true,
      createdAt: old.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    recipes = recipes.map(item => item.id === old.id ? updated : item);

    return persist(res, 200, {
      success: true,
      message: "Recipe updated successfully.",
      recipe: recipeWithRating(updated)
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.delete("/recipes/:id", findRecipe, (req, res) => {
  const recipe = req.recipe;

  recipes = recipes.filter(item => item.id !== recipe.id);
  reviews = reviews.filter(item => item.recipeId !== recipe.id);
  shoppingList = shoppingList.filter(item => item.recipeId !== recipe.id);

  return persist(res, 200, {
    success: true,
    message: "Recipe and its reviews deleted.",
    recipe
  });
});

// =====================================================
// FAVORITES
// =====================================================

app.get("/favorites", (req, res) => {
  const favorites = recipes
    .filter(recipe => recipe.favorite === true)
    .map(recipeWithRating);

  res.json({ success: true, count: favorites.length, recipes: favorites });
});

app.put("/recipes/:id/favorite", findRecipe, (req, res) => {
  req.recipe.favorite = !req.recipe.favorite;

  return persist(res, 200, {
    success: true,
    favorite: req.recipe.favorite,
    recipe: recipeWithRating(req.recipe)
  });
});

app.patch("/recipes/:id/favorite", findRecipe, (req, res) => {
  if (typeof req.body.favorite !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "Provide favorite as true or false."
    });
  }

  req.recipe.favorite = req.body.favorite;

  return persist(res, 200, {
    success: true,
    favorite: req.recipe.favorite,
    recipe: recipeWithRating(req.recipe)
  });
});

// =====================================================
// COMMENTS AND STAR RATINGS
// =====================================================

// GET /recipes/1/reviews
app.get("/recipes/:id/reviews", findRecipe, (req, res) => {
  const items = reviews
    .filter(review => review.recipeId === req.recipe.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    recipeId: req.recipe.id,
    ...getRecipeRating(req.recipe.id),
    count: items.length,
    reviews: items
  });
});

// POST /recipes/1/reviews
// Body: { "name": "Alex", "rating": 5, "comment": "Great recipe!" }
app.post("/recipes/:id/reviews", findRecipe, (req, res) => {
  const name = cleanText(req.body.name, 80) || "Anonymous";
  const comment = cleanText(req.body.comment, 2000);
  const rating = Number(req.body.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: "Rating must be an integer from 1 to 5."
    });
  }

  if (!comment) {
    return res.status(400).json({
      success: false,
      message: "Comment is required."
    });
  }

  const review = {
    id: nextReviewId++,
    recipeId: req.recipe.id,
    name,
    rating,
    comment,
    createdAt: new Date().toISOString()
  };

  reviews.push(review);

  return persist(res, 201, {
    success: true,
    message: "Your rating and comment have been saved.",
    review,
    ...getRecipeRating(req.recipe.id)
  });
});

// DELETE /reviews/1
// Note: protect this endpoint with authentication before public deployment.
app.delete("/reviews/:reviewId", (req, res) => {
  const id = validId(req.params.reviewId);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Invalid review ID."
    });
  }

  const index = reviews.findIndex(review => review.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Review not found."
    });
  }

  const [review] = reviews.splice(index, 1);

  return persist(res, 200, {
    success: true,
    message: "Review deleted.",
    review,
    ...getRecipeRating(review.recipeId)
  });
});

// =====================================================
// SHOPPING LIST
// =====================================================

app.get("/shopping-list", (req, res) => {
  res.json({
    success: true,
    count: shoppingList.length,
    items: shoppingList
  });
});

app.post("/shopping-list", (req, res) => {
  const name = cleanText(req.body.name, 150);
  const amount = cleanText(req.body.amount, 100);

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Item name is required."
    });
  }

  const existing = shoppingList.find(item =>
    item.name.toLowerCase() === name.toLowerCase() &&
    item.amount === amount
  );

  if (existing) {
    return res.status(200).json({
      success: true,
      message: "This item is already on your shopping list.",
      item: existing
    });
  }

  const item = {
    id: nextShoppingId(),
    name,
    amount,
    checked: false,
    createdAt: new Date().toISOString()
  };

  shoppingList.push(item);

  return persist(res, 201, {
    success: true,
    message: "Shopping item added.",
    item
  });
});

app.put("/shopping-list/:id", (req, res) => {
  const id = validId(req.params.id);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Invalid shopping item ID."
    });
  }

  const item = shoppingList.find(entry => entry.id === id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Shopping item not found."
    });
  }

  const { name, amount, checked } = req.body;

  if (name !== undefined) {
    const cleanName = cleanText(name, 150);

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: "Item name cannot be empty."
      });
    }

    item.name = cleanName;
  }

  if (amount !== undefined) item.amount = cleanText(amount, 100);

  if (checked !== undefined) {
    if (typeof checked !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "checked must be true or false."
      });
    }

    item.checked = checked;
  }

  return persist(res, 200, {
    success: true,
    message: "Shopping item updated.",
    item
  });
});

app.delete("/shopping-list/:id", (req, res) => {
  const id = validId(req.params.id);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Invalid shopping item ID."
    });
  }

  const index = shoppingList.findIndex(item => item.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Shopping item not found."
    });
  }

  const [item] = shoppingList.splice(index, 1);

  return persist(res, 200, {
    success: true,
    message: "Shopping item deleted.",
    item
  });
});

// POST /shopping-list/recipe/1
app.post("/shopping-list/recipe/:id", findRecipe, (req, res) => {
  const added = [];

  for (const ingredient of req.recipe.ingredients || []) {
    if (!ingredient.name) continue;

    const exists = shoppingList.some(item =>
      item.recipeId === req.recipe.id &&
      item.name.toLowerCase() === ingredient.name.toLowerCase() &&
      item.amount === (ingredient.amount || "")
    );

    if (exists) continue;

    const item = {
      id: nextShoppingId(),
      name: ingredient.name,
      amount: ingredient.amount || "",
      checked: false,
      recipeId: req.recipe.id,
      createdAt: new Date().toISOString()
    };

    shoppingList.push(item);
    added.push(item);
  }

  return persist(res, 201, {
    success: true,
    message: `${added.length} ingredient(s) added to shopping list.`,
    recipeId: req.recipe.id,
    count: shoppingList.length,
    items: shoppingList,
    added
  });
});

// =====================================================
// FEEDBACK
// =====================================================

app.post("/feedback", (req, res) => {
  const message = cleanText(req.body.message, 5000);

  if (!message) {
    return res.status(400).json({
      success: false,
      message: "Feedback message is required."
    });
  }

  const feedback = {
    id: nextFeedbackId++,
    message,
    app: cleanText(req.body.app, 100) || "RecipeBox",
    platform: cleanText(req.body.platform, 100) || "Android",
    createdAt: new Date().toISOString()
  };

  feedbackItems.push(feedback);

  return persist(res, 201, {
    success: true,
    message: "Thank you! Your feedback has been submitted.",
    feedback: {
      id: feedback.id,
      createdAt: feedback.createdAt
    }
  });
});

// GET /admin/feedback
app.get("/admin/feedback", (req, res) => {
  const adminKey = process.env.ADMIN_KEY;

  if (!adminKey || req.get("x-admin-key") !== adminKey) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized."
    });
  }

  res.json({
    success: true,
    count: feedbackItems.length,
    feedback: feedbackItems
  });
});

// =====================================================
// 404 AND ERROR HANDLING
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found.",
    path: req.originalUrl
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  console.error("Request error:", error.message);

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body."
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error."
  });
});

// =====================================================
// START SERVER
// =====================================================

try {
  loadData();

  app.listen(PORT, "0.0.0.0", () => {
    console.log("=================================");
    console.log("RecipeBox API v3.0.0");
    console.log(`Port: ${PORT}`);
    console.log(`Storage: ${DATA_FILE}`);
    console.log(`Recipes: ${recipes.length}`);
    console.log(`Reviews: ${reviews.length}`);
    console.log("Comments and ratings enabled.");
    console.log("=================================");
  });
} catch (error) {
  console.error("Failed to start RecipeBox API:", error.message);
  process.exit(1);
}

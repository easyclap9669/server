require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

// ========================================
// CONFIG
// ========================================
const PORT = process.env.PORT || 3000;

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors());
app.use(express.json());

// ========================================
// RECIPE DATA
// Everything is inside server.js
// ========================================
let recipes = [
  {
    id: 1,
    title: "Chicken Fried Rice",
    description: "A delicious and easy chicken fried rice recipe.",
    imageUrl:
      "https://nourishingniki.com/wp-content/uploads/2024/08/shrimp-and-chicken-fried-rice-3-scaled.jpg",
    servings: 2,
    cookingTime: 25,
    tags: ["chicken", "rice", "quick", "asian"],
    ingredients: [
      {
        id: 1,
        name: "Chicken breast",
        amount: "200g"
      },
      {
        id: 2,
        name: "Cooked rice",
        amount: "2 cups"
      },
      {
        id: 3,
        name: "Eggs",
        amount: "2"
      },
      {
        id: 4,
        name: "Soy sauce",
        amount: "2 tbsp"
      },
      {
        id: 5,
        name: "Cooking oil",
        amount: "1 tbsp"
      },
      {
        id: 6,
        name: "Garlic",
        amount: "2 cloves"
      }
    ],
    steps: [
      {
        id: 1,
        description: "Cut the chicken into small pieces."
      },
      {
        id: 2,
        description: "Heat oil in a large pan."
      },
      {
        id: 3,
        description: "Cook the chicken until fully cooked."
      },
      {
        id: 4,
        description: "Add garlic and cook for 30 seconds."
      },
      {
        id: 5,
        description: "Add the cooked rice and stir well."
      },
      {
        id: 6,
        description: "Add the eggs and mix everything together."
      },
      {
        id: 7,
        description: "Add soy sauce and stir-fry for several minutes."
      },
      {
        id: 8,
        description: "Serve hot."
      }
    ],
    favorite: false
  },

  {
    id: 2,
    title: "Spaghetti Carbonara",
    description: "Creamy Italian-style spaghetti carbonara.",
    imageUrl:
      "https://images.unsplash.com/photo-1612874742237-6526221588e3",
    servings: 2,
    cookingTime: 20,
    tags: ["pasta", "italian", "quick"],
    ingredients: [
      {
        id: 1,
        name: "Spaghetti",
        amount: "200g"
      },
      {
        id: 2,
        name: "Eggs",
        amount: "2"
      },
      {
        id: 3,
        name: "Parmesan cheese",
        amount: "50g"
      },
      {
        id: 4,
        name: "Bacon",
        amount: "100g"
      },
      {
        id: 5,
        name: "Black pepper",
        amount: "1 tsp"
      }
    ],
    steps: [
      {
        id: 1,
        description: "Cook the spaghetti according to the package instructions."
      },
      {
        id: 2,
        description: "Cook the bacon in a pan until crispy."
      },
      {
        id: 3,
        description: "Mix eggs and Parmesan cheese in a bowl."
      },
      {
        id: 4,
        description: "Drain the spaghetti and keep some pasta water."
      },
      {
        id: 5,
        description: "Mix the hot spaghetti with the bacon."
      },
      {
        id: 6,
        description: "Remove from heat and add the egg mixture."
      },
      {
        id: 7,
        description: "Add pasta water if needed and mix until creamy."
      },
      {
        id: 8,
        description: "Add black pepper and serve."
      }
    ],
    favorite: false
  },

  {
    id: 3,
    title: "Beef Burger",
    description: "Juicy homemade beef burger with fresh vegetables.",
    imageUrl:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
    servings: 2,
    cookingTime: 30,
    tags: ["beef", "burger", "american"],
    ingredients: [
      {
        id: 1,
        name: "Ground beef",
        amount: "300g"
      },
      {
        id: 2,
        name: "Burger buns",
        amount: "2"
      },
      {
        id: 3,
        name: "Cheese",
        amount: "2 slices"
      },
      {
        id: 4,
        name: "Lettuce",
        amount: "2 leaves"
      },
      {
        id: 5,
        name: "Tomato",
        amount: "1"
      },
      {
        id: 6,
        name: "Salt",
        amount: "1 tsp"
      },
      {
        id: 7,
        name: "Black pepper",
        amount: "1/2 tsp"
      }
    ],
    steps: [
      {
        id: 1,
        description: "Form the ground beef into burger patties."
      },
      {
        id: 2,
        description: "Season both sides with salt and pepper."
      },
      {
        id: 3,
        description: "Heat a pan or grill."
      },
      {
        id: 4,
        description: "Cook the patties until fully cooked."
      },
      {
        id: 5,
        description: "Add cheese during the final minute."
      },
      {
        id: 6,
        description: "Toast the burger buns."
      },
      {
        id: 7,
        description: "Add lettuce and tomato."
      },
      {
        id: 8,
        description: "Place the burger patty inside the bun and serve."
      }
    ],
    favorite: false
  }
];

// ========================================
// HELPER
// ========================================

function nextRecipeId() {
  if (recipes.length === 0) {
    return 1;
  }

  return Math.max(...recipes.map(recipe => recipe.id)) + 1;
}

// ========================================
// HOME
// ========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "RecipeBox API is running",
    version: "1.0.0",
    database: false,
    storage: "server.js",
    endpoints: {
      recipes: "/recipes",
      recipeById: "/recipes/:id",
      favorites: "/recipes/:id/favorite",
      shoppingList: "/shopping-list"
    }
  });
});

// ========================================
// GET ALL RECIPES
// GET /recipes
// GET /recipes?q=chicken
// GET /recipes?tag=rice
// ========================================

app.get("/recipes", (req, res) => {
  const { q, tag } = req.query;

  let result = [...recipes];

  // Search
  if (q) {
    const search = q.toLowerCase();

    result = result.filter(recipe => {
      return (
        recipe.title.toLowerCase().includes(search) ||
        recipe.description.toLowerCase().includes(search) ||
        recipe.tags.some(tag =>
          tag.toLowerCase().includes(search)
        )
      );
    });
  }

  // Tag filter
  if (tag) {
    const selectedTag = tag.toLowerCase();

    result = result.filter(recipe =>
      recipe.tags.some(
        recipeTag => recipeTag.toLowerCase() === selectedTag
      )
    );
  }

  res.json({
    success: true,
    count: result.length,
    recipes: result
  });
});

// ========================================
// GET SINGLE RECIPE
// GET /recipes/1
// ========================================

app.get("/recipes/:id", (req, res) => {
  const id = Number(req.params.id);

  const recipe = recipes.find(recipe => recipe.id === id);

  if (!recipe) {
    return res.status(404).json({
      success: false,
      message: "Recipe not found"
    });
  }

  res.json({
    success: true,
    recipe
  });
});

// ========================================
// CREATE RECIPE
// POST /recipes
// ========================================

app.post("/recipes", (req, res) => {
  const {
    title,
    description,
    imageUrl,
    servings,
    cookingTime,
    tags,
    ingredients,
    steps
  } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      message: "Title is required"
    });
  }

  const newRecipe = {
    id: nextRecipeId(),
    title,
    description: description || "",
    imageUrl: imageUrl || "",
    servings: Number(servings) || 1,
    cookingTime: Number(cookingTime) || 0,
    tags: Array.isArray(tags) ? tags : [],
    ingredients: Array.isArray(ingredients)
      ? ingredients
      : [],
    steps: Array.isArray(steps)
      ? steps
      : [],
    favorite: false
  };

  recipes.push(newRecipe);

  res.status(201).json({
    success: true,
    message: "Recipe created successfully",
    recipe: newRecipe
  });
});

// ========================================
// UPDATE RECIPE
// PUT /recipes/:id
// ========================================

app.put("/recipes/:id", (req, res) => {
  const id = Number(req.params.id);

  const recipeIndex = recipes.findIndex(
    recipe => recipe.id === id
  );

  if (recipeIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Recipe not found"
    });
  }

  const oldRecipe = recipes[recipeIndex];

  const updatedRecipe = {
    ...oldRecipe,
    ...req.body,
    id: oldRecipe.id
  };

  recipes[recipeIndex] = updatedRecipe;

  res.json({
    success: true,
    message: "Recipe updated successfully",
    recipe: updatedRecipe
  });
});

// ========================================
// DELETE RECIPE
// DELETE /recipes/:id
// ========================================

app.delete("/recipes/:id", (req, res) => {
  const id = Number(req.params.id);

  const recipeIndex = recipes.findIndex(
    recipe => recipe.id === id
  );

  if (recipeIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Recipe not found"
    });
  }

  const deletedRecipe = recipes.splice(recipeIndex, 1)[0];

  res.json({
    success: true,
    message: "Recipe deleted successfully",
    recipe: deletedRecipe
  });
});

// ========================================
// FAVORITE / UNFAVORITE
// PUT /recipes/:id/favorite
// ========================================

app.put("/recipes/:id/favorite", (req, res) => {
  const id = Number(req.params.id);

  const recipe = recipes.find(recipe => recipe.id === id);

  if (!recipe) {
    return res.status(404).json({
      success: false,
      message: "Recipe not found"
    });
  }

  recipe.favorite = !recipe.favorite;

  res.json({
    success: true,
    message: recipe.favorite
      ? "Recipe added to favorites"
      : "Recipe removed from favorites",
    favorite: recipe.favorite,
    recipe
  });
});

// ========================================
// GET FAVORITES
// GET /favorites
// ========================================

app.get("/favorites", (req, res) => {
  const favorites = recipes.filter(
    recipe => recipe.favorite === true
  );

  res.json({
    success: true,
    count: favorites.length,
    recipes: favorites
  });
});

// ========================================
// SHOPPING LIST
// ========================================

let shoppingList = [];

// ========================================
// GET SHOPPING LIST
// GET /shopping-list
// ========================================

app.get("/shopping-list", (req, res) => {
  res.json({
    success: true,
    count: shoppingList.length,
    items: shoppingList
  });
});

// ========================================
// ADD SHOPPING ITEM
// POST /shopping-list
// ========================================

app.post("/shopping-list", (req, res) => {
  const {
    name,
    amount
  } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Item name is required"
    });
  }

  const item = {
    id:
      shoppingList.length === 0
        ? 1
        : Math.max(
            ...shoppingList.map(item => item.id)
          ) + 1,

    name,
    amount: amount || "",
    checked: false
  };

  shoppingList.push(item);

  res.status(201).json({
    success: true,
    message: "Shopping item added",
    item
  });
});

// ========================================
// UPDATE SHOPPING ITEM
// PUT /shopping-list/:id
// ========================================

app.put("/shopping-list/:id", (req, res) => {
  const id = Number(req.params.id);

  const itemIndex = shoppingList.findIndex(
    item => item.id === id
  );

  if (itemIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Shopping item not found"
    });
  }

  shoppingList[itemIndex] = {
    ...shoppingList[itemIndex],
    ...req.body,
    id: shoppingList[itemIndex].id
  };

  res.json({
    success: true,
    message: "Shopping item updated",
    item: shoppingList[itemIndex]
  });
});

// ========================================
// DELETE SHOPPING ITEM
// DELETE /shopping-list/:id
// ========================================

app.delete("/shopping-list/:id", (req, res) => {
  const id = Number(req.params.id);

  const itemIndex = shoppingList.findIndex(
    item => item.id === id
  );

  if (itemIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Shopping item not found"
    });
  }

  const deletedItem = shoppingList.splice(
    itemIndex,
    1
  )[0];

  res.json({
    success: true,
    message: "Shopping item deleted",
    item: deletedItem
  });
});

// ========================================
// ADD ALL RECIPE INGREDIENTS
// POST /shopping-list/recipe/:id
// ========================================

app.post("/shopping-list/recipe/:id", (req, res) => {
  const recipeId = Number(req.params.id);

  const recipe = recipes.find(
    recipe => recipe.id === recipeId
  );

  if (!recipe) {
    return res.status(404).json({
      success: false,
      message: "Recipe not found"
    });
  }

  recipe.ingredients.forEach(ingredient => {
    const newId =
      shoppingList.length === 0
        ? 1
        : Math.max(
            ...shoppingList.map(item => item.id)
          ) + 1;

    shoppingList.push({
      id: newId,
      name: ingredient.name,
      amount: ingredient.amount,
      checked: false
    });
  });

  res.json({
    success: true,
    message: "Recipe ingredients added to shopping list",
    recipeId: recipe.id,
    items: shoppingList
  });
});

// ========================================
// 404
// ========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    path: req.originalUrl
  });
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, "0.0.0.0", () => {
  console.log("=================================");
  console.log("RecipeBox API");
  console.log("=================================");
  console.log(`Server running on port ${PORT}`);
  console.log("Storage: server.js");
  console.log("Database: none");
  console.log("=================================");
});
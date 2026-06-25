const mongoose = require('mongoose');
const Recipe = require('./models/Recipe');

const recipes = [
  // English recipes
  {
    title: "Spaghetti Carbonara",
    ingredients: ["200g spaghetti", "100g pancetta", "2 eggs", "50g Parmesan cheese", "Black pepper"],
    instructions: ["Cook spaghetti in salted water.", "Fry pancetta until crispy.", "Mix eggs and cheese.", "Combine with hot pasta.", "Season with pepper."],
    prepTime: 10,
    cookTime: 15,
    servings: 2,
    tags: ["Italian", "Pasta"],
    language: "English"
  },
  {
    title: "Chicken Curry",
    ingredients: ["500g chicken", "2 onions", "2 tomatoes", "Spices (cumin, coriander, turmeric)", "Coconut milk"],
    instructions: ["Sauté onions.", "Add spices and tomatoes.", "Cook chicken.", "Add coconut milk.", "Simmer until done."],
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    tags: ["Indian", "Spicy"],
    language: "English"
  },
  {
    title: "Chocolate Chip Cookies",
    ingredients: ["2 cups flour", "1 cup butter", "1 cup sugar", "1 egg", "1 cup chocolate chips"],
    instructions: ["Cream butter and sugar.", "Add egg.", "Mix in flour.", "Fold in chips.", "Bake at 180°C for 10-12 minutes."],
    prepTime: 10,
    cookTime: 12,
    servings: 24,
    tags: ["Dessert", "Baking"],
    language: "English"
  },
  {
    title: "Caesar Salad",
    ingredients: ["Romaine lettuce", "Croutons", "Parmesan cheese", "Caesar dressing", "Anchovies (optional)"],
    instructions: ["Chop lettuce.", "Add croutons and cheese.", "Toss with dressing.", "Top with anchovies if desired."],
    prepTime: 10,
    cookTime: 0,
    servings: 2,
    tags: ["Salad", "Healthy"],
    language: "English"
  },
  {
    title: "Pancakes",
    ingredients: ["1 cup flour", "1 egg", "1 cup milk", "1 tbsp sugar", "Butter for frying"],
    instructions: ["Mix ingredients.", "Heat pan with butter.", "Pour batter.", "Flip when bubbles form.", "Serve with syrup."],
    prepTime: 5,
    cookTime: 10,
    servings: 4,
    tags: ["Breakfast", "Sweet"],
    language: "English"
  },
  // Hindi recipes
  {
    title: "Paneer Butter Masala",
    ingredients: ["250g paneer", "2 onions", "2 tomatoes", "Butter", "Cream", "Spices"],
    instructions: ["Pyaz ko fry karein.", "Tamatar aur spices add karein.", "Paneer add karein.", "Cream dalen.", "Serve karein."],
    prepTime: 15,
    cookTime: 20,
    servings: 4,
    tags: ["Indian", "Vegetarian"],
    language: "Hindi"
  },
  {
    title: "Aloo Gobi",
    ingredients: ["2 potatoes", "1 cauliflower", "Onions", "Tomatoes", "Spices"],
    instructions: ["Sabzi ko cut karein.", "Onions fry karein.", "Spices add karein.", "Vegetables cook karein.", "Serve karein."],
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    tags: ["Indian", "Vegetarian"],
    language: "Hindi"
  },
  {
    title: "Chana Masala",
    ingredients: ["1 cup chickpeas", "Onions", "Tomatoes", "Spices", "Oil"],
    instructions: ["Chickpeas boil karein.", "Onions fry karein.", "Spices add karein.", "Chickpeas mix karein.", "Serve karein."],
    prepTime: 10,
    cookTime: 25,
    servings: 4,
    tags: ["Indian", "Vegetarian"],
    language: "Hindi"
  },
  {
    title: "Dal Tadka",
    ingredients: ["1 cup lentils", "Onions", "Tomatoes", "Ghee", "Spices"],
    instructions: ["Dal boil karein.", "Tadka banayein.", "Mix karein.", "Serve karein."],
    prepTime: 5,
    cookTime: 30,
    servings: 4,
    tags: ["Indian", "Vegetarian"],
    language: "Hindi"
  },
  {
    title: "Rajma",
    ingredients: ["1 cup kidney beans", "Onions", "Tomatoes", "Spices", "Oil"],
    instructions: ["Rajma boil karein.", "Masala banayein.", "Mix karein.", "Serve karein."],
    prepTime: 10,
    cookTime: 40,
    servings: 4,
    tags: ["Indian", "Vegetarian"],
    language: "Hindi"
  },
  // Haryanvi recipes
  {
    title: "Bajra Khichdi",
    ingredients: ["Bajra", "Moong dal", "Onions", "Spices", "Ghee"],
    instructions: ["Bajra aur dal ko soak karein.", "Cook karein.", "Tadka banayein.", "Serve karein."],
    prepTime: 10,
    cookTime: 30,
    servings: 4,
    tags: ["Haryanvi", "Healthy"],
    language: "Haryanvi"
  },
  {
    title: "Singri Ki Sabzi",
    ingredients: ["Singri (drumsticks)", "Onions", "Spices", "Oil"],
    instructions: ["Singri cut karein.", "Fry karein.", "Spices add karein.", "Cook karein."],
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    tags: ["Haryanvi", "Vegetarian"],
    language: "Haryanvi"
  },
  {
    title: "Khichdi",
    ingredients: ["Rice", "Moong dal", "Ghee", "Spices"],
    instructions: ["Rice aur dal cook karein.", "Ghee aur spices add karein.", "Serve karein."],
    prepTime: 5,
    cookTime: 25,
    servings: 4,
    tags: ["Haryanvi", "Comfort Food"],
    language: "Haryanvi"
  },
  {
    title: "Makhan Malai",
    ingredients: ["Milk", "Sugar", "Cardamom", "Nuts"],
    instructions: ["Milk ko reduce karein.", "Sugar add karein.", "Cardamom dalen.", "Serve karein."],
    prepTime: 5,
    cookTime: 60,
    servings: 4,
    tags: ["Haryanvi", "Dessert"],
    language: "Haryanvi"
  },
  {
    title: "Bathua Raita",
    ingredients: ["Bathua leaves", "Yogurt", "Spices"],
    instructions: ["Bathua boil karein.", "Yogurt mein mix karein.", "Spices add karein.", "Serve karein."],
    prepTime: 10,
    cookTime: 10,
    servings: 4,
    tags: ["Haryanvi", "Healthy"],
    language: "Haryanvi"
  }
];

async function seedDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cookiemice', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    await Recipe.deleteMany({});
    console.log('Cleared existing recipes');

    await Recipe.insertMany(recipes);
    console.log('Seeded recipes successfully');

    mongoose.connection.close();
  } catch (err) {
    console.error('Error seeding DB:', err);
  }
}

seedDB();

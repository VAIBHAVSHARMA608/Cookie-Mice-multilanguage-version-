const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  ingredients: [{ type: String, required: true }],
  instructions: [{ type: String, required: true }],
  prepTime: { type: Number }, // in minutes
  cookTime: { type: Number }, // in minutes
  servings: { type: Number },
  tags: [{ type: String }],
  language: {
    type: String,
    required: true,
    enum: [
      'English', 'Hindi', 'Haryanvi', 'Punjabi', 'Marathi',
      'Gujarati', 'Bengali', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Urdu'
    ]
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Recipe', recipeSchema);

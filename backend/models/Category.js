const mongoose = require('mongoose');

/**
 * Category Schema
 * Represents a category for menu items
 */
const categorySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Category ID is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'Category ID can only contain lowercase letters, numbers, and hyphens']
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters']
    },
    image: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for faster queries
categorySchema.index({ id: 1 });

// Pre-save middleware to ensure ID is lowercase
categorySchema.pre('save', function(next) {
  if (this.id) {
    this.id = this.id.toLowerCase().trim();
  }
  if (this.name) {
    this.name = this.name.trim();
  }
  next();
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;

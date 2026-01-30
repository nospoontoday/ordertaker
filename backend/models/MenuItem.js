const mongoose = require('mongoose');

/**
 * MenuItem Schema
 * Represents a menu item in the restaurant
 */
const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Menu item name is required'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      validate: {
        validator: function(value) {
          return Number.isFinite(value) && value >= 0;
        },
        message: 'Price must be a valid positive number'
      }
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    image: {
      type: String,
      trim: true,
      default: ''
    },
    onlineImage: {
      type: String,
      trim: true,
      default: '',
      description: 'Image shown to online customers (if empty, placeholder is shown)'
    },
    isBestSeller: {
      type: Boolean,
      default: false
    },
    isPublic: {
      type: Boolean,
      default: false,
      description: 'If true, item is visible to online customers'
    },
    owner: {
      type: String,
      enum: ['john', 'elwin'],
      required: [true, 'Owner is required. Must be "john" or "elwin"'],
      default: 'john'
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for faster queries
menuItemSchema.index({ category: 1 });
menuItemSchema.index({ isBestSeller: 1 });
menuItemSchema.index({ isPublic: 1 });

// Virtual for formatted price
menuItemSchema.virtual('formattedPrice').get(function() {
  return `$${this.price.toFixed(2)}`;
});

// Pre-save middleware to validate data
menuItemSchema.pre('save', function(next) {
  // Trim whitespace from name
  if (this.name) {
    this.name = this.name.trim();
  }

  // Ensure price has max 2 decimal places
  if (this.price) {
    this.price = Math.round(this.price * 100) / 100;
  }

  next();
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

module.exports = MenuItem;

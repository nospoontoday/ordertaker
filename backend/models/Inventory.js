const mongoose = require('mongoose');

/**
 * Inventory Schema
 * Represents an inventory item in the restaurant
 */
const inventorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
      enum: ['pcs', 'kg', 'g', 'liters', 'ml', 'boxes', 'bags', 'bottles', 'cans'],
      default: 'pcs'
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      enum: [
        'Coffee Beans',
        'Milk & Dairy',
        'Syrups & Flavors',
        'Pastries & Bread',
        'Food Ingredients',
        'Packaging',
        'Supplies',
        'Other'
      ]
    },
    lowStockThreshold: {
      type: Number,
      required: [true, 'Low stock threshold is required'],
      min: [0, 'Threshold cannot be negative'],
      default: 10
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot be more than 500 characters']
    },
    image: {
      type: String,
      trim: true,
      default: ''
    },
    lastUpdatedBy: {
      type: String,
      trim: true
    },
    lastUpdatedByEmail: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for faster queries
inventorySchema.index({ category: 1 });
inventorySchema.index({ name: 1 });

// Virtual for stock status
inventorySchema.virtual('stockStatus').get(function() {
  if (this.quantity === 0) {
    return 'out';
  }
  if (this.quantity <= this.lowStockThreshold) {
    return 'low';
  }
  return 'good';
});

// Virtual for low stock alert
inventorySchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.lowStockThreshold && this.quantity > 0;
});

// Virtual for out of stock
inventorySchema.virtual('isOutOfStock').get(function() {
  return this.quantity === 0;
});

// Pre-save middleware to validate data
inventorySchema.pre('save', function(next) {
  // Trim whitespace from name
  if (this.name) {
    this.name = this.name.trim();
  }

  // Ensure quantity and threshold are integers
  if (this.quantity !== undefined) {
    this.quantity = Math.max(0, Math.floor(this.quantity));
  }

  if (this.lowStockThreshold !== undefined) {
    this.lowStockThreshold = Math.max(0, Math.floor(this.lowStockThreshold));
  }

  next();
});

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;

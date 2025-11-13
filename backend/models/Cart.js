const mongoose = require('mongoose');

/**
 * Cart Schema
 * Stores temporary cart data for users
 */
const cartSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: [true, 'User email is required'],
      trim: true,
      index: true,
    },
    customerName: {
      type: String,
      default: '',
      trim: true,
    },
    orderType: {
      type: String,
      enum: ['dine-in', 'take-out'],
      default: 'dine-in',
    },
    orderNote: {
      type: String,
      default: '',
      trim: true,
    },
    items: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
cartSchema.index({ userEmail: 1 });

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;

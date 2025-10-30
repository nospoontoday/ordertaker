const mongoose = require('mongoose');

/**
 * Withdrawal/Purchase Schema
 * Tracks operational withdrawals and purchases
 * Examples: water, gas, miscellaneous fees, cash withdrawals for operations
 */
const withdrawalSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['withdrawal', 'purchase'],
      required: [true, 'Type is required. Must be "withdrawal" or "purchase"'],
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters']
    },
    createdAt: {
      type: Number,
      required: true,
      default: Date.now,
      index: true
    },
    createdBy: {
      userId: {
        type: String,
        required: false
      },
      name: {
        type: String,
        required: false,
        trim: true
      },
      email: {
        type: String,
        required: false,
        trim: true
      }
    },
    // Optional metadata
    paymentMethod: {
      type: String,
      enum: ['cash', 'gcash', null],
      default: null
    },
    chargedTo: {
      type: String,
      enum: ['john', 'elwin', 'all'],
      required: [true, 'chargedTo is required. Must be "john", "elwin", or "all"'],
      default: 'john'
    }
  },
  {
    timestamps: true
  }
);

// Index for date range queries
withdrawalSchema.index({ createdAt: -1 });
withdrawalSchema.index({ type: 1, createdAt: -1 });

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

module.exports = Withdrawal;


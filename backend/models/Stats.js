const mongoose = require('mongoose');
const { DEFAULT_BRANCH, VALID_BRANCH_IDS } = require('../config/branches');

/**
 * Stats Schema
 * Single document to track aggregate statistics like average wait time
 * Uses a key field to allow for different stat categories in the future
 * Now supports per-branch statistics
 */
const statsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      default: 'global'
    },
    branchId: {
      type: String,
      required: true,
      enum: VALID_BRANCH_IDS,
      default: DEFAULT_BRANCH.id,
      index: true
    },
    // Sum of all wait times (in milliseconds)
    totalWaitTimeMs: {
      type: Number,
      default: 0,
      min: 0
    },
    // Count of completed orders (used to calculate average)
    completedOrdersCount: {
      type: Number,
      default: 0,
      min: 0
    },
    // Timestamp of last update
    lastUpdated: {
      type: Number,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound unique index for key + branchId
statsSchema.index({ key: 1, branchId: 1 }, { unique: true });

// Virtual for average wait time in milliseconds
statsSchema.virtual('averageWaitTimeMs').get(function() {
  return this.completedOrdersCount > 0
    ? Math.round(this.totalWaitTimeMs / this.completedOrdersCount)
    : 0;
});

// Static method to get or create stats for a branch
statsSchema.statics.getGlobalStats = async function(branchId = DEFAULT_BRANCH.id) {
  let stats = await this.findOne({ key: 'global', branchId });
  if (!stats) {
    stats = await this.create({ key: 'global', branchId });
  }
  return stats;
};

// Static method to update stats when an order is completed
statsSchema.statics.recordCompletedOrder = async function(waitTimeMs, branchId = DEFAULT_BRANCH.id) {
  return this.findOneAndUpdate(
    { key: 'global', branchId },
    {
      $inc: {
        totalWaitTimeMs: waitTimeMs,
        completedOrdersCount: 1
      },
      $set: { lastUpdated: Date.now() }
    },
    { upsert: true, new: true }
  );
};

const Stats = mongoose.model('Stats', statsSchema);

module.exports = Stats;

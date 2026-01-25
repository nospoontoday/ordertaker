const mongoose = require('mongoose');

/**
 * Stats Schema
 * Single document to track aggregate statistics like average wait time
 * Uses a key field to allow for different stat categories in the future
 */
const statsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global'
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

// Virtual for average wait time in milliseconds
statsSchema.virtual('averageWaitTimeMs').get(function() {
  return this.completedOrdersCount > 0
    ? Math.round(this.totalWaitTimeMs / this.completedOrdersCount)
    : 0;
});

// Static method to get or create global stats
statsSchema.statics.getGlobalStats = async function() {
  let stats = await this.findOne({ key: 'global' });
  if (!stats) {
    stats = await this.create({ key: 'global' });
  }
  return stats;
};

// Static method to update stats when an order is completed
statsSchema.statics.recordCompletedOrder = async function(waitTimeMs) {
  return this.findOneAndUpdate(
    { key: 'global' },
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

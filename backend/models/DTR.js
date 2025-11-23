const mongoose = require('mongoose');

/**
 * DTR (Daily Time Record) Schema
 * Tracks clock in/out times for crew members
 */
const dtrSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    clockInTime: {
      type: Date,
      required: [true, 'Clock in time is required'],
      index: true
    },
    clockOutTime: {
      type: Date,
      default: null
    },
    date: {
      type: String, // Format: YYYY-MM-DD for easy querying
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['clocked_in', 'clocked_out'],
      default: 'clocked_in',
      required: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient queries
dtrSchema.index({ userId: 1, date: 1 });
dtrSchema.index({ userId: 1, clockInTime: -1 });

// Instance method to calculate work duration in hours
dtrSchema.methods.getWorkDuration = function() {
  if (!this.clockOutTime) {
    return null; // Still clocked in
  }
  const durationMs = this.clockOutTime - this.clockInTime;
  return (durationMs / (1000 * 60 * 60)).toFixed(2); // Convert to hours
};

// Instance method to check if currently clocked in
dtrSchema.methods.isClockedIn = function() {
  return this.status === 'clocked_in' && !this.clockOutTime;
};

// Static method to get monthly summary for a user
dtrSchema.statics.getMonthlySummary = async function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const records = await this.find({
    userId,
    clockInTime: { $gte: startDate, $lte: endDate }
  }).sort({ clockInTime: -1 });

  const totalDays = records.filter(r => r.status === 'clocked_out').length;
  let totalHours = 0;

  records.forEach(record => {
    if (record.clockOutTime) {
      const duration = (record.clockOutTime - record.clockInTime) / (1000 * 60 * 60);
      totalHours += duration;
    }
  });

  return {
    records,
    totalDays,
    totalHours: totalHours.toFixed(2),
    month,
    year
  };
};

const DTR = mongoose.model('DTR', dtrSchema);

module.exports = DTR;

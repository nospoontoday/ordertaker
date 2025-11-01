const mongoose = require('mongoose');

/**
 * Daily Report Validation Schema
 * Tracks which daily reports have been validated by admin
 */
const dailyReportValidationSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: [true, 'Date is required'],
      unique: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
      index: true
    },
    isValidated: {
      type: Boolean,
      default: false,
      required: true
    },
    validatedAt: {
      type: Number,
      required: false
    },
    validatedBy: {
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
    }
  },
  {
    timestamps: true
  }
);

// Index for date queries
dailyReportValidationSchema.index({ date: 1 });

const DailyReportValidation = mongoose.model('DailyReportValidation', dailyReportValidationSchema);

module.exports = DailyReportValidation;


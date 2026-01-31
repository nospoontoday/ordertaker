const mongoose = require('mongoose');

/**
 * CustomerPhoto Schema
 * Represents customer photos displayed in the Hero section of the Online Order page
 */
const customerPhotoSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true
    },
    displayOrder: {
      type: Number,
      required: true,
      min: [1, 'Display order must be at least 1'],
      max: [6, 'Display order cannot exceed 6']
    },
    isActive: {
      type: Boolean,
      default: false,
      description: 'If true, photo is one of the 6 displayed in the Hero section'
    },
    altText: {
      type: String,
      trim: true,
      default: 'Customer photo',
      maxlength: [200, 'Alt text cannot be more than 200 characters']
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for faster queries
customerPhotoSchema.index({ isActive: 1, displayOrder: 1 });
customerPhotoSchema.index({ displayOrder: 1 });

// Pre-save middleware to ensure only 6 photos can be active
customerPhotoSchema.pre('save', async function(next) {
  if (this.isActive) {
    // Count current active photos (excluding this one if it's being updated)
    const activeCount = await mongoose.model('CustomerPhoto').countDocuments({
      isActive: true,
      _id: { $ne: this._id }
    });
    
    if (activeCount >= 6) {
      const error = new Error('Maximum of 6 photos can be active at a time');
      error.name = 'ValidationError';
      return next(error);
    }
  }
  next();
});

const CustomerPhoto = mongoose.model('CustomerPhoto', customerPhotoSchema);

module.exports = CustomerPhoto;

const mongoose = require('mongoose');

/**
 * User Schema
 * Represents a user in the system with role-based access
 * Roles: super_admin, order_taker, crew, order_taker_crew
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
      type: String,
      enum: ['super_admin', 'order_taker', 'crew', 'order_taker_crew'],
      default: 'crew',
      required: true
    },
    name: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Index for faster email lookups
userSchema.index({ email: 1 });

// Instance method to check if user has specific role
userSchema.methods.hasRole = function(role) {
  return this.role === role;
};

// Instance method to check if user has admin privileges
userSchema.methods.isAdmin = function() {
  return this.role === 'super_admin';
};

// Instance method to check if user is order taker
userSchema.methods.isOrderTaker = function() {
  return this.role === 'order_taker' || this.role === 'order_taker_crew';
};

// Instance method to check if user is crew
userSchema.methods.isCrew = function() {
  return this.role === 'crew' || this.role === 'order_taker_crew';
};

// Don't return password in JSON responses
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

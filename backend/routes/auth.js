const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @body    { email, password, role }
 * @access  Public
 */
router.post('/register', async (req, res) => {
  // Registration is disabled - only predefined users can access the app
  return res.status(403).json({
    success: false,
    error: 'Registration is disabled. Please contact the administrator for access.'
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @body    { email, password }
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account has been deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to login'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side will clear session)
 * @access  Public
 */
router.post('/logout', async (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info (placeholder for future JWT implementation)
 * @access  Private (would require auth middleware)
 */
router.get('/me', async (req, res) => {
  // This would typically require authentication middleware
  // For now, it's a placeholder
  res.status(501).json({
    success: false,
    error: 'Not implemented yet'
  });
});

module.exports = router;

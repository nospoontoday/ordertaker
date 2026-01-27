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
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  const timestamp = new Date().toISOString();
  
  try {
    // Detailed logging for production debugging
    console.log(`[${timestamp}] [LOGIN:${requestId}] === LOGIN REQUEST ===`);
    console.log(`[${timestamp}] [LOGIN:${requestId}] Origin:`, req.headers.origin || 'none');
    console.log(`[${timestamp}] [LOGIN:${requestId}] User-Agent:`, req.headers['user-agent'] || 'none');
    console.log(`[${timestamp}] [LOGIN:${requestId}] Referer:`, req.headers.referer || 'none');
    console.log(`[${timestamp}] [LOGIN:${requestId}] IP:`, req.ip || req.connection.remoteAddress || 'unknown');
    console.log(`[${timestamp}] [LOGIN:${requestId}] Method:`, req.method);
    console.log(`[${timestamp}] [LOGIN:${requestId}] Path:`, req.path);
    console.log(`[${timestamp}] [LOGIN:${requestId}] Email:`, req.body.email || 'none');
    console.log(`[${timestamp}] [LOGIN:${requestId}] Password provided:`, req.body.password ? 'yes' : 'no');
    
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      console.log(`[${timestamp}] [LOGIN:${requestId}] ❌ Validation failed: missing email or password`);
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log(`[${timestamp}] [LOGIN:${requestId}] ❌ User not found:`, email.toLowerCase());
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    console.log(`[${timestamp}] [LOGIN:${requestId}] ✓ User found:`, email.toLowerCase(), 'ID:', user._id);

    // Check if user is active
    if (!user.isActive) {
      console.log(`[${timestamp}] [LOGIN:${requestId}] ❌ Account deactivated:`, email.toLowerCase());
      return res.status(403).json({
        success: false,
        error: 'Account has been deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log(`[${timestamp}] [LOGIN:${requestId}] ❌ Invalid password for:`, email.toLowerCase());
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    console.log(`[${timestamp}] [LOGIN:${requestId}] ✓✓✓ LOGIN SUCCESSFUL for:`, email.toLowerCase());
    console.log(`[${timestamp}] [LOGIN:${requestId}] User details:`, {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      branches: user.branches,
      preferredBranch: user.preferredBranch
    });

    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        branches: user.branches || ['pangabugan', 'baan'], // Default to all branches for backward compat
        preferredBranch: user.preferredBranch || null
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [LOGIN:${requestId}] ❌❌❌ ERROR:`, error);
    console.error(`[${new Date().toISOString()}] [LOGIN:${requestId}] Error stack:`, error.stack);
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

/**
 * @route   PATCH /api/auth/preferred-branch
 * @desc    Update user's preferred branch
 * @body    { userId, preferredBranch }
 * @access  Public (should be authenticated in production)
 */
router.patch('/preferred-branch', async (req, res) => {
  try {
    const { userId, preferredBranch } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account has been deactivated'
      });
    }

    // Validate that preferredBranch is in user's allowed branches
    if (preferredBranch && !user.branches.includes(preferredBranch)) {
      return res.status(400).json({
        success: false,
        error: 'You can only set a preferred branch from your accessible branches'
      });
    }

    // Update preferred branch
    user.preferredBranch = preferredBranch || null;
    await user.save();

    console.log(`[PREFERRED-BRANCH] Updated for user ${user.email}: ${preferredBranch || 'cleared'}`);

    res.json({
      success: true,
      data: {
        preferredBranch: user.preferredBranch
      },
      message: preferredBranch ? 'Preferred branch updated successfully' : 'Preferred branch cleared'
    });
  } catch (error) {
    console.error('Error updating preferred branch:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update preferred branch'
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password (requires email and current password verification)
 * @body    { email, currentPassword, newPassword }
 * @access  Public
 */
router.post('/change-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    // Validation
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, current password, and new password are required'
      });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters'
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

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if new password is the same as current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to change password'
    });
  }
});

module.exports = router;

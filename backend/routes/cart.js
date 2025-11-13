const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');

/**
 * @route   GET /api/cart/:userEmail
 * @desc    Get cart for a user
 * @access  Public
 */
router.get('/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;

    const cart = await Cart.findOne({ userEmail });

    if (!cart) {
      return res.json({
        success: true,
        data: {
          customerName: '',
          orderType: 'dine-in',
          orderNote: '',
          items: [],
        },
      });
    }

    res.json({
      success: true,
      data: {
        customerName: cart.customerName,
        orderType: cart.orderType,
        orderNote: cart.orderNote,
        items: cart.items,
      },
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching cart',
    });
  }
});

/**
 * @route   POST /api/cart
 * @desc    Save or update cart for a user
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { userEmail, customerName, orderType, orderNote, items } = req.body;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'User email is required',
      });
    }

    // Find existing cart or create new one
    let cart = await Cart.findOne({ userEmail });

    if (cart) {
      // Update existing cart
      cart.customerName = customerName || '';
      cart.orderType = orderType || 'dine-in';
      cart.orderNote = orderNote || '';
      cart.items = items || [];
      await cart.save();
    } else {
      // Create new cart
      cart = await Cart.create({
        userEmail,
        customerName: customerName || '',
        orderType: orderType || 'dine-in',
        orderNote: orderNote || '',
        items: items || [],
      });
    }

    res.json({
      success: true,
      data: {
        customerName: cart.customerName,
        orderType: cart.orderType,
        orderNote: cart.orderNote,
        items: cart.items,
      },
    });
  } catch (error) {
    console.error('Error saving cart:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while saving cart',
    });
  }
});

/**
 * @route   DELETE /api/cart/:userEmail
 * @desc    Clear cart for a user
 * @access  Public
 */
router.delete('/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;

    await Cart.findOneAndDelete({ userEmail });

    res.json({
      success: true,
      message: 'Cart cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while clearing cart',
    });
  }
});

module.exports = router;

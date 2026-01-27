const express = require('express');
const router = express.Router();
const { BRANCH_LIST, getBranchById, isValidBranchId } = require('../config/branches');

/**
 * @route   GET /api/branches
 * @desc    Get all available branches
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: BRANCH_LIST
  });
});

/**
 * @route   GET /api/branches/:id
 * @desc    Get a specific branch by ID
 * @access  Public
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  if (!isValidBranchId(id)) {
    return res.status(404).json({
      success: false,
      error: 'Branch not found'
    });
  }
  
  const branch = getBranchById(id);
  
  res.json({
    success: true,
    data: branch
  });
});

module.exports = router;

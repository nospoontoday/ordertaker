/**
 * Branch Configuration
 * Hardcoded branches for the order management system
 */

const BRANCHES = {
  PANGABUGAN: { id: 'pangabugan', name: 'Pangabugan Branch' },
  BAAN: { id: 'baan', name: 'Baan Branch' }
};

const BRANCH_LIST = Object.values(BRANCHES);

const DEFAULT_BRANCH = BRANCHES.PANGABUGAN;

// Valid branch IDs for validation
const VALID_BRANCH_IDS = BRANCH_LIST.map(b => b.id);

/**
 * Check if a branch ID is valid
 * @param {string} branchId - Branch ID to validate
 * @returns {boolean}
 */
const isValidBranchId = (branchId) => {
  return VALID_BRANCH_IDS.includes(branchId);
};

/**
 * Get branch by ID
 * @param {string} branchId - Branch ID
 * @returns {object|null} Branch object or null if not found
 */
const getBranchById = (branchId) => {
  return BRANCH_LIST.find(b => b.id === branchId) || null;
};

module.exports = {
  BRANCHES,
  BRANCH_LIST,
  DEFAULT_BRANCH,
  VALID_BRANCH_IDS,
  isValidBranchId,
  getBranchById
};

/**
 * Branch Configuration
 * Hardcoded branches for the order management system
 */

export const BRANCHES = {
  PANGABUGAN: { id: 'pangabugan', name: 'Pangabugan Branch' },
  BAAN: { id: 'baan', name: 'Baan Branch' }
} as const;

export const BRANCH_LIST = Object.values(BRANCHES);

export const DEFAULT_BRANCH = BRANCHES.PANGABUGAN;

// Type for branch IDs
export type BranchId = 'pangabugan' | 'baan';

// Type for a branch object
export interface Branch {
  id: BranchId;
  name: string;
}

// Valid branch IDs for validation
export const VALID_BRANCH_IDS: BranchId[] = BRANCH_LIST.map(b => b.id) as BranchId[];

/**
 * Check if a branch ID is valid
 */
export const isValidBranchId = (branchId: string): branchId is BranchId => {
  return VALID_BRANCH_IDS.includes(branchId as BranchId);
};

/**
 * Get branch by ID
 */
export const getBranchById = (branchId: string): Branch | null => {
  return BRANCH_LIST.find(b => b.id === branchId) || null;
};

// localStorage key for persisting selected branch
export const BRANCH_STORAGE_KEY = 'ordertaker_selected_branch';

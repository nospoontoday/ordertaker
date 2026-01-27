/**
 * Branch Migration Utility
 * Runs on backend startup to migrate existing data to default branch
 * Safe to run multiple times (idempotent) - only updates documents missing branchId
 */

const { DEFAULT_BRANCH, VALID_BRANCH_IDS } = require('../config/branches');

/**
 * Migrate all existing data to include branchId field
 * This function is idempotent - safe to run multiple times
 */
async function runBranchMigration() {
  console.log('🔄 Starting branch migration check...');
  
  const Order = require('../models/Order');
  const Withdrawal = require('../models/Withdrawal');
  const Inventory = require('../models/Inventory');
  const DTR = require('../models/DTR');
  const User = require('../models/User');
  
  const defaultBranchId = DEFAULT_BRANCH.id;
  const defaultBranches = VALID_BRANCH_IDS;
  
  let totalMigrated = 0;
  
  try {
    // Migrate Orders without branchId
    const ordersResult = await Order.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId: defaultBranchId } }
    );
    if (ordersResult.modifiedCount > 0) {
      console.log(`  ✓ Migrated ${ordersResult.modifiedCount} orders to ${defaultBranchId} branch`);
      totalMigrated += ordersResult.modifiedCount;
    }
    
    // Also migrate orders with null branchId
    const ordersNullResult = await Order.updateMany(
      { branchId: null },
      { $set: { branchId: defaultBranchId } }
    );
    if (ordersNullResult.modifiedCount > 0) {
      console.log(`  ✓ Fixed ${ordersNullResult.modifiedCount} orders with null branchId`);
      totalMigrated += ordersNullResult.modifiedCount;
    }
    
    // Migrate Withdrawals without branchId
    const withdrawalsResult = await Withdrawal.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId: defaultBranchId } }
    );
    if (withdrawalsResult.modifiedCount > 0) {
      console.log(`  ✓ Migrated ${withdrawalsResult.modifiedCount} withdrawals to ${defaultBranchId} branch`);
      totalMigrated += withdrawalsResult.modifiedCount;
    }
    
    // Also migrate withdrawals with null branchId
    const withdrawalsNullResult = await Withdrawal.updateMany(
      { branchId: null },
      { $set: { branchId: defaultBranchId } }
    );
    if (withdrawalsNullResult.modifiedCount > 0) {
      console.log(`  ✓ Fixed ${withdrawalsNullResult.modifiedCount} withdrawals with null branchId`);
      totalMigrated += withdrawalsNullResult.modifiedCount;
    }
    
    // Migrate Inventory without branchId
    const inventoryResult = await Inventory.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId: defaultBranchId } }
    );
    if (inventoryResult.modifiedCount > 0) {
      console.log(`  ✓ Migrated ${inventoryResult.modifiedCount} inventory items to ${defaultBranchId} branch`);
      totalMigrated += inventoryResult.modifiedCount;
    }
    
    // Also migrate inventory with null branchId
    const inventoryNullResult = await Inventory.updateMany(
      { branchId: null },
      { $set: { branchId: defaultBranchId } }
    );
    if (inventoryNullResult.modifiedCount > 0) {
      console.log(`  ✓ Fixed ${inventoryNullResult.modifiedCount} inventory items with null branchId`);
      totalMigrated += inventoryNullResult.modifiedCount;
    }
    
    // Migrate DTR without branchId
    const dtrResult = await DTR.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId: defaultBranchId } }
    );
    if (dtrResult.modifiedCount > 0) {
      console.log(`  ✓ Migrated ${dtrResult.modifiedCount} DTR records to ${defaultBranchId} branch`);
      totalMigrated += dtrResult.modifiedCount;
    }
    
    // Also migrate DTR with null branchId
    const dtrNullResult = await DTR.updateMany(
      { branchId: null },
      { $set: { branchId: defaultBranchId } }
    );
    if (dtrNullResult.modifiedCount > 0) {
      console.log(`  ✓ Fixed ${dtrNullResult.modifiedCount} DTR records with null branchId`);
      totalMigrated += dtrNullResult.modifiedCount;
    }
    
    // Migrate Users without branches array
    const usersResult = await User.updateMany(
      { branches: { $exists: false } },
      { $set: { branches: defaultBranches } }
    );
    if (usersResult.modifiedCount > 0) {
      console.log(`  ✓ Migrated ${usersResult.modifiedCount} users to have access to all branches`);
      totalMigrated += usersResult.modifiedCount;
    }
    
    // Also migrate users with empty branches array
    const usersEmptyResult = await User.updateMany(
      { branches: { $size: 0 } },
      { $set: { branches: defaultBranches } }
    );
    if (usersEmptyResult.modifiedCount > 0) {
      console.log(`  ✓ Fixed ${usersEmptyResult.modifiedCount} users with empty branches array`);
      totalMigrated += usersEmptyResult.modifiedCount;
    }
    
    if (totalMigrated === 0) {
      console.log('✅ Branch migration check complete - no migration needed');
    } else {
      console.log(`✅ Branch migration complete - ${totalMigrated} documents migrated`);
    }
    
    return { success: true, totalMigrated };
  } catch (error) {
    console.error('❌ Branch migration failed:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { runBranchMigration };

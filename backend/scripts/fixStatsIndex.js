/**
 * Fix Stats collection index issue
 * Drops the old key_1 unique index and ensures proper compound index exists
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordertaker';

async function fixStatsIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const statsCollection = db.collection('stats');

    // List current indexes
    console.log('\nCurrent indexes on stats collection:');
    const indexes = await statsCollection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    // Drop the problematic key_1 index if it exists
    const hasKeyIndex = indexes.some(idx => idx.name === 'key_1');
    if (hasKeyIndex) {
      console.log('\nDropping old key_1 index...');
      await statsCollection.dropIndex('key_1');
      console.log('Dropped key_1 index');
    } else {
      console.log('\nNo key_1 index found');
    }

    // Ensure the compound index exists
    console.log('\nCreating compound index on key + branchId...');
    await statsCollection.createIndex(
      { key: 1, branchId: 1 },
      { unique: true, name: 'key_branchId_unique' }
    );
    console.log('Compound index created');

    // List updated indexes
    console.log('\nUpdated indexes:');
    const newIndexes = await statsCollection.indexes();
    console.log(JSON.stringify(newIndexes, null, 2));

    console.log('\n✓ Stats index fix completed successfully!');
    console.log('You can now run: curl -X POST http://localhost:5000/api/stats/recalculate -H "Content-Type: application/json" -d \'{}\'');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixStatsIndex();

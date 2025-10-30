require('dotenv').config();
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const connectDB = require('../config/db');

/**
 * Seed Script to Import Menu Items from Excel File
 * Expected Excel columns:
 * - Name (required)
 * - Price (required)
 * - Category (required) - category name or category ID
 * - Owner (required) - "john" or "elwin"
 * - Image (optional) - image URL/path
 * - Best Seller (optional) - "yes", "true", "1", or true
 */

const seedMenuItems = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    console.log('\n========================================');
    console.log('Starting Menu Items Seed from Excel');
    console.log('========================================\n');

    // Find the Excel file (look in project root and backend directory)
    const excelFileName = 'Untitled spreadsheet (1).xlsx';
    const possiblePaths = [
      path.join(__dirname, '../../', excelFileName),
      path.join(__dirname, '../', excelFileName),
      path.join(process.cwd(), excelFileName),
      path.join(process.cwd(), '..', excelFileName),
    ];

    let excelPath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        excelPath = possiblePath;
        break;
      }
    }

    if (!excelPath) {
      console.error(`❌ Excel file not found: ${excelFileName}`);
      console.log('Searched in:');
      possiblePaths.forEach(p => console.log(`  - ${p}`));
      process.exit(1);
    }

    console.log(`✓ Found Excel file: ${excelPath}\n`);

    // Read Excel file
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      console.error('❌ No data found in Excel file');
      process.exit(1);
    }

    console.log(`✓ Found ${data.length} rows in Excel file\n`);

    // Display first row to understand structure
    console.log('Sample row structure:');
    console.log(JSON.stringify(data[0], null, 2));
    console.log('');

    // Normalize column names (handle different naming variations)
    const normalizeColumn = (columnName) => {
      if (!columnName) return null;
      const normalized = columnName.toString().trim().toLowerCase();
      
      // Name variations
      if (normalized.includes('name') || normalized.includes('item')) {
        return 'name';
      }
      // Price variations
      if (normalized.includes('price') || normalized.includes('cost')) {
        return 'price';
      }
      // Category variations
      if (normalized.includes('category') || normalized.includes('type')) {
        return 'category';
      }
      // Owner variations (Buyer/Seller, Owner, Seller, etc.)
      if (normalized.includes('owner') || 
          normalized.includes('seller') || 
          normalized.includes('buyer') ||
          normalized.includes('buyer/seller')) {
        return 'owner';
      }
      // Image variations
      if (normalized.includes('image') || normalized.includes('picture') || normalized.includes('photo')) {
        return 'image';
      }
      // Best Seller variations
      if (normalized.includes('best') || normalized.includes('seller') || normalized.includes('popular')) {
        return 'bestSeller';
      }
      
      return null;
    };

    // Get column mapping from first row
    const columnMapping = {};
    const firstRow = data[0];
    Object.keys(firstRow).forEach(key => {
      const normalized = normalizeColumn(key);
      if (normalized) {
        columnMapping[normalized] = key;
      }
    });

    console.log('Column mapping:');
    console.log(columnMapping);
    console.log('');

    // Validate required columns
    const requiredColumns = ['name', 'price', 'category', 'owner'];
    const missingColumns = requiredColumns.filter(col => !columnMapping[col]);
    
    if (missingColumns.length > 0) {
      console.error(`❌ Missing required columns: ${missingColumns.join(', ')}`);
      console.log('\nExpected columns:');
      console.log('  - Name (or Item Name, Product Name)');
      console.log('  - Price (or Cost)');
      console.log('  - Category (or Type)');
      console.log('  - Owner (john or elwin)');
      console.log('\nOptional columns:');
      console.log('  - Image (or Picture, Photo)');
      console.log('  - Best Seller (or Best Seller, Popular)');
      process.exit(1);
    }

    // Get or create categories
    const categoryMap = new Map();
    const categories = await Category.find({});
    categories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
      categoryMap.set(cat.id.toLowerCase().trim(), cat.id);
    });

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Extract values using column mapping
        const name = row[columnMapping.name]?.toString().trim();
        const priceStr = row[columnMapping.price]?.toString().trim();
        const categoryName = row[columnMapping.category]?.toString().trim();
        const owner = row[columnMapping.owner]?.toString().trim().toLowerCase();
        const image = columnMapping.image ? (row[columnMapping.image]?.toString().trim() || '') : '';
        const bestSellerValue = columnMapping.bestSeller ? row[columnMapping.bestSeller] : false;

        // Validate required fields
        if (!name) {
          errors.push(`Row ${i + 2}: Missing name`);
          skippedCount++;
          continue;
        }

        if (!priceStr || isNaN(parseFloat(priceStr))) {
          errors.push(`Row ${i + 2}: Invalid price: ${priceStr}`);
          skippedCount++;
          continue;
        }

        const price = parseFloat(priceStr);
        if (price < 0) {
          errors.push(`Row ${i + 2}: Price cannot be negative: ${price}`);
          skippedCount++;
          continue;
        }

        if (!categoryName) {
          errors.push(`Row ${i + 2}: Missing category`);
          skippedCount++;
          continue;
        }

        if (!owner || !['john', 'elwin'].includes(owner)) {
          errors.push(`Row ${i + 2}: Invalid owner: ${owner}. Must be "john" or "elwin"`);
          skippedCount++;
          continue;
        }

        // Get or create category ID
        let categoryId = categoryMap.get(categoryName.toLowerCase());
        
        if (!categoryId) {
          // Create new category
          const categoryIdSlug = categoryName.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          
          const newCategory = new Category({
            id: categoryIdSlug,
            name: categoryName,
            image: ''
          });
          
          await newCategory.save();
          categoryMap.set(categoryName.toLowerCase(), categoryIdSlug);
          categoryId = categoryIdSlug;
          console.log(`✓ Created new category: ${categoryName} (${categoryId})`);
        }

        // Parse best seller
        const isBestSeller = bestSellerValue 
          ? (bestSellerValue.toString().toLowerCase() === 'yes' || 
             bestSellerValue.toString().toLowerCase() === 'true' || 
             bestSellerValue.toString().toLowerCase() === '1' ||
             bestSellerValue === true || 
             bestSellerValue === 1)
          : false;

        // Check if menu item already exists (by name and category)
        const existingItem = await MenuItem.findOne({ 
          name: name,
          category: categoryId
        });

        if (existingItem) {
          // Update existing item
          existingItem.price = price;
          existingItem.owner = owner;
          existingItem.image = image || existingItem.image || '';
          existingItem.isBestSeller = isBestSeller;
          await existingItem.save();
          updatedCount++;
          console.log(`✓ Updated: ${name} (${categoryId}) - ₱${price.toFixed(2)}`);
        } else {
          // Create new item
          const menuItem = new MenuItem({
            name: name,
            price: price,
            category: categoryId,
            owner: owner,
            image: image || '',
            isBestSeller: isBestSeller
          });
          
          await menuItem.save();
          createdCount++;
          console.log(`✓ Created: ${name} (${categoryId}) - ₱${price.toFixed(2)} - Owner: ${owner}`);
        }
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
        skippedCount++;
        console.error(`❌ Error processing row ${i + 2}:`, error.message);
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('Seed Summary');
    console.log('========================================');
    console.log(`✓ Created: ${createdCount} menu items`);
    console.log(`✓ Updated: ${updatedCount} menu items`);
    console.log(`⚠ Skipped: ${skippedCount} rows`);
    
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log('\n========================================');
    console.log('Seed completed successfully!');
    console.log('========================================\n');

    // Disconnect from MongoDB
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding menu items:', error);
    process.exit(1);
  }
};

// Run the seed script
seedMenuItems();


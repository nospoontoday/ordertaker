const mongoose = require('mongoose');

/**
 * Order Item Sub-Schema
 * Represents an individual item in an order
 */
const orderItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Item price is required'],
      min: [0, 'Price cannot be negative']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1
    },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'served'],
      default: 'pending'
    },
    itemType: {
      type: String,
      enum: ['dine-in', 'take-out'],
      default: 'dine-in'
    },
    note: {
      type: String,
      required: false,
      trim: true,
      maxlength: [500, 'Note cannot be more than 500 characters']
    },
    preparingAt: {
      type: Number,
      required: false
    },
    readyAt: {
      type: Number,
      required: false
    },
    servedAt: {
      type: Number,
      required: false
    },
    preparedBy: {
      type: String,
      required: false,
      trim: true
    },
    preparedByEmail: {
      type: String,
      required: false,
      trim: true
    },
    servedBy: {
      type: String,
      required: false,
      trim: true
    },
    servedByEmail: {
      type: String,
      required: false,
      trim: true
    }
  },
  { _id: false } // Don't create _id for subdocuments
);

/**
 * Appended Order Sub-Schema
 * Represents additional items added to an existing order
 */
const appendedOrderSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: function(items) {
          return items && items.length > 0;
        },
        message: 'Appended order must have at least one item'
      }
    },
    createdAt: {
      type: Number,
      required: true,
      default: Date.now
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'gcash', 'split', null],
      default: null
    },
    cashAmount: {
      type: Number,
      required: false,
      min: [0, 'Cash amount cannot be negative']
    },
    gcashAmount: {
      type: Number,
      required: false,
      min: [0, 'GCash amount cannot be negative']
    },
    paidAmount: {
      type: Number,
      required: false,
      min: [0, 'Paid amount cannot be negative']
    },
    amountReceived: {
      type: Number,
      required: false,
      min: [0, 'Amount received cannot be negative']
    }
  },
  { _id: false } // Don't create _id for subdocuments
);

/**
 * Order Schema
 * Represents a complete customer order
 */
const orderSchema = new mongoose.Schema(
  {
    // Keep the original id format from frontend for compatibility
    id: {
      type: String,
      required: true,
      unique: true
    },
    orderNumber: {
      type: Number,
      required: false,
      sparse: true, // Allows multiple documents without orderNumber
      index: true
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Customer name cannot be more than 100 characters']
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: function(items) {
          return items && items.length > 0;
        },
        message: 'Order must have at least one item'
      }
    },
    createdAt: {
      type: Number,
      required: true,
      default: Date.now,
      index: true // Index for sorting and filtering
    },
    isPaid: {
      type: Boolean,
      default: false,
      index: true // Index for filtering paid/unpaid orders
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'gcash', 'split', null],
      default: null
    },
    cashAmount: {
      type: Number,
      required: false,
      min: [0, 'Cash amount cannot be negative']
    },
    gcashAmount: {
      type: Number,
      required: false,
      min: [0, 'GCash amount cannot be negative']
    },
    paidAmount: {
      type: Number,
      required: false,
      min: [0, 'Paid amount cannot be negative']
    },
    amountReceived: {
      type: Number,
      required: false,
      min: [0, 'Amount received cannot be negative']
    },
    orderType: {
      type: String,
      enum: ['dine-in', 'take-out'],
      required: true,
      default: 'dine-in'
    },
    appendedOrders: {
      type: [appendedOrderSchema],
      default: []
    },
    allItemsServedAt: {
      type: Number,
      required: false
    },
    orderTakerName: {
      type: String,
      required: false,
      trim: true,
      maxlength: [100, 'Order taker name cannot be more than 100 characters']
    },
    orderTakerEmail: {
      type: String,
      required: false,
      trim: true,
      maxlength: [255, 'Order taker email cannot be more than 255 characters']
    },
    notes: {
      type: [{
        id: {
          type: String,
          required: true
        },
        content: {
          type: String,
          required: [true, 'Note content is required'],
          trim: true,
          maxlength: [500, 'Note cannot be more than 500 characters']
        },
        createdAt: {
          type: Number,
          required: true,
          default: Date.now
        },
        createdBy: {
          type: String,
          required: false,
          trim: true
        },
        createdByEmail: {
          type: String,
          required: false,
          trim: true
        }
      }],
      default: []
    }
  },
  {
    timestamps: true, // Adds MongoDB createdAt and updatedAt timestamps
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index for common queries
orderSchema.index({ createdAt: -1, isPaid: 1 });
orderSchema.index({ customerName: 1, createdAt: -1 });

// Virtual for total order amount
orderSchema.virtual('totalAmount').get(function() {
  const mainTotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const appendedTotal = this.appendedOrders.reduce((sum, appended) => {
    return sum + appended.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
  }, 0);
  return mainTotal + appendedTotal;
});

// Virtual for total items count
orderSchema.virtual('totalItems').get(function() {
  const mainItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  const appendedItems = this.appendedOrders.reduce((sum, appended) => {
    return sum + appended.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
  }, 0);
  return mainItems + appendedItems;
});

// Virtual for order status
orderSchema.virtual('orderStatus').get(function() {
  const allItems = [
    ...this.items,
    ...this.appendedOrders.flatMap(appended => appended.items)
  ];

  if (allItems.every(item => item.status === 'served')) {
    return 'completed';
  } else if (allItems.some(item => item.status === 'preparing' || item.status === 'ready')) {
    return 'in_progress';
  } else {
    return 'pending';
  }
});

// Virtual for total paid amount (main order + appended orders)
orderSchema.virtual('totalPaidAmount').get(function() {
  let paidAmount = 0;
  
  // Add main order paid amount if paid
  if (this.isPaid && this.paidAmount) {
    paidAmount += this.paidAmount;
  }
  
  // Add appended orders paid amounts
  this.appendedOrders.forEach(appended => {
    if (appended.isPaid && appended.paidAmount) {
      paidAmount += appended.paidAmount;
    }
  });
  
  return paidAmount;
});

// Virtual for pending amount (total - paid)
orderSchema.virtual('pendingAmount').get(function() {
  const total = this.totalAmount || 0;
  const paid = this.totalPaidAmount || 0;
  return Math.max(0, total - paid);
});

// Pre-save middleware to validate and format data
orderSchema.pre('save', function(next) {
  // Trim customer name
  if (this.customerName) {
    this.customerName = this.customerName.trim();
  }

  // Ensure prices have max 2 decimal places
  this.items.forEach(item => {
    if (item.price) {
      item.price = Math.round(item.price * 100) / 100;
    }
  });

  this.appendedOrders.forEach(appended => {
    appended.items.forEach(item => {
      if (item.price) {
        item.price = Math.round(item.price * 100) / 100;
      }
    });
  });

  next();
});

// Static method to get orders by date range
orderSchema.statics.getOrdersByDateRange = function(startDate, endDate) {
  return this.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ createdAt: -1 });
};

// Static method to get unpaid orders
orderSchema.statics.getUnpaidOrders = function() {
  return this.find({
    $or: [
      { isPaid: false },
      { 'appendedOrders.isPaid': false }
    ]
  }).sort({ createdAt: -1 });
};

// Instance method to check if order is fully paid
orderSchema.methods.isFullyPaid = function() {
  const mainPaid = this.isPaid;
  const appendedPaid = this.appendedOrders.length === 0 ||
                       this.appendedOrders.every(appended => appended.isPaid);
  return mainPaid && appendedPaid;
};

// Instance method to check if order is fully served
orderSchema.methods.isFullyServed = function() {
  const mainServed = this.items.every(item => item.status === 'served');
  const appendedServed = this.appendedOrders.length === 0 ||
                         this.appendedOrders.every(appended =>
                           appended.items.every(item => item.status === 'served')
                         );
  return mainServed && appendedServed;
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;

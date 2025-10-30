# Split Payment Feature

## Overview
Implemented a split payment feature that allows order takers to accept payments using both Cash and GCash in a single transaction, improving UX by reducing clicks and eliminating manual calculations.

## User Flow

### Before (Old Way)
1. Customer says "I have ₱150 cash, rest on GCash"
2. Order taker manually calculates: ₱457.50 - ₱150 = ₱307.50
3. Process as two separate transactions (complex, error-prone)

### After (New Way)
1. Click **🔀 Split** button
2. Dialog opens showing total amount
3. Click quick amount button (₱50, ₱100, ₱500, etc.) OR type exact amount
4. GCash amount auto-calculates
5. Click **Complete Payment** - Done! ✅

## UI Components

### Payment Buttons
Located at the top right of order cards in:
- Active Orders
- Served (Not Paid)

Buttons available:
- **💵 Cash** - Full cash payment
- **Ⓖ GCash** - Full GCash payment
- **🔀 Split** - NEW! Split payment dialog

### Split Payment Dialog
Features:
- **Total Amount Display** - Shows order total (read-only)
- **Cash Input** - Number pad optimized input with quick amount buttons
- **Quick Buttons** - ₱50, ₱100, ₱200, ₱500, ₱1000 for fast input
- **Auto-calculated GCash** - Remaining balance updates automatically
- **Payment Summary** - Shows breakdown before confirming
- **Validation** - Ensures amounts are valid and total matches

## Technical Implementation

### Frontend Changes

#### Components
- `components/split-payment-dialog.tsx` - NEW split payment UI component
- `components/crew-dashboard.tsx` - Integrated split payment functionality

#### Data Model Updates
```typescript
interface Order {
  paymentMethod?: "cash" | "gcash" | "split" | null
  cashAmount?: number        // NEW
  gcashAmount?: number       // NEW
  // ... existing fields
}
```

#### API Updates
- `lib/api.ts` - Updated togglePayment and toggleAppendedPayment to support split payments

### Backend Changes

#### Model Updates
- `backend/models/Order.js`
  - Added `paymentMethod: 'split'` enum value
  - Added `cashAmount` field (Number, optional)
  - Added `gcashAmount` field (Number, optional)
  - Updated both main order and appended order schemas

#### Route Updates
- `backend/routes/orders.js`
  - Updated payment validation to accept 'split' method
  - Added logic to store cashAmount and gcashAmount
  - Handles clearing split amounts for non-split payments

### Display Updates
Completed orders now show split payment details:
- Single payment method: Shows **💵 Cash** or **Ⓖ GCash** badge
- Split payment: Shows **💵 ₱150.00** + **Ⓖ ₱307.50** badges

## Database Schema

### Main Order
```javascript
{
  isPaid: Boolean,
  paymentMethod: String, // 'cash' | 'gcash' | 'split' | null
  cashAmount: Number,    // Optional, for split payments
  gcashAmount: Number,   // Optional, for split payments
}
```

### Appended Order
```javascript
{
  isPaid: Boolean,
  paymentMethod: String, // 'cash' | 'gcash' | 'split' | null
  cashAmount: Number,    // Optional, for split payments
  gcashAmount: Number,   // Optional, for split payments
}
```

## Benefits

1. **Faster Checkout** - 2-3 taps vs manual calculation
2. **Error Prevention** - Auto-calculation eliminates math errors
3. **Better UX** - Quick amount buttons speed up common amounts
4. **Accurate Records** - Exact breakdown of Cash vs GCash amounts
5. **Real-time Validation** - Prevents invalid payment amounts

## Testing

Test scenarios:
1. ✅ Split payment with exact cash amount
2. ✅ Split payment using quick buttons
3. ✅ Validation prevents invalid amounts
4. ✅ Split payment displays correctly in completed orders
5. ✅ Works with both main orders and appended orders
6. ✅ Payment history shows accurate breakdown

## Future Enhancements

Potential improvements:
- Add "Round Up" button to nearest ₱50 or ₱100
- Remember commonly used amounts per user
- Add payment receipt generation with split breakdown
- Support for more payment methods (credit card, ewallet, etc.)

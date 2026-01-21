#!/bin/bash

# Clear all existing orders first
echo "Clearing all existing orders..."
curl -s -X DELETE http://localhost:5000/api/orders/all
echo ""

# Clear all withdrawals
echo "Clearing withdrawals..."
for id in $(curl -s http://localhost:5000/api/withdrawals | grep -oP '"_id":"[^"]*"' | sed 's/"_id":"//;s/"//g'); do
  curl -s -X DELETE "http://localhost:5000/api/withdrawals/$id" > /dev/null
done
echo "Withdrawals cleared."

# Current timestamp
NOW=$(date +%s)000

echo ""
echo "========================================================"
echo "COMPREHENSIVE TEST: ALL ORDER TYPES AND PAYMENT METHODS"
echo "========================================================"
echo ""

# ============================================
# SECTION 1: BASIC ORDERS - SINGLE PAYMENT METHODS
# ============================================
echo "--- SECTION 1: Basic Orders (No Appended) ---"
echo ""

# 1.1: Cash payment
echo "1.1: Dine-in, Cash, Paid (₱120)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-001",
    "customerName": "Basic Cash",
    "orderType": "dine-in",
    "items": [
      {"id": "i-001-1", "name": "Salted Caramel", "price": 40, "quantity": 3, "status": "served", "owner": "john"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "cash"
  }' | grep -o '"success":[^,]*'

# 1.2: GCash payment
echo "1.2: Take-out, GCash, Paid (₱160)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-002",
    "customerName": "Basic GCash",
    "orderType": "take-out",
    "items": [
      {"id": "i-002-1", "name": "zb 1", "price": 80, "quantity": 2, "status": "served", "owner": "elwin"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "gcash"
  }' | grep -o '"success":[^,]*'

# 1.3: Split payment
echo "1.3: Dine-in, Split, Paid (₱100 = 60 cash + 40 gcash)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-003",
    "customerName": "Basic Split",
    "orderType": "dine-in",
    "items": [
      {"id": "i-003-1", "name": "Mocha", "price": 40, "quantity": 1, "status": "served", "owner": "john"},
      {"id": "i-003-2", "name": "zions burger", "price": 60, "quantity": 1, "status": "served", "owner": "elwin"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "split",
    "cashAmount": 60,
    "gcashAmount": 40
  }' | grep -o '"success":[^,]*'

# 1.4: Legacy order - paid but NO paymentMethod (should default to cash)
echo "1.4: Legacy order, Paid, NO paymentMethod (₱50 - should count as cash)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-004",
    "customerName": "Legacy Paid",
    "orderType": "dine-in",
    "items": [
      {"id": "i-004-1", "name": "Siopao", "price": 25, "quantity": 2, "status": "served", "owner": "john"}
    ],
    "createdAt": '$NOW',
    "isPaid": true
  }' | grep -o '"success":[^,]*'

# 1.5: UNPAID order - should NOT count
echo "1.5: Unpaid order (₱200 - should NOT count)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-005",
    "customerName": "Unpaid Customer",
    "orderType": "take-out",
    "items": [
      {"id": "i-005-1", "name": "Dark Choco", "price": 50, "quantity": 4, "status": "pending", "owner": "john"}
    ],
    "createdAt": '$NOW',
    "isPaid": false
  }' | grep -o '"success":[^,]*'

echo ""
echo "--- SECTION 2: Orders with Appended (Same Payment Method) ---"
echo ""

# 2.1: Main Cash + Appended Cash
echo "2.1: Main Cash + Appended Cash (₱80 + ₱50 = ₱130)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-006",
    "customerName": "Cash+Cash",
    "orderType": "dine-in",
    "items": [
      {"id": "i-006-1", "name": "Matcha", "price": 80, "quantity": 1, "status": "served", "owner": "john"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "cash",
    "appendedOrders": [
      {
        "id": "app-006-1",
        "items": [
          {"id": "i-006-a1", "name": "Belgian Waffle", "price": 25, "quantity": 2, "status": "served", "owner": "john"}
        ],
        "createdAt": '$NOW',
        "isPaid": true,
        "paymentMethod": "cash"
      }
    ]
  }' | grep -o '"success":[^,]*'

# 2.2: Main GCash + Appended GCash
echo "2.2: Main GCash + Appended GCash (₱85 + ₱40 = ₱125)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-007",
    "customerName": "GCash+GCash",
    "orderType": "take-out",
    "items": [
      {"id": "i-007-1", "name": "zb 2", "price": 85, "quantity": 1, "status": "served", "owner": "elwin"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "gcash",
    "appendedOrders": [
      {
        "id": "app-007-1",
        "items": [
          {"id": "i-007-a1", "name": "cheezy fries", "price": 40, "quantity": 1, "status": "served", "owner": "elwin"}
        ],
        "createdAt": '$NOW',
        "isPaid": true,
        "paymentMethod": "gcash"
      }
    ]
  }' | grep -o '"success":[^,]*'

# 2.3: Main Split + Appended Split
echo "2.3: Main Split + Appended Split (₱130 + ₱45 = ₱175)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-008",
    "customerName": "Split+Split",
    "orderType": "dine-in",
    "items": [
      {"id": "i-008-1", "name": "zb mushroom", "price": 130, "quantity": 1, "status": "served", "owner": "elwin"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "split",
    "cashAmount": 80,
    "gcashAmount": 50,
    "appendedOrders": [
      {
        "id": "app-008-1",
        "items": [
          {"id": "i-008-a1", "name": "Siopao", "price": 25, "quantity": 1, "status": "served", "owner": "john"},
          {"id": "i-008-a2", "name": "Siomai", "price": 20, "quantity": 1, "status": "served", "owner": "john"}
        ],
        "createdAt": '$NOW',
        "isPaid": true,
        "paymentMethod": "split",
        "cashAmount": 25,
        "gcashAmount": 20
      }
    ]
  }' | grep -o '"success":[^,]*'

echo ""
echo "--- SECTION 3: Orders with Appended (DIFFERENT Payment Methods) ---"
echo ""

# 3.1: Main Cash + Appended GCash
echo "3.1: Main Cash + Appended GCash (₱40 cash + ₱60 gcash = ₱100)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-009",
    "customerName": "Cash+GCash",
    "orderType": "dine-in",
    "items": [
      {"id": "i-009-1", "name": "Choco", "price": 40, "quantity": 1, "status": "served", "owner": "john"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "cash",
    "appendedOrders": [
      {
        "id": "app-009-1",
        "items": [
          {"id": "i-009-a1", "name": "zions burger", "price": 60, "quantity": 1, "status": "served", "owner": "elwin"}
        ],
        "createdAt": '$NOW',
        "isPaid": true,
        "paymentMethod": "gcash"
      }
    ]
  }' | grep -o '"success":[^,]*'

# 3.2: Main GCash + Appended Cash
echo "3.2: Main GCash + Appended Cash (₱80 gcash + ₱25 cash = ₱105)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-010",
    "customerName": "GCash+Cash",
    "orderType": "take-out",
    "items": [
      {"id": "i-010-1", "name": "zb 1", "price": 80, "quantity": 1, "status": "served", "owner": "elwin"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "gcash",
    "appendedOrders": [
      {
        "id": "app-010-1",
        "items": [
          {"id": "i-010-a1", "name": "Siopao", "price": 25, "quantity": 1, "status": "served", "owner": "john"}
        ],
        "createdAt": '$NOW',
        "isPaid": true,
        "paymentMethod": "cash"
      }
    ]
  }' | grep -o '"success":[^,]*'

# 3.3: Main Split + Appended Cash
echo "3.3: Main Split + Appended Cash (₱100 split + ₱40 cash = ₱140)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-011",
    "customerName": "Split+Cash",
    "orderType": "dine-in",
    "items": [
      {"id": "i-011-1", "name": "zb combo", "price": 100, "quantity": 1, "status": "served", "owner": "elwin"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "split",
    "cashAmount": 60,
    "gcashAmount": 40,
    "appendedOrders": [
      {
        "id": "app-011-1",
        "items": [
          {"id": "i-011-a1", "name": "Hazelnut", "price": 40, "quantity": 1, "status": "served", "owner": "john"}
        ],
        "createdAt": '$NOW',
        "isPaid": true,
        "paymentMethod": "cash"
      }
    ]
  }' | grep -o '"success":[^,]*'

# 3.4: Main Split + Appended GCash
echo "3.4: Main Split + Appended GCash (₱95 split + ₱25 gcash = ₱120)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-012",
    "customerName": "Split+GCash",
    "orderType": "take-out",
    "items": [
      {"id": "i-012-1", "name": "z chicken burger", "price": 95, "quantity": 1, "status": "served", "owner": "elwin"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "split",
    "cashAmount": 45,
    "gcashAmount": 50,
    "appendedOrders": [
      {
        "id": "app-012-1",
        "items": [
          {"id": "i-012-a1", "name": "Belgian Waffle", "price": 25, "quantity": 1, "status": "served", "owner": "john"}
        ],
        "createdAt": '$NOW',
        "isPaid": true,
        "paymentMethod": "gcash"
      }
    ]
  }' | grep -o '"success":[^,]*'

# 3.5: Main Cash + Appended Split
echo "3.5: Main Cash + Appended Split (₱50 cash + ₱80 split = ₱130)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-013",
    "customerName": "Cash+Split",
    "orderType": "dine-in",
    "items": [
      {"id": "i-013-1", "name": "Dark Choco", "price": 50, "quantity": 1, "status": "served", "owner": "john"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "cash",
    "appendedOrders": [
      {
        "id": "app-013-1",
        "items": [
          {"id": "i-013-a1", "name": "Matcha", "price": 80, "quantity": 1, "status": "served", "owner": "john"}
        ],
        "createdAt": '$NOW',
        "isPaid": true,
        "paymentMethod": "split",
        "cashAmount": 30,
        "gcashAmount": 50
      }
    ]
  }' | grep -o '"success":[^,]*'

# 3.6: Main GCash + Appended Split
echo "3.6: Main GCash + Appended Split (₱40 gcash + ₱60 split = ₱100)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-014",
    "customerName": "GCash+Split",
    "orderType": "take-out",
    "items": [
      {"id": "i-014-1", "name": "Vanilla", "price": 40, "quantity": 1, "status": "served", "owner": "john"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "gcash",
    "appendedOrders": [
      {
        "id": "app-014-1",
        "items": [
          {"id": "i-014-a1", "name": "zions burger", "price": 60, "quantity": 1, "status": "served", "owner": "elwin"}
        ],
        "createdAt": '$NOW',
        "isPaid": true,
        "paymentMethod": "split",
        "cashAmount": 35,
        "gcashAmount": 25
      }
    ]
  }' | grep -o '"success":[^,]*'

echo ""
echo "--- SECTION 4: Unpaid Appended Orders (Should NOT Count) ---"
echo ""

# 4.1: Main Paid + Appended Unpaid
echo "4.1: Main Paid + Appended Unpaid (₱40 only, appended ₱60 excluded)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-015",
    "customerName": "Paid+Unpaid",
    "orderType": "dine-in",
    "items": [
      {"id": "i-015-1", "name": "Strawberry", "price": 40, "quantity": 1, "status": "served", "owner": "john"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "cash",
    "appendedOrders": [
      {
        "id": "app-015-1",
        "items": [
          {"id": "i-015-a1", "name": "zions burger", "price": 60, "quantity": 1, "status": "pending", "owner": "elwin"}
        ],
        "createdAt": '$NOW',
        "isPaid": false
      }
    ]
  }' | grep -o '"success":[^,]*'

# 4.2: Main Paid + Multiple Appended (1 paid, 1 unpaid)
echo "4.2: Main Paid + 2 Appended (1 paid gcash, 1 unpaid) (₱40 + ₱50 = ₱90)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-016",
    "customerName": "Mixed Appended",
    "orderType": "dine-in",
    "items": [
      {"id": "i-016-1", "name": "Banana", "price": 40, "quantity": 1, "status": "served", "owner": "john"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "gcash",
    "appendedOrders": [
      {
        "id": "app-016-1",
        "items": [
          {"id": "i-016-a1", "name": "Hazelnut", "price": 40, "quantity": 1, "status": "served", "owner": "john"},
          {"id": "i-016-a2", "name": "Extra Coffee", "price": 10, "quantity": 1, "status": "served", "owner": "john"}
        ],
        "createdAt": '$NOW',
        "isPaid": true,
        "paymentMethod": "gcash"
      },
      {
        "id": "app-016-2",
        "items": [
          {"id": "i-016-a3", "name": "Matcha", "price": 80, "quantity": 1, "status": "pending", "owner": "john"}
        ],
        "createdAt": '$NOW',
        "isPaid": false
      }
    ]
  }' | grep -o '"success":[^,]*'

echo ""
echo "--- SECTION 5: Edge Cases ---"
echo ""

# 5.1: Appended paid but NO paymentMethod (should default to cash)
echo "5.1: Main Cash + Appended Paid but NO paymentMethod (₱40 + ₱25 legacy = ₱65)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-017",
    "customerName": "Legacy Appended",
    "orderType": "dine-in",
    "items": [
      {"id": "i-017-1", "name": "Choco Hazelnut", "price": 40, "quantity": 1, "status": "served", "owner": "john"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "cash",
    "appendedOrders": [
      {
        "id": "app-017-1",
        "items": [
          {"id": "i-017-a1", "name": "Siopao", "price": 25, "quantity": 1, "status": "served", "owner": "john"}
        ],
        "createdAt": '$NOW',
        "isPaid": true
      }
    ]
  }' | grep -o '"success":[^,]*'

# 5.2: Multiple appended orders, all paid, different methods
echo "5.2: Main Split + 3 Appended (cash, gcash, split) (₱100 + ₱40 + ₱25 + ₱60 = ₱225)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-018",
    "customerName": "Multi Appended Methods",
    "orderType": "dine-in",
    "items": [
      {"id": "i-018-1", "name": "zb combo", "price": 100, "quantity": 1, "status": "served", "owner": "elwin"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "split",
    "cashAmount": 60,
    "gcashAmount": 40,
    "appendedOrders": [
      {
        "id": "app-018-1",
        "items": [
          {"id": "i-018-a1", "name": "Mocha", "price": 40, "quantity": 1, "status": "served", "owner": "john"}
        ],
        "createdAt": '$NOW',
        "isPaid": true,
        "paymentMethod": "cash"
      },
      {
        "id": "app-018-2",
        "items": [
          {"id": "i-018-a2", "name": "Belgian Waffle", "price": 25, "quantity": 1, "status": "served", "owner": "john"}
        ],
        "createdAt": '$NOW',
        "isPaid": true,
        "paymentMethod": "gcash"
      },
      {
        "id": "app-018-3",
        "items": [
          {"id": "i-018-a3", "name": "zions burger", "price": 60, "quantity": 1, "status": "served", "owner": "elwin"}
        ],
        "createdAt": '$NOW',
        "isPaid": true,
        "paymentMethod": "split",
        "cashAmount": 30,
        "gcashAmount": 30
      }
    ]
  }' | grep -o '"success":[^,]*'

# 5.3: High quantity items
echo "5.3: High quantity items (₱40 x 5 = ₱200)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-019",
    "customerName": "Bulk Order",
    "orderType": "take-out",
    "items": [
      {"id": "i-019-1", "name": "French Fries", "price": 40, "quantity": 5, "status": "served", "owner": "elwin"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "gcash"
  }' | grep -o '"success":[^,]*'

# 5.4: Multiple items, multiple quantities, split payment
echo "5.4: Multi-item, multi-qty, split (₱280 = 150 cash + 130 gcash)"
curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-020",
    "customerName": "Complex Order",
    "orderType": "dine-in",
    "items": [
      {"id": "i-020-1", "name": "Salted Caramel", "price": 40, "quantity": 3, "status": "served", "owner": "john"},
      {"id": "i-020-2", "name": "zb 1", "price": 80, "quantity": 2, "status": "served", "owner": "elwin"}
    ],
    "createdAt": '$NOW',
    "isPaid": true,
    "paymentMethod": "split",
    "cashAmount": 150,
    "gcashAmount": 130
  }' | grep -o '"success":[^,]*'

echo ""
echo "========================================================"
echo "EXPECTED CALCULATIONS"
echo "========================================================"
echo ""
echo "SECTION 1 - Basic Orders:"
echo "  1.1 Cash:     ₱120 (cash)"
echo "  1.2 GCash:    ₱160 (gcash)"
echo "  1.3 Split:    ₱100 (60 cash + 40 gcash)"
echo "  1.4 Legacy:   ₱50  (cash - no method defaults to cash)"
echo "  1.5 Unpaid:   ₱0   (excluded)"
echo "  Subtotal:     ₱430 (230 cash + 200 gcash)"
echo ""
echo "SECTION 2 - Same Payment Methods:"
echo "  2.1 Cash+Cash:     ₱130 (130 cash)"
echo "  2.2 GCash+GCash:   ₱125 (125 gcash)"
echo "  2.3 Split+Split:   ₱175 (105 cash + 70 gcash)"
echo "  Subtotal:          ₱430 (235 cash + 195 gcash)"
echo ""
echo "SECTION 3 - Different Payment Methods:"
echo "  3.1 Cash+GCash:    ₱100 (40 cash + 60 gcash)"
echo "  3.2 GCash+Cash:    ₱105 (25 cash + 80 gcash)"
echo "  3.3 Split+Cash:    ₱140 (100 cash + 40 gcash)"
echo "  3.4 Split+GCash:   ₱120 (45 cash + 75 gcash)"
echo "  3.5 Cash+Split:    ₱130 (80 cash + 50 gcash)"
echo "  3.6 GCash+Split:   ₱100 (35 cash + 65 gcash)"
echo "  Subtotal:          ₱695 (325 cash + 370 gcash)"
echo ""
echo "SECTION 4 - Unpaid Appended:"
echo "  4.1 Paid+Unpaid:   ₱40  (40 cash)"
echo "  4.2 Mixed Append:  ₱90  (90 gcash)"
echo "  Subtotal:          ₱130 (40 cash + 90 gcash)"
echo ""
echo "SECTION 5 - Edge Cases:"
echo "  5.1 Legacy Append: ₱65  (65 cash - legacy defaults to cash)"
echo "  5.2 Multi Methods: ₱225 (130 cash + 95 gcash)"
echo "  5.3 High Qty:      ₱200 (200 gcash)"
echo "  5.4 Complex Split: ₱280 (150 cash + 130 gcash)"
echo "  Subtotal:          ₱770 (345 cash + 425 gcash)"
echo ""
echo "========================================================"
echo "GRAND TOTALS EXPECTED:"
echo "========================================================"
echo "  Total Gross: ₱2,455"
echo "  Total Cash:  ₱1,175"
echo "  Total GCash: ₱1,280"
echo "========================================================"
echo ""

echo "Fetching daily sales to verify..."
echo ""
curl -s "http://localhost:5000/api/orders/daily-sales?page=1&limit=1" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success') and data.get('data'):
    d = data['data'][0]
    print('ACTUAL RESULTS FROM API:')
    print('=' * 50)
    print(f\"Total Gross Sales: ₱{d['totalSales']:.2f}\")
    print(f\"Gross Cash:        ₱{d['grossCash']:.2f}\")
    print(f\"Gross GCash:       ₱{d['grossGcash']:.2f}\")
    print(f\"Net Sales:         ₱{d['netSales']:.2f}\")
    print()
    print('Owner Breakdown:')
    print(f\"  John:  ₱{d['salesByOwner']['john']:.2f}\")
    print(f\"  Elwin: ₱{d['salesByOwner']['elwin']:.2f}\")
    print()

    # Verify totals
    expected_total = 2455
    expected_cash = 1175
    expected_gcash = 1280

    print('=' * 50)
    print('VERIFICATION:')
    print('=' * 50)

    total_ok = abs(d['totalSales'] - expected_total) < 0.01
    cash_ok = abs(d['grossCash'] - expected_cash) < 0.01
    gcash_ok = abs(d['grossGcash'] - expected_gcash) < 0.01

    print(f\"Total Gross: {'✓ PASS' if total_ok else '✗ FAIL'} (expected {expected_total}, got {d[\"totalSales\"]:.2f})\")
    print(f\"Cash:        {'✓ PASS' if cash_ok else '✗ FAIL'} (expected {expected_cash}, got {d[\"grossCash\"]:.2f})\")
    print(f\"GCash:       {'✓ PASS' if gcash_ok else '✗ FAIL'} (expected {expected_gcash}, got {d[\"grossGcash\"]:.2f})\")

    if total_ok and cash_ok and gcash_ok:
        print()
        print('🎉 ALL TESTS PASSED!')
    else:
        print()
        print('❌ SOME TESTS FAILED - Investigation needed')

        # Show discrepancy
        if not total_ok:
            print(f'   Total discrepancy: {d[\"totalSales\"] - expected_total:.2f}')
        if not cash_ok:
            print(f'   Cash discrepancy: {d[\"grossCash\"] - expected_cash:.2f}')
        if not gcash_ok:
            print(f'   GCash discrepancy: {d[\"grossGcash\"] - expected_gcash:.2f}')
else:
    print('Error:', data)
"

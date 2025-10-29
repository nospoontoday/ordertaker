# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 (App Router) order management application for a coffee shop/cafe. It features two main views:

1. **Order Taker**: Interface for taking customer orders with menu items (coffee, food, pastries)
2. **Crew Dashboard**: Kitchen/crew interface for tracking order status and managing payments

The app uses localStorage for data persistence and supports order appending (adding items to existing orders).

## Commands

```bash
# Development
npm run dev          # Start development server (default: http://localhost:3000)

# Build & Production
npm run build        # Build for production
npm start            # Start production server

# Linting
npm run lint         # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 16 with React 19 (App Router, Client Components)
- **Styling**: Tailwind CSS v4 with CSS variables theming
- **UI Components**: shadcn/ui (New York style) with Radix UI primitives
- **Icons**: lucide-react
- **Forms**: react-hook-form with zod validation
- **State**: React hooks with localStorage persistence
- **Analytics**: Vercel Analytics

## Architecture

### Component Structure

- `app/page.tsx`: Main entry point with view toggle (Order Taker vs Crew Dashboard)
- `app/layout.tsx`: Root layout with global styles and analytics
- `components/order-taker.tsx`: Order creation/appending interface (~530 lines)
- `components/crew-dashboard.tsx`: Order status tracking and payment management (~730 lines)
- `components/ui/`: shadcn/ui component library

### Data Model

Orders are stored in localStorage with this structure:

```typescript
interface Order {
  id: string                    // Format: "order-{timestamp}"
  customerName: string
  items: OrderItem[]
  createdAt: number
  isPaid: boolean
  appendedOrders?: AppendedOrder[]  // Additional orders added after initial order
}

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  status: "pending" | "preparing" | "ready" | "served"
}

interface AppendedOrder {
  id: string                    // Format: "appended-{timestamp}"
  items: OrderItem[]
  createdAt: number
  isPaid?: boolean
}
```

### State Management

- Orders are synchronized between views via localStorage
- Each view loads/saves from `localStorage.getItem("orders")`
- Parent component (`app/page.tsx`) handles view switching and order appending flow
- Order appending flow: Dashboard → triggers append → switches to Order Taker → adds items → returns to Dashboard

### Key Features

1. **Menu System**: Categories (Best Sellers, Coffee, Food, Pastry) with images
2. **Order Appending**: Add items to existing orders (tracked separately for payment)
3. **Status Tracking**: 4-stage item lifecycle (pending → preparing → ready → served)
4. **Payment Tracking**: Separate payment status for main orders and appended orders
5. **Dashboard Columns**:
   - Active Orders: Orders with items not yet fully served
   - Served (Not Paid): All items served but payment pending
   - Completed Orders: Fully served and fully paid

## Path Aliases

- `@/` maps to project root
- `@/components` for components
- `@/lib` for utilities
- `@/hooks` for custom hooks
- `@/components/ui` for shadcn/ui components

## Styling

- Uses Tailwind CSS v4 with `@tailwindcss/postcss`
- Theme configured via CSS variables in `app/globals.css`
- shadcn/ui components use `cn()` utility from `lib/utils.ts` for className merging
- Responsive design with mobile-first approach

## Important Notes

- All main components use `"use client"` directive (client-side rendering)
- Menu items and categories are hardcoded in `order-taker.tsx` (MENU_ITEMS, CATEGORIES)
- Images referenced are in `/public` directory
- No backend API - all data persists in browser localStorage
- Order IDs use timestamp-based generation (not suitable for production without backend)

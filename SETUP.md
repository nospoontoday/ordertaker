# Order Taker Application - Complete Setup Guide

This guide will walk you through setting up the full-stack Order Taker application with MongoDB backend and Next.js frontend.

## Overview

The application consists of:
- **Backend**: Node.js + Express + MongoDB (port 5000)
- **Frontend**: Next.js 16 + React 19 + TypeScript (port 3000)

## Prerequisites

Before you begin, ensure you have installed:
- **Node.js** v18 or higher ([nodejs.org](https://nodejs.org/))
- **MongoDB** ([mongodb.com/try/download/community](https://www.mongodb.com/try/download/community))
  - Or use MongoDB Atlas (free cloud database)
- **npm** or **yarn** (comes with Node.js)

## Quick Start

### Step 1: Install MongoDB

#### Option A: Local MongoDB Installation

**Windows:**
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Run the installer with default settings
3. MongoDB will start automatically as a Windows service

**macOS (using Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**Verify MongoDB is running:**
```bash
mongosh
# Should connect successfully. Type 'exit' to quit.
```

#### Option B: MongoDB Atlas (Cloud)

1. Create account at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster (M0 Sandbox)
3. Create a database user (Database Access)
4. Add your IP to whitelist (Network Access) - or use `0.0.0.0/0` for development
5. Get connection string: Cluster > Connect > Connect your application
6. Replace `<password>` with your database user password

### Step 2: Set Up Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

**Edit `backend/.env`:**

For local MongoDB:
```env
MONGODB_URI=mongodb://localhost:27017/ordertaker
PORT=5000
NODE_ENV=development
```

For MongoDB Atlas:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ordertaker?retryWrites=true&w=majority
PORT=5000
NODE_ENV=development
```

**Start the backend server:**
```bash
# Development mode (auto-restart on changes)
npm run dev

# You should see:
# =========================================
# Server is running on port 5000
# MongoDB Connected: localhost
# =========================================
```

### Step 3: Set Up Frontend

Open a **new terminal window** (keep backend running):

```bash
# Navigate to project root
cd ..

# Install dependencies (if not already done)
npm install

# Create environment file
cp .env.local.example .env.local
```

**Edit `.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Start the frontend:**
```bash
npm run dev

# Next.js will start on http://localhost:3000
```

### Step 4: Access the Application

1. **Open browser**: [http://localhost:3000](http://localhost:3000)
2. **Register/Login**: Create an account or use existing credentials
3. **Access Admin Dashboard**: Click the "Admin" button in the top-right

## Using the Admin Dashboard

### First-Time Setup

1. **Navigate to Admin Dashboard**: Click "Admin" button in navbar
2. **Create Categories First**:
   - Click "Manage Categories"
   - Add categories:
     - ID: `coffee`, Name: `Coffee`, Image: `/coffee-cup.png`
     - ID: `food`, Name: `Food`, Image: `/food-plate.png`
     - ID: `pastry`, Name: `Pastry`, Image: `/pastry-dessert.jpg`
3. **Add Menu Items**:
   - Return to main admin page
   - Click "Add Menu Item"
   - Fill in the form (Name, Price, Category, Image URL)
   - Check "Mark as Best Seller" for popular items
   - Click "Create"

### Managing Menu Items

**Add New Item:**
1. Click "Add Menu Item" button
2. Fill in required fields:
   - Name (required)
   - Price (required)
   - Category (required - select from dropdown)
   - Image URL (optional - can be web URL or local path)
   - Best Seller checkbox (optional)
3. Click "Create"

**Edit Item:**
1. Click the edit icon (pencil) next to any menu item
2. Modify fields as needed
3. Click "Update"

**Delete Item:**
1. Click the delete icon (trash) next to any menu item
2. Confirm deletion

### Managing Categories

1. Click "Manage Categories" from admin dashboard
2. Similar interface to menu items
3. **Note**: Category ID cannot be changed after creation

## How It Works

### Architecture

```
┌─────────────────┐         HTTP/REST API        ┌─────────────────┐
│                 │◄──────────────────────────────┤                 │
│   Next.js       │         (port 3000           │   Express.js    │
│   Frontend      │          → 5000)             │   Backend       │
│                 │──────────────────────────────►│                 │
└─────────────────┘                               └────────┬────────┘
                                                           │
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │    MongoDB      │
                                                  │    Database     │
                                                  └─────────────────┘
```

### Data Flow

1. **Admin adds menu item** → Saves to MongoDB
2. **User opens Order Taker** → Fetches menu items from MongoDB via API
3. **API unavailable?** → Falls back to cached data or hardcoded defaults
4. **Admin updates item** → Changes reflect immediately (after refresh)

### API Integration

The frontend automatically:
- Fetches menu items and categories from backend on load
- Caches data in localStorage for offline use
- Falls back to hardcoded defaults if backend is unavailable
- Shows "Offline Mode" badge when API is unreachable
- Provides "Refresh Menu" button to reload data

## Troubleshooting

### Backend Won't Start

**Error: "EADDRINUSE: port 5000 already in use"**
```bash
# Find what's using port 5000
# macOS/Linux:
lsof -i :5000
# Windows:
netstat -ano | findstr :5000

# Either kill that process or change port in backend/.env:
PORT=5001

# Also update frontend .env.local:
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

**Error: "MongooseServerSelectionError"**
- MongoDB is not running
- Start MongoDB: `brew services start mongodb-community` (macOS)
- Or check MongoDB Atlas connection string and network access

**Error: "Authentication failed"** (MongoDB Atlas)
- Verify username/password in connection string
- Check if IP is whitelisted in MongoDB Atlas Network Access

### Frontend Issues

**Menu items not loading:**
1. Check browser console for errors (F12)
2. Verify backend is running: [http://localhost:5000/api/health](http://localhost:5000/api/health)
3. Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
4. Restart Next.js dev server: `Ctrl+C` and `npm run dev`

**Admin dashboard shows "Failed to load data":**
- Backend server is not running
- Check backend terminal for errors
- Verify MongoDB is connected (check backend logs)

**Toast notifications not working:**
- These use shadcn/ui Toast component
- Should work automatically with existing setup

### Database Issues

**Menu items not persisting:**
- Check MongoDB connection in backend logs
- Verify you created the database user (Atlas)
- Try connecting with mongosh: `mongosh "your-connection-string"`

**Want to reset database:**
```bash
# Connect to MongoDB
mongosh

# Use the database
use ordertaker

# Drop all data
db.menuitems.deleteMany({})
db.categories.deleteMany({})
```

## Development Tips

### Running Both Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### API Testing

Test backend endpoints directly:
```bash
# Get all menu items
curl http://localhost:5000/api/menu-items

# Get all categories
curl http://localhost:5000/api/categories

# Health check
curl http://localhost:5000/api/health
```

### Code Structure

```
ordertakerapp/
├── backend/                    # Express.js backend
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── models/
│   │   ├── MenuItem.js        # Menu item schema
│   │   └── Category.js        # Category schema
│   ├── routes/
│   │   ├── menuItems.js       # Menu items endpoints
│   │   └── categories.js      # Categories endpoints
│   ├── server.js              # Express server
│   └── .env                   # Backend config (create from .env.example)
│
├── app/                       # Next.js app router
│   ├── admin/
│   │   ├── page.tsx          # Menu items admin
│   │   └── categories/
│   │       └── page.tsx      # Categories admin
│   ├── login/                # Login page
│   ├── register/             # Register page
│   └── page.tsx              # Main app (Order Taker + Crew Dashboard)
│
├── components/
│   ├── order-taker.tsx       # Order taking interface (with API integration)
│   └── crew-dashboard.tsx    # Kitchen dashboard
│
├── lib/
│   └── api.ts                # API client functions
│
├── contexts/
│   └── auth-context.tsx      # Authentication context
│
└── .env.local                 # Frontend config (create from .env.local.example)
```

## Production Deployment

### Environment Variables

**Backend (.env):**
```env
MONGODB_URI=<production-mongodb-uri>
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
```

### Deployment Options

**Backend:**
- Railway
- Render
- Heroku
- DigitalOcean App Platform
- AWS Elastic Beanstalk

**Frontend:**
- Vercel (recommended for Next.js)
- Netlify
- AWS Amplify

**Database:**
- MongoDB Atlas (free tier available)

## Features

### Implemented

- Full CRUD operations for menu items and categories
- Admin dashboard with table views and forms
- Real-time menu updates
- Offline fallback with localStorage caching
- Category filtering
- Best sellers functionality
- Form validation
- Error handling with toast notifications
- Responsive design
- Authentication requirement for admin access

### API Features

- RESTful API design
- Input validation with Mongoose
- Error handling middleware
- CORS configuration
- Query parameter filtering
- Consistent response format

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify both servers are running
3. Check browser console and server logs for errors
4. Ensure MongoDB is connected and accessible

## Next Steps

After setup:
1. Create categories through admin dashboard
2. Add menu items
3. Test the Order Taker interface
4. Customize menu items for your needs
5. Add more categories as needed
6. Consider adding authentication to API endpoints for production use

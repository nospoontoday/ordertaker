# Quick Start Guide

Get the Order Taker app running in 5 minutes!

## Prerequisites

- Node.js installed
- MongoDB installed (or MongoDB Atlas account)

## Step 1: Start MongoDB

**Local MongoDB:**
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows - MongoDB runs automatically as a service
```

**OR use MongoDB Atlas** (cloud - free tier available)
- Sign up at mongodb.com/atlas
- Create a free cluster
- Get connection string

## Step 2: Start Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
```
MONGODB_URI=mongodb://localhost:27017/ordertaker
PORT=5000
NODE_ENV=development
```

Start server:
```bash
npm run dev
```

You should see: "Server is running on port 5000"

## Step 3: Start Frontend

**Open a new terminal:**

```bash
cd ..  # back to project root
npm install
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start app:
```bash
npm run dev
```

## Step 4: Set Up Menu

1. Open http://localhost:3000
2. Login or register
3. Click "Admin" button (top right)
4. Click "Manage Categories"
5. Add these categories:
   - ID: `coffee`, Name: `Coffee`
   - ID: `food`, Name: `Food`
   - ID: `pastry`, Name: `Pastry`
6. Go back and add menu items!

## Done!

Your Order Taker app is now running with a MongoDB backend.

---

## Terminal Setup

You'll need 2 terminal windows:

**Terminal 1 - Backend:**
```
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```
npm run dev
```

Keep both running while developing.

---

## Verify Everything Works

1. Backend health check: http://localhost:5000/api/health
2. Frontend: http://localhost:3000
3. Admin: http://localhost:3000/admin

---

## Troubleshooting

**Backend won't start:**
- Is MongoDB running? Try: `mongosh`
- Port 5000 taken? Change PORT in backend/.env

**Frontend shows "Failed to load data":**
- Is backend running? Check terminal 1
- Check .env.local has correct API URL

**Need help?** See SETUP.md for detailed instructions.

# Order Taker Backend API

Express.js + MongoDB backend for the Order Taker application.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up MongoDB

#### Option A: Local MongoDB

1. Install MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Start MongoDB service:
   - **Windows**: MongoDB should start automatically as a service
   - **macOS**: `brew services start mongodb-community`
   - **Linux**: `sudo systemctl start mongod`

#### Option B: MongoDB Atlas (Cloud)

1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier available)
3. Create a database user with read/write permissions
4. Get your connection string from "Connect" > "Connect your application"

### 3. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set your MongoDB connection string:

   **For Local MongoDB:**
   ```
   MONGODB_URI=mongodb://localhost:27017/ordertaker
   PORT=5000
   NODE_ENV=development
   ```

   **For MongoDB Atlas:**
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ordertaker?retryWrites=true&w=majority
   PORT=5000
   NODE_ENV=development
   ```

### 4. Start the Server

#### Development Mode (with auto-restart):
```bash
npm run dev
```

#### Production Mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
- `GET /api/health` - Check if server is running

### Menu Items
- `GET /api/menu-items` - Get all menu items
  - Query params: `?category=coffee&bestSellers=true`
- `GET /api/menu-items/:id` - Get single menu item
- `POST /api/menu-items` - Create new menu item
- `PUT /api/menu-items/:id` - Update menu item
- `DELETE /api/menu-items/:id` - Delete menu item

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get single category
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

## Testing the API

### Using curl:

```bash
# Get all menu items
curl http://localhost:5000/api/menu-items

# Create a menu item
curl -X POST http://localhost:5000/api/menu-items \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Espresso",
    "price": 3.5,
    "category": "coffee",
    "image": "/espresso.png",
    "isBestSeller": true
  }'

# Create a category
curl -X POST http://localhost:5000/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "id": "coffee",
    "name": "Coffee",
    "image": "/coffee-cup.png"
  }'
```

### Using the Admin Dashboard:

1. Start the Next.js frontend: `npm run dev` (from root directory)
2. Navigate to `http://localhost:3000/admin`
3. Use the UI to manage menu items and categories

## Troubleshooting

### MongoDB Connection Issues

**Error: "MongooseServerSelectionError"**
- Verify MongoDB is running: `mongosh` (should connect)
- Check connection string in `.env`
- For Atlas: Verify IP whitelist and user credentials

**Error: "ECONNREFUSED"**
- MongoDB service is not running
- Start the service using instructions in Setup step 2

### Port Already in Use

If port 5000 is already in use, change the `PORT` in `.env`:
```
PORT=5001
```

Also update `NEXT_PUBLIC_API_URL` in the frontend's `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

## Project Structure

```
backend/
├── config/
│   └── db.js              # MongoDB connection configuration
├── models/
│   ├── MenuItem.js        # MenuItem schema and model
│   └── Category.js        # Category schema and model
├── routes/
│   ├── menuItems.js       # Menu items API routes
│   └── categories.js      # Categories API routes
├── server.js              # Express server setup
├── package.json           # Dependencies and scripts
├── .env.example           # Example environment variables
└── .gitignore            # Git ignore rules
```

## Development Notes

- The server uses CORS to allow requests from the Next.js frontend (port 3000)
- All API responses follow a consistent format: `{ success, data, error }`
- Input validation is handled by Mongoose schemas
- Errors are logged to console and returned as JSON

## Next Steps

After starting the backend:
1. Use the admin dashboard to create categories (coffee, food, pastry)
2. Add menu items through the dashboard
3. Menu items will automatically appear in the Order Taker interface

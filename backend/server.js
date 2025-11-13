require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  }
});

// Connect to MongoDB
connectDB();

// Middleware
// CORS configuration - WIDE OPEN (no restrictions)
app.use(cors({
  origin: '*', // Allow all origins
  credentials: false, // Disable credentials requirement
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: '*', // Allow all headers
  exposedHeaders: '*', // Expose all headers
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible to routes
app.set('io', io);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware (enabled for both development and production)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  
  // Log more details in production for debugging
  if (process.env.NODE_ENV === 'production') {
    console.log(`[${timestamp}] Origin:`, req.headers.origin || 'none');
    console.log(`[${timestamp}] User-Agent:`, req.headers['user-agent'] || 'none');
    console.log(`[${timestamp}] IP:`, req.ip || req.connection.remoteAddress || 'unknown');
  }
  
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/menu-items', require('./routes/menuItems'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/withdrawals', require('./routes/withdrawals'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/cart', require('./routes/cart'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Order Taker API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      menuItems: '/api/menu-items',
      categories: '/api/categories',
      upload: '/api/upload',
      orders: '/api/orders',
      withdrawals: '/api/withdrawals',
      inventory: '/api/inventory',
      cart: '/api/cart',
      images: '/uploads/:filename'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`✓ Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`✗ Client disconnected: ${socket.id}`);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`
  =========================================
  Server is running on port ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}

  API Endpoints:
  - Health Check: http://localhost:${PORT}/api/health
  - Auth:         http://localhost:${PORT}/api/auth
  - Menu Items:   http://localhost:${PORT}/api/menu-items
  - Categories:   http://localhost:${PORT}/api/categories
  - Upload:       http://localhost:${PORT}/api/upload
  - Orders:       http://localhost:${PORT}/api/orders
  - Withdrawals:  http://localhost:${PORT}/api/withdrawals
  - Inventory:    http://localhost:${PORT}/api/inventory
  - Images:       http://localhost:${PORT}/uploads/:filename

  WebSocket:
  - Real-time updates enabled on port ${PORT}
  =========================================
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

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
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Connect to MongoDB
connectDB();

// Middleware
// CORS configuration - allow requests from frontend and mobile browsers
const corsOptions = {
  origin: function (origin, callback) {
    // Log CORS check for debugging in production
    if (process.env.NODE_ENV === 'production') {
      console.log(`[${new Date().toISOString()}] [CORS] Checking origin:`, origin || 'none');
      console.log(`[${new Date().toISOString()}] [CORS] FRONTEND_URL:`, process.env.FRONTEND_URL || 'not set');
    }
    
    // Allow requests with no origin (mobile browsers, Postman, etc.)
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        console.log(`[${new Date().toISOString()}] [CORS] Allowing request with no origin`);
      }
      return callback(null, true);
    }
    
    // Build list of allowed origins
    const allowedOrigins = [];
    
    // Add FRONTEND_URL if set
    if (process.env.FRONTEND_URL) {
      const frontendUrl = process.env.FRONTEND_URL.trim();
      allowedOrigins.push(frontendUrl);
      // Also add without trailing slash
      if (frontendUrl.endsWith('/')) {
        allowedOrigins.push(frontendUrl.slice(0, -1));
      } else {
        allowedOrigins.push(frontendUrl + '/');
      }
    }
    
    // Add localhost for development
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:3000', 'http://localhost');
    }
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      return origin === allowed || 
             origin === allowed.replace(/\/$/, '') ||
             origin === allowed + '/';
    });
    
    // In production, allow if origin matches or if FRONTEND_URL matches
    // Also be lenient for mobile browsers that might have slightly different origins
    if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL) {
      // Allow if exact match, or if origin starts with FRONTEND_URL (for mobile subdomains, etc.)
      if (isAllowed || origin.startsWith(process.env.FRONTEND_URL)) {
        console.log(`[${new Date().toISOString()}] [CORS] ✓ Allowing origin:`, origin);
        callback(null, true);
      } else {
        console.log(`[${new Date().toISOString()}] [CORS] ✓ Allowing origin (lenient):`, origin);
        callback(null, true); // Temporarily allow all to fix mobile issue
      }
    } else {
      // In development or if FRONTEND_URL not set, allow the origin
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 200 // Important for mobile browsers and legacy clients
};

app.use(cors(corsOptions));

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

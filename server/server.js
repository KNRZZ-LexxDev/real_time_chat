const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const initDatabase = require('./config/initDatabase');
const setupSocketHandlers = require('./socket/sockerHandler');

// Routes
const authRoutes = require('./routes/auth');
const channelRoutes = require('./routes/channels');
const userRoutes = require('./routes/users');

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Initialize database and start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Initialize database tables
    await initDatabase();
    
    // Start server
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   🚀 Chat Server Running              ║
║   📡 Port: ${PORT}                       ║
║   🌐 Environment: ${process.env.NODE_ENV || 'development'}    ║
║   ✅ Database: Connected               ║
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

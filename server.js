// server.js
const express = require('express');
const path = require('path');
const app = express();
require('dotenv').config();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Debug middleware - log all requests
app.use((req, res, next) => {
    console.log(`🔍 ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const repRoutes = require('./routes/representative');
const publicRoutes = require('./routes/public');
const adminApiRoutes = require('./routes/admin-api');

app.use('/api/auth', authRoutes);

// ============================================
// SIMPLE DASHBOARD ROUTES - NO AUTH FOR NOW
// ============================================

// Admin Dashboard
app.get('/admin/dashboard', (req, res) => {
  console.log('✅ Admin dashboard accessed');
  res.render('admin-dashboard');
});

// Representative Dashboard
app.get('/representative/dashboard', (req, res) => {
  console.log('✅ Representative dashboard accessed');
  res.render('representative-dashboard');
});

// Public routes
app.use('/admin', adminRoutes);
app.use('/representative', repRoutes);
app.use('/api/admin', adminApiRoutes);
app.use('/', publicRoutes);

// Login route
app.get('/login', (req, res) => {
  console.log('🔐 Login page accessed');
  res.render('login');
});

// Signup route
app.get('/signup', (req, res) => {
  console.log('🔐 Signup page accessed');
  res.render('signup');
});

// Home route
app.get('/', (req, res) => {
  console.log('🏠 Home page accessed');
  res.render('home');
});

// Bracket route
app.get('/bracket', (req, res) => {
  console.log('🏆 Bracket page accessed');
  res.render('bracket');
});

// ============================================
// FIXED ERROR HANDLING (no missing EJS files)
// ============================================

// Error handling for undefined routes
app.use((req, res) => {
    console.log(`❌ 404 - Route not found: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        error: 'Page not found',
        message: `The route ${req.method} ${req.url} does not exist.`,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.message);
    res.status(500).json({
        success: false,
        error: 'Server error',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
🚀 African Nations League Server running on port ${PORT}
🔗 Home page: http://localhost:${PORT}
🔗 Login: http://localhost:${PORT}/login
🔗 Signup: http://localhost:${PORT}/signup
🔗 Tournament Bracket: http://localhost:${PORT}/bracket
🔗 Admin Dashboard: http://localhost:${PORT}/admin/dashboard
🔗 Representative Dashboard: http://localhost:${PORT}/representative/dashboard
  `);
});
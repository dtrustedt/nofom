// backend/src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const triageRoutes = require('./routes/triage');
const patientRoutes = require('./routes/patients');
const syncRoutes = require('./routes/sync');
const authRoutes = require('./routes/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security + logging middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Health check — Railway uses this to confirm app is alive
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'nofom-api', ts: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/sync', syncRoutes);

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;

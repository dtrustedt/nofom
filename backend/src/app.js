// backend/src/app.js
'use strict'

require('dotenv').config()
const express   = require('express')
const cors      = require('cors')
const helmet    = require('helmet')
const morgan    = require('morgan')
const rateLimit = require('express-rate-limit')

const triageRoutes  = require('./routes/triage')
const patientRoutes = require('./routes/patients')
const syncRoutes    = require('./routes/sync')
const authRoutes    = require('./routes/auth')
const errorHandler  = require('./middleware/errorHandler')

const app = express()

const adminRoutes   = require('./routes/admin')

const followupRoutes = require('./routes/followup')

const diagnosticRoutes = require('./routes/diagnostics')

// ── CORS ─────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean)

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true)
    if (origin.endsWith('.vercel.app')) return callback(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    console.warn(`[CORS] Blocked: ${origin}`)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials:    true,
  methods:        ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}))

// ── Rate limiting ─────────────────────────────────────────────
// General API limit: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              100,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: 'Too many requests. Please try again later.' }
})

// Sync limit: 30 sync requests per 15 minutes
// Prevents infinite retry loops from buggy clients
const syncLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              30,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: 'Sync rate limit exceeded. Wait before retrying.' }
})

// ── Security middleware ───────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(morgan('combined'))
app.use(express.json({ limit: '500kb' }))

// ── Public routes ─────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok', service: 'nofom-api', ts: new Date().toISOString()
}))
app.use('/api/auth', generalLimiter, authRoutes)

// ── Protected routes ──────────────────────────────────────────
app.use('/api/triage',   generalLimiter, triageRoutes)
app.use('/api/patients', generalLimiter, patientRoutes)
app.use('/api/sync',     syncLimiter,    syncRoutes)
app.use('/api/admin',    adminRoutes)
app.use('/api/followup', followupRoutes)
app.use('/api/diagnostics', diagnosticRoutes)

// ── Error handler ─────────────────────────────────────────────
app.use(errorHandler)

module.exports = app

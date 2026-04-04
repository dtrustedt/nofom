// backend/src/app.js
'use strict'

require('dotenv').config()
const express    = require('express')
const cors       = require('cors')
const helmet     = require('helmet')
const morgan     = require('morgan')

const triageRoutes  = require('./routes/triage')
const patientRoutes = require('./routes/patients')
const syncRoutes    = require('./routes/sync')
const authRoutes    = require('./routes/auth')
const errorHandler  = require('./middleware/errorHandler')

const app = express()

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
app.options('*', cors())

// ── General middleware ────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(morgan('combined'))
app.use(express.json({ limit: '500kb' }))

// ── Public routes (no auth required) ─────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok', service: 'nofom-api', ts: new Date().toISOString()
}))
app.use('/api/auth', authRoutes)

// ── Protected routes (JWT required) ──────────────────────────
// Auth middleware is applied per-route inside each router file
// so individual endpoints can opt into optionalToken if needed
app.use('/api/triage',   triageRoutes)
app.use('/api/patients', patientRoutes)
app.use('/api/sync',     syncRoutes)

// ── Error handler (must be last) ─────────────────────────────
app.use(errorHandler)

module.exports = app

// backend/src/middleware/auth.js
'use strict'

const supabase = require('../db/supabase')

/**
 * verifyToken
 * 
 * Extracts Bearer token from Authorization header,
 * verifies it with Supabase, and attaches the user
 * and their health_worker profile to req.
 * 
 * Usage: router.post('/', verifyToken, handler)
 */
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or malformed Authorization header',
        hint:  'Expected: Authorization: Bearer <token>'
      })
    }

    const token = authHeader.split(' ')[1]

    // Verify token with Supabase — returns the user if valid
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        hint:  'Please log in again'
      })
    }

    // Attach auth user to request
    req.user = user

    // Fetch health worker profile so routes can use worker ID + facility
    const { data: worker } = await supabase
      .from('health_workers')
      .select('id, full_name, role, facility_id')
      .eq('auth_user_id', user.id)
      .single()

    // Attach worker profile (may be null for users not yet linked)
    req.worker = worker || null

    next()
  } catch (err) {
    next(err)
  }
}

/**
 * optionalToken
 * 
 * Same as verifyToken but does NOT reject if token is missing.
 * Used for endpoints that work both authenticated and anonymous
 * (e.g. offline sync retry without a fresh session).
 */
async function optionalToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user   = null
    req.worker = null
    return next()
  }
  return verifyToken(req, res, next)
}

module.exports = { verifyToken, optionalToken }

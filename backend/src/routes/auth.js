// backend/src/routes/auth.js
'use strict'

const express  = require('express')
const supabase = require('../db/supabase')

const router = express.Router()

/**
 * POST /api/auth/verify
 * Lightweight token verification endpoint.
 * Frontend can ping this to confirm its token is still valid.
 */
router.post('/verify', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false, error: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ valid: false, error: 'Invalid token' })
    }

    const { data: worker } = await supabase
      .from('health_workers')
      .select('id, full_name, role, facility_id')
      .eq('auth_user_id', user.id)
      .single()

    res.json({
      valid:   true,
      user_id: user.id,
      email:   user.email,
      worker:  worker || null
    })
  } catch (err) { next(err) }
})

module.exports = router

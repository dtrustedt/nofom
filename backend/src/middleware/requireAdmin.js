// backend/src/middleware/requireAdmin.js
'use strict'

/**
 * requireAdmin
 * Must be used AFTER verifyToken — assumes req.worker is populated.
 * Rejects requests from non-admin workers with 403.
 */
function requireAdmin(req, res, next) {
  if (!req.worker) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  if (req.worker.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      hint:  'Your account does not have admin privileges'
    })
  }

  next()
}

module.exports = { requireAdmin }

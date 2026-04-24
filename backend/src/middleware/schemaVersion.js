// backend/src/middleware/schemaVersion.js
'use strict'

/**
 * Injects canonical schema version headers on every response.
 * Required for audit trail and multi-country traceability.
 * Per schema section 13 — versioning policy.
 */
function schemaVersionHeaders(req, res, next) {
  res.setHeader('X-Nofom-Schema-Version',        '1.0.0')
  res.setHeader('X-Nofom-Triage-Logic-Version',  '1.0.0')
  res.setHeader('X-Nofom-Country-Profile',       'NG-0.1.0')
  res.setHeader('X-Nofom-Assessment-Mode',       'rule_based')
  next()
}

module.exports = { schemaVersionHeaders }

// backend/src/routes/diagnostics.js
'use strict'

const express         = require('express')
const { v4: uuidv4 }  = require('uuid')
const supabase        = require('../db/supabase')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()

// Standard test options aligned with schema section 5.7
const VALID_TESTS = [
  'cbc', 'peripheral_smear', 'xray', 'ultrasound',
  'ct_scan', 'mri', 'bone_marrow_biopsy',
  'urinalysis', 'lft', 'rft', 'other'
]

// ── POST /api/diagnostics ─────────────────────────────────────
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const {
      encounter_id,
      triage_assessment_id,
      requested_tests,
      request_reason,
      result_status,
      abnormal_result_flag,
      result_summary
    } = req.body

    if (!encounter_id) {
      return res.status(400).json({ error: 'encounter_id is required' })
    }

    if (!requested_tests || !Array.isArray(requested_tests) ||
        requested_tests.length === 0) {
      return res.status(400).json({
        error: 'requested_tests must be a non-empty array'
      })
    }

    // Validate test names
    const invalidTests = requested_tests.filter(t => !VALID_TESTS.includes(t))
    if (invalidTests.length > 0) {
      return res.status(400).json({
        error: `Invalid test(s): ${invalidTests.join(', ')}`,
        valid_tests: VALID_TESTS
      })
    }

    const { data, error } = await supabase
      .from('diagnostic_requests')
      .insert({
        encounter_id,
        triage_assessment_id:  triage_assessment_id || null,
        requested_tests,
        request_reason:        request_reason        || null,
        result_status:         result_status         || 'pending',
        abnormal_result_flag:  abnormal_result_flag  ?? null,
        result_summary:        result_summary        || null,
        requested_by:          req.worker?.id        || null
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) { next(err) }
})

// ── GET /api/diagnostics/encounter/:encounter_id ─────────────
router.get('/encounter/:encounter_id', verifyToken, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('diagnostic_requests')
      .select('*')
      .eq('encounter_id', req.params.encounter_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ data: data || [] })
  } catch (err) { next(err) }
})

// ── PATCH /api/diagnostics/:id/result ────────────────────────
// Update result when it comes back
router.patch('/:id/result', verifyToken, async (req, res, next) => {
  try {
    const { result_status, result_summary, abnormal_result_flag } = req.body

    const validStatuses = ['pending','completed','abnormal','normal','inconclusive']
    if (result_status && !validStatuses.includes(result_status)) {
      return res.status(400).json({
        error: `result_status must be one of: ${validStatuses.join(', ')}`
      })
    }

    const { data, error } = await supabase
      .from('diagnostic_requests')
      .update({
        result_status:        result_status       || 'completed',
        result_summary:       result_summary      || null,
        abnormal_result_flag: abnormal_result_flag ?? null
      })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
})

module.exports = router

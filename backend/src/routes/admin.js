// backend/src/routes/admin.js
'use strict'

const express            = require('express')
const { verifyToken }    = require('../middleware/auth')
const { requireAdmin }   = require('../middleware/requireAdmin')
const supabase           = require('../db/supabase')

const router = express.Router()

// All admin routes require auth + admin role
router.use(verifyToken, requireAdmin)

// ── GET /api/admin/stats ─────────────────────────────────────
// Summary counts for the admin dashboard header
router.get('/stats', async (req, res, next) => {
  try {
    // Total assessments
    const { count: totalAssessments } = await supabase
      .from('triage_assessments')
      .select('id', { count: 'exact', head: true })

    // By risk level
    const { data: riskCounts } = await supabase
      .from('triage_assessments')
      .select('risk_level')

    const byRisk = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    riskCounts?.forEach(r => {
      if (byRisk[r.risk_level] !== undefined) byRisk[r.risk_level]++
    })

    // Total patients
    const { count: totalPatients } = await supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })

    // Total workers
    const { count: totalWorkers } = await supabase
      .from('health_workers')
      .select('id', { count: 'exact', head: true })

    // Total facilities
    const { count: totalFacilities } = await supabase
      .from('facilities')
      .select('id', { count: 'exact', head: true })

    // Assessments in last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: recentAssessments } = await supabase
      .from('triage_assessments')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    res.json({
      total_assessments:  totalAssessments  || 0,
      total_patients:     totalPatients     || 0,
      total_workers:      totalWorkers      || 0,
      total_facilities:   totalFacilities   || 0,
      recent_assessments: recentAssessments || 0,
      by_risk: byRisk
    })
  } catch (err) { next(err) }
})

// ── GET /api/admin/assessments ───────────────────────────────
// Paginated list of all assessments across all workers
// Query params: page, limit, risk_level, facility_id, worker_id, search
router.get('/assessments', async (req, res, next) => {
  try {
    const page       = parseInt(req.query.page)       || 1
    const limit      = parseInt(req.query.limit)      || 25
    const from       = (page - 1) * limit
    const risk_level = req.query.risk_level || null
    const facility_id = req.query.facility_id || null
    const worker_id  = req.query.worker_id  || null

    let query = supabase
      .from('triage_assessments')
      .select(`
        id,
        local_id,
        risk_level,
        risk_score,
        submitted_at,
        created_at,
        synced_at,
        offline_created,
        duration_weeks,
        prior_treatment,
        referral_action,
        referral_label,
        referral_timeframe,
        override_applied,
        patient_id,
        submitted_by,
        patients (
          id,
          age_months,
          sex,
          guardian_name
        ),
        health_workers (
          id,
          full_name,
          role,
          facility_id,
          facilities (
            id,
            name,
            type,
            location
          )
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (risk_level)  query = query.eq('risk_level',   risk_level)
    if (worker_id)   query = query.eq('submitted_by', worker_id)

    const { data, error, count } = await query
    if (error) throw error

    res.json({
      data,
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit)
    })
  } catch (err) { next(err) }
})

// ── GET /api/admin/workers ───────────────────────────────────
// All health workers with their assessment counts
router.get('/workers', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('health_workers')
      .select(`
        id,
        full_name,
        role,
        created_at,
        facilities (
          id,
          name,
          type,
          location
        )
      `)
      .order('full_name')

    if (error) throw error

    // Get assessment count per worker
    const workerIds = data.map(w => w.id)
    const counts = {}

    for (const wid of workerIds) {
      const { count } = await supabase
        .from('triage_assessments')
        .select('id', { count: 'exact', head: true })
        .eq('submitted_by', wid)
      counts[wid] = count || 0
    }

    const enriched = data.map(w => ({
      ...w,
      assessment_count: counts[w.id] || 0
    }))

    res.json({ data: enriched, total: data.length })
  } catch (err) { next(err) }
})

// ── GET /api/admin/assessment/:id ────────────────────────────
// Full detail of any single assessment
router.get('/assessment/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('triage_assessments')
      .select(`
        *,
        patients (*),
        health_workers (
          id, full_name, role,
          facilities (id, name, type, location)
        )
      `)
      .eq('id', req.params.id)
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Not found' })

    res.json(data)
  } catch (err) { next(err) }
})

module.exports = router

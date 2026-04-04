// backend/src/routes/triage.js
'use strict'

const express       = require('express')
const { v4: uuidv4 } = require('uuid')
const { runTriage }       = require('../engine/triageRules')
const { generateReferral } = require('../engine/referralEngine')
const supabase      = require('../db/supabase')

const router = express.Router()

// ── POST /api/triage ─────────────────────────────────────────
// Submit a triage assessment. Runs rule engine, stores result.
router.post('/', async (req, res, next) => {
  try {
    const {
      patient_id,
      age_months,
      symptoms,
      duration_weeks,
      prior_treatment,
      facility_id,
      submitted_by,
      submitted_at,
      offline_created,
      local_id
    } = req.body

    // Validate required fields
    if (!age_months || !symptoms) {
      return res.status(400).json({
        error: 'age_months and symptoms are required'
      })
    }

    // ── Run the rule engine ──────────────────────────────────
    const triageResult = runTriage({ age_months, symptoms, duration_weeks, prior_treatment })
    const referral     = generateReferral(triageResult, symptoms)

    // ── Persist to Supabase ──────────────────────────────────
    const { data, error } = await supabase
      .from('triage_assessments')
      .insert({
        local_id:                 local_id || uuidv4(),
        patient_id,
        submitted_by,
        // Symptom fields
        symptom_weight_loss:      Boolean(symptoms.unexplained_weight_loss),
        symptom_persistent_fever: Boolean(symptoms.persistent_fever),
        symptom_abdominal_mass:   Boolean(symptoms.abdominal_mass),
        symptom_lymph_node_swelling: Boolean(symptoms.lymph_node_swelling),
        symptom_bone_pain:        Boolean(symptoms.bone_pain),
        symptom_unusual_bruising: Boolean(symptoms.unusual_bruising),
        symptom_persistent_headache: Boolean(symptoms.persistent_headache),
        symptom_vision_changes:   Boolean(symptoms.vision_changes),
        symptom_extreme_fatigue:  Boolean(symptoms.extreme_fatigue),
        duration_weeks:           Number(duration_weeks) || 0,
        prior_treatment:          Boolean(prior_treatment),
        // Triage output
        risk_score:               triageResult.risk_score,
        risk_level:               triageResult.risk_level,
        score_breakdown:          triageResult.score_breakdown,
        explanation:              triageResult.explanation,
        // Referral output
        referral_action:          referral.action,
        referral_label:           referral.label,
        referral_timeframe:       referral.timeframe,
        referral_facility_tier:   referral.facility_tier,
        referral_notes:           referral.special_notes.join(' | ') || null,
        // Meta
        offline_created:          Boolean(offline_created),
        submitted_at:             submitted_at || new Date().toISOString(),
        synced_at:                new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // ── Return full result ───────────────────────────────────
    res.status(201).json({
      triage_id:      data.id,
      risk_level:     triageResult.risk_level,
      risk_score:     triageResult.risk_score,
      score_breakdown: triageResult.score_breakdown,
      explanation:    triageResult.explanation,
      age_modifier:   triageResult.age_modifier,
      duration_label: triageResult.duration_label,
      override_applied: triageResult.override_applied,
      referral,
      created_at:     data.created_at
    })

  } catch (err) {
    next(err)
  }
})

// ── GET /api/triage/:id ──────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('triage_assessments')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Triage record not found' })

    res.json(data)
  } catch (err) {
    next(err)
  }
})

// ── GET /api/triage ──────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1
    const limit = parseInt(req.query.limit) || 20
    const from  = (page - 1) * limit
    const to    = from + limit - 1

    const { data, error, count } = await supabase
      .from('triage_assessments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    res.json({ data, total: count, page, limit })
  } catch (err) {
    next(err)
  }
})

module.exports = router

// backend/src/routes/triage.js
'use strict'

const express              = require('express')
const { v4: uuidv4 }       = require('uuid')
const { runTriage }        = require('../engine/triageRules')
const { generateReferral } = require('../engine/referralEngine')
const supabase             = require('../db/supabase')
const { verifyToken }      = require('../middleware/auth')

const router = express.Router()

// ── POST /api/triage ─────────────────────────────────────────
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const {
      local_id, patient_name, patient_gender, age_months, symptoms,
      duration_weeks, prior_treatment, facility_id,
      submitted_by, submitted_at, offline_created
    } = req.body

    if (!age_months || !symptoms) {
      return res.status(400).json({ error: 'age_months and symptoms are required' })
    }

    // Use worker from token if submitted_by not in payload
    const workerIdToUse = submitted_by || req.worker?.id || null
    const facilityToUse = facility_id  || req.worker?.facility_id || null

    // ── Auto-create patient ──────────────────────────────────
    let resolvedPatientId = req.body.patient_id || null

    if (!resolvedPatientId) {
      const { data: newPatient, error: patientError } = await supabase
        .from('patients')
        .insert({
          local_id:      local_id ? `pat-${local_id}` : uuidv4(),
          age_months:    Number(age_months),
          sex:           patient_gender || 'unknown',
          guardian_name: patient_name || null,
          facility_id:   facilityToUse,
          created_by:    workerIdToUse,
          synced_at:     new Date().toISOString()
        })
        .select('id')
        .single()

      if (patientError) {
        console.warn('[Triage] Patient create failed:', patientError.message)
      } else {
        resolvedPatientId = newPatient.id
      }
    }

    // ── Run triage engine ────────────────────────────────────
    const triageResult = runTriage({ age_months, symptoms, duration_weeks, prior_treatment })
    const referral     = generateReferral(triageResult, symptoms)

    // ── Upsert — handles duplicate local_id from offline sync ─
    const { data, error } = await supabase
      .from('triage_assessments')
      .upsert({
        local_id:                    local_id || uuidv4(),
        patient_id:                  resolvedPatientId,
        submitted_by:                workerIdToUse,
        symptom_weight_loss:         Boolean(symptoms.unexplained_weight_loss),
        symptom_persistent_fever:    Boolean(symptoms.persistent_fever),
        symptom_abdominal_mass:      Boolean(symptoms.abdominal_mass),
        symptom_lymph_node_swelling: Boolean(symptoms.lymph_node_swelling),
        symptom_bone_pain:           Boolean(symptoms.bone_pain),
        symptom_unusual_bruising:    Boolean(symptoms.unusual_bruising),
        symptom_persistent_headache: Boolean(symptoms.persistent_headache),
        symptom_vision_changes:      Boolean(symptoms.vision_changes),
        symptom_extreme_fatigue:     Boolean(symptoms.extreme_fatigue),
        duration_weeks:              Number(duration_weeks) || 0,
        prior_treatment:             Boolean(prior_treatment),
        risk_score:                  triageResult.risk_score,
        risk_level:                  triageResult.risk_level,
        score_breakdown:             triageResult.score_breakdown,
        explanation:                 triageResult.explanation,
        referral_action:             referral.action,
        referral_label:              referral.label,
        referral_timeframe:          referral.timeframe,
        referral_facility_tier:      referral.facility_tier,
        referral_notes:              referral.special_notes?.join(' | ') || null,
        offline_created:             Boolean(offline_created),
        submitted_at:                submitted_at || new Date().toISOString(),
        synced_at:                   new Date().toISOString()
      },
      { onConflict: 'local_id' })   // ← idempotent: duplicate syncs are safe
      .select()
      .single()

    if (error) throw error

    res.status(201).json({
      triage_id:        data.id,
      patient_id:       resolvedPatientId,
      risk_level:       triageResult.risk_level,
      risk_score:       triageResult.risk_score,
      score_breakdown:  triageResult.score_breakdown,
      explanation:      triageResult.explanation,
      age_modifier:     triageResult.age_modifier,
      duration_label:   triageResult.duration_label,
      override_applied: triageResult.override_applied,
      referral,
      created_at:       data.created_at
    })

  } catch (err) { next(err) }
})

// ── GET /api/triage ──────────────────────────────────────────
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1
    const limit = parseInt(req.query.limit) || 20
    const from  = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('triage_assessments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw error
    res.json({ data, total: count, page, limit })
  } catch (err) { next(err) }
})

// ── GET /api/triage/:id ──────────────────────────────────────
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('triage_assessments')
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Not found' })
    res.json(data)
  } catch (err) { next(err) }
})

module.exports = router

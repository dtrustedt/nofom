// backend/src/routes/sync.js
'use strict'

const express              = require('express')
const { v4: uuidv4 }       = require('uuid')
const { verifyToken }      = require('../middleware/auth')
const { runTriage }        = require('../engine/triageRules')
const { generateReferral } = require('../engine/referralEngine')
const supabase             = require('../db/supabase')

const router = express.Router()

/**
 * POST /api/sync
 * 
 * Batch upsert of offline triage records.
 * Accepts an array of triage assessments, processes each,
 * and returns a per-record result summary.
 * 
 * Body: { records: TriagePayload[] }
 * 
 * Response: {
 *   synced:  number,
 *   failed:  number,
 *   results: Array<{ local_id, triage_id?, error? }>
 * }
 */
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { records } = req.body

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'records array is required and must not be empty' })
    }

    if (records.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 records per sync batch' })
    }

    const workerIdToUse = req.worker?.id          || null
    const facilityToUse = req.worker?.facility_id  || null

    const results = []
    let synced = 0, failed = 0

    for (const record of records) {
      try {
        const {
          local_id, patient_name, patient_gender, age_months, symptoms,
          duration_weeks, prior_treatment, submitted_at,
          submitted_by, facility_id, offline_created
        } = record

        if (!age_months || !symptoms) {
          throw new Error('age_months and symptoms are required')
        }

        // Auto-create patient
        let resolvedPatientId = record.patient_id || null

        if (!resolvedPatientId) {
          const { data: p, error: pe } = await supabase
            .from('patients')
            .insert({
              local_id:      local_id ? `pat-${local_id}` : uuidv4(),
              age_months:    Number(age_months),
              sex:           patient_gender || 'unknown',
              guardian_name: patient_name || null,
              facility_id:   facility_id  || facilityToUse,
              created_by:    submitted_by || workerIdToUse,
              synced_at:     new Date().toISOString()
            })
            .select('id')
            .single()

          if (!pe) resolvedPatientId = p.id
        }

        // Run triage engine
        const triageResult = runTriage({ age_months, symptoms, duration_weeks, prior_treatment })
        const referral     = generateReferral(triageResult, symptoms)

        // Upsert — idempotent on local_id
        const { data, error } = await supabase
          .from('triage_assessments')
          .upsert({
            local_id:                    local_id || uuidv4(),
            patient_id:                  resolvedPatientId,
            submitted_by:                submitted_by || workerIdToUse,
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
          { onConflict: 'local_id' })
          .select('id')
          .single()

        if (error) throw error

        results.push({ local_id, triage_id: data.id, status: 'synced' })
        synced++

      } catch (recordError) {
        results.push({
          local_id: record.local_id || null,
          status:   'failed',
          error:    recordError.message
        })
        failed++
      }
    }

    res.status(200).json({
      synced,
      failed,
      total:   records.length,
      results
    })

  } catch (err) { next(err) }
})

/**
 * GET /api/sync/status
 * 
 * Returns counts for the authenticated worker.
 * Used by the frontend to show how many records are on the server.
 */
router.get('/status', verifyToken, async (req, res, next) => {
  try {
    const workerId = req.worker?.id

    const query = supabase
      .from('triage_assessments')
      .select('id', { count: 'exact', head: true })

    if (workerId) query.eq('submitted_by', workerId)

    const { count, error } = await query
    if (error) throw error

    res.json({
      worker_id:      workerId || null,
      total_on_server: count   || 0,
      checked_at:     new Date().toISOString()
    })
  } catch (err) { next(err) }
})

module.exports = router

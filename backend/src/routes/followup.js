// backend/src/routes/followup.js
'use strict'

const express         = require('express')
const { v4: uuidv4 }  = require('uuid')
const supabase        = require('../db/supabase')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()

// ── POST /api/followup ───────────────────────────────────────
// Record a follow-up outcome for an encounter
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const {
      encounter_id,
      triage_assessment_id,
      patient_reached,
      symptoms_persist,
      referral_completed,
      diagnosis_status,
      confirmed_diagnosis_label,
      diagnosis_date,
      treatment_started,
      treatment_start_date,
      first_symptom_date,
      first_medical_evaluation_date,
      notes,
      offline_created
    } = req.body

    // Validate required fields
    if (!encounter_id) {
      return res.status(400).json({ error: 'encounter_id is required' })
    }

    if (!diagnosis_status) {
      return res.status(400).json({ error: 'diagnosis_status is required' })
    }

    // Validate diagnosis_status enum
    const validStatuses = [
      'no_cancer_identified', 'suspected_cancer', 'confirmed_cancer',
      'other_condition', 'lost_to_followup', 'unknown'
    ]
    if (!validStatuses.includes(diagnosis_status)) {
      return res.status(400).json({
        error: `diagnosis_status must be one of: ${validStatuses.join(', ')}`
      })
    }

    // Compute timing indicators if dates provided
    let time_parental_delay_days    = null
    let time_medical_delay_days     = null
    let time_to_diagnosis_days      = null

    if (first_symptom_date && first_medical_evaluation_date) {
      const symptomDate  = new Date(first_symptom_date)
      const evalDate     = new Date(first_medical_evaluation_date)
      time_parental_delay_days = Math.round(
        (evalDate - symptomDate) / (1000 * 60 * 60 * 24)
      )
    }

    if (first_medical_evaluation_date && diagnosis_date) {
      const evalDate  = new Date(first_medical_evaluation_date)
      const diagDate  = new Date(diagnosis_date)
      time_medical_delay_days = Math.round(
        (diagDate - evalDate) / (1000 * 60 * 60 * 24)
      )
    }

    if (first_symptom_date && diagnosis_date) {
      const symptomDate = new Date(first_symptom_date)
      const diagDate    = new Date(diagnosis_date)
      time_to_diagnosis_days = Math.round(
        (diagDate - symptomDate) / (1000 * 60 * 60 * 24)
      )
    }

    const { data, error } = await supabase
      .from('followup_outcomes')
      .insert({
        encounter_id,
        followup_datetime:              new Date().toISOString(),
        patient_reached:                Boolean(patient_reached),
        symptoms_persist:               symptoms_persist ?? null,
        referral_completed:             referral_completed ?? null,
        diagnosis_status,
        confirmed_diagnosis_label:      confirmed_diagnosis_label || null,
        diagnosis_date:                 diagnosis_date            || null,
        treatment_started:              treatment_started         ?? null,
        treatment_start_date:           treatment_start_date      || null,
        first_symptom_date:             first_symptom_date        || null,
        first_medical_evaluation_date:  first_medical_evaluation_date || null,
        time_parental_delay_days,
        time_medical_delay_days,
        time_to_diagnosis_days,
        notes:                          notes     || null,
        recorded_by:                    req.worker?.id || null
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({
      followup_id:             data.followup_id,
      encounter_id:            data.encounter_id,
      diagnosis_status:        data.diagnosis_status,
      referral_completed:      data.referral_completed,
      time_to_diagnosis_days:  data.time_to_diagnosis_days,
      created_at:              data.created_at
    })

  } catch (err) { next(err) }
})

// ── GET /api/followup/encounter/:encounter_id ────────────────
router.get('/encounter/:encounter_id', verifyToken, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('followup_outcomes')
      .select('*')
      .eq('encounter_id', req.params.encounter_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ data: data || [] })
  } catch (err) { next(err) }
})

module.exports = router

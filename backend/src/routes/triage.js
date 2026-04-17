// backend/src/routes/triage.js
// =============================================================
// CANONICAL PIPELINE: Encounter → Observation[] → Triage → Referral
// =============================================================
'use strict'

const express              = require('express')
const { v4: uuidv4 }       = require('uuid')
const { runTriage }        = require('../engine/triageRules')
const { generateReferral } = require('../engine/referralEngine')
const supabase             = require('../db/supabase')
const { verifyToken }      = require('../middleware/auth')

const router = express.Router()

// ── Mapping: local field key → canonical observation data ─────
// This is the mapping layer (Module F) — resolves local input
// fields to canonical codes from schema_mappings table
const LOCAL_TO_CANONICAL = {
  unexplained_weight_loss: {
    canonical_code: 'SYM_WEIGHT_LOSS_UNEXPLAINED',
    canonical_label: 'Unexplained weight loss',
    body_system: 'general',
    observation_type: 'symptom'
  },
  persistent_fever: {
    canonical_code: 'SYM_FEVER_PERSISTENT',
    canonical_label: 'Persistent fever (>2 weeks, no infection source)',
    body_system: 'general',
    observation_type: 'symptom'
  },
  abdominal_mass: {
    canonical_code: 'SIGN_MASS_ABDOMINAL',
    canonical_label: 'Palpable abdominal mass',
    body_system: 'abdominal',
    observation_type: 'sign'
  },
  lymph_node_swelling: {
    canonical_code: 'SIGN_ADENOPATHY_PERSISTENT',
    canonical_label: 'Unexplained lymph node swelling',
    body_system: 'lymphatic',
    observation_type: 'sign'
  },
  bone_pain: {
    canonical_code: 'SYM_PAIN_BONE_PERSISTENT',
    canonical_label: 'Bone pain or limb swelling',
    body_system: 'musculoskeletal',
    observation_type: 'symptom'
  },
  unusual_bruising: {
    canonical_code: 'SIGN_BRUISING_UNEXPLAINED',
    canonical_label: 'Unusual bruising or bleeding',
    body_system: 'hematologic',
    observation_type: 'sign'
  },
  persistent_headache: {
    canonical_code: 'SYM_HEADACHE_PROGRESSIVE_SEVERE',
    canonical_label: 'Persistent headache or morning vomiting',
    body_system: 'neurologic',
    observation_type: 'symptom'
  },
  vision_changes: {
    canonical_code: 'SIGN_LEUKOCORIA',
    canonical_label: 'Vision changes or white pupil reflex (leukocoria)',
    body_system: 'ocular',
    observation_type: 'sign'
  },
  extreme_fatigue: {
    canonical_code: 'SYM_FATIGUE_MARKED',
    canonical_label: 'Extreme fatigue or pallor',
    body_system: 'hematologic',
    observation_type: 'symptom'
  }
}

// ── POST /api/triage ─────────────────────────────────────────
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const {
      local_id, patient_name, patient_gender, age_months, symptoms,
      duration_weeks, prior_treatment, facility_id, submitted_by,
      submitted_at, offline_created
    } = req.body

    if (!age_months || !symptoms) {
      return res.status(400).json({ error: 'age_months and symptoms are required' })
    }

    const workerIdToUse = submitted_by || req.worker?.id  || null
    const facilityToUse = facility_id  || req.worker?.facility_id || null
    const now = new Date().toISOString()

    // ── STEP 1: Auto-create patient ──────────────────────────
    let resolvedPatientId = req.body.patient_id || null
    if (!resolvedPatientId) {
      const { data: p, error: pe } = await supabase
        .from('patients')
        .insert({
          local_id:      local_id ? `pat-${local_id}` : uuidv4(),
          age_months:    Number(age_months),
          age_value:     Number(age_months),
          age_unit:      'months',
          sex:           patient_gender || 'unknown',
          guardian_name: patient_name   || null,
          facility_id:   facilityToUse,
          created_by:    workerIdToUse,
          country_code:  'NG',
          consent_status: 'obtained',
          synced_at:     now
        })
        .select('id')
        .single()

      if (pe) console.warn('[Triage] Patient create failed:', pe.message)
      else resolvedPatientId = p.id
    }

    // ── STEP 2: Create Encounter ─────────────────────────────
    const { data: encounter, error: encounterError } = await supabase
      .from('encounters')
      .insert({
        patient_id:                   resolvedPatientId,
        facility_id:                  facilityToUse,
        encounter_type:               'clinic_visit',
        encounter_datetime:           submitted_at || now,
        history_source:               'parent_guardian',
        duration_of_symptoms_days:    duration_weeks ? Number(duration_weeks) * 7 : null,
        suspected_condition_category: 'oncology',
        schema_name:                  'nofom_clinical_intake',
        schema_version:               '1.0.0',
        triage_logic_version:         '1.0.0',
        offline_created:              Boolean(offline_created),
        synced_at:                    now
      })
      .select('encounter_id')
      .single()

    if (encounterError) throw encounterError
    const encounterId = encounter.encounter_id

    // ── STEP 3: Create Reporter ──────────────────────────────
    await supabase.from('reporters').insert({
      encounter_id:           encounterId,
      health_worker_id:       workerIdToUse,
      reporter_role:          req.worker?.role || 'community_health_worker',
      reporter_training_level: 'frontline',
      reporter_confidence:    'medium'
    })

    // ── STEP 4: Create Observations — ONE ROW PER FINDING ────
    const presentSymptoms = Object.entries(symptoms).filter(([, v]) => Boolean(v))

    if (presentSymptoms.length > 0) {
      const observationRows = presentSymptoms.map(([localKey]) => {
        const canonical = LOCAL_TO_CANONICAL[localKey]
        if (!canonical) return null
        return {
          encounter_id:       encounterId,
          observation_type:   canonical.observation_type,
          canonical_code:     canonical.canonical_code,
          canonical_label:    canonical.canonical_label,
          local_label:        localKey,
          body_system:        canonical.body_system,
          value_type:         'boolean',
          value_boolean:      true,
          duration_days:      duration_weeks ? Number(duration_weeks) * 7 : null,
          persistence:        'persistent',
          verification_status: 'reported'
        }
      }).filter(Boolean)

      if (observationRows.length > 0) {
        const { error: obsError } = await supabase
          .from('observations')
          .insert(observationRows)
        if (obsError) console.warn('[Triage] Observations insert failed:', obsError.message)
      }
    }

    // ── STEP 5: Run triage engine ────────────────────────────
    const triageResult = runTriage({ age_months, symptoms, duration_weeks, prior_treatment })
    const referral     = generateReferral(triageResult, symptoms)

    // ── STEP 6: Upsert TriageAssessment ──────────────────────
    const { data: assessment, error: triageError } = await supabase
      .from('triage_assessments')
      .upsert({
        local_id:                      local_id || uuidv4(),
        encounter_id:                  encounterId,
        patient_id:                    resolvedPatientId,
        submitted_by:                  workerIdToUse,

        // Canonical urgency fields
        urgency_level:                 triageResult.urgency_level,
        urgency_color:                 triageResult.urgency_color,
        assessment_mode:               'rule_based',
        assessment_version:            'nofom_v1',
        assessed_by_role:              req.worker?.role || 'community_health_worker',

        // Explainability — non-negotiable
        explanation_summary:           triageResult.explanation_summary,
        explanation:                   triageResult.explanation,
        triggering_findings:           triageResult.triggering_findings,
        escalation_flag:               triageResult.escalation_flag,
        multiple_low_grade_escalation: triageResult.multiple_low_grade_escalation,
        override_applied:              triageResult.override_applied,
        override_reason:               triageResult.override_applied
          ? `Red flag override: ${triageResult.red_flag_count} red-flag indicators`
          : null,

        // Scoring
        risk_score:                    triageResult.risk_score,
        risk_level:                    triageResult.urgency_level === 'immediate' ? 'HIGH'
          : triageResult.urgency_level === 'priority' ? 'MEDIUM' : 'LOW',
        score_breakdown:               triageResult.score_breakdown,

        // Symptom columns (backward compat)
        symptom_weight_loss:           Boolean(symptoms.unexplained_weight_loss),
        symptom_persistent_fever:      Boolean(symptoms.persistent_fever),
        symptom_abdominal_mass:        Boolean(symptoms.abdominal_mass),
        symptom_lymph_node_swelling:   Boolean(symptoms.lymph_node_swelling),
        symptom_bone_pain:             Boolean(symptoms.bone_pain),
        symptom_unusual_bruising:      Boolean(symptoms.unusual_bruising),
        symptom_persistent_headache:   Boolean(symptoms.persistent_headache),
        symptom_vision_changes:        Boolean(symptoms.vision_changes),
        symptom_extreme_fatigue:       Boolean(symptoms.extreme_fatigue),

        duration_weeks:                Number(duration_weeks) || 0,
        prior_treatment:               Boolean(prior_treatment),

        // Referral fields (backward compat)
        referral_action:               referral.action,
        referral_label:                referral.label,
        referral_timeframe:            referral.timeframe_display,
        referral_facility_tier:        referral.facility_tier,
        referral_notes:                referral.special_notes?.join(' | ') || null,

        offline_created:               Boolean(offline_created),
        submitted_at:                  submitted_at || now,
        synced_at:                     now
      },
      { onConflict: 'local_id' })
      .select('id')
      .single()

    if (triageError) throw triageError

    // ── STEP 7: Create ReferralDecision ──────────────────────
    // Deterministic from urgency_level — no separate logic
    const { error: refError } = await supabase
      .from('referrals')
      .insert({
        encounter_id:         encounterId,
        triage_assessment_id: assessment.id,
        referral_needed:      triageResult.urgency_level !== 'scheduled' ||
                              triageResult.risk_score > 10,
        referral_target_type: referral.referral_target_type,
        referral_timeframe:   referral.referral_timeframe,
        referral_status:      'recommended',
        transport_barrier:    'unknown',
        referral_notes:       referral.special_notes?.join(' | ') || null
      })

    if (refError) console.warn('[Triage] Referral insert failed:', refError.message)

    // ── STEP 8: Return full canonical response ────────────────
    res.status(201).json({
      triage_id:          assessment.id,
      encounter_id:       encounterId,
      patient_id:         resolvedPatientId,

      // Canonical urgency
      urgency_level:      triageResult.urgency_level,
      urgency_color:      triageResult.urgency_color,

      // Explainability
      triggering_findings: triageResult.triggering_findings,
      explanation_summary: triageResult.explanation_summary,
      explanation:         triageResult.explanation,
      escalation_flag:     triageResult.escalation_flag,
      override_applied:    triageResult.override_applied,

      // Scoring
      risk_score:          triageResult.risk_score,
      score_breakdown:     triageResult.score_breakdown,
      age_modifier:        triageResult.age_modifier,
      duration_label:      triageResult.duration_label,
      rule_version:        triageResult.rule_version,
      assessment_mode:     triageResult.assessment_mode,

      // Referral (deterministic)
      referral,
      created_at:          now
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
      .select(`*, encounters(*), patients(*), referrals(*)`)
      .eq('id', req.params.id)
      .single()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Not found' })
    res.json(data)
  } catch (err) { next(err) }
})

module.exports = router

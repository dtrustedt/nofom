// frontend/src/engine/referralEngine.js
// =============================================================
// NOFOM REFERRAL DECISION ENGINE
// =============================================================
// Referral is DETERMINISTIC from urgency_level.
// No separate logic. No UI override without audit trail.
//
// Mapping (per Engineering Review — non-negotiable):
//   immediate → emergency_pediatric_hospital
//   priority  → pediatric_oncohematology_unit (48–72h)
//   scheduled → diagnostic_center (within 2 weeks)
// =============================================================

// ── Deterministic referral map ────────────────────────────────
// Keyed by urgency_level from runTriage() output
const REFERRAL_MAP = {
  immediate: {
    action:               'URGENT_REFERRAL',
    label:                'Emergency Referral — Pediatric Hospital',
    referral_target_type: 'emergency_pediatric_hospital',
    referral_timeframe:   'immediate',
    timeframe_display:    'Within 24 hours — do not delay',
    facility_tier:        'Tertiary',
    color:                'danger',
    instructions: [
      'Prepare a written referral letter with all symptom details and duration.',
      'Do not start treatment before specialist evaluation.',
      'Inform the guardian this referral is urgent — same day if possible.',
      'Call the receiving facility before sending the patient.',
      'Record the referral in this app before the patient leaves.'
    ]
  },
  priority: {
    action:               'PRIORITY_REFERRAL',
    label:                'Specialist Referral — Pediatric Oncology Unit',
    referral_target_type: 'pediatric_oncohematology_unit',
    referral_timeframe:   '48_72_hours',
    timeframe_display:    'Within 48–72 hours',
    facility_tier:        'Secondary / Tertiary',
    color:                'warning',
    instructions: [
      'Complete a referral form with full symptom history.',
      'Advise guardian on warning signs requiring emergency visit.',
      'Schedule a follow-up if the patient does not attend the referral.',
      'Request CBC and basic labs at referral facility on arrival.',
      'Record this assessment in the app.'
    ]
  },
  scheduled: {
    action:               'SCHEDULED_REFERRAL',
    label:                'Diagnostic Review — Outpatient',
    referral_target_type: 'diagnostic_center',
    referral_timeframe:   'within_2_weeks',
    timeframe_display:    'Within 2 weeks',
    facility_tier:        'Primary / Secondary',
    color:                'success',
    instructions: [
      'Educate the guardian on early warning signs of childhood cancer.',
      'Advise them to return immediately if symptoms worsen or new ones appear.',
      'Schedule a diagnostic follow-up visit within 2 weeks.',
      'Document this assessment in the app.'
    ]
  }
}

// ── Special case clinical warnings ───────────────────────────
// Appended to base referral when specific symptoms present
const SPECIAL_CASE_NOTES = [
  {
    condition: (s) => s.vision_changes,
    note: '⚠️ LEUKOCORIA/VISION CHANGE: Refer urgently to ophthalmology. ' +
          'Retinoblastoma is highly treatable when caught early. ' +
          'Canonical: SIGN_LEUKOCORIA'
  },
  {
    condition: (s) => s.abdominal_mass,
    note: '⚠️ ABDOMINAL MASS (SIGN_MASS_ABDOMINAL): Do NOT palpate repeatedly — ' +
          'risk of tumour rupture. Request urgent abdominal ultrasound on arrival.'
  },
  {
    condition: (s) => s.persistent_headache && s.vision_changes,
    note: '⚠️ CNS INVOLVEMENT POSSIBLE: Headache + vision changes may indicate ' +
          'raised intracranial pressure. Avoid lumbar puncture before imaging.'
  },
  {
    condition: (s) => s.unusual_bruising && s.extreme_fatigue,
    note: '⚠️ LEUKEMIA PATTERN: SIGN_BRUISING_UNEXPLAINED + SYM_FATIGUE_MARKED — ' +
          'warrants urgent CBC. Request full blood count on arrival.'
  }
]

/**
 * generateReferral
 *
 * Deterministic: urgency_level → referral action.
 * No separate logic path. Override only via audit trail.
 *
 * @param {Object} triageResult  — output from runTriage()
 * @param {Object} symptoms      — original symptom flags
 * @returns {Object} referral
 */
export function generateReferral(triageResult, symptoms = {}) {
  const urgencyLevel = triageResult.urgency_level

  // Look up deterministic referral — fallback to scheduled if unknown
  const base = REFERRAL_MAP[urgencyLevel] || REFERRAL_MAP.scheduled

  // Collect special case notes
  const special_notes = SPECIAL_CASE_NOTES
    .filter(sc => sc.condition(symptoms))
    .map(sc => sc.note)

  return {
    action:               base.action,
    label:                base.label,
    referral_target_type: base.referral_target_type,
    referral_timeframe:   base.referral_timeframe,
    timeframe_display:    base.timeframe_display,
    facility_tier:        base.facility_tier,
    color:                base.color,
    instructions:         base.instructions,
    special_notes,
    // Pass through urgency for UI display
    urgency_level:        urgencyLevel,
    urgency_color:        triageResult.urgency_color
  }
}

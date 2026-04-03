// frontend/src/engine/referralEngine.js
// =============================================================
// NOFOM REFERRAL ENGINE
// =============================================================
// Accepts a triage result and returns a concrete referral action.
// Also a pure function — runs offline, no network needed.
// =============================================================

/**
 * REFERRAL ACTION REGISTRY
 * 
 * Actions are matched by risk_level.
 * Special overrides apply for specific symptom combinations.
 */
const REFERRAL_ACTIONS = {
  HIGH: {
    action:        'URGENT_REFERRAL',
    label:         'Refer to Pediatric Oncology Unit',
    timeframe:     'Within 24 hours — do not delay',
    facility_tier: 'Tertiary',
    color:         'danger',
    instructions: [
      'Prepare a written referral letter with all symptom details and duration.',
      'Do not start treatment before specialist evaluation.',
      'Inform the guardian this referral is urgent.',
      'Call the receiving facility if possible before sending the patient.',
      'Record the referral in this app before the patient leaves.'
    ]
  },
  MEDIUM: {
    action:        'SCHEDULED_REFERRAL',
    label:         'Refer to District/Secondary Hospital',
    timeframe:     'Within 7 days',
    facility_tier: 'Secondary',
    color:         'warning',
    instructions: [
      'Complete a referral form with symptom history.',
      'Advise guardian on warning signs that would require immediate emergency visit.',
      'Schedule a follow-up if the patient does not attend referral.',
      'Record this assessment in the app.'
    ]
  },
  LOW: {
    action:        'MONITOR_AND_EDUCATE',
    label:         'Monitor and Educate',
    timeframe:     'Follow up within 4 weeks',
    facility_tier: 'Primary',
    color:         'success',
    instructions: [
      'Educate the guardian on early warning signs of childhood cancer.',
      'Advise them to return immediately if new symptoms appear or current ones worsen.',
      'Schedule a routine follow-up visit.',
      'Document this assessment in the app.'
    ]
  }
}

/**
 * SPECIAL CASE OVERRIDES
 * 
 * Certain symptom combinations require a specific referral note
 * regardless of risk level. These are appended to the base referral.
 */
const SPECIAL_CASE_NOTES = [
  {
    condition: (symptoms) => symptoms.vision_changes,
    note: '⚠️ LEUKOCORIA/VISION CHANGE: Refer urgently to ophthalmology. ' +
          'Retinoblastoma is highly treatable when caught early.'
  },
  {
    condition: (symptoms) => symptoms.abdominal_mass,
    note: '⚠️ ABDOMINAL MASS: Do NOT palpate repeatedly — risk of tumor rupture. ' +
          'Request urgent abdominal ultrasound at referral facility.'
  },
  {
    condition: (symptoms) => symptoms.persistent_headache && symptoms.vision_changes,
    note: '⚠️ CNS INVOLVEMENT POSSIBLE: Headache + vision changes may indicate ' +
          'raised intracranial pressure. Avoid lumbar puncture before imaging.'
  },
  {
    condition: (symptoms) => symptoms.unusual_bruising && symptoms.extreme_fatigue,
    note: '⚠️ LEUKEMIA SIGNS: Bruising + fatigue combination warrants urgent CBC. ' +
          'Request full blood count at referral facility on arrival.'
  }
]

/**
 * generateReferral()
 * 
 * @param {Object} triageResult  - Output from runTriage()
 * @param {Object} symptoms      - Original symptom flags (for special cases)
 * 
 * @returns {Object} referral
 * @returns {string} referral.action          - Machine-readable action key
 * @returns {string} referral.label           - Human label for the action
 * @returns {string} referral.timeframe       - When to act
 * @returns {string} referral.facility_tier   - Where to send
 * @returns {string} referral.color           - UI color key (danger/warning/success)
 * @returns {string[]} referral.instructions  - Step-by-step instructions
 * @returns {string[]} referral.special_notes - Any special clinical warnings
 */
export function generateReferral(triageResult, symptoms = {}) {
  const { risk_level } = triageResult

  // Get base referral for this risk level
  const base = REFERRAL_ACTIONS[risk_level] || REFERRAL_ACTIONS.LOW

  // Collect any special-case notes
  const special_notes = SPECIAL_CASE_NOTES
    .filter(sc => sc.condition(symptoms))
    .map(sc => sc.note)

  return {
    action:         base.action,
    label:          base.label,
    timeframe:      base.timeframe,
    facility_tier:  base.facility_tier,
    color:          base.color,
    instructions:   base.instructions,
    special_notes
  }
}

// backend/src/engine/referralEngine.js
'use strict'

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

const SPECIAL_CASE_NOTES = [
  {
    condition: (s) => s.vision_changes,
    note: '⚠️ LEUKOCORIA/VISION CHANGE: Refer urgently to ophthalmology. Retinoblastoma is highly treatable when caught early.'
  },
  {
    condition: (s) => s.abdominal_mass,
    note: '⚠️ ABDOMINAL MASS: Do NOT palpate repeatedly — risk of tumor rupture. Request urgent abdominal ultrasound at referral facility.'
  },
  {
    condition: (s) => s.persistent_headache && s.vision_changes,
    note: '⚠️ CNS INVOLVEMENT POSSIBLE: Headache + vision changes may indicate raised intracranial pressure. Avoid lumbar puncture before imaging.'
  },
  {
    condition: (s) => s.unusual_bruising && s.extreme_fatigue,
    note: '⚠️ LEUKEMIA SIGNS: Bruising + fatigue combination warrants urgent CBC. Request full blood count at referral facility on arrival.'
  }
]

function generateReferral(triageResult, symptoms = {}) {
  const base = REFERRAL_ACTIONS[triageResult.risk_level] || REFERRAL_ACTIONS.LOW
  const special_notes = SPECIAL_CASE_NOTES
    .filter(sc => sc.condition(symptoms))
    .map(sc => sc.note)

  return {
    action:        base.action,
    label:         base.label,
    timeframe:     base.timeframe,
    facility_tier: base.facility_tier,
    color:         base.color,
    instructions:  base.instructions,
    special_notes
  }
}

module.exports = { generateReferral }

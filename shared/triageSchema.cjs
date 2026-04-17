// shared/triageSchema.cjs
'use strict'

const SCHEMA_VERSION = {
  schema_name:          'nofom_clinical_intake',
  schema_version:       '1.0.0',
  triage_logic_version: '1.0.0',
  country_profile:      'NG-0.1.0'
}

const SYMPTOMS = [
  {
    key: 'unexplained_weight_loss', canonical_code: 'SYM_WEIGHT_LOSS_UNEXPLAINED',
    label: 'Unexplained weight loss', observation_type: 'symptom',
    body_system: 'general', urgency_weight: 20, is_red_flag: true,
    explanation: 'Unexplained weight loss (>10% body weight) is a primary indicator of pediatric malignancy, particularly lymphoma, leukemia, and solid tumors. Warrants urgent investigation.'
  },
  {
    key: 'persistent_fever', canonical_code: 'SYM_FEVER_PERSISTENT',
    label: 'Persistent fever (>2 weeks, no infection source)', observation_type: 'symptom',
    body_system: 'general', urgency_weight: 15, is_red_flag: true,
    explanation: 'Persistent fever without identified infection source lasting more than 2 weeks is a classic B-symptom of lymphoma and may indicate leukemia or other hematologic malignancy.'
  },
  {
    key: 'abdominal_mass', canonical_code: 'SIGN_MASS_ABDOMINAL',
    label: 'Palpable abdominal mass', observation_type: 'sign',
    body_system: 'abdominal', urgency_weight: 22, is_red_flag: true,
    explanation: 'A palpable abdominal mass in a child is a red flag for Wilms tumor (nephroblastoma), neuroblastoma, or hepatoblastoma. Requires immediate imaging and oncology referral.'
  },
  {
    key: 'lymph_node_swelling', canonical_code: 'SIGN_ADENOPATHY_PERSISTENT',
    label: 'Unexplained lymph node swelling', observation_type: 'sign',
    body_system: 'lymphatic', urgency_weight: 18, is_red_flag: true,
    explanation: 'Painless, progressive lymphadenopathy — especially cervical, axillary, or supraclavicular — is a hallmark of lymphoma and leukemia in children.'
  },
  {
    key: 'bone_pain', canonical_code: 'SYM_PAIN_BONE_PERSISTENT',
    label: 'Bone pain or limb swelling', observation_type: 'symptom',
    body_system: 'musculoskeletal', urgency_weight: 16, is_red_flag: true,
    explanation: 'Unexplained bone pain or limb swelling, especially at night or not related to trauma, may indicate osteosarcoma, Ewing sarcoma, or leukemic bone infiltration.'
  },
  {
    key: 'unusual_bruising', canonical_code: 'SIGN_BRUISING_UNEXPLAINED',
    label: 'Unusual bruising or bleeding', observation_type: 'sign',
    body_system: 'hematologic', urgency_weight: 14, is_red_flag: false,
    explanation: 'Petechiae, easy bruising, or unexplained bleeding may indicate thrombocytopenia caused by bone marrow infiltration in acute leukemia.'
  },
  {
    key: 'persistent_headache', canonical_code: 'SYM_HEADACHE_PROGRESSIVE_SEVERE',
    label: 'Persistent headache or morning vomiting', observation_type: 'symptom',
    body_system: 'neurologic', urgency_weight: 17, is_red_flag: true,
    explanation: 'Morning headache with vomiting may indicate raised intracranial pressure from a CNS tumor. Combined with other neurological signs, this is an urgent referral indicator.'
  },
  {
    key: 'vision_changes', canonical_code: 'SIGN_LEUKOCORIA',
    label: 'Vision changes or white pupil reflex (leukocoria)', observation_type: 'sign',
    body_system: 'ocular', urgency_weight: 22, is_red_flag: true,
    explanation: 'Leukocoria (white pupil reflex) is the most common sign of retinoblastoma, a childhood eye cancer. Any visual change in a child under 6 requires urgent ophthalmology review.'
  },
  {
    key: 'extreme_fatigue', canonical_code: 'SYM_FATIGUE_MARKED',
    label: 'Extreme fatigue or pallor', observation_type: 'symptom',
    body_system: 'hematologic', urgency_weight: 10, is_red_flag: false,
    explanation: 'Severe, unexplained fatigue and pallor may indicate anemia caused by bone marrow suppression in leukemia or other hematologic conditions.'
  }
]

const URGENCY_LEVELS = {
  RED:    { level: 'immediate', color: 'red',    label: 'Immediate', score_threshold: 35 },
  YELLOW: { level: 'priority',  color: 'yellow', label: 'Priority',  score_threshold: 15 },
  GREEN:  { level: 'scheduled', color: 'green',  label: 'Scheduled', score_threshold: 0  }
}

const DURATION_MULTIPLIERS = [
  { minWeeks: 0,   maxWeeks: 1,   multiplier: 0.8, label: 'Less than 1 week' },
  { minWeeks: 1,   maxWeeks: 2,   multiplier: 0.9, label: '1–2 weeks' },
  { minWeeks: 2,   maxWeeks: 4,   multiplier: 1.0, label: '2–4 weeks' },
  { minWeeks: 4,   maxWeeks: 8,   multiplier: 1.2, label: '4–8 weeks' },
  { minWeeks: 8,   maxWeeks: 999, multiplier: 1.5, label: 'More than 8 weeks' }
]

const AGE_MODIFIER = (ageMonths) => {
  if (ageMonths <= 12)  return { score: 5, label: 'Infant (≤12 months) — elevated baseline risk' }
  if (ageMonths <= 60)  return { score: 3, label: 'Toddler/preschool (1–5 years) — Wilms, NBL, RB peak age' }
  if (ageMonths <= 120) return { score: 2, label: 'School age (5–10 years)' }
  if (ageMonths <= 180) return { score: 4, label: 'Adolescent (10–15 years) — bone tumor, lymphoma peak age' }
  return                       { score: 2, label: 'Older adolescent (>15 years)' }
}

const RED_FLAG_OVERRIDE_THRESHOLD = 2
const MAX_RAW_SCORE = SYMPTOMS.reduce((sum, s) => sum + s.urgency_weight, 0)

module.exports = {
  SCHEMA_VERSION, SYMPTOMS, URGENCY_LEVELS,
  DURATION_MULTIPLIERS, AGE_MODIFIER,
  RED_FLAG_OVERRIDE_THRESHOLD, MAX_RAW_SCORE
}

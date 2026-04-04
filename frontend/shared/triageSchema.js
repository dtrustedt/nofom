// frontend/shared/triageSchema.js
// Vite-accessible copy of the shared schema.
// Path: frontend/shared/ resolves ../../shared/ from frontend/src/pages/ and frontend/src/engine/

export const SYMPTOMS = [
  {
    key: 'unexplained_weight_loss',
    label: 'Unexplained weight loss',
    weight: 20,
    isPrimary: true,
    explanation:
      'Unexplained weight loss (>10% body weight) is a primary indicator of pediatric malignancy, ' +
      'particularly lymphoma, leukemia, and solid tumors. Warrants urgent investigation.'
  },
  {
    key: 'persistent_fever',
    label: 'Persistent fever (>2 weeks, no infection source)',
    weight: 15,
    isPrimary: true,
    explanation:
      'Persistent fever without identified infection source lasting more than 2 weeks is a ' +
      'classic B-symptom of lymphoma and may indicate leukemia or other hematologic malignancy.'
  },
  {
    key: 'abdominal_mass',
    label: 'Palpable abdominal mass',
    weight: 22,
    isPrimary: true,
    explanation:
      'A palpable abdominal mass in a child is a red flag for Wilms tumor (nephroblastoma), ' +
      'neuroblastoma, or hepatoblastoma. Requires immediate imaging and oncology referral.'
  },
  {
    key: 'lymph_node_swelling',
    label: 'Unexplained lymph node swelling',
    weight: 18,
    isPrimary: true,
    explanation:
      'Painless, progressive lymphadenopathy — especially cervical, axillary, or supraclavicular — ' +
      'is a hallmark of lymphoma and leukemia in children.'
  },
  {
    key: 'bone_pain',
    label: 'Bone pain or limb swelling',
    weight: 16,
    isPrimary: true,
    explanation:
      'Unexplained bone pain or limb swelling, especially at night or not related to trauma, ' +
      'may indicate osteosarcoma, Ewing sarcoma, or leukemic bone infiltration.'
  },
  {
    key: 'unusual_bruising',
    label: 'Unusual bruising or bleeding',
    weight: 14,
    isPrimary: false,
    explanation:
      'Petechiae, easy bruising, or unexplained bleeding may indicate thrombocytopenia ' +
      'caused by bone marrow infiltration in acute leukemia.'
  },
  {
    key: 'persistent_headache',
    label: 'Persistent headache or vomiting (morning)',
    weight: 17,
    isPrimary: true,
    explanation:
      'Morning headache with vomiting may indicate raised intracranial pressure from a CNS tumor. ' +
      'Combined with other neurological signs, this is an urgent referral indicator.'
  },
  {
    key: 'vision_changes',
    label: 'Vision changes or white pupil reflex (leukocoria)',
    weight: 22,
    isPrimary: true,
    explanation:
      'Leukocoria (white pupil reflex) is the most common sign of retinoblastoma, a childhood ' +
      'eye cancer. Any visual change in a child under 6 requires urgent ophthalmology review.'
  },
  {
    key: 'extreme_fatigue',
    label: 'Extreme fatigue or pallor',
    weight: 10,
    isPrimary: false,
    explanation:
      'Severe, unexplained fatigue and pallor may indicate anemia caused by bone marrow ' +
      'suppression in leukemia or other hematologic conditions.'
  }
]

export const DURATION_MULTIPLIERS = [
  { minWeeks: 0,   maxWeeks: 1,   multiplier: 0.8, label: 'Less than 1 week' },
  { minWeeks: 1,   maxWeeks: 2,   multiplier: 0.9, label: '1–2 weeks' },
  { minWeeks: 2,   maxWeeks: 4,   multiplier: 1.0, label: '2–4 weeks' },
  { minWeeks: 4,   maxWeeks: 8,   multiplier: 1.2, label: '4–8 weeks' },
  { minWeeks: 8,   maxWeeks: 999, multiplier: 1.5, label: 'More than 8 weeks' }
]

export const AGE_MODIFIER = (ageMonths) => {
  if (ageMonths <= 12)  return { score: 5, label: 'Infant (≤12 months) — elevated baseline risk' }
  if (ageMonths <= 60)  return { score: 3, label: 'Toddler/preschool (1–5 years) — Wilms, NBL, RB peak age' }
  if (ageMonths <= 120) return { score: 2, label: 'School age (5–10 years)' }
  if (ageMonths <= 180) return { score: 4, label: 'Adolescent (10–15 years) — bone tumor, lymphoma peak age' }
  return                       { score: 2, label: 'Older adolescent (>15 years)' }
}

export const RISK_THRESHOLDS = {
  HIGH:   { min: 35, label: 'HIGH' },
  MEDIUM: { min: 15, label: 'MEDIUM' },
  LOW:    { min: 0,  label: 'LOW' }
}

export const PRIMARY_SYMPTOM_HIGH_OVERRIDE = 2

export const MAX_RAW_SCORE = SYMPTOMS.reduce((sum, s) => sum + s.weight, 0)

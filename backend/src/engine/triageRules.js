// backend/src/engine/triageRules.js
'use strict'

const {
  SYMPTOMS, URGENCY_LEVELS, DURATION_MULTIPLIERS,
  AGE_MODIFIER, RED_FLAG_OVERRIDE_THRESHOLD,
  MAX_RAW_SCORE, SCHEMA_VERSION
} = require('../../shared/triageSchema.cjs')

function getDurationMultiplier(durationWeeks) {
  const weeks = Number(durationWeeks) || 0
  for (const band of DURATION_MULTIPLIERS) {
    if (weeks >= band.minWeeks && weeks < band.maxWeeks) return band
  }
  return DURATION_MULTIPLIERS[DURATION_MULTIPLIERS.length - 1]
}

function classifyUrgency(finalScore, redFlagCount) {
  if (redFlagCount >= RED_FLAG_OVERRIDE_THRESHOLD) return URGENCY_LEVELS.RED
  if (finalScore >= URGENCY_LEVELS.RED.score_threshold)    return URGENCY_LEVELS.RED
  if (finalScore >= URGENCY_LEVELS.YELLOW.score_threshold) return URGENCY_LEVELS.YELLOW
  return URGENCY_LEVELS.GREEN
}

function buildTriggeringFindings(symptoms) {
  return SYMPTOMS
    .filter(s => Boolean(symptoms[s.key]))
    .map(s => ({
      canonical_code:   s.canonical_code,
      label:            s.label,
      body_system:      s.body_system,
      observation_type: s.observation_type,
      urgency_weight:   s.urgency_weight,
      is_red_flag:      s.is_red_flag
    }))
}

function buildExplanationSummary(triggeringFindings, urgencyLevel, overrideApplied, escalationFlag) {
  const count = triggeringFindings.length
  if (count === 0) return 'No high-suspicion findings reported. Routine monitoring advised.'
  const systems = [...new Set(triggeringFindings.map(f => f.body_system))]
  let summary = `${count} finding${count !== 1 ? 's' : ''} across ${systems.length} body system${systems.length !== 1 ? 's' : ''} (${systems.join(', ')}).`
  if (overrideApplied) summary += ` Red-flag override applied — urgency escalated to IMMEDIATE.`
  else if (escalationFlag) summary += ` Multiple lower-severity findings together justify elevated urgency.`
  summary += ` Classification: ${urgencyLevel.level.toUpperCase()}.`
  return summary
}

function runTriage(input) {
  const ageMonths     = Number(input.age_months)     || 0
  const durationWeeks = Number(input.duration_weeks) || 0
  const symptoms      = input.symptoms               || {}

  if (ageMonths < 0 || ageMonths > 216) {
    throw new Error(`Invalid age_months: ${ageMonths}. Must be 0–216.`)
  }

  const score_breakdown = {}
  const explanation     = []
  let   rawScore        = 0
  let   redFlagCount    = 0

  for (const symptom of SYMPTOMS) {
    const isPresent = Boolean(symptoms[symptom.key])
    if (isPresent) {
      score_breakdown[symptom.canonical_code] = symptom.urgency_weight
      rawScore += symptom.urgency_weight
      explanation.push(symptom.explanation)
      if (symptom.is_red_flag) redFlagCount++
    } else {
      score_breakdown[symptom.canonical_code] = 0
    }
  }

  const ageModifier  = AGE_MODIFIER(ageMonths)
  rawScore          += ageModifier.score

  const durationBand = getDurationMultiplier(durationWeeks)
  const finalScore   = Math.round(rawScore * durationBand.multiplier)
  const urgencyLevel = classifyUrgency(finalScore, redFlagCount)

  const overrideApplied = (
    redFlagCount >= RED_FLAG_OVERRIDE_THRESHOLD &&
    finalScore < URGENCY_LEVELS.RED.score_threshold
  )

  const nonRedFlagPresent = SYMPTOMS
    .filter(s => !s.is_red_flag && Boolean(symptoms[s.key])).length
  const escalationFlag = !overrideApplied && nonRedFlagPresent >= 2 &&
    urgencyLevel.level !== 'scheduled'

  const triggeringFindings = buildTriggeringFindings(symptoms)
  const explanationSummary = buildExplanationSummary(
    triggeringFindings, urgencyLevel, overrideApplied, escalationFlag
  )

  if (input.prior_treatment) {
    explanation.push(
      'Patient has received prior treatment. This context must be communicated to the receiving facility at referral.'
    )
  }

  if (explanation.length === 0) {
    explanation.push('No high-risk symptoms reported at this time. Continue monitoring.')
  }

  return {
    urgency_level:        urgencyLevel.level,
    urgency_color:        urgencyLevel.color,
    triggering_findings:  triggeringFindings,
    explanation_summary:  explanationSummary,
    explanation,
    escalation_flag:      escalationFlag,
    override_applied:     overrideApplied,
    multiple_low_grade_escalation: escalationFlag,
    risk_score:           finalScore,
    raw_score:            rawScore,
    score_breakdown,
    duration_label:       durationBand.label,
    duration_multiplier:  durationBand.multiplier,
    age_modifier:         ageModifier,
    red_flag_count:       redFlagCount,
    max_possible_score:   Math.round(MAX_RAW_SCORE * 1.5),
    rule_version:         SCHEMA_VERSION.triage_logic_version,
    schema_version:       SCHEMA_VERSION.schema_version,
    assessment_mode:      'rule_based',
    assessed_by_role:     'community_health_worker'
  }
}

module.exports = { runTriage }

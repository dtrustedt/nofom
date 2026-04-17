// frontend/src/engine/triageRules.js
// =============================================================
// NOFOM TRIAGE RULE ENGINE v1.0.0
// Compliant with Nofom Clinical Data Schema v1
//
// Output contract (non-negotiable per Engineering Review):
//   urgency_level        — immediate | priority | scheduled
//   urgency_color        — red | yellow | green
//   triggering_findings  — canonical codes of present symptoms
//   explanation_summary  — single human-readable summary string
//   explanation          — array of per-finding explanations
//   escalation_flag      — true if multiple low-grade findings elevated
//   override_applied     — true if red-flag threshold forced urgency up
//   rule_version         — triage logic version string
//   risk_score           — numeric score (for display/debugging)
// =============================================================

import {
  SYMPTOMS,
  URGENCY_LEVELS,
  DURATION_MULTIPLIERS,
  AGE_MODIFIER,
  RED_FLAG_OVERRIDE_THRESHOLD,
  MAX_RAW_SCORE,
  SCHEMA_VERSION
} from '../../shared/triageSchema.js'

// ── Private helpers ───────────────────────────────────────────

function getDurationMultiplier(durationWeeks) {
  const weeks = Number(durationWeeks) || 0
  for (const band of DURATION_MULTIPLIERS) {
    if (weeks >= band.minWeeks && weeks < band.maxWeeks) return band
  }
  return DURATION_MULTIPLIERS[DURATION_MULTIPLIERS.length - 1]
}

function classifyUrgency(finalScore, redFlagCount) {
  // Red flag override: N+ red-flag symptoms → immediate regardless of score
  if (redFlagCount >= RED_FLAG_OVERRIDE_THRESHOLD) {
    return URGENCY_LEVELS.RED
  }
  if (finalScore >= URGENCY_LEVELS.RED.score_threshold)    return URGENCY_LEVELS.RED
  if (finalScore >= URGENCY_LEVELS.YELLOW.score_threshold) return URGENCY_LEVELS.YELLOW
  return URGENCY_LEVELS.GREEN
}

// ── Build triggering_findings array ──────────────────────────
// Returns array of objects with canonical_code + label
// Used for auditability and schema compliance
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

// ── Build explanation_summary (single string) ─────────────────
function buildExplanationSummary(triggeringFindings, urgencyLevel, overrideApplied, escalationFlag) {
  const count = triggeringFindings.length

  if (count === 0) {
    return 'No high-suspicion findings reported. Routine monitoring advised.'
  }

  const redFlags = triggeringFindings.filter(f => f.is_red_flag)
  const systems  = [...new Set(triggeringFindings.map(f => f.body_system))]

  let summary = `${count} clinical finding${count !== 1 ? 's' : ''} identified across `
  summary    += `${systems.length} body system${systems.length !== 1 ? 's' : ''}`
  summary    += ` (${systems.join(', ')}).`

  if (overrideApplied) {
    summary += ` ${redFlags.length} red-flag indicator${redFlags.length !== 1 ? 's' : ''} ` +
               `present simultaneously — urgency escalated to IMMEDIATE per protocol.`
  } else if (escalationFlag) {
    summary += ` Multiple lower-severity findings together justify elevated urgency classification.`
  }

  summary += ` Urgency classification: ${urgencyLevel.level.toUpperCase()}.`
  return summary
}

// ── Main export: runTriage() ──────────────────────────────────

/**
 * runTriage — canonical triage rule engine
 *
 * @param {Object} input
 * @param {number}  input.age_months
 * @param {Object}  input.symptoms        — key/boolean map
 * @param {number}  input.duration_weeks
 * @param {boolean} input.prior_treatment
 *
 * @returns {Object} Full canonical triage output
 */
export function runTriage(input) {
  // ── Validation ───────────────────────────────────────────
  const ageMonths     = Number(input.age_months)     || 0
  const durationWeeks = Number(input.duration_weeks) || 0
  const symptoms      = input.symptoms               || {}

  if (ageMonths < 0 || ageMonths > 216) {
    throw new Error(`Invalid age_months: ${ageMonths}. Must be 0–216.`)
  }

  // ── Score each symptom ───────────────────────────────────
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

  // ── Age modifier ─────────────────────────────────────────
  const ageModifier = AGE_MODIFIER(ageMonths)
  rawScore += ageModifier.score

  // ── Duration multiplier ───────────────────────────────────
  const durationBand = getDurationMultiplier(durationWeeks)
  const finalScore   = Math.round(rawScore * durationBand.multiplier)

  // ── Urgency classification ────────────────────────────────
  const urgencyLevel = classifyUrgency(finalScore, redFlagCount)

  const overrideApplied = (
    redFlagCount >= RED_FLAG_OVERRIDE_THRESHOLD &&
    finalScore < URGENCY_LEVELS.RED.score_threshold
  )

  // Multiple low-grade findings escalation
  // (non-red-flag symptoms together justify higher concern)
  const nonRedFlagPresent = SYMPTOMS
    .filter(s => !s.is_red_flag && Boolean(symptoms[s.key]))
    .length
  const escalationFlag = !overrideApplied && nonRedFlagPresent >= 2 &&
    urgencyLevel.level !== 'scheduled'

  // ── Triggering findings (canonical codes) ─────────────────
  const triggeringFindings = buildTriggeringFindings(symptoms)

  // ── Explanation summary (single string) ───────────────────
  const explanationSummary = buildExplanationSummary(
    triggeringFindings, urgencyLevel, overrideApplied, escalationFlag
  )

  // ── Prior treatment note ──────────────────────────────────
  if (input.prior_treatment) {
    explanation.push(
      'Patient has received prior treatment. This context must be ' +
      'communicated to the receiving facility at referral.'
    )
  }

  if (explanation.length === 0) {
    explanation.push(
      'No high-risk symptoms reported at this time. Continue monitoring. ' +
      'Advise guardian to return if any new symptoms develop.'
    )
  }

  // ── Return full canonical output ──────────────────────────
  return {
    // Canonical urgency fields (schema section 5.5)
    urgency_level:        urgencyLevel.level,   // immediate | priority | scheduled
    urgency_color:        urgencyLevel.color,   // red | yellow | green

    // Explainability (non-negotiable per Engineering Review)
    triggering_findings:  triggeringFindings,
    explanation_summary:  explanationSummary,
    explanation,                                // per-finding detail array
    escalation_flag:      escalationFlag,
    override_applied:     overrideApplied,
    multiple_low_grade_escalation: escalationFlag,

    // Scoring detail (for UI display and audit)
    risk_score:           finalScore,
    raw_score:            rawScore,
    score_breakdown,
    duration_label:       durationBand.label,
    duration_multiplier:  durationBand.multiplier,
    age_modifier:         ageModifier,
    red_flag_count:       redFlagCount,
    max_possible_score:   Math.round(MAX_RAW_SCORE * 1.5),

    // Versioning (required for audit trail)
    rule_version:         SCHEMA_VERSION.triage_logic_version,
    schema_version:       SCHEMA_VERSION.schema_version,
    assessment_mode:      'rule_based',
    assessed_by_role:     'community_health_worker'
  }
}

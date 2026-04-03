// frontend/src/engine/triageRules.js
// =============================================================
// NOFOM TRIAGE RULE ENGINE
// =============================================================
// Pure function — no network, no database, no side effects.
// Runs identically in browser (offline) and on Node.js server.
//
// USAGE:
//   import { runTriage } from './triageRules'
//   const result = runTriage(input)
//
// INPUT shape: see runTriage() JSDoc below
// OUTPUT shape: see RETURN section of runTriage() JSDoc
// =============================================================

import {
  SYMPTOMS,
  DURATION_MULTIPLIERS,
  AGE_MODIFIER,
  RISK_THRESHOLDS,
  PRIMARY_SYMPTOM_HIGH_OVERRIDE,
  MAX_RAW_SCORE
} from '../shared/triageSchema.js'

// =============================================================
// PRIVATE HELPER: Get duration multiplier for given week count
// =============================================================
function getDurationMultiplier(durationWeeks) {
  const weeks = Number(durationWeeks) || 0
  for (const band of DURATION_MULTIPLIERS) {
    if (weeks >= band.minWeeks && weeks < band.maxWeeks) {
      return band
    }
  }
  // Fallback — should never reach here given the 0–999 range
  return DURATION_MULTIPLIERS[DURATION_MULTIPLIERS.length - 1]
}

// =============================================================
// PRIVATE HELPER: Classify risk level from final score
// Also applies the primary-symptom override rule
// =============================================================
function classifyRisk(finalScore, primarySymptomsCount) {
  // Hard safety override: 2+ primary symptoms = always HIGH
  if (primarySymptomsCount >= PRIMARY_SYMPTOM_HIGH_OVERRIDE) {
    return RISK_THRESHOLDS.HIGH.label
  }

  if (finalScore >= RISK_THRESHOLDS.HIGH.min)   return RISK_THRESHOLDS.HIGH.label
  if (finalScore >= RISK_THRESHOLDS.MEDIUM.min) return RISK_THRESHOLDS.MEDIUM.label
  return RISK_THRESHOLDS.LOW.label
}

// =============================================================
// MAIN EXPORT: runTriage()
// =============================================================
/**
 * Runs the Nofom triage rule engine.
 *
 * @param {Object} input
 * @param {number}  input.age_months       - Patient age in months (0–216)
 * @param {Object}  input.symptoms         - Key/boolean map of symptom flags
 *                                           (keys match SYMPTOMS[].key)
 * @param {number}  input.duration_weeks   - How long symptoms have been present
 * @param {boolean} input.prior_treatment  - Has the patient received prior treatment
 *
 * @returns {Object} result
 * @returns {string}  result.risk_level         - 'LOW' | 'MEDIUM' | 'HIGH'
 * @returns {number}  result.risk_score          - Final integer score (0–~200)
 * @returns {number}  result.raw_score           - Score before duration multiplier
 * @returns {Object}  result.score_breakdown     - Per-symptom score contributions
 * @returns {string}  result.duration_label      - Human-readable duration band
 * @returns {number}  result.duration_multiplier - Multiplier applied to raw score
 * @returns {Object}  result.age_modifier        - Age score and label
 * @returns {string[]} result.explanation        - Ordered list of explanations
 * @returns {number}  result.primary_count       - How many primary symptoms present
 * @returns {boolean} result.override_applied    - Whether the primary override fired
 */
export function runTriage(input) {
  // ── 1. Input validation ──────────────────────────────────────
  const ageMonths     = Number(input.age_months)    || 0
  const durationWeeks = Number(input.duration_weeks) || 0
  const symptoms      = input.symptoms              || {}

  if (ageMonths < 0 || ageMonths > 216) {
    throw new Error(`Invalid age_months: ${ageMonths}. Must be 0–216.`)
  }

  // ── 2. Score each symptom ────────────────────────────────────
  const score_breakdown = {}
  const explanation     = []
  let   rawScore        = 0
  let   primaryCount    = 0

  for (const symptom of SYMPTOMS) {
    const isPresent = Boolean(symptoms[symptom.key])

    if (isPresent) {
      score_breakdown[symptom.key] = symptom.weight
      rawScore += symptom.weight
      explanation.push(symptom.explanation)

      if (symptom.isPrimary) primaryCount++
    } else {
      score_breakdown[symptom.key] = 0
    }
  }

  // ── 3. Apply age modifier ────────────────────────────────────
  const ageModifier = AGE_MODIFIER(ageMonths)
  rawScore += ageModifier.score

  // ── 4. Apply duration multiplier ────────────────────────────
  const durationBand = getDurationMultiplier(durationWeeks)
  const finalScore   = Math.round(rawScore * durationBand.multiplier)

  // ── 5. Classify risk ─────────────────────────────────────────
  const riskLevel       = classifyRisk(finalScore, primaryCount)
  const overrideApplied = (
    primaryCount >= PRIMARY_SYMPTOM_HIGH_OVERRIDE &&
    finalScore < RISK_THRESHOLDS.HIGH.min
  )

  // ── 6. Add override explanation if it fired ──────────────────
  if (overrideApplied) {
    explanation.unshift(
      `Risk elevated to HIGH because ${primaryCount} primary cancer indicators ` +
      `are present simultaneously. This combination requires urgent evaluation ` +
      `regardless of individual symptom scores.`
    )
  }

  // ── 7. Add prior treatment note ──────────────────────────────
  if (input.prior_treatment) {
    explanation.push(
      'Patient has received prior treatment. This context should be communicated ' +
      'to the receiving facility at referral.'
    )
  }

  // ── 8. If no symptoms, explain that too ─────────────────────
  if (explanation.length === 0) {
    explanation.push(
      'No high-risk symptoms reported at this time. Continue monitoring. ' +
      'Advise guardian to return if any new symptoms develop.'
    )
  }

  // ── 9. Return full result ────────────────────────────────────
  return {
    risk_level:          riskLevel,
    risk_score:          finalScore,
    raw_score:           rawScore,
    score_breakdown,
    duration_label:      durationBand.label,
    duration_multiplier: durationBand.multiplier,
    age_modifier:        ageModifier,
    explanation,
    primary_count:       primaryCount,
    override_applied:    overrideApplied,
    max_possible_score:  Math.round(MAX_RAW_SCORE * 1.5) // for UI progress bar
  }
}

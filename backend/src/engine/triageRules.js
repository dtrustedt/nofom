// backend/src/engine/triageRules.js
'use strict'

const {
  SYMPTOMS,
  DURATION_MULTIPLIERS,
  AGE_MODIFIER,
  RISK_THRESHOLDS,
  PRIMARY_SYMPTOM_HIGH_OVERRIDE,
  MAX_RAW_SCORE
} = require('../../../shared/triageSchema.cjs')

function getDurationMultiplier(durationWeeks) {
  const weeks = Number(durationWeeks) || 0
  for (const band of DURATION_MULTIPLIERS) {
    if (weeks >= band.minWeeks && weeks < band.maxWeeks) return band
  }
  return DURATION_MULTIPLIERS[DURATION_MULTIPLIERS.length - 1]
}

function classifyRisk(finalScore, primaryCount) {
  if (primaryCount >= PRIMARY_SYMPTOM_HIGH_OVERRIDE) return RISK_THRESHOLDS.HIGH.label
  if (finalScore >= RISK_THRESHOLDS.HIGH.min)         return RISK_THRESHOLDS.HIGH.label
  if (finalScore >= RISK_THRESHOLDS.MEDIUM.min)       return RISK_THRESHOLDS.MEDIUM.label
  return RISK_THRESHOLDS.LOW.label
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

  const ageModifier  = AGE_MODIFIER(ageMonths)
  rawScore          += ageModifier.score

  const durationBand = getDurationMultiplier(durationWeeks)
  const finalScore   = Math.round(rawScore * durationBand.multiplier)
  const riskLevel    = classifyRisk(finalScore, primaryCount)

  const overrideApplied = (
    primaryCount >= PRIMARY_SYMPTOM_HIGH_OVERRIDE &&
    finalScore < RISK_THRESHOLDS.HIGH.min
  )

  if (overrideApplied) {
    explanation.unshift(
      `Risk elevated to HIGH because ${primaryCount} primary cancer indicators ` +
      `are present simultaneously. This combination requires urgent evaluation ` +
      `regardless of individual symptom scores.`
    )
  }

  if (input.prior_treatment) {
    explanation.push(
      'Patient has received prior treatment. This context should be communicated ' +
      'to the receiving facility at referral.'
    )
  }

  if (explanation.length === 0) {
    explanation.push(
      'No high-risk symptoms reported at this time. Continue monitoring. ' +
      'Advise guardian to return if any new symptoms develop.'
    )
  }

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
    max_possible_score:  Math.round(MAX_RAW_SCORE * 1.5)
  }
}

module.exports = { runTriage }

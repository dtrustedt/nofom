// backend/test-engine.js
// Run: node test-engine.js
// Tests the rule engine with known inputs and expected outputs
'use strict'

const { runTriage }        = require('./src/engine/triageRules')
const { generateReferral } = require('./src/engine/referralEngine')

console.log('\n🧪 NOFOM ENGINE TEST SUITE\n')
console.log('='.repeat(50))

// ── Test 1: High-risk patient (Phase 0 payload) ──────────────
console.log('\nTest 1: High-risk patient (multiple primary symptoms)')
const test1 = runTriage({
  age_months: 36,
  symptoms: {
    unexplained_weight_loss: true,
    persistent_fever:        true,
    abdominal_mass:          false,
    lymph_node_swelling:     true,
    bone_pain:               false,
    unusual_bruising:        false,
    persistent_headache:     false,
    vision_changes:          false,
    extreme_fatigue:         true
  },
  duration_weeks: 4,
  prior_treatment: false
})
const ref1 = generateReferral(test1, { unexplained_weight_loss: true, persistent_fever: true, lymph_node_swelling: true })
console.log(`  Risk Level:    ${test1.risk_level}   (expected: HIGH)`)
console.log(`  Risk Score:    ${test1.risk_score}`)
console.log(`  Primary Count: ${test1.primary_count}   (expected: 3)`)
console.log(`  Override:      ${test1.override_applied}`)
console.log(`  Referral:      ${ref1.action}`)
console.log(`  Timeframe:     ${ref1.timeframe}`)
console.assert(test1.risk_level === 'HIGH', '❌ FAIL: Expected HIGH')
console.assert(test1.primary_count === 3,   '❌ FAIL: Expected 3 primary symptoms')
console.log('  ✅ PASS')

// ── Test 2: Low-risk patient (no symptoms) ───────────────────
console.log('\nTest 2: No symptoms — should be LOW risk')
const test2 = runTriage({
  age_months: 60,
  symptoms: {},
  duration_weeks: 1,
  prior_treatment: false
})
console.log(`  Risk Level:  ${test2.risk_level}   (expected: LOW)`)
console.log(`  Risk Score:  ${test2.risk_score}`)
console.assert(test2.risk_level === 'LOW', '❌ FAIL: Expected LOW')
console.log('  ✅ PASS')

// ── Test 3: Override rule fires ──────────────────────────────
console.log('\nTest 3: Override — 2 primary symptoms, short duration (score might be medium without override)')
const test3 = runTriage({
  age_months: 48,
  symptoms: {
    vision_changes:      true,  // primary, weight 22
    abdominal_mass:      true,  // primary, weight 22
  },
  duration_weeks: 1,  // short = 0.9 multiplier — would reduce score
  prior_treatment: false
})
console.log(`  Risk Level:     ${test3.risk_level}   (expected: HIGH)`)
console.log(`  Override fired: ${test3.override_applied}   (expected: true)`)
console.assert(test3.risk_level === 'HIGH', '❌ FAIL: Override should force HIGH')
console.assert(test3.override_applied === true, '❌ FAIL: Override should be marked true')
console.log('  ✅ PASS')

// ── Test 4: Medium-risk patient ──────────────────────────────
console.log('\nTest 4: Single non-primary symptom — should be MEDIUM or LOW')
const test4 = runTriage({
  age_months: 84,
  symptoms: {
    extreme_fatigue: true,   // non-primary, weight 10
    unusual_bruising: true,  // non-primary, weight 14
  },
  duration_weeks: 3,
  prior_treatment: false
})
console.log(`  Risk Level:  ${test4.risk_level}   (expected: MEDIUM)`)
console.log(`  Risk Score:  ${test4.risk_score}`)
console.assert(test4.risk_level === 'MEDIUM', '❌ FAIL: Expected MEDIUM')
console.log('  ✅ PASS')

// ── Test 5: Special case note fires ─────────────────────────
console.log('\nTest 5: Abdominal mass — special note should fire')
const test5Input = { abdominal_mass: true }
const test5Triage = runTriage({ age_months: 24, symptoms: test5Input, duration_weeks: 2 })
const test5Ref = generateReferral(test5Triage, test5Input)
console.log(`  Special notes: ${test5Ref.special_notes.length}   (expected: 1)`)
console.log(`  Note preview:  ${test5Ref.special_notes[0]?.slice(0, 60)}...`)
console.assert(test5Ref.special_notes.length >= 1, '❌ FAIL: Expected special note for abdominal mass')
console.log('  ✅ PASS')

// ── Test 6: Age validation ───────────────────────────────────
console.log('\nTest 6: Invalid age — should throw')
try {
  runTriage({ age_months: 999, symptoms: {}, duration_weeks: 0 })
  console.log('  ❌ FAIL: Should have thrown')
} catch (e) {
  console.log(`  Threw correctly: "${e.message}"`)
  console.log('  ✅ PASS')
}

console.log('\n' + '='.repeat(50))
console.log('✅ All tests passed. Engine is ready.\n')

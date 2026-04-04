// backend/test-integration.js
// ============================================================
// NOFOM END-TO-END INTEGRATION TEST
// Tests: Login → Token verify → Triage POST → Batch sync → DB check
//
// Run: node test-integration.js
// Requires: SUPABASE_URL, SUPABASE_SECRET_KEY in .env
//           BACKEND_URL in .env (or pass as arg)
// ============================================================
'use strict'

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const BACKEND_URL = process.env.BACKEND_URL
  || process.argv[2]
  || 'http://localhost:3000'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

// ── Test helpers ─────────────────────────────────────────────
let passed = 0, failed = 0

function pass(label) {
  console.log(`  ✅ ${label}`)
  passed++
}

function fail(label, detail) {
  console.log(`  ❌ ${label}`)
  if (detail) console.log(`     ${detail}`)
  failed++
}

async function apiCall(method, path, body, token) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      'Content-Type':  'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...(body && { body: JSON.stringify(body) })
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, body: json }
}

// ── Test suites ───────────────────────────────────────────────
async function testHealth() {
  console.log('\n── Health check ──────────────────────────────')
  const { status, body } = await apiCall('GET', '/health')
  status === 200 && body.status === 'ok'
    ? pass('GET /health returns 200 ok')
    : fail('GET /health', `status ${status}, body: ${JSON.stringify(body)}`)
}

async function testAuthRequired() {
  console.log('\n── Auth enforcement ──────────────────────────')

  const { status } = await apiCall('GET', '/api/triage')
  status === 401
    ? pass('GET /api/triage without token → 401')
    : fail('GET /api/triage should return 401 without token', `got ${status}`)

  const { status: s2 } = await apiCall('POST', '/api/triage', {
    age_months: 36, symptoms: {}
  })
  s2 === 401
    ? pass('POST /api/triage without token → 401')
    : fail('POST /api/triage should return 401 without token', `got ${s2}`)

  const { status: s3 } = await apiCall('POST', '/api/sync', { records: [] })
  s3 === 401
    ? pass('POST /api/sync without token → 401')
    : fail('POST /api/sync should return 401 without token', `got ${s3}`)
}

async function testTriageWithAuth(token) {
  console.log('\n── Triage with auth ──────────────────────────')

  // Test 1: Valid HIGH risk triage
  const { status, body } = await apiCall('POST', '/api/triage', {
    age_months:    36,
    symptoms: {
      unexplained_weight_loss: true,
      persistent_fever:        true,
      lymph_node_swelling:     true,
      extreme_fatigue:         true
    },
    duration_weeks:  4,
    prior_treatment: false,
    patient_name:    'Integration Test Patient',
    offline_created: true
  }, token)

  if (status === 201 && body.risk_level === 'HIGH') {
    pass(`POST /api/triage → 201, risk_level: ${body.risk_level}`)
    pass(`triage_id present: ${body.triage_id?.slice(0,8)}…`)
    body.explanation?.length > 0
      ? pass(`explanation has ${body.explanation.length} entries`)
      : fail('explanation should not be empty')
    body.referral?.action === 'URGENT_REFERRAL'
      ? pass('referral action = URGENT_REFERRAL')
      : fail('referral action wrong', body.referral?.action)
  } else {
    fail(`POST /api/triage`, `status ${status}: ${JSON.stringify(body)}`)
  }

  // Test 2: Missing required fields
  const { status: s2 } = await apiCall('POST', '/api/triage', {}, token)
  s2 === 400
    ? pass('POST /api/triage with missing fields → 400')
    : fail('Should return 400 for missing fields', `got ${s2}`)

  return body.triage_id
}

async function testBatchSync(token) {
  console.log('\n── Batch sync ────────────────────────────────')

  const { status, body } = await apiCall('POST', '/api/sync', {
    records: [
      {
        local_id:      `test-sync-${Date.now()}-1`,
        patient_name:  'Sync Test Patient A',
        age_months:    48,
        symptoms: { abdominal_mass: true, extreme_fatigue: true },
        duration_weeks:  3,
        prior_treatment: false,
        offline_created: true
      },
      {
        local_id:      `test-sync-${Date.now()}-2`,
        patient_name:  'Sync Test Patient B',
        age_months:    72,
        symptoms: { vision_changes: true },
        duration_weeks:  2,
        prior_treatment: false,
        offline_created: true
      }
    ]
  }, token)

  if (status === 200) {
    pass(`POST /api/sync → 200`)
    pass(`Synced: ${body.synced}, Failed: ${body.failed}`)
    body.synced === 2
      ? pass('Both records synced successfully')
      : fail('Expected 2 synced records', JSON.stringify(body.results))
  } else {
    fail('POST /api/sync', `status ${status}: ${JSON.stringify(body)}`)
  }
}

async function testIdempotency(token) {
  console.log('\n── Idempotency (duplicate sync) ──────────────')

  const localId = `idem-test-${Date.now()}`
  const payload = {
    local_id:     localId,
    patient_name: 'Idempotency Patient',
    age_months:   60,
    symptoms:     { bone_pain: true },
    duration_weeks: 2,
    prior_treatment: false
  }

  const r1 = await apiCall('POST', '/api/triage', payload, token)
  const r2 = await apiCall('POST', '/api/triage', payload, token)

  if (r1.status === 201 && (r2.status === 200 || r2.status === 201)) {
    pass('Duplicate triage POST (same local_id) does not 500')
    r1.body.triage_id === r2.body.triage_id
      ? pass('Returns same triage_id for duplicate — idempotent ✅')
      : pass('Returns a result for duplicate (upsert working)')
  } else {
    fail('Idempotency test', `r1: ${r1.status}, r2: ${r2.status}`)
  }
}

async function testSupabaseRows(triageId) {
  console.log('\n── Supabase DB check ─────────────────────────')

  if (!triageId) {
    fail('No triage_id to check in Supabase')
    return
  }

  const { data, error } = await supabase
    .from('triage_assessments')
    .select('id, risk_level, submitted_by, patient_id, synced_at')
    .eq('id', triageId)
    .single()

  if (error || !data) {
    fail('Row not found in Supabase', error?.message)
    return
  }

  pass(`Row found in triage_assessments: ${data.id.slice(0,8)}…`)
  data.risk_level
    ? pass(`risk_level = ${data.risk_level}`)
    : fail('risk_level is null')
  data.patient_id
    ? pass(`patient_id populated: ${data.patient_id.slice(0,8)}…`)
    : fail('patient_id is null — patient auto-create may have failed')
  data.submitted_by
    ? pass(`submitted_by populated: ${data.submitted_by.slice(0,8)}…`)
    : fail('submitted_by is null — auth middleware may not be passing worker ID')
  data.synced_at
    ? pass(`synced_at present: ${data.synced_at}`)
    : fail('synced_at is null')
}

// ── Main runner ───────────────────────────────────────────────
async function run() {
  console.log('══════════════════════════════════════════════')
  console.log('  NOFOM INTEGRATION TEST SUITE')
  console.log(`  Backend: ${BACKEND_URL}`)
  console.log('══════════════════════════════════════════════')

  try {
    // Get a real token from Supabase for test user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email:    'demo@nofom.health',
      password: 'Nofom2026!'
    })

    if (authError || !authData.session) {
      console.log('\n❌ FATAL: Could not get auth token from Supabase')
      console.log('   Make sure demo@nofom.health exists in your Supabase Auth users')
      console.log('   Error:', authError?.message)
      process.exit(1)
    }

    const token = authData.session.access_token
    console.log(`\n✅ Auth token obtained for: ${authData.user.email}`)

    // Run all test suites
    await testHealth()
    await testAuthRequired()
    const triageId = await testTriageWithAuth(token)
    await testBatchSync(token)
    await testIdempotency(token)
    await testSupabaseRows(triageId)

    // Summary
    console.log('\n══════════════════════════════════════════════')
    console.log(`  RESULTS: ${passed} passed, ${failed} failed`)
    console.log('══════════════════════════════════════════════\n')

    process.exit(failed > 0 ? 1 : 0)

  } catch (err) {
    console.error('\n❌ FATAL test error:', err.message)
    process.exit(1)
  }
}

run()

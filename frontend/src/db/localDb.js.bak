// frontend/src/db/localDb.js
import Dexie from 'dexie'

export const db = new Dexie('NofomDB')

// ── Version 2: adds patient_name field ──────────────────────
// Version 1 stays declared so Dexie can upgrade existing installs
db.version(1).stores({
  patients:           '++_localId, &local_id, age_months, created_at, synced_at',
  triage_assessments: '++_localId, &local_id, patient_local_id, risk_level, submitted_at, synced_at',
  sync_queue:         '++id, entity_type, local_id, status, created_at, last_attempted_at'
})

db.version(2).stores({
  patients:           '++_localId, &local_id, age_months, created_at, synced_at',
  triage_assessments: '++_localId, &local_id, patient_local_id, patient_name, risk_level, submitted_at, synced_at',
  sync_queue:         '++id, entity_type, local_id, status, created_at, last_attempted_at'
})

// ── Patient ops ──────────────────────────────────────────────
export async function savePatientLocally(patientData) {
  const local_id = patientData.local_id || crypto.randomUUID()
  const record = { ...patientData, local_id, created_at: new Date().toISOString(), synced_at: null }
  await db.patients.add(record)
  await addToSyncQueue('patient', local_id)
  return record
}

export async function getAllPatientsLocally() {
  return db.patients.orderBy('created_at').reverse().toArray()
}

// ── Triage ops ───────────────────────────────────────────────
export async function saveTriageLocally(triageData) {
  const local_id = triageData.local_id || crypto.randomUUID()
  const record = {
    ...triageData,
    local_id,
    submitted_at:    new Date().toISOString(),
    synced_at:       null,
    offline_created: true
  }
  await db.triage_assessments.add(record)
  await addToSyncQueue('triage_assessment', local_id)
  return record
}

export async function getAllTriageLocally() {
  return db.triage_assessments.orderBy('submitted_at').reverse().toArray()
}

export async function getTriageByLocalId(local_id) {
  return db.triage_assessments.where('local_id').equals(local_id).first()
}

export async function markTriageSynced(local_id, server_id) {
  await db.triage_assessments.where('local_id').equals(local_id).modify({
    synced_at: new Date().toISOString(),
    server_id
  })
}

// ── Sync queue ops ───────────────────────────────────────────
export async function addToSyncQueue(entityType, localId) {
  const existing = await db.sync_queue
    .where('local_id').equals(localId)
    .and(i => i.status === 'pending')
    .first()
  if (!existing) {
    await db.sync_queue.add({
      entity_type:       entityType,
      local_id:          localId,
      status:            'pending',
      created_at:        new Date().toISOString(),
      last_attempted_at: null,
      error:             null
    })
  }
}

export async function getPendingSyncItems() {
  return db.sync_queue.where('status').equals('pending').toArray()
}

export async function markSyncItemComplete(id) {
  await db.sync_queue.update(id, { status: 'synced', last_attempted_at: new Date().toISOString() })
}

export async function markSyncItemFailed(id, error) {
  await db.sync_queue.update(id, { status: 'failed', last_attempted_at: new Date().toISOString(), error: String(error) })
}

export async function getPendingSyncCount() {
  return db.sync_queue.where('status').equals('pending').count()
}

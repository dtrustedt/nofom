// frontend/src/sync/syncService.js
// =============================================================
// NOFOM SYNC SERVICE
// =============================================================
// Reads from the local sync_queue and pushes to the backend API.
// Called:
//   - When the app detects it's back online
//   - On app startup (catches anything missed while offline)
//   - After each triage submission (opportunistic)
// =============================================================

import {
  getPendingSyncItems,
  getTriageByLocalId,
  markSyncItemComplete,
  markSyncItemFailed
} from '../db/localDb'

const API_BASE = import.meta.env.VITE_API_BASE_URL

// =============================================================
// MAIN SYNC FUNCTION
// =============================================================
export async function syncPendingRecords(authToken) {
  if (!navigator.onLine) {
    console.log('[Sync] Device is offline — skipping sync')
    return { synced: 0, failed: 0, skipped: true }
  }

  const queue = await getPendingSyncItems()

  if (queue.length === 0) {
    console.log('[Sync] Nothing to sync')
    return { synced: 0, failed: 0, skipped: false }
  }

  console.log(`[Sync] Found ${queue.length} item(s) to sync`)

  let synced = 0
  let failed = 0

  for (const item of queue) {
    try {
      if (item.entity_type === 'triage_assessment') {
        await syncTriageRecord(item, authToken)
        await markSyncItemComplete(item.id)
        synced++
      }
      // patient sync can be added here in future
    } catch (err) {
      console.error(`[Sync] Failed to sync item ${item.local_id}:`, err)
      await markSyncItemFailed(item.id, err.message)
      failed++
    }
  }

  console.log(`[Sync] Complete — synced: ${synced}, failed: ${failed}`)
  return { synced, failed, skipped: false }
}

// =============================================================
// SYNC A SINGLE TRIAGE RECORD
// =============================================================
async function syncTriageRecord(queueItem, authToken) {
  const record = await getTriageByLocalId(queueItem.local_id)
  if (!record) throw new Error(`Local record not found: ${queueItem.local_id}`)

  // Reconstruct the API payload from local record
  const payload = {
    local_id:      record.local_id,
    patient_id:    record.patient_id     || null,
    age_months:    record.age_months,
    symptoms:      record.symptoms,
    duration_weeks: record.duration_weeks || 0,
    prior_treatment: record.prior_treatment || false,
    submitted_at:  record.submitted_at,
    offline_created: true
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` })
  }

  const response = await fetch(`${API_BASE}/api/triage`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(payload)
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(err.error || `HTTP ${response.status}`)
  }

  const result = await response.json()
  console.log(`[Sync] Triage ${record.local_id} → server ID: ${result.triage_id}`)
  return result
}

// =============================================================
// REGISTER ONLINE EVENT LISTENER
// Call this once at app startup
// =============================================================
export function registerSyncOnReconnect(getAuthToken) {
  window.addEventListener('online', async () => {
    console.log('[Sync] Back online — triggering sync')
    const token = getAuthToken ? getAuthToken() : null
    await syncPendingRecords(token)
  })
  console.log('[Sync] Online listener registered')
}

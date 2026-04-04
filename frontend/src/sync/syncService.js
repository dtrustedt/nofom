// frontend/src/sync/syncService.js
import {
  db,
  getPendingSyncItems,
  getTriageByLocalId,
  markTriageSynced,
  markSyncItemComplete,
  markSyncItemFailed
} from '../db/localDb'

const API_BASE = import.meta.env.VITE_API_BASE_URL

export async function syncPendingRecords(authToken) {
  if (!navigator.onLine) return { synced: 0, failed: 0, skipped: true }

  const queue = await getPendingSyncItems()
  if (queue.length === 0) return { synced: 0, failed: 0, skipped: false }

  console.log(`[Sync] ${queue.length} item(s) to sync`)
  let synced = 0, failed = 0

  for (const item of queue) {
    try {
      if (item.entity_type === 'triage_assessment') {
        const result = await syncTriageRecord(item, authToken)
        await markSyncItemComplete(item.id)
        await markTriageSynced(item.local_id, result.triage_id)
        console.log(`[Sync] ✅ ${item.local_id} → ${result.triage_id}`)
        synced++
      }
    } catch (err) {
      console.error(`[Sync] ❌ ${item.local_id}:`, err.message)
      await markSyncItemFailed(item.id, err.message)
      failed++
    }
  }

  console.log(`[Sync] Done — synced: ${synced}, failed: ${failed}`)
  return { synced, failed, skipped: false }
}

async function syncTriageRecord(queueItem, authToken) {
  const record = await getTriageByLocalId(queueItem.local_id)
  if (!record) throw new Error(`Local record not found: ${queueItem.local_id}`)

  const payload = {
    local_id:        record.local_id,
    patient_name:    record.patient_name    || 'Patient',
    patient_gender:  record.patient_gender  || 'unknown',
    age_months:      record.age_months,
    symptoms:        record.symptoms,
    duration_weeks:  record.duration_weeks  || 0,
    prior_treatment: record.prior_treatment || false,
    submitted_by:    record.submitted_by    || null,   // ← now included
    facility_id:     record.facility_id     || null,   // ← now included
    submitted_at:    record.submitted_at,
    offline_created: true
  }

  const response = await fetch(`${API_BASE}/api/triage`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` })
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(err.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// Resets failed items to pending and re-runs sync
export async function retryFailedSyncItems(getAuthToken) {
  const failed = await db.sync_queue
    .where('status').equals('failed')
    .toArray()

  if (failed.length === 0) return { synced: 0, failed: 0, skipped: false }

  console.log(`[Sync] Retrying ${failed.length} failed item(s)`)

  for (const item of failed) {
    await db.sync_queue.update(item.id, {
      status:            'pending',
      error:             null,
      last_attempted_at: null
    })
  }

  const token = getAuthToken ? getAuthToken() : null
  return syncPendingRecords(token)
}

export function registerSyncOnReconnect(getAuthToken) {
  window.addEventListener('online', async () => {
    console.log('[Sync] Back online')
    await syncPendingRecords(getAuthToken ? getAuthToken() : null)
  })
  console.log('[Sync] Online listener registered')
}

// frontend/src/sync/syncService.js
import {
  getPendingSyncItems,
  getTriageByLocalId,
  markTriageSynced,        // ← THIS was never being called. Root cause of bug 3.
  markSyncItemComplete,
  markSyncItemFailed
} from '../db/localDb'

const API_BASE = import.meta.env.VITE_API_BASE_URL

export async function syncPendingRecords(authToken) {
  if (!navigator.onLine) {
    console.log('[Sync] Offline — skipping')
    return { synced: 0, failed: 0, skipped: true }
  }

  const queue = await getPendingSyncItems()
  if (queue.length === 0) return { synced: 0, failed: 0, skipped: false }

  console.log(`[Sync] ${queue.length} item(s) to sync`)
  let synced = 0, failed = 0

  for (const item of queue) {
    try {
      if (item.entity_type === 'triage_assessment') {
        const result = await syncTriageRecord(item, authToken)
        // ── Fix: mark BOTH the queue item AND the triage record ──
        await markSyncItemComplete(item.id)
        await markTriageSynced(item.local_id, result.triage_id)  // ← THE FIX
        synced++
      }
    } catch (err) {
      console.error(`[Sync] Failed ${item.local_id}:`, err)
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
    patient_id:      record.patient_id     || null,
    age_months:      record.age_months,
    symptoms:        record.symptoms,
    duration_weeks:  record.duration_weeks || 0,
    prior_treatment: record.prior_treatment || false,
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

export function registerSyncOnReconnect(getAuthToken) {
  window.addEventListener('online', async () => {
    console.log('[Sync] Back online — syncing')
    await syncPendingRecords(getAuthToken ? getAuthToken() : null)
  })
}

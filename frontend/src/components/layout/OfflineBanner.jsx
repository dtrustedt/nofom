import useAppStore from '../../store/useAppStore'
import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflineBanner() {
  const { isOnline, pendingSyncCount } = useAppStore()
  if (isOnline && pendingSyncCount === 0) return null

  return (
    <div className={`nf-banner ${isOnline ? 'nf-banner-syncing' : 'nf-banner-offline'}`}>
      {isOnline ? (
        <>
          <RefreshCw size={13} style={{ animation:'nf-spin 1s linear infinite', flexShrink:0 }} />
          <span>{pendingSyncCount} record{pendingSyncCount !== 1 ? 's' : ''} syncing to server</span>
        </>
      ) : (
        <>
          <WifiOff size={13} style={{ flexShrink:0 }} />
          <span>Offline — triage works normally. Records sync when you reconnect.</span>
        </>
      )}
    </div>
  )
}

// frontend/src/components/layout/OfflineBanner.jsx
import useAppStore from '../../store/useAppStore'
import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflineBanner() {
  const { isOnline, pendingSyncCount } = useAppStore()

  if (isOnline && pendingSyncCount === 0) return null

  return (
    <div className={`w-full py-2 px-4 text-sm font-medium flex items-center gap-2
      ${isOnline ? 'bg-amber-100 text-amber-800' : 'bg-slate-800 text-white'}`}>

      {isOnline ? (
        <>
          <RefreshCw size={14} className="animate-spin" />
          <span>{pendingSyncCount} record{pendingSyncCount !== 1 ? 's' : ''} waiting to sync</span>
        </>
      ) : (
        <>
          <WifiOff size={14} />
          <span>You are offline — triage still works. Records will sync when connected.</span>
        </>
      )}
    </div>
  )
}

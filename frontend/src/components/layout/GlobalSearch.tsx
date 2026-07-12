import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2 } from 'lucide-react'
import { listDevices } from '../../api/devices'
import { deviceTypeLabel } from '../../lib/format'
import { StatusBadge } from '../ui/Badge'
import { useI18n } from '../../context/I18nContext'
import type { Device } from '../../types'

export function GlobalSearch() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Device[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    const handle = window.setTimeout(async () => {
      try {
        const data = await listDevices({ search: q, page_size: 8 })
        setResults(data.items)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => window.clearTimeout(handle)
  }, [query])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const goTo = (device: Device) => {
    setOpen(false)
    setQuery('')
    navigate(`/assets/${device.id}`)
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={t('topbar.searchPlaceholder')}
          className="h-9 w-full rounded-md border border-surface-300 bg-surface-50 pl-8 pr-8 text-sm placeholder:text-surface-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 dark:border-surface-700 dark:bg-surface-800 dark:placeholder:text-surface-500"
        />
        {loading && (
          <Loader2
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-surface-400"
          />
        )}
      </div>

      {open && (
        <div className="absolute top-full z-30 mt-1 w-full overflow-hidden rounded-md border border-surface-200 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-900">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-surface-500">No devices found</p>
          ) : (
            results.map((d) => (
              <button
                key={d.id}
                onClick={() => goTo(d)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-50 dark:hover:bg-surface-800"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{d.name}</span>
                  <span className="block truncate text-xs text-surface-500">
                    {d.asset_tag} · {deviceTypeLabel(d.device_type)}
                    {d.ip_address ? ` · ${d.ip_address}` : ''}
                  </span>
                </span>
                <StatusBadge status={d.status} />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

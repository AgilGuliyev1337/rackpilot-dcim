import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine, Loader2, HardDrive, Package } from 'lucide-react'
import { lookupCode } from '../api/lookup'
import { listDevices } from '../api/devices'
import { searchStockItems } from '../api/warehouses'
import { apiErrorMessage } from '../api/client'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { deviceTypeLabel } from '../lib/format'
import { useI18n } from '../context/I18nContext'

interface Match {
  type: 'device' | 'stock_item'
  id: number
  name: string
  identifier: string
  detail: string
}

export function LookupPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Live partial search: as you type ≥2 chars, list matching devices and stock items.
  useEffect(() => {
    const q = code.trim()
    if (q.length < 2) {
      setMatches([])
      setSearching(false)
      return
    }
    setSearching(true)
    const handle = window.setTimeout(async () => {
      try {
        const [devices, stock] = await Promise.all([
          listDevices({ search: q, page_size: 8 }),
          searchStockItems(q).catch(() => []),
        ])
        const deviceMatches: Match[] = devices.items.map((d) => ({
          type: 'device',
          id: d.id,
          name: d.name,
          identifier: d.asset_tag,
          detail: `${deviceTypeLabel(d.device_type)}${d.ip_address ? ' · ' + d.ip_address : ''}`,
        }))
        const stockMatches: Match[] = stock.slice(0, 8).map((s) => ({
          type: 'stock_item',
          id: s.id,
          name: s.name,
          identifier: s.sku,
          detail: `${s.quantity} ${s.unit} in stock`,
        }))
        setMatches([...deviceMatches, ...stockMatches])
      } catch {
        setMatches([])
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => window.clearTimeout(handle)
  }, [code])

  const go = (m: Match) => {
    if (m.type === 'device') navigate(`/assets/${m.id}`)
    else navigate(`/warehouses/stock/${m.id}`)
  }

  // Enter: a scanner sends the exact code + Enter. Resolve it exactly; if that
  // misses but the live search has matches, jump to the first match.
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const v = code.trim()
    if (!v || busy) return
    setBusy(true)
    setError(null)
    try {
      const hit = await lookupCode(v)
      go({ type: hit.type, id: hit.id, name: hit.name, identifier: hit.identifier, detail: '' })
    } catch (err) {
      if (matches.length > 0) {
        go(matches[0])
      } else {
        setError(apiErrorMessage(err))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">{t('lookup.title')}</h1>
        <p className="text-xs text-surface-500">{t('lookup.subtitle')}</p>
      </div>

      <Card className="p-4">
        <form onSubmit={onSubmit}>
          <div className="relative">
            <ScanLine
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-accent-500"
            />
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('lookup.placeholder')}
              autoComplete="off"
              className="h-12 w-full rounded-md border border-surface-300 bg-white pl-10 pr-10 text-base focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 dark:border-surface-700 dark:bg-surface-900"
            />
            {(busy || searching) && (
              <Loader2
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-surface-400"
              />
            )}
          </div>
          {error && (
            <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}
        </form>
      </Card>

      {code.trim().length >= 2 && (
        <Card>
          {matches.length === 0 ? (
            <p className="px-4 py-4 text-xs text-surface-500">
              {searching ? t('lookup.searching') : t('lookup.noMatch')}
            </p>
          ) : (
            <ul className="divide-y divide-surface-100 dark:divide-surface-800/60">
              {matches.map((m) => (
                <li key={`${m.type}-${m.id}`}>
                  <button
                    onClick={() => go(m)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-50 dark:hover:bg-surface-800"
                  >
                    {m.type === 'device' ? (
                      <HardDrive size={16} className="shrink-0 text-surface-400" />
                    ) : (
                      <Package size={16} className="shrink-0 text-surface-400" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{m.name}</span>
                      <span className="block truncate text-xs text-surface-500">
                        {m.identifier} · {m.detail}
                      </span>
                    </span>
                    <Badge tone={m.type === 'device' ? 'blue' : 'neutral'}>
                      {m.type === 'device' ? t('lookup.device') : t('lookup.stock')}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  )
}

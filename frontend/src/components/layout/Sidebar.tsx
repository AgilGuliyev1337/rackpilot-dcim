import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Rows3,
  HardDrive,
  Warehouse,
  ScrollText,
  BarChart3,
  ScanLine,
  Settings,
  X,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { Logo } from '../Logo'
import { getDashboard } from '../../api/dashboard'
import { useAsync } from '../../hooks/useAsync'
import { useI18n } from '../../context/I18nContext'

const NAV_ITEMS = [
  { to: '/', key: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/datacenters', key: 'nav.datacenters', icon: Building2, end: false },
  { to: '/racks', key: 'nav.racks', icon: Rows3, end: false },
  { to: '/assets', key: 'nav.assets', icon: HardDrive, end: false },
  { to: '/warehouses', key: 'nav.warehouse', icon: Warehouse, end: false },
  { to: '/lookup', key: 'nav.lookup', icon: ScanLine, end: false },
  { to: '/audit', key: 'nav.audit', icon: ScrollText, end: false },
  { to: '/reports', key: 'nav.reports', icon: BarChart3, end: false },
  { to: '/settings', key: 'nav.settings', icon: Settings, end: false },
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { data: dashboard } = useAsync(getDashboard)
  const { t } = useI18n()
  const lowStock = dashboard?.low_stock.length ?? 0

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-3">
      {NAV_ITEMS.map(({ to, key, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent-600/10 text-accent-700 dark:bg-accent-500/10 dark:text-accent-400'
                : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100',
            )
          }
        >
          <Icon size={16} />
          {t(key)}
          {to === '/warehouses' && lowStock > 0 && (
            <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {lowStock}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )

  const header = (
    <div className="flex h-14 items-center border-b border-surface-200 px-4 dark:border-surface-800">
      <Logo />
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900 lg:flex">
        {header}
        {nav}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-surface-950/50" onClick={onClose} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
            <div className="flex items-center justify-between pr-2">
              {header}
              <button
                onClick={onClose}
                className="rounded p-1.5 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </>
  )
}

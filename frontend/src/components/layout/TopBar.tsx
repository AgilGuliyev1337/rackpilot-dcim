import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Moon, Sun, ChevronDown, LogOut, UserCircle2, Languages } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useI18n } from '../../context/I18nContext'
import { LANGUAGES } from '../../i18n/translations'
import { GlobalSearch } from './GlobalSearch'
import { Badge } from '../ui/Badge'
import { cn } from '../../lib/cn'

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang, t } = useI18n()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false)
      if (langRef.current && !langRef.current.contains(e.target as Node))
        setLangOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const onLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-surface-200 bg-white px-4 dark:border-surface-800 dark:bg-surface-900">
      <button
        onClick={onMenuClick}
        className="rounded p-1.5 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-1">
        <div ref={langRef} className="relative">
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="flex items-center gap-1 rounded-md px-2 py-2 text-sm text-surface-500 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100"
            aria-label="Language"
          >
            <Languages size={16} />
            <span className="text-xs font-medium uppercase">{lang}</span>
          </button>
          {langOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-md border border-surface-200 bg-white p-1 shadow-lg dark:border-surface-700 dark:bg-surface-900">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLang(l.code)
                    setLangOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-surface-100 dark:hover:bg-surface-800',
                    lang === l.code && 'font-semibold text-accent-600 dark:text-accent-400',
                  )}
                >
                  {l.label}
                  {lang === l.code && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={toggleTheme}
          className="rounded-md p-2 text-surface-500 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100"
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <UserCircle2 size={18} className="text-surface-400" />
            <span className="hidden max-w-[10rem] truncate font-medium sm:block">
              {user?.full_name}
            </span>
            <ChevronDown size={14} className="text-surface-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-md border border-surface-200 bg-white p-1 shadow-lg dark:border-surface-700 dark:bg-surface-900">
              <div className="border-b border-surface-100 px-3 py-2 dark:border-surface-800">
                <p className="truncate text-sm font-medium">{user?.full_name}</p>
                <p className="truncate text-xs text-surface-500">{user?.email}</p>
                <div className="mt-1.5">
                  <Badge tone="blue">{user?.role}</Badge>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="mt-1 flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-surface-700 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-800"
              >
                <LogOut size={14} />
                {t('common.signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

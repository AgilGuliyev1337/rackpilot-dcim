import { Moon, Sun } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useI18n } from '../context/I18nContext'
import { LANGUAGES } from '../i18n/translations'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { formatDate } from '../lib/format'

export function SettingsPage() {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang, t } = useI18n()

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-lg font-semibold">{t('settings.title')}</h1>

      <Card>
        <CardHeader title={t('settings.profile')} />
        <dl className="divide-y divide-surface-100 text-sm dark:divide-surface-800/60">
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-surface-500">{t('settings.name')}</dt>
            <dd className="font-medium">{user?.full_name}</dd>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-surface-500">{t('settings.email')}</dt>
            <dd>{user?.email}</dd>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-surface-500">{t('settings.role')}</dt>
            <dd>
              <Badge tone="blue">{user?.role}</Badge>
            </dd>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-surface-500">{t('settings.memberSince')}</dt>
            <dd>{formatDate(user?.created_at)}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader title={t('settings.language')} />
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-xs text-surface-500">{t('settings.languageDesc')}</p>
          <div className="w-44 shrink-0">
            <Select
              options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
              value={lang}
              onChange={(e) => setLang(e.target.value as typeof lang)}
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={t('settings.appearance')} />
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">{t('settings.theme')}</p>
            <p className="text-xs text-surface-500">
              {t('settings.themeDesc', { theme })}
            </p>
          </div>
          <Button variant="secondary" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? t('settings.switchToLight') : t('settings.switchToDark')}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title={t('settings.about')} />
        <div className="px-4 py-3 text-sm text-surface-600 dark:text-surface-300">
          <p>
            RackPilot DCIM — enterprise data center inventory management.
            Roles: <Badge tone="blue">admin</Badge> full access,{' '}
            <Badge tone="blue">engineer</Badge> infrastructure CRUD,{' '}
            <Badge tone="blue">viewer</Badge> read-only.
          </p>
        </div>
      </Card>
    </div>
  )
}

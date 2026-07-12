import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Info } from 'lucide-react'
import { Logo } from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { apiErrorMessage } from '../api/client'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useI18n } from '../context/I18nContext'

export function LoginPage() {
  const { login } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center">
          <Logo size={20} className="text-lg" />
        </div>

        <div className="rounded-lg border border-surface-200 bg-white p-6 dark:border-surface-800 dark:bg-surface-900">
          <h1 className="mb-4 text-base font-semibold">{t('auth.signIn')}</h1>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <Input
              label={t('auth.email')}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label={t('auth.password')}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-400">
                {error}
              </p>
            )}
            <Button type="submit" loading={loading} className="mt-1 w-full">
              {t('auth.signIn')}
            </Button>
          </form>

          <div className="mt-4 flex items-start gap-2 rounded-md border border-accent-200 bg-accent-50 px-3 py-2 text-xs text-accent-800 dark:border-accent-900 dark:bg-accent-950/40 dark:text-accent-300">
            <Info size={14} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{t('auth.demoCreds')}</p>
              <p className="mt-0.5">
                admin@example.com / Demo123!
                <br />
                Also: engineer@… and viewer@… (same password)
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-surface-500 dark:text-surface-400">
          {t('auth.newOrg')}{' '}
          <Link to="/register" className="font-medium text-accent-600 hover:underline dark:text-accent-400">
            {t('auth.createAccount')}
          </Link>
        </p>
      </div>
    </div>
  )
}

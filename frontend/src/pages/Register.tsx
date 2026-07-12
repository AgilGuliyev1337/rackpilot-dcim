import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import * as authApi from '../api/auth'
import { apiErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useI18n } from '../context/I18nContext'

export function RegisterPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { login } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({
    organization_name: '',
    full_name: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await authApi.register(form)
      await login(form.email, form.password)
      toast.success(`Organization "${form.organization_name}" created`)
      navigate('/', { replace: true })
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
          <h1 className="text-base font-semibold">{t('auth.createOrg')}</h1>
          <p className="mb-4 mt-1 text-xs text-surface-500 dark:text-surface-400">
            {t('auth.createOrgSubtitle')}
          </p>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <Input
              label={t('reg.orgName')}
              required
              value={form.organization_name}
              onChange={set('organization_name')}
            />
            <Input
              label={t('reg.fullName')}
              required
              value={form.full_name}
              onChange={set('full_name')}
            />
            <Input
              label={t('auth.email')}
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={set('email')}
            />
            <Input
              label={t('auth.password')}
              type="password"
              autoComplete="new-password"
              required
              hint={t('auth.minChars')}
              value={form.password}
              onChange={set('password')}
            />
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-400">
                {error}
              </p>
            )}
            <Button type="submit" loading={loading} className="mt-1 w-full">
              {t('auth.createOrgButton')}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-surface-500 dark:text-surface-400">
          {t('auth.alreadyHave')}{' '}
          <Link to="/login" className="font-medium text-accent-600 hover:underline dark:text-accent-400">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}

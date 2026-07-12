import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Warehouse as WarehouseIcon, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createWarehouse,
  deleteWarehouse,
  listWarehouses,
  updateWarehouse,
} from '../api/warehouses'
import { apiErrorMessage } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { useI18n } from '../context/I18nContext'
import type { Warehouse } from '../types'

const EMPTY = { name: '', location: '', description: '' }

export function WarehousesPage() {
  const { canEdit } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const { data, loading, reload } = useAsync(listWarehouses)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Warehouse | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Warehouse | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setModalOpen(true)
  }
  const openEdit = (w: Warehouse) => {
    setEditing(w)
    setForm({ name: w.name, location: w.location ?? '', description: w.description ?? '' })
    setModalOpen(true)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        location: form.location || null,
        description: form.description || null,
      }
      if (editing) await updateWarehouse(editing.id, payload)
      else await createWarehouse(payload)
      toast.success(editing ? 'Warehouse updated' : 'Warehouse created')
      setModalOpen(false)
      reload()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await deleteWarehouse(deleting.id)
      toast.success(`Deleted "${deleting.name}"`)
      setDeleting(null)
      reload()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t('page.warehouses')}</h1>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus size={15} /> {t('common.newWarehouse')}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState
            icon={WarehouseIcon}
            title={t('wh.noWarehouses')}
            description={t('wh.noWarehousesDesc')}
            action={canEdit ? <Button onClick={openCreate}><Plus size={15} /> {t('common.newWarehouse')}</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((w) => (
            <Card key={w.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/warehouses/${w.id}`} className="group min-w-0">
                  <h2 className="flex items-center gap-2 truncate text-base font-semibold group-hover:text-accent-600 dark:group-hover:text-accent-400">
                    <WarehouseIcon size={16} className="shrink-0 text-surface-400" />
                    {w.name}
                  </h2>
                  {w.location && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-surface-500">
                      <MapPin size={12} /> {w.location}
                    </p>
                  )}
                </Link>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(w)} aria-label="Edit">
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(w)} aria-label="Delete">
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
              {w.description && (
                <p className="mt-2 line-clamp-2 text-xs text-surface-500">{w.description}</p>
              )}
              <Link
                to={`/warehouses/${w.id}`}
                className="mt-3 text-xs text-accent-600 hover:underline dark:text-accent-400"
              >
                {t('common.viewStock')}
              </Link>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit warehouse' : 'New warehouse'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="wh-form" loading={saving}>
              {editing ? 'Save changes' : 'Create'}
            </Button>
          </>
        }
      >
        <form id="wh-form" onSubmit={submit} className="flex flex-col gap-3">
          <Input label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          <Input label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete warehouse"
        message={`Delete "${deleting?.name}"? All its stock items will also be removed.`}
        loading={deleteLoading}
        onConfirm={onDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}

import { useRef, useState, type DragEvent } from 'react'
import { CheckCircle2, Download, FileSpreadsheet, UploadCloud } from 'lucide-react'
import {
  downloadImportTemplate,
  importDevices,
  type ImportResult,
} from '../api/devices'
import { apiErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'
import { downloadBlob, downloadCsv } from '../lib/download'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { cn } from '../lib/cn'

interface ImportModalProps {
  open: boolean
  onClose: () => void
  onImported: () => void
}

export function ImportModal({ open, onClose, onImported }: ImportModalProps) {
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setResult(null)
    setUploading(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const pickFile = (f: File | undefined | null) => {
    if (!f) return
    if (!/\.(csv|xlsx)$/i.test(f.name)) {
      toast.error('Only .csv and .xlsx files are supported')
      return
    }
    setFile(f)
    setResult(null)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    pickFile(e.dataTransfer.files[0])
  }

  const upload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const res = await importDevices(file)
      setResult(res)
      if (res.imported > 0) onImported()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const getTemplate = async (format: 'csv' | 'xlsx') => {
    try {
      const blob = await downloadImportTemplate(format)
      downloadBlob(blob, `devices-import-template.${format}`)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  const downloadErrors = () => {
    if (!result) return
    downloadCsv(
      result.errors.map((e) => ({ row: e.row, field: e.field, message: e.message })),
      'import-errors.csv',
    )
  }

  return (
    <Modal open={open} title="Import devices" onClose={close} wide>
      {result ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 size={16} />
            <span>
              <strong>{result.imported}</strong> device{result.imported === 1 ? '' : 's'} imported
              {result.failed > 0 && (
                <>
                  , <strong>{result.failed}</strong> row{result.failed === 1 ? '' : 's'} failed
                </>
              )}
            </span>
          </div>

          {result.errors.length > 0 && (
            <>
              <div className="max-h-64 overflow-y-auto rounded-md border border-surface-200 dark:border-surface-700">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-surface-50 dark:bg-surface-800">
                    <tr className="text-surface-500">
                      <th className="px-3 py-2 font-medium">Row</th>
                      <th className="px-3 py-2 font-medium">Field</th>
                      <th className="px-3 py-2 font-medium">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i} className="border-t border-surface-100 dark:border-surface-800">
                        <td className="px-3 py-1.5 font-mono">{e.row}</td>
                        <td className="px-3 py-1.5 font-mono">{e.field}</td>
                        <td className="px-3 py-1.5 text-red-600 dark:text-red-400">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="secondary" size="sm" onClick={downloadErrors} className="self-start">
                <Download size={13} /> Download errors as CSV
              </Button>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={reset}>
              Import another file
            </Button>
            <Button onClick={close}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Upload a CSV or Excel file. Start from the template to get the correct headers:{' '}
            <button onClick={() => getTemplate('csv')} className="text-accent-600 hover:underline dark:text-accent-400">
              template.csv
            </button>{' '}
            ·{' '}
            <button onClick={() => getTemplate('xlsx')} className="text-accent-600 hover:underline dark:text-accent-400">
              template.xlsx
            </button>
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors',
              dragOver
                ? 'border-accent-500 bg-accent-500/10'
                : 'border-surface-300 hover:border-accent-400 dark:border-surface-700',
            )}
          >
            {file ? (
              <>
                <FileSpreadsheet size={24} className="text-accent-500" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-surface-500">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <UploadCloud size={24} className="text-surface-400" />
                <p className="text-sm">
                  Drag &amp; drop a file here, or <span className="text-accent-600 dark:text-accent-400">browse</span>
                </p>
                <p className="text-xs text-surface-500">.csv or .xlsx, max 5 MB</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={upload} disabled={!file} loading={uploading}>
              <UploadCloud size={14} /> Import
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

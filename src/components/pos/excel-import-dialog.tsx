import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { FileSpreadsheet, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useGenericPostMutation } from '@/store/slice/users/api/api'

interface ColumnHeader { Name?: string; Value?: number }
interface MappedItem { Id?: number; Name?: string; Value?: number | null }
interface ExcelMapped { FileName?: string; ExcelHeader?: ColumnHeader[]; ExcelMappedItems?: MappedItem[] }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Uploads the file, returns the field list to map (ExcelMapped, Value unset). */
  headerUrl: string
  /** Shared preview endpoint — POSTs the mapped ExcelMapped, returns raw rows. */
  dataUrl: string
  /** POSTs the same ExcelMapped (now with Value filled in) to actually import. */
  importUrl: string
  onImported: () => void
}

function errMsg(e: any, t: (key: string) => string) {
  return e?.data?.Errors?.[0]?.Message || e?.data?.Message || t('components.excelImportDialog.processError')
}

/**
 * Generic Excel import flow, shared by every "Nhập Excel" entry point in the
 * app. Mirrors pos_web's ExcelService 1:1:
 *
 *  1. upload  — file → `headerUrl` (multipart), server returns the column
 *     mapping template: every target field (`ExcelMappedItems`) plus the
 *     columns actually found in the file (`ExcelHeader`).
 *  2. map     — user assigns an Excel column to each target field.
 *  3. preview — POST the mapping to `dataUrl` for a read-only look at the
 *     rows the server will import (optional step, skippable).
 *  4. import  — POST the SAME mapping object to `importUrl`. The server
 *     re-reads the file it already stored under `FileName` using this
 *     mapping — the preview step never sends parsed rows back.
 */
export function ExcelImportDialog({ open, onOpenChange, headerUrl, dataUrl, importUrl, onImported }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload')
  const [mapped, setMapped] = useState<ExcelMapped | null>(null)
  const [previewRows, setPreviewRows] = useState<any[][] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [request, { isLoading: busy }] = useGenericPostMutation()

  const reset = () => { setStep('upload'); setMapped(null); setPreviewRows(null) }
  const close = () => { onOpenChange(false); reset() }

  const handleFile = async (file: File) => {
    try {
      // Every get-excel-header-* endpoint binds a fixed IFormFile parameter
      // named `formFile` — some are lenient about the field name, but
      // opening-balances/* 500s ("Object reference not set...") on anything
      // else, so this must always be sent as exactly `formFile`.
      const form = new FormData()
      form.append('formFile', file)
      const res = await request({ url: headerUrl, method: 'POST', body: form }).unwrap()
      const data = (res?.Data ?? {}) as ExcelMapped
      setMapped({
        FileName: data.FileName,
        ExcelHeader: data.ExcelHeader ?? [],
        ExcelMappedItems: (data.ExcelMappedItems ?? []).map(i => ({ ...i, Value: i.Value ?? null })),
      })
      setStep('map')
    } catch (e) { toast.error(errMsg(e, t)) }
  }

  const setColumn = (id: number | undefined, value: string) =>
    setMapped(m => m && ({
      ...m,
      ExcelMappedItems: (m.ExcelMappedItems ?? []).map(i =>
        i.Id === id ? { ...i, Value: value === '' ? null : Number(value) } : i),
    }))

  const handlePreview = async () => {
    if (!mapped) return
    try {
      const res = await request({ url: dataUrl, method: 'POST', body: mapped }).unwrap()
      setPreviewRows((res?.Data ?? []) as any[][])
      setStep('preview')
    } catch (e) { toast.error(errMsg(e, t)) }
  }

  const handleImport = async () => {
    if (!mapped) return
    try {
      await request({ url: importUrl, method: 'POST', body: mapped }).unwrap()
      toast.success(t('components.excelImportDialog.importSuccess'))
      onImported()
      close()
    } catch (e) { toast.error(errMsg(e, t)) }
  }

  const headerOptions = mapped?.ExcelHeader ?? []
  const items = mapped?.ExcelMappedItems ?? []

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) close(); else onOpenChange(o) }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> {t('components.excelImportDialog.title')}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12">
            <Upload className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t('components.excelImportDialog.selectFilePrompt')}</p>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            <Button size="sm" disabled={busy} onClick={() => fileInputRef.current?.click()}>
              {busy ? t('components.excelImportDialog.uploading') : t('components.excelImportDialog.chooseFile')}
            </Button>
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{t('components.excelImportDialog.mapInstruction')}</p>
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/50 text-xs text-muted-foreground">
                  <tr className="h-9">
                    <th className="w-10 px-2">{t('common.index')}</th>
                    <th className="px-2 text-left">{t('components.excelImportDialog.dataColumnName')}</th>
                    <th className="px-2 text-left">{t('components.excelImportDialog.excelColumn')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.Id ?? index} className="border-t">
                      <td className="px-2 py-1.5 text-center text-muted-foreground">{index + 1}</td>
                      <td className="px-2 py-1.5 font-medium">{item.Name}</td>
                      <td className="px-2 py-1.5">
                        <select
                          value={item.Value ?? ''}
                          onChange={e => setColumn(item.Id, e.target.value)}
                          className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                        >
                          <option value="">{t('components.excelImportDialog.noSelection')}</option>
                          {headerOptions.map(h => (
                            <option key={h.Value} value={h.Value}>{h.Name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {t('components.excelImportDialog.previewRowsCount', { count: previewRows?.length ?? 0 })}
            </p>
            <div className="max-h-[50vh] overflow-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/50 text-muted-foreground">
                  <tr className="h-8">
                    <th className="w-10 px-2">#</th>
                    {items.map((item, i) => <th key={item.Id ?? i} className="px-2 text-left whitespace-nowrap">{item.Name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(previewRows ?? []).map((row, r) => (
                    <tr key={r} className="border-t">
                      <td className="px-2 py-1 text-center text-muted-foreground">{r + 1}</td>
                      {row.map((cell, c) => <td key={c} className="px-2 py-1 whitespace-nowrap">{cell == null ? '' : String(cell)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && <Button variant="outline" onClick={close}>{t('components.excelImportDialog.close')}</Button>}
          {step === 'map' && (
            <>
              <Button variant="outline" onClick={close}>{t('common.cancel')}</Button>
              <Button variant="outline" onClick={() => setStep('upload')}>{t('components.excelImportDialog.chooseAnotherFile')}</Button>
              <Button variant="outline" disabled={busy} onClick={handlePreview}>{t('components.excelImportDialog.previewButton')}</Button>
              <Button disabled={busy} onClick={handleImport}>{busy ? t('components.excelImportDialog.importing') : t('components.excelImportDialog.importData')}</Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('map')}>{t('components.excelImportDialog.back')}</Button>
              <Button disabled={busy} onClick={handleImport}>{busy ? t('components.excelImportDialog.importing') : t('components.excelImportDialog.confirmImport')}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getInstalledPrinters } from '@/utils/print-service'
import { Loader2, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
interface PrinterPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  printerUrl: string | undefined
  onSelect: (printerName: string) => void
}

/** Mirrors pos_web's printer-list-dialog: lists the printer names the local
 * print bridge reports as installed, so a row's "Máy in" field can be picked
 * instead of typed by hand. */
export function PrinterPickerDialog({ open, onOpenChange, printerUrl, onSelect }: PrinterPickerDialogProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [printers, setPrinters] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getInstalledPrinters(printerUrl).then(list => { setPrinters(list); setLoading(false) })
  }, [open, printerUrl])

  const pick = (name: string) => { onSelect(name); onOpenChange(false) }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Printer className="h-4 w-4" />
            {t('pages.setting.printer.picker.printerListTitle')}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('pages.setting.printer.picker.loadingPrinterList')}
          </div>
        ) : printers.length === 0 ? (
          <div className="py-10 text-center text-sm italic text-muted-foreground">
            {t('pages.setting.printer.picker.noPrintersInstalled')}
          </div>
        ) : (
          <div className="max-h-96 space-y-1 overflow-y-auto pr-1">
            {printers.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => pick(name)}
                className="group flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <span className="text-sm font-medium">{name}</span>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                  {t('pages.setting.printer.picker.select')}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t('pages.setting.printer.picker.close')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

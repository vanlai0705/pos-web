import type { TPosActiveProduct } from '@/store/slice/users/types/pos-types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Ban, CheckCircle2, Pencil } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NumInput } from './order-inputs'
import { type CartItem, createCartItemFromProduct, itemSubtotal } from './order-model'

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1 block">
        {required && <span className="text-destructive mr-0.5">*</span>}{label}
      </label>
      {children}
    </div>
  )
}

interface ProductItemDialogProps {
  product: TPosActiveProduct | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (item: CartItem) => void
}

export function ProductItemDialog({ product, open, onOpenChange, onConfirm }: ProductItemDialogProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<CartItem | null>(null)

  useEffect(() => {
    setDraft(product ? createCartItemFromProduct(product) : null)
  }, [product])

  const setField = (field: 'qty' | 'price' | 'discountPct' | 'discountAmt', value: number) => {
    setDraft(current => current ? { ...current, [field]: value } : current)
  }

  const setNote = (value: string) => {
    setDraft(current => current ? { ...current, note: value } : current)
  }

  const handleConfirm = () => {
    if (!draft) return
    const qty = Math.max(1, Math.round(Number(draft.qty) || 1))
    const price = Math.max(0, Number(draft.price) || 0)
    const discountPct = Math.min(100, Math.max(0, Number(draft.discountPct) || 0))
    const discountAmt = Math.max(0, Number(draft.discountAmt) || 0)
    onConfirm({ ...draft, qty, price, discountPct, discountAmt })
    onOpenChange(false)
  }

  const total = draft ? itemSubtotal(draft) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <DialogHeader className="border-b bg-muted/20 px-5 py-4">
          <DialogTitle className="flex items-center gap-3 text-base">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Pencil className="h-5 w-5" />
            </span>
            <span className="truncate">{product?.Name || t('common.productName')}</span>
          </DialogTitle>
        </DialogHeader>

        {draft && (
          <div className="space-y-5 px-5 py-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('common.quantity')}>
                <NumInput value={draft.qty} onChange={value => setField('qty', Math.max(1, Math.round(value)))} className="h-11" />
              </Field>
              <Field label={t('common.price')}>
                <NumInput value={draft.price} onChange={value => setField('price', Math.max(0, value))} className="h-11" />
              </Field>
              <Field label={t('common.discount')}>
                <NumInput value={draft.discountPct} onChange={value => setField('discountPct', Math.min(100, Math.max(0, value)))} suffix="%" className="h-11" />
              </Field>
              <Field label={t('metrics.discount')}>
                <NumInput value={draft.discountAmt} onChange={value => setField('discountAmt', Math.max(0, value))} className="h-11" />
              </Field>
              <Field label={t('metrics.amount')}>
                <NumInput value={total} onChange={() => undefined} className="h-11 pointer-events-none opacity-70" />
              </Field>
            </div>
            <Field label={t('common.note')}>
              <Textarea
                value={draft.note}
                onChange={event => setNote(event.target.value)}
                placeholder={t('common.note')}
                className="min-h-12 resize-none"
              />
            </Field>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t bg-muted/20 px-5 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-w-28">
            <Ban className="mr-2 h-4 w-4" /> {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm} className="min-w-32 bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle2 className="mr-2 h-4 w-4" /> {t('pages.actives.order.searchDialogConfirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

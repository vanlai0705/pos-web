import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useLazyGetTableOrderDetailQuery } from '@/store/slice/users/api/api'
import type { TPosOrderItem, TPosTable } from '@/store/slice/users/types/pos-types'

interface SplitOrderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fromTable: TPosTable | null
  toTable: TPosTable | null
  onConfirm: (itemIds: number[]) => void
}

/** Mirrors pos_web's split-order-modal: pick which line items move from
 * `fromTable`'s order over to `toTable`'s, two-pane move/return UI. */
export function SplitOrderModal({ open, onOpenChange, fromTable, toTable, onConfirm }: SplitOrderModalProps) {
  const { t } = useTranslation()
  const [sourceItems, setSourceItems] = useState<TPosOrderItem[]>([])
  const [targetItems, setTargetItems] = useState<TPosOrderItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loadDetail, { isFetching }] = useLazyGetTableOrderDetailQuery()

  useEffect(() => {
    if (!open || !fromTable?.Id) return
    setSourceItems([])
    setTargetItems([])
    setSelected(new Set())
    loadDetail(fromTable.Id).unwrap().then(order => setSourceItems(order?.Items ?? []))
  }, [open, fromTable?.Id, loadDetail])

  const toggle = (productId?: number) => {
    if (productId == null) return
    setSelected(prev => {
      const next = new Set(prev)
      next.has(productId) ? next.delete(productId) : next.add(productId)
      return next
    })
  }

  const allSelected = sourceItems.length > 0 && selected.size === sourceItems.length
  const someSelected = selected.size > 0 && selected.size < sourceItems.length

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(sourceItems.map(it => it.Product?.Id).filter((id): id is number => id != null)) : new Set())
  }

  const moveToTarget = () => {
    if (selected.size === 0) return
    const moved = sourceItems.filter(it => it.Product?.Id != null && selected.has(it.Product.Id))
    setTargetItems(prev => [...prev, ...moved])
    setSourceItems(prev => prev.filter(it => !(it.Product?.Id != null && selected.has(it.Product.Id))))
    setSelected(new Set())
  }

  const returnItem = (item: TPosOrderItem) => {
    setTargetItems(prev => prev.filter(it => it.Product?.Id !== item.Product?.Id))
    setSourceItems(prev => [...prev, item])
  }

  const returnAll = () => {
    if (targetItems.length === 0) return
    setSourceItems(prev => [...prev, ...targetItems])
    setTargetItems([])
    setSelected(new Set())
  }

  const confirmSplit = () => {
    onConfirm(targetItems.map(it => it.Id).filter((id): id is number => id != null))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-4 p-6">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-lg font-semibold">
            {t('pages.actives.tablesOrder.splitModalTitle', { table: fromTable?.Name })}
          </h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-destructive">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Source (fromTable) */}
          <div className="overflow-hidden rounded-lg border">
            <div className="flex items-center gap-2 bg-muted/40 px-3 py-2 font-medium">
              <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected }}
                onChange={e => toggleAll(e.target.checked)} className="accent-primary" />
              <span className="text-sm">{fromTable?.Name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{selected.size}/{sourceItems.length}</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {isFetching ? (
                <div className="py-6 text-center text-sm text-muted-foreground">{t('common.loading')}</div>
              ) : sourceItems.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">{t('common.noData')}</div>
              ) : sourceItems.map((item, i) => (
                <div key={item.Product?.Id ?? i} onClick={() => toggle(item.Product?.Id)}
                  className={`flex cursor-pointer items-center gap-3 border-b px-3 py-2 hover:bg-accent ${item.Product?.Id != null && selected.has(item.Product.Id) ? 'bg-primary/10' : ''}`}>
                  <input type="checkbox" readOnly checked={item.Product?.Id != null && selected.has(item.Product.Id)} className="accent-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{item.ProductName ?? item.Product?.Name}</div>
                    <div className="text-xs text-muted-foreground">{t('common.quantity')}: {item.Quantity} · {item.UnitName ?? item.Unit?.Name}</div>
                  </div>
                  <div className="text-sm font-semibold text-primary tabular-nums">{item.Price?.toLocaleString('vi-VN')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Target (toTable) */}
          <div className="overflow-hidden rounded-lg border">
            <div className="bg-muted/40 px-3 py-2 font-medium text-sm">{toTable?.Name}</div>
            <div className="max-h-96 overflow-y-auto">
              {targetItems.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">{t('pages.actives.tablesOrder.splitNoItemsYet')}</div>
              ) : targetItems.map((item, i) => (
                <div key={item.Product?.Id ?? i} className="flex items-center justify-between border-b px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{item.ProductName ?? item.Product?.Name}</div>
                    <div className="text-xs text-muted-foreground">{t('common.quantity')}: {item.Quantity} · {item.UnitName ?? item.Unit?.Name}</div>
                  </div>
                  <button onClick={() => returnItem(item)} className="text-sm font-medium text-destructive hover:underline">
                    ↩ {t('pages.actives.tablesOrder.splitReturn')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <Button onClick={moveToTarget} disabled={selected.size === 0}>
            ➜ {t('pages.actives.tablesOrder.splitMoveTo', { table: toTable?.Name })}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={returnAll} disabled={targetItems.length === 0}>
              {t('pages.actives.tablesOrder.splitReturnAll')}
            </Button>
            <Button onClick={confirmSplit} disabled={targetItems.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
              {t('pages.actives.tablesOrder.splitConfirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

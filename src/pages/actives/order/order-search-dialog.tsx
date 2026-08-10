import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { History, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CustomerSelect } from '@/components/pos/customer-select'
import {
  useDeleteTemporaryReceiptMutation,
  useFilterBookingsQuery,
  useFilterQuotationsQuery,
  useFilterTemporaryReceiptsQuery,
  useLazyGetOrderItemsQuery,
} from '@/store/slice/users/api/api'
import type { TPosBooking, TPosCustomerSimple, TPosOrder, TPosQuotation } from '@/store/slice/users/types/pos-types'
import { DateRangeFilter, Pagination, SearchBar, fmtCurrency, fmtDate, useListFilter, PAGE_SIZE } from '../shared'

type OrderSearchKind = 'booking' | 'quotation' | 'temporary'
type PickableOrder = TPosBooking | TPosQuotation | TPosOrder

interface OrderSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Which backend list to search — booking, quotation, or Angular's
   * OrderTemporaryReceiptSearchComponent flow for saved temporary receipts. */
  kind: OrderSearchKind
  onConfirm: (order: PickableOrder) => void
}

/** Mirrors pos_web's booking / quotation / temporary-receipt search dialogs:
 * search, preview items, then hand the pick back to the order screen. */
export function OrderSearchDialog({ open, onOpenChange, kind, onConfirm }: OrderSearchDialogProps) {
  const { t } = useTranslation()
  const { keyword, setKeyword, page, goPage, dateFrom, setDateFrom, dateTo, setDateTo } = useListFilter()
  const [customer, setCustomer] = useState<TPosCustomerSimple | null>(null)
  const [selected, setSelected] = useState<PickableOrder | null>(null)
  const [getItems, { data: previewItems = [], isFetching: itemsLoading }] = useLazyGetOrderItemsQuery()

  const params = {
    PageIndex: page - 1, PageSize: PAGE_SIZE, Keyword: keyword,
    DateFrom: dateFrom, DateTo: dateTo, CustomerId: customer?.Id,
  }
  const bookingQuery = useFilterBookingsQuery(params, { skip: !open || kind !== 'booking' })
  const quotationQuery = useFilterQuotationsQuery(params, { skip: !open || kind !== 'quotation' })
  const temporaryQuery = useFilterTemporaryReceiptsQuery(params, { skip: !open || kind !== 'temporary' })
  const [deleteTemporaryReceipt, { isLoading: deleting }] = useDeleteTemporaryReceiptMutation()
  const activeQuery = kind === 'booking' ? bookingQuery : kind === 'quotation' ? quotationQuery : temporaryQuery
  const { data, isFetching, refetch } = activeQuery
  const items = data?.Items ?? []
  const title = kind === 'temporary'
    ? 'Chọn lại hóa đơn lưu tạm'
    : t('pages.actives.order.searchDialogTitle')

  // Reset local state every time the dialog re-opens, mirroring Angular's
  // fresh component instance per dialogService.show() call.
  useEffect(() => {
    if (!open) return
    setSelected(null)
    setCustomer(null)
    setKeyword('')
  }, [open])

  const pick = (order: PickableOrder) => {
    if (selected?.Id === order.Id) return
    setSelected(order)
    if (order.Id) getItems(order.Id)
  }

  const handleConfirm = () => {
    if (!selected?.Id) { toast.error(t('pages.actives.order.searchDialogNoSelection')); return }
    onConfirm(kind === 'temporary' ? { ...selected, Items: previewItems } : selected)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-5xl flex-col gap-0 p-0 max-h-[85vh]">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <History className="h-4 w-4" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
          <SearchBar value={keyword} onChange={setKeyword} />
          <CustomerSelect value={customer} onChange={setCustomer} className="w-52" />
          <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-4 md:grid-cols-12">
          {/* Preview panel — read-only line items of the currently selected row */}
          <div className="md:col-span-5 rounded-lg border">
            <div className="border-b bg-muted/30 px-3 py-2 text-xs font-semibold">
              {t('pages.actives.order.searchDialogPreview')}
            </div>
            <div className="max-h-[45vh] overflow-y-auto md:max-h-none">
              {!selected ? (
                <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                  {t('pages.actives.order.searchDialogPickRow')}
                </div>
              ) : itemsLoading ? (
                <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">{t('common.loading')}</div>
              ) : previewItems.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">{t('common.noData')}</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-muted/20 text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left">{t('common.productName')}</th>
                      <th className="px-2 py-1.5 text-right">{t('common.quantity')}</th>
                      <th className="px-2 py-1.5 text-right">{t('common.price')}</th>
                      <th className="px-2 py-1.5 text-right">{t('common.amount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewItems.map((it, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1.5">{it.ProductName ?? it.Product?.Name}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{it.Quantity}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{fmtCurrency(it.Price)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{fmtCurrency(it.Amount ?? it.Total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Result list */}
          <div className="md:col-span-7 flex min-h-0 flex-col rounded-lg border">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="w-10 px-2 py-1.5 text-center">{t('common.index')}</th>
                    <th className="px-2 py-1.5 text-left">{t('common.voucherNo')}</th>
                    <th className="px-2 py-1.5 text-center">{t('common.date')}</th>
                    <th className="px-2 py-1.5 text-left">{t('common.customer')}</th>
                    <th className="px-2 py-1.5 text-right">{t('metrics.subtotal')}</th>
                    <th className="px-2 py-1.5 text-right">{t('metrics.grandTotal')}</th>
                    {kind === 'temporary' && <th className="w-10 px-2 py-1.5" />}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isFetching ? (
                    <tr><td colSpan={kind === 'temporary' ? 7 : 6} className="px-2 py-8 text-center text-muted-foreground">{t('common.loading')}</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={kind === 'temporary' ? 7 : 6} className="px-2 py-8 text-center text-muted-foreground">{t('common.noData')}</td></tr>
                  ) : items.map((order, i) => (
                    <tr
                      key={order.Id}
                      onClick={() => pick(order)}
                      className={`cursor-pointer transition-colors hover:bg-accent ${selected?.Id === order.Id ? 'bg-primary/10' : ''}`}
                    >
                      <td className="px-2 py-1.5 text-center">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="px-2 py-1.5 font-medium">{order.Code}</td>
                      <td className="px-2 py-1.5 text-center whitespace-nowrap">{fmtDate(order.Date)}</td>
                      <td className="px-2 py-1.5 truncate">{order.Customer?.Name}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{fmtCurrency(order.SubTotal)}</td>
                      <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{fmtCurrency(order.Total)}</td>
                      {kind === 'temporary' && (
                        <td className="px-2 py-1.5 text-right">
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded text-destructive hover:bg-destructive/10 disabled:opacity-40"
                            disabled={deleting}
                            onClick={async e => {
                              e.stopPropagation()
                              if (!order.Id) return
                              try {
                                await deleteTemporaryReceipt(order.Id).unwrap()
                                if (selected?.Id === order.Id) setSelected(null)
                                refetch()
                              } catch {
                                toast.error(t('pages.actives.order.deleteOrderFailed'))
                              }
                            }}
                            title={t('common.delete')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t px-2 py-1.5">
              <Pagination page={page} total={data?.TotalItemCount ?? 0} pageSize={PAGE_SIZE} onChange={goPage} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleConfirm} disabled={!selected || itemsLoading}>{t('pages.actives.order.searchDialogConfirm')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

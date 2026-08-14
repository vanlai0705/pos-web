import ConfirmDialog from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { MoneyTag, VoucherTag } from '@/components/ui/data-tag'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { DateRangeFilter, fmtDateTime, ListPageHeader, Pagination, SearchBar, useListFilter } from '@/pages/actives/shared'
import { useCancelOrderMutation, useFilterOrdersQuery, useLazyGetOrderDetailQuery } from '@/store/slice/orders/api'
import { TPosOrder } from '@/store/slice/users'
import { withDomainPath } from '@/utils/domain-route'
import { ClipboardList, ExternalLink, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
function OrderDetailPanel({ order, onCancel }: { order: TPosOrder; onCancel: () => void }) {
  const { t } = useTranslation()
  const items = order.Items ?? []
  const subTotal = items.reduce((s, i) => s + (i.Total ?? 0), 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
        <div>
          <p className="font-semibold">{order.Name ?? order.Code ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{fmtDateTime(order.Date)}</p>
        </div>
        <StatusBadge status={order.Status} />
      </div>

      {/* Customer info */}
      <div className="px-4 py-3 border-b space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('common.customer')}</span>
          <span className="font-medium">{order.Customer?.Name ?? '—'}</span>
        </div>
        {order.Customer?.Phone && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('pages.actives.orderManager.phoneLabel')}</span>
            <span>{order.Customer.Phone}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('pages.actives.orderManager.employeeLabel')}</span>
          <span>{order.User?.Name ?? '—'}</span>
        </div>
        {order.Stock?.Name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('pages.actives.orderManager.warehouseLabel')}</span>
            <span>{order.Stock.Name}</span>
          </div>
        )}
        {order.FundType?.Name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('pages.actives.orderManager.paymentMethodLabel')}</span>
            <span>{order.FundType.Name}</span>
          </div>
        )}
      </div>

      {/* Order items */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background border-b">
            <tr>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">{t('pages.actives.orderManager.itemNameHeader')}</th>
              <th className="text-right px-3 py-2 text-muted-foreground font-medium">{t('pages.actives.orderManager.qtyHeader')}</th>
              <th className="text-right px-3 py-2 text-muted-foreground font-medium">{t('common.price')}</th>
              <th className="text-right px-3 py-2 text-muted-foreground font-medium">{t('pages.actives.orderManager.amountHeader')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.length === 0
              ? <tr><td colSpan={4} className="text-center py-6 text-muted-foreground text-xs">{t('pages.actives.orderManager.noItemsText')}</td></tr>
              : items.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <div className="font-medium">{item?.Product?.Name}</div>
                    {item.ProductCode && <div className="text-xs text-muted-foreground">{item.ProductCode}</div>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.Quantity}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.Price?.toLocaleString('vi-VN')}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{item.Total?.toLocaleString('vi-VN')}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="border-t px-4 py-3 space-y-1.5 text-sm bg-muted/10">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('pages.actives.orderManager.subTotalLabel')}</span>
          <MoneyTag value={order.SubTotal ?? subTotal} />
        </div>
        {(order.Discount ?? 0) > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('pages.actives.orderManager.discountLabel')}</span>
            <MoneyTag value={order.Discount} />
          </div>
        )}
        <div className="flex justify-between font-semibold text-base border-t pt-1.5">
          <span>{t('pages.actives.orderManager.grandTotalLabel')}</span>
          <MoneyTag value={order.Total ?? order.SubTotal ?? subTotal} />
        </div>
      </div>

      {/* Actions */}
      {order.Status?.Id === 1 && (
        <div className="px-4 py-3 border-t flex gap-2">
          <ConfirmDialog
            title={t('pages.actives.orderManager.deleteOrderButton')}
            description={t('pages.actives.orderManager.confirmDeleteOrder', { name: order.Name ?? order.Code })}
            confirmText={t('common.delete')}
            trigger={(
              <Button variant="destructive" size="sm" className="flex-1">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> {t('pages.actives.orderManager.deleteOrderButton')}
              </Button>
            )}
            onConfirm={onCancel}
          />
        </div>
      )}
    </div>
  )
}

export default function OrderManagerPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { keyword, setKeyword, page, goPage, pageSize, setPageSize, dateFrom, setDateFrom, dateTo, setDateTo } = useListFilter()
  const [selected, setSelected] = useState<TPosOrder | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const { data, isLoading, refetch } = useFilterOrdersQuery({
    PageIndex: page - 1,
    PageSize: pageSize,
    Keyword: keyword || undefined,
    DateFrom: dateFrom,
    DateTo: dateTo,
  })
  const [getDetail] = useLazyGetOrderDetailQuery()
  const [cancelOrder] = useCancelOrderMutation()

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0

  const handleSelect = async (item: TPosOrder) => {
    if (!item.Id) return
    setLoadingDetail(true)
    try {
      const detail = await getDetail(item.Id).unwrap()
      setSelected(detail)
    } catch {
      setSelected(item)
    } finally {
      setLoadingDetail(false)
    }
  }

  const openOrderDetail = (item: TPosOrder) => {
    if (!item.Id) return
    navigate(withDomainPath(`/actives/order?orderId=${item.Id}&fromOrderManager=1`))
  }

  const handleDeleteOrder = async (order: TPosOrder) => {
    if (!order?.Id) return
    try {
      await cancelOrder(order.Id).unwrap()
      toast.success(t('pages.actives.orderManager.deleteOrderSuccess'))
      if (selected?.Id === order.Id) setSelected(null)
      refetch()
    } catch { toast.error(t('pages.actives.orderManager.deleteOrderError')) }
  }

  const handleDeleteSelected = () => {
    if (selected) handleDeleteOrder(selected)
  }

  return (
    <div className="space-y-4">
      <ListPageHeader title={t('pages.actives.orderManager.title')} icon={ClipboardList}>
        <SearchBar value={keyword} onChange={setKeyword} placeholder={t('pages.actives.orderManager.searchPlaceholder')} />
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
      </ListPageHeader>

      {/* Split panel */}
      <div className="flex gap-4 rounded-xl border bg-card overflow-hidden" style={{ minHeight: '520px' }}>
        {/* Left: order list */}
        <div className={`${selected ? 'w-[55%]' : 'w-full'} flex-none flex flex-col border-r transition-all`}>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 sticky top-0">
                <tr>
                  {[
                    t('common.index'),
                    t('common.voucherNo'),
                    t('common.date'),
                    t('common.customer'),
                    t('pages.actives.orderManager.employeeLabel'),
                    t('pages.actives.orderManager.subTotalLabel'),
                    t('common.statusShort'),
                    t('common.actions'),
                  ].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-3 py-2.5"><Skeleton className="h-4 w-full" /></td>
                    ))}</tr>
                  ))
                  : items.length === 0
                    ? <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">{t('pages.actives.orderManager.noOrdersText')}</td></tr>
                    : items.map((item, idx) => (
                      <tr
                        key={item.Id ?? idx}
                        onClick={() => handleSelect(item)}
                        onDoubleClick={() => openOrderDetail(item)}
                        className={`cursor-pointer transition-colors hover:bg-accent/50 ${selected?.Id === item.Id ? 'bg-primary/8 border-l-2 border-l-primary' : ''}`}
                      >
                        <td className="px-3 py-2.5 text-muted-foreground">{(page - 1) * pageSize + idx + 1}</td>
                        <td className="px-3 py-2.5"><VoucherTag value={item.Name ?? item.Code} /></td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs">{fmtDateTime(item.Date)}</td>
                        <td className="px-3 py-2.5">{item.Customer?.Name ?? '—'}</td>
                        <td className="px-3 py-2.5">{item.User?.Name ?? '—'}</td>
                        <td className="px-3 py-2.5"><MoneyTag value={item.Total ?? item.SubTotal} /></td>
                        <td className="px-3 py-2.5"><StatusBadge status={item.Status} /></td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-sky-600 hover:text-sky-700"
                              title={t('common.detailEdit')}
                              onClick={(event) => {
                                event.stopPropagation()
                                openOrderDetail(item)
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <ConfirmDialog
                              title={t('pages.actives.orderManager.deleteOrderButton')}
                              description={t('pages.actives.orderManager.confirmDeleteOrder', { name: item.Name ?? item.Code })}
                              confirmText={t('common.delete')}
                              trigger={(
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-rose-600 hover:text-rose-700"
                                  title={t('pages.actives.orderManager.deleteOrderButton')}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                              onConfirm={() => handleDeleteOrder(item)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t">
            <Pagination page={page} total={total} pageSize={pageSize} onPageSizeChange={setPageSize} onChange={goPage} />
          </div>
        </div>

        {/* Right: detail panel */}
        {selected && (
          <div className="flex-1 min-w-0 flex flex-col relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-2 right-2 z-10 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
            {loadingDetail
              ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
                </div>
              )
              : <OrderDetailPanel order={selected} onCancel={handleDeleteSelected} />
            }
          </div>
        )}
      </div>
    </div>
  )
}

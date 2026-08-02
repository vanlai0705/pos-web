import { useState } from 'react'
import { ClipboardList, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  useFilterOrdersQuery,
  useLazyGetOrderDetailQuery,
  useCancelOrderMutation,
} from '@/store/slice/users/api/api'
import type { TPosOrder } from '@/store/slice/users/types/pos-types'
import { ListPageHeader, SearchBar, DateRangeFilter, Pagination, StatusBadge, fmtCurrency, fmtDateTime, useListFilter } from '../shared'

function OrderDetailPanel({ order, onCancel }: { order: TPosOrder; onCancel: () => void }) {
  const items = order.OrderItems ?? []
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
          <span className="text-muted-foreground">Khách hàng</span>
          <span className="font-medium">{order.Customer?.Name ?? '—'}</span>
        </div>
        {order.Customer?.Phone && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">SĐT</span>
            <span>{order.Customer.Phone}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Nhân viên</span>
          <span>{order.User?.Name ?? '—'}</span>
        </div>
        {order.Stock?.Name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Kho</span>
            <span>{order.Stock.Name}</span>
          </div>
        )}
        {order.FundType?.Name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">TT thanh toán</span>
            <span>{order.FundType.Name}</span>
          </div>
        )}
      </div>

      {/* Order items */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background border-b">
            <tr>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Tên hàng</th>
              <th className="text-right px-3 py-2 text-muted-foreground font-medium">SL</th>
              <th className="text-right px-3 py-2 text-muted-foreground font-medium">Đơn giá</th>
              <th className="text-right px-3 py-2 text-muted-foreground font-medium">T.Tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.length === 0
              ? <tr><td colSpan={4} className="text-center py-6 text-muted-foreground text-xs">Không có mặt hàng</td></tr>
              : items.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <div className="font-medium">{item.ProductName}</div>
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
          <span className="text-muted-foreground">Tiền hàng</span>
          <span className="tabular-nums">{fmtCurrency(order.SubTotal ?? subTotal)}</span>
        </div>
        {(order.Discount ?? 0) > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Giảm giá</span>
            <span className="tabular-nums text-orange-500">- {fmtCurrency(order.Discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-base border-t pt-1.5">
          <span>Tổng cộng</span>
          <span className="tabular-nums text-primary">{fmtCurrency(order.Total ?? order.SubTotal ?? subTotal)}</span>
        </div>
      </div>

      {/* Actions */}
      {order.Status?.Id === 1 && (
        <div className="px-4 py-3 border-t flex gap-2">
          <Button variant="destructive" size="sm" onClick={onCancel} className="flex-1">
            <X className="h-3.5 w-3.5 mr-1" /> Huỷ đơn
          </Button>
        </div>
      )}
    </div>
  )
}

export default function OrderManagerPage() {
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

  const handleCancel = async () => {
    if (!selected?.Id) return
    if (!window.confirm(`Huỷ đơn hàng ${selected.Name ?? selected.Code}?`)) return
    try {
      await cancelOrder(selected.Id).unwrap()
      toast.success('Đã huỷ đơn hàng')
      setSelected(null)
      refetch()
    } catch { toast.error('Không thể huỷ đơn hàng') }
  }

  return (
    <div className="space-y-4">
      <ListPageHeader title="Quản lý bán hàng" icon={ClipboardList}>
        <SearchBar value={keyword} onChange={setKeyword} placeholder="Tìm số phiếu, khách hàng..." />
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
                  {['STT', 'Số phiếu', 'Ngày', 'Khách hàng', 'Nhân viên', 'Tiền hàng', 'TT'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-3 py-2.5"><Skeleton className="h-4 w-full" /></td>
                    ))}</tr>
                  ))
                  : items.length === 0
                    ? <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Không có đơn hàng nào</td></tr>
                    : items.map((item, idx) => (
                      <tr
                        key={item.Id ?? idx}
                        onClick={() => handleSelect(item)}
                        className={`cursor-pointer transition-colors hover:bg-accent/50 ${selected?.Id === item.Id ? 'bg-primary/8 border-l-2 border-l-primary' : ''}`}
                      >
                        <td className="px-3 py-2.5 text-muted-foreground">{(page - 1) * pageSize + idx + 1}</td>
                        <td className="px-3 py-2.5 font-medium">{item.Name ?? item.Code ?? '—'}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs">{fmtDateTime(item.Date)}</td>
                        <td className="px-3 py-2.5">{item.Customer?.Name ?? '—'}</td>
                        <td className="px-3 py-2.5">{item.User?.Name ?? '—'}</td>
                        <td className="px-3 py-2.5 tabular-nums">{fmtCurrency(item.Total ?? item.SubTotal)}</td>
                        <td className="px-3 py-2.5"><StatusBadge status={item.Status} /></td>
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
              : <OrderDetailPanel order={selected} onCancel={handleCancel} />
            }
          </div>
        )}
      </div>
    </div>
  )
}

import { X, Printer, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import type { TPosOrder, TPosBooking } from '@/store/slice/users/types/pos-types'

export function fmtCurrency(val?: number | null) {
  if (val == null) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
}

export function fmtDateTime(dateStr?: string | null) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export function StatusChip({ status }: { status?: { Id?: number; Name?: string } }) {
  const id = status?.Id ?? 0
  const map: Record<number, { label: string; cls: string }> = {
    1: { label: 'Chờ xử lý', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
    2: { label: 'Hoàn thành', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
    3: { label: 'Đã thanh toán', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    4: { label: 'Đã huỷ', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  }
  const cfg = map[id] ?? { label: status?.Name ?? '—', cls: 'bg-muted text-muted-foreground' }
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
}

// ─── Order detail panel shared by sales + restaurant ─────────────────────────

type AnyOrder = TPosOrder & TPosBooking

interface InvoiceDetailPanelProps {
  order: AnyOrder
  loading?: boolean
  onClose: () => void
  onCancel?: () => void
  onPrint?: () => void
}

export function InvoiceDetailPanel({ order, loading, onClose, onCancel, onPrint }: InvoiceDetailPanelProps) {
  const items = order.OrderItems ?? []
  const subTotal = items.reduce((s, i) => s + (i.Total ?? 0), 0)

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b bg-muted/20">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{order.Code ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{fmtDateTime(order.Date)}</p>
          <div className="mt-1"><StatusChip status={order.Status} /></div>
        </div>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-muted ml-2 shrink-0">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Info rows */}
      <div className="px-4 py-2.5 border-b space-y-1.5 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground shrink-0">Khách hàng</span>
          <span className="font-medium text-right truncate">{order.Customer?.Name ?? '—'}</span>
        </div>
        {order.Customer?.Phone && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground shrink-0">SĐT</span>
            <span>{order.Customer.Phone}</span>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground shrink-0">Nhân viên</span>
          <span className="text-right">{order.User?.Name ?? '—'}</span>
        </div>
        {(order as TPosOrder).FundType?.Name && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground shrink-0">Thanh toán</span>
            <span className="text-right">{(order as TPosOrder).FundType?.Name}</span>
          </div>
        )}
        {order.Note && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground shrink-0">Ghi chú</span>
            <span className="text-right italic">{order.Note}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0
          ? <p className="text-center text-xs text-muted-foreground py-6">Không có mặt hàng</p>
          : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background border-b">
                <tr>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Mặt hàng</th>
                  <th className="text-right px-3 py-2 text-muted-foreground font-medium w-10">SL</th>
                  <th className="text-right px-3 py-2 text-muted-foreground font-medium">Đơn giá</th>
                  <th className="text-right px-3 py-2 text-muted-foreground font-medium">T.Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <div className="font-medium">{item.ProductName ?? '—'}</div>
                      {item.Unit?.Name && <div className="text-muted-foreground text-[10px]">{item.Unit.Name}</div>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{item.Quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{item.Price?.toLocaleString('vi-VN') ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{item.Total?.toLocaleString('vi-VN') ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>

      {/* Totals */}
      <div className="border-t px-4 py-3 space-y-1 text-xs bg-muted/10">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tiền hàng</span>
          <span className="tabular-nums">{fmtCurrency(order.SubTotal ?? subTotal)}</span>
        </div>
        {(order.DiscountPercent ?? 0) > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Giảm giá ({order.DiscountPercent}%)</span>
            <span className="tabular-nums text-orange-500">-{fmtCurrency(order.Discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm pt-1 border-t">
          <span>Tổng cộng</span>
          <span className="tabular-nums text-primary">{fmtCurrency(order.Total ?? order.SubTotal ?? subTotal)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t flex gap-2">
        {onPrint && (
          <Button size="sm" variant="outline" onClick={onPrint} className="flex-1">
            <Printer className="h-3.5 w-3.5 mr-1" /> In HĐ
          </Button>
        )}
        {onCancel && order.Status?.Id === 1 && (
          <Button size="sm" variant="destructive" onClick={onCancel} className="flex-1">
            <Ban className="h-3.5 w-3.5 mr-1" /> Huỷ
          </Button>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DataPagination } from '@/components/ui/data-pagination'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import type { TPosLiabilityVoucher } from '@/store/slice/users/types/pos-types'
import { fmtDate } from '@/pages/actives/shared'

const money = (v?: number) => (v ?? 0).toLocaleString('vi-VN')

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** liabilities/filter-liabilities-customer or -supplier */
  endpoint: string
  customerId?: number
  supplierId?: number
}

/**
 * Every voucher (order, receipt, payment...) that moved this customer's or
 * supplier's balance — mirrors Angular's LiabilitiesDetailComponent 1:1.
 */
export function LiabilityDetailDialog({ open, onOpenChange, endpoint, customerId, supplierId }: Props) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const { data, isLoading } = useFilterReportQuery({
    path: endpoint,
    params: {
      CustomerId: customerId, SupplierId: supplierId,
      PageIndex: page - 1, PageSize: pageSize,
    },
  }, { skip: !open })

  const items = (data?.Items ?? []) as TPosLiabilityVoucher[]
  const total = data?.TotalItemCount ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chi tiết công nợ</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50 text-xs text-muted-foreground">
              <tr className="h-9">
                <th className="w-10 px-2">STT</th>
                <th className="px-2">Ngày</th>
                <th className="px-2 text-left">Số phiếu</th>
                <th className="px-2 text-left">Diễn giải</th>
                <th className="px-2 text-right">Tổng cộng</th>
                <th className="px-2 text-right">Tiền thanh toán</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="p-4 text-center text-xs text-muted-foreground">Đang tải...</td></tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-xs text-muted-foreground">Không có phát sinh</td></tr>
              )}
              {items.map((item, index) => (
                <tr key={index} className="border-t">
                  <td className="px-2 py-1.5 text-center text-muted-foreground">{(page - 1) * pageSize + index + 1}</td>
                  <td className="px-2 py-1.5 text-center">{fmtDate(item.Date)}</td>
                  <td className="px-2 py-1.5">{item.Name ?? '—'}</td>
                  <td className="px-2 py-1.5">{item.Detail ?? '—'}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{money(item.Total)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{money(item.Payment)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DataPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

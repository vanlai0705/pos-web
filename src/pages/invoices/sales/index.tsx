import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt, Plus, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  useFilterOrdersQuery,
  useLazyGetOrderDetailQuery,
  useCancelOrderMutation,
} from '@/store/slice/users/api/api'
import type { TPosOrder } from '@/store/slice/users/types/pos-types'
import { ListPageHeader, SearchBar, DateRangeFilter, Pagination, fmtCurrency, fmtDateTime, useListFilter } from '@/pages/actives/shared'
import { InvoiceDetailPanel, StatusChip } from '../shared'

export default function SalesInvoicePage() {
  const navigate = useNavigate()
  const { keyword, setKeyword, page, goPage, pageSize, setPageSize, dateFrom, setDateFrom, dateTo, setDateTo } = useListFilter()
  const [statusId, setStatusId] = useState<number | ''>('')
  const [selected, setSelected] = useState<TPosOrder | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const { data, isLoading, refetch } = useFilterOrdersQuery({
    PageIndex: page - 1,
    PageSize: pageSize,
    Keyword: keyword || undefined,
    DateFrom: dateFrom,
    DateTo: dateTo,
    StatusId: statusId,
  })
  const [getDetail] = useLazyGetOrderDetailQuery()
  const [cancelOrder] = useCancelOrderMutation()

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0

  const handleSelect = async (order: TPosOrder) => {
    if (!order.Id) return
    setLoadingDetail(true)
    try {
      const detail = await getDetail(order.Id).unwrap()
      setSelected(detail)
    } catch {
      setSelected(order)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleCancel = async () => {
    if (!selected?.Id) return
    if (!window.confirm(`Huỷ hoá đơn ${selected.Code}?`)) return
    try {
      await cancelOrder(selected.Id).unwrap()
      toast.success('Đã huỷ hoá đơn')
      setSelected(null)
      refetch()
    } catch { toast.error('Không thể huỷ hoá đơn') }
  }

  const handlePrint = () => {
    if (!selected) return
    window.print()
  }

  const showDetail = selected !== null

  return (
    <div className="flex flex-col h-full gap-3">
      <ListPageHeader title="Hoá đơn bán hàng" icon={Receipt}>
        <SearchBar value={keyword} onChange={setKeyword} placeholder="Tìm số HĐ, khách hàng..." />
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
        <select
          value={statusId}
          onChange={e => setStatusId(e.target.value === '' ? '' : Number(e.target.value))}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Tất cả TT</option>
          <option value={1}>Chờ xử lý</option>
          <option value={2}>Hoàn thành</option>
          <option value={3}>Đã TT</option>
          <option value={4}>Đã huỷ</option>
        </select>
        <Button size="sm" variant="outline" className="h-8" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" className="h-8" onClick={() => navigate('/actives/order')}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Tạo HĐ
        </Button>
      </ListPageHeader>

      {/* Split panel */}
      <div className={`flex gap-3 flex-1 overflow-hidden rounded-xl border bg-card`} style={{ minHeight: 0 }}>
        {/* List */}
        <div className={`${showDetail ? 'w-[54%]' : 'w-full'} flex flex-col border-r transition-all duration-200`} style={{ minHeight: 0 }}>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card border-b z-10">
                <tr>
                  {['#', 'Số HĐ', 'Ngày', 'Khách hàng', 'Tổng tiền', 'TT'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading
                  ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-3 py-2.5"><Skeleton className="h-4 w-full" /></td>
                    ))}</tr>
                  ))
                  : items.length === 0
                    ? (
                      <tr>
                        <td colSpan={6} className="text-center py-16 text-muted-foreground text-sm">
                          Không có hoá đơn nào
                        </td>
                      </tr>
                    )
                    : items.map((item, idx) => (
                      <tr
                        key={item.Id ?? idx}
                        onClick={() => handleSelect(item)}
                        className={`cursor-pointer transition-colors hover:bg-accent/50 ${selected?.Id === item.Id ? 'bg-primary/8 border-l-2 border-primary' : ''}`}
                      >
                        <td className="px-3 py-2.5 text-muted-foreground">{(page - 1) * pageSize + idx + 1}</td>
                        <td className="px-3 py-2.5 font-medium">{item.Code ?? '—'}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{fmtDateTime(item.Date)}</td>
                        <td className="px-3 py-2.5 max-w-[100px] truncate">{item.Customer?.Name ?? '—'}</td>
                        <td className="px-3 py-2.5 tabular-nums font-semibold text-primary">
                          {fmtCurrency(item.Total ?? item.SubTotal)}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusChip status={item.Status} />
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t shrink-0">
            <Pagination page={page} total={total} pageSize={pageSize} onPageSizeChange={setPageSize} onChange={goPage} />
          </div>
        </div>

        {/* Detail panel */}
        {showDetail && (
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <InvoiceDetailPanel
              order={selected as any}
              loading={loadingDetail}
              onClose={() => setSelected(null)}
              onCancel={handleCancel}
              onPrint={handlePrint}
            />
          </div>
        )}
      </div>
    </div>
  )
}

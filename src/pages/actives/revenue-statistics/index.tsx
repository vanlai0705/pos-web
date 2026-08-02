import { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useFilterRevenueStatisticsQuery, useFilterRevenueStatisticsSummaryQuery } from '@/store/slice/users/api/api'
import type { TPosRevenueStatItem } from '@/store/slice/users/types/pos-types'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import {
  ListPageHeader, DateRangeFilter, SummaryCard, fmtCurrency, fmtDateTime, useListFilter, PAGE_SIZE,
} from '../shared'

function RevenueTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  const { data, isLoading } = useFilterRevenueStatisticsQuery({
    PageIndex: page - 1,
    PageSize: pageSize,
    DateFrom: dateFrom,
    DateTo: dateTo,
  })

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const sumary = data?.Sumary

  const columns: ColumnDef<TPosRevenueStatItem>[] = [
    {
      id: 'stt',
      header: 'STT',
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span>,
    },
    {
      id: 'name',
      header: 'Số phiếu',
      cell: ({ row }) => <span className="font-medium">{row.original.Name ?? '—'}</span>,
    },
    {
      id: 'date',
      header: 'Ngày',
      cell: ({ row }) => <span className="whitespace-nowrap">{fmtDateTime(row.original.Date)}</span>,
    },
    {
      id: 'customer',
      header: 'Khách hàng',
      cell: ({ row }) => row.original.Customer?.Name ?? '—',
    },
    {
      id: 'subTotal',
      header: 'Tiền hàng',
      cell: ({ row }) => <span className="tabular-nums">{fmtCurrency(row.original.SubTotal)}</span>,
    },
    {
      id: 'discount',
      header: 'Giảm giá',
      cell: ({ row }) => <span className="tabular-nums">{fmtCurrency(row.original.Discount)}</span>,
    },
    {
      id: 'discountPercent',
      header: 'Tỷ lệ GG',
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.DiscountPercent != null ? `${row.original.DiscountPercent.toFixed(1)}%` : '—'}
        </span>
      ),
    },
    {
      id: 'transferCost',
      header: 'Phí VC',
      cell: ({ row }) => <span className="tabular-nums">{fmtCurrency(row.original.TransferCost)}</span>,
    },
    {
      id: 'total',
      header: 'Tổng cộng',
      cell: ({ row }) => <span className="tabular-nums font-semibold">{fmtCurrency(row.original.Total)}</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Tiền hàng" value={sumary?.SubTotal} currency />
        <SummaryCard label="Giảm giá" value={sumary?.Discount} currency />
        <SummaryCard label="Phí vận chuyển" value={sumary?.TransferCost} currency />
        <SummaryCard label="Tổng cộng" value={sumary?.Total} currency />
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize} onPageSizeChange={setPageSize}
        onPageChange={setPage}
        emptyText="Không có dữ liệu"
      />
    </div>
  )
}

function SummaryTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { data: items = [], isLoading } = useFilterRevenueStatisticsSummaryQuery({ DateFrom: dateFrom, DateTo: dateTo })
  const totalAmount = items.reduce((sum, item) => sum + (item.Total ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <span className="font-semibold text-sm">TỔNG DOANH SỐ</span>
          <span className="font-bold text-base tabular-nums">{fmtCurrency(totalAmount || undefined)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Phương thức thanh toán</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Tổng tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2.5"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-3 py-2.5"><Skeleton className="h-4 w-28 ml-auto" /></td>
                  </tr>
                ))
                : items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5">{item.FundType?.Name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">{fmtCurrency(item.Total)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function RevenueStatisticsPage() {
  const [tab, setTab] = useState<'revenue' | 'summary'>('revenue')
  const { dateFrom, setDateFrom, dateTo, setDateTo } = useListFilter()

  const tabs = [
    { key: 'revenue', label: 'Thống kê doanh thu' },
    { key: 'summary', label: 'Tổng hợp' },
  ] as const

  return (
    <div className="space-y-4">
      <ListPageHeader title="Thống kê doanh thu" icon={TrendingUp}>
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
      </ListPageHeader>

      <div className="border-b flex gap-0">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'revenue'
        ? <RevenueTab dateFrom={dateFrom} dateTo={dateTo} />
        : <SummaryTab dateFrom={dateFrom} dateTo={dateTo} />
      }
    </div>
  )
}

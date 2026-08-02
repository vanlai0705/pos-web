import { useState } from 'react'
import { Users } from 'lucide-react'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, DateRangeFilter, fmtCurrency, PAGE_SIZE, defaultDateFrom, defaultDateTo, SummaryCard } from '@/pages/actives/shared'
import type { TPosDebtItem } from '@/store/slice/users/types/pos-types'

export default function LiabilityCustomerPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())

  const { data, isLoading } = useFilterReportQuery({
    path: 'liabilities/filter-customer',
    params: { Keyword: keyword || undefined, DateFrom: dateFrom, DateTo: dateTo, PageIndex: page - 1, PageSize: pageSize },
  })

  const items = (data?.Items ?? []) as TPosDebtItem[]
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  const columns: ColumnDef<TPosDebtItem>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    {
      id: 'customer', header: 'Khách hàng',
      cell: ({ row }) => {
        const c = row.original.Customer
        const name = c?.Name ?? row.original.ObjectName ?? '—'
        return (
          <div>
            <p className="font-medium">{name}</p>
            {c?.Phone && <p className="text-xs text-muted-foreground">{c.Phone}</p>}
          </div>
        )
      },
    },
    { id: 'beginning', header: 'Nợ đầu kỳ', cell: ({ row }) => <span className="tabular-nums">{fmtCurrency(row.original.BeginningDebt)}</span> },
    { id: 'inDebt', header: 'Phát sinh nợ', cell: ({ row }) => <span className="tabular-nums text-rose-700">{fmtCurrency(row.original.InDebt)}</span> },
    { id: 'outDebt', header: 'Đã trả', cell: ({ row }) => <span className="tabular-nums text-emerald-700">{fmtCurrency(row.original.OutDebt)}</span> },
    {
      id: 'ending', header: 'Nợ cuối kỳ',
      cell: ({ row }) => {
        const v = row.original.EndingDebt
        return <span className={`tabular-nums font-semibold ${(v ?? 0) > 0 ? 'text-rose-700' : 'text-foreground'}`}>{fmtCurrency(v)}</span>
      },
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Công nợ khách hàng" icon={Users}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm khách hàng..." />
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={v => { setDateFrom(v); setPage(1) }} onTo={v => { setDateTo(v); setPage(1) }} />
      </ListPageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Nợ đầu kỳ" value={s.BeginningDebt} currency />
        <SummaryCard label="Phát sinh nợ" value={s.InDebt} currency />
        <SummaryCard label="Đã trả" value={s.OutDebt} currency />
        <SummaryCard label="Nợ cuối kỳ" value={s.EndingDebt} currency />
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize} onPageSizeChange={setPageSize}
        onPageChange={setPage}
        emptyText="Không có công nợ khách hàng"
      />
    </div>
  )
}

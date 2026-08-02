import { useState } from 'react'
import { Banknote } from 'lucide-react'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, DateRangeFilter, fmtCurrency, PAGE_SIZE, defaultDateFrom, defaultDateTo, StatusBadge } from '@/pages/actives/shared'

interface TSalaryPay {
  Id?: number
  Name?: string
  Member?: { Name?: string }
  Month?: string
  Amount?: number
  Note?: string
  Status?: { Id?: number; Name?: string }
}

export default function SalaryPaysPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())

  const { data, isLoading } = useFilterReportQuery({
    path: 'salary/filter-salary-pay',
    params: { Keyword: keyword || undefined, DateFrom: dateFrom, DateTo: dateTo, PageIndex: page - 1, PageSize: PAGE_SIZE },
  })

  const items = (data?.Items ?? []) as TSalaryPay[]
  const total = data?.TotalItemCount ?? 0

  const columns: ColumnDef<TSalaryPay>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * PAGE_SIZE + row.index + 1}</span> },
    { id: 'name', header: 'Mã phiếu', cell: ({ row }) => <span className="font-mono text-xs">{row.original.Name ?? '—'}</span> },
    { id: 'member', header: 'Nhân viên', cell: ({ row }) => <span className="font-medium">{row.original.Member?.Name ?? '—'}</span> },
    { id: 'month', header: 'Tháng', cell: ({ row }) => <span>{row.original.Month ?? '—'}</span> },
    { id: 'amount', header: 'Số tiền', cell: ({ row }) => <span className="tabular-nums font-semibold text-emerald-700">{fmtCurrency(row.original.Amount)}</span> },
    { id: 'note', header: 'Ghi chú', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.Note ?? '—'}</span> },
    { id: 'status', header: 'TT', cell: ({ row }) => <StatusBadge status={row.original.Status} /> },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Chi lương" icon={Banknote}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm phiếu chi lương..." />
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={v => { setDateFrom(v); setPage(1) }} onTo={v => { setDateTo(v); setPage(1) }} />
      </ListPageHeader>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        emptyText="Không có phiếu chi lương nào"
      />
    </div>
  )
}

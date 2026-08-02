import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, DateRangeFilter, fmtCurrency, fmtDateTime, PAGE_SIZE, defaultDateFrom, defaultDateTo, SummaryCard } from '@/pages/actives/shared'
import type { TPosCurrencyVoucher } from '@/store/slice/users/types/pos-types'

export default function CashBalancePage() {
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())

  const { data, isLoading } = useFilterReportQuery({
    path: 'reports/filter-cash-balance',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page - 1, PageSize: PAGE_SIZE },
  })

  const items = (data?.Items ?? []) as TPosCurrencyVoucher[]
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  const columns: ColumnDef<TPosCurrencyVoucher>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * PAGE_SIZE + row.index + 1}</span> },
    { id: 'name', header: 'Số phiếu', cell: ({ row }) => <span className="font-medium text-primary">{row.original.Name ?? '—'}</span> },
    { id: 'date', header: 'Ngày', cell: ({ row }) => <span>{fmtDateTime(row.original.Date)}</span> },
    { id: 'detail', header: 'Diễn giải', cell: ({ row }) => <span className="text-xs">{row.original.Detail ?? '—'}</span> },
    { id: 'receipt', header: 'Thu', cell: ({ row }) => <span className="tabular-nums text-emerald-700">{row.original.Receipt ? fmtCurrency(row.original.Receipt) : '—'}</span> },
    { id: 'payment', header: 'Chi', cell: ({ row }) => <span className="tabular-nums text-rose-700">{row.original.Payment ? fmtCurrency(row.original.Payment) : '—'}</span> },
    { id: 'balance', header: 'Tồn', cell: ({ row }) => <span className="tabular-nums font-medium">{fmtCurrency(row.original.Balance)}</span> },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Số dư quỹ" icon={Wallet}>
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={v => { setDateFrom(v); setPage(1) }} onTo={v => { setDateTo(v); setPage(1) }} />
      </ListPageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Tồn đầu kỳ" value={s.Beginning} currency />
        <SummaryCard label="Tổng thu" value={s.Receipt} currency />
        <SummaryCard label="Tổng chi" value={s.Payment} currency />
        <SummaryCard label="Tồn cuối kỳ" value={s.End} currency />
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        emptyText="Không có dữ liệu"
      />
    </div>
  )
}

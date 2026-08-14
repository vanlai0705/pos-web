import type { TPosCashBalanceItem } from '@/store/slice/users/types/pos-types'
import { LookupSelect, type LookupItem } from '@/components/pos/lookup-select'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { MoneyTag, VoucherTag } from '@/components/ui/data-tag'
import { DateRangeFilter, defaultDateFrom, defaultDateTo, ListPageHeader, PAGE_SIZE, SummaryCard } from '@/pages/actives/shared'
import { fmtDateTime } from '@/utils'
import { useFilterReportQuery } from '@/store/slice/generic/api'
import { Wallet } from 'lucide-react'
import { useState } from 'react'
export default function CashBalancePage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())
  const [fundType, setFundType] = useState<LookupItem | null>(null)

  const { data, isLoading } = useFilterReportQuery({
    path: 'reports/filter-cash-balance',
    params: { DateFrom: dateFrom, DateTo: dateTo, FundTypeId: fundType?.Id || undefined, PageIndex: page - 1, PageSize: pageSize },
  })

  const items = (data?.Items ?? []) as TPosCashBalanceItem[]
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  const columns: ColumnDef<TPosCashBalanceItem>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'name', header: 'Số phiếu', cell: ({ row }) => <VoucherTag value={row.original.Name} /> },
    { id: 'date', header: 'Ngày', cell: ({ row }) => <span>{fmtDateTime(row.original.Date)}</span> },
    { id: 'detail', header: 'Diễn giải', cell: ({ row }) => <span className="text-xs">{row.original.Detail ?? '—'}</span> },
    { id: 'receipt', header: 'Thu', cell: ({ row }) => row.original.Receipt ? <MoneyTag value={row.original.Receipt} /> : '-' },
    { id: 'payment', header: 'Chi', cell: ({ row }) => row.original.Payment ? <MoneyTag value={row.original.Payment} /> : '-' },
    { id: 'balance', header: 'Tồn', cell: ({ row }) => <MoneyTag value={row.original.Balance} /> },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Số dư quỹ" icon={Wallet}>
        <LookupSelect className="w-44" endpoint="fundtype/filter-simple" placeholder="Tất cả loại quỹ"
          value={fundType} onChange={v => { setFundType(v); setPage(1) }} />
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
        pageSize={pageSize} onPageSizeChange={setPageSize}
        onPageChange={setPage}
        emptyText="Không có dữ liệu"
      />
    </div>
  )
}

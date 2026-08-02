import { useState } from 'react'
import { UserCircle } from 'lucide-react'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, PAGE_SIZE, fmtCurrency } from '@/pages/actives/shared'

interface TOpeningBalance {
  Id?: number
  Customer?: { Name?: string; Code?: string }
  BeginningDebt?: number
  Note?: string
}

export default function OpeningBalancesCustomerPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useFilterReportQuery({
    path: 'opening-balances/filter-customer',
    params: { Keyword: keyword || undefined, PageIndex: page - 1, PageSize: PAGE_SIZE },
  })

  const items = (data?.Items ?? []) as TOpeningBalance[]
  const total = data?.TotalItemCount ?? 0

  const columns: ColumnDef<TOpeningBalance>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * PAGE_SIZE + row.index + 1}</span> },
    { id: 'code', header: 'Mã KH', cell: ({ row }) => <span className="text-xs font-mono text-muted-foreground">{row.original.Customer?.Code ?? '—'}</span> },
    { id: 'name', header: 'Khách hàng', cell: ({ row }) => <span className="font-medium">{row.original.Customer?.Name ?? '—'}</span> },
    { id: 'debt', header: 'Số dư đầu kỳ', cell: ({ row }) => <span className="tabular-nums font-semibold">{fmtCurrency(row.original.BeginningDebt)}</span> },
    { id: 'note', header: 'Ghi chú', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.Note ?? '—'}</span> },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Công nợ KH ban đầu" icon={UserCircle}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm khách hàng..." />
      </ListPageHeader>
      <DataTable columns={columns} data={items} loading={isLoading} total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} emptyText="Không có dữ liệu" />
    </div>
  )
}

import { useState } from 'react'
import { Truck } from 'lucide-react'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, PAGE_SIZE, fmtCurrency } from '@/pages/actives/shared'

interface TOpeningBalance {
  Id?: number
  Supplier?: { Name?: string; Code?: string }
  BeginningDebt?: number
  Note?: string
}

export default function OpeningBalancesSupplierPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  const { data, isLoading } = useFilterReportQuery({
    path: 'opening-balances/filter-supplier',
    params: { Keyword: keyword || undefined, PageIndex: page - 1, PageSize: pageSize },
  })

  const items = (data?.Items ?? []) as TOpeningBalance[]
  const total = data?.TotalItemCount ?? 0

  const columns: ColumnDef<TOpeningBalance>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'code', header: 'Mã NCC', cell: ({ row }) => <span className="text-xs font-mono text-muted-foreground">{row.original.Supplier?.Code ?? '—'}</span> },
    { id: 'name', header: 'Nhà cung cấp', cell: ({ row }) => <span className="font-medium">{row.original.Supplier?.Name ?? '—'}</span> },
    { id: 'debt', header: 'Số dư đầu kỳ', cell: ({ row }) => <span className="tabular-nums font-semibold">{fmtCurrency(row.original.BeginningDebt)}</span> },
    { id: 'note', header: 'Ghi chú', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.Note ?? '—'}</span> },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Công nợ NCC ban đầu" icon={Truck}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm nhà cung cấp..." />
      </ListPageHeader>
      <DataTable columns={columns} data={items} loading={isLoading} total={total} page={page} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={setPage} emptyText="Không có dữ liệu" />
    </div>
  )
}

import { useState } from 'react'
import { PackageSearch } from 'lucide-react'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, PAGE_SIZE, fmtCurrency } from '@/pages/actives/shared'

interface TOpeningInventory {
  Id?: number
  Product?: { Name?: string; Code?: string; Unit?: { Name?: string } }
  Stock?: { Name?: string }
  Quantity?: number
  Price?: number
  Amount?: number
}

export default function OpeningInventoryPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  const { data, isLoading } = useFilterReportQuery({
    path: 'opening-balances/filter-inventory',
    params: { Keyword: keyword || undefined, PageIndex: page - 1, PageSize: pageSize },
  })

  const items = (data?.Items ?? []) as TOpeningInventory[]
  const total = data?.TotalItemCount ?? 0

  const columns: ColumnDef<TOpeningInventory>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'code', header: 'Mã HH', cell: ({ row }) => <span className="text-xs font-mono text-muted-foreground">{row.original.Product?.Code ?? '—'}</span> },
    { id: 'name', header: 'Tên mặt hàng', cell: ({ row }) => <span className="font-medium">{row.original.Product?.Name ?? '—'}</span> },
    { id: 'unit', header: 'ĐVT', cell: ({ row }) => <span className="text-xs">{row.original.Product?.Unit?.Name ?? '—'}</span> },
    { id: 'stock', header: 'Kho', cell: ({ row }) => <span className="text-sm">{row.original.Stock?.Name ?? '—'}</span> },
    { id: 'qty', header: 'Số lượng', cell: ({ row }) => <span className="tabular-nums">{row.original.Quantity?.toLocaleString('vi-VN') ?? '—'}</span> },
    { id: 'price', header: 'Đơn giá', cell: ({ row }) => <span className="tabular-nums">{fmtCurrency(row.original.Price)}</span> },
    { id: 'amount', header: 'Thành tiền', cell: ({ row }) => <span className="tabular-nums font-medium text-emerald-700">{fmtCurrency(row.original.Amount)}</span> },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Tồn kho ban đầu" icon={PackageSearch}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm mặt hàng..." />
      </ListPageHeader>
      <DataTable columns={columns} data={items} loading={isLoading} total={total} page={page} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={setPage} emptyText="Không có dữ liệu tồn kho ban đầu" />
    </div>
  )
}

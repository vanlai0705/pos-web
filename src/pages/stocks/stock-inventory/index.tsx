import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { CodeTag, MoneyTag } from '@/components/ui/data-tag'
import { DateRangeFilter, monthToDateFrom, defaultDateTo, ListPageHeader, PAGE_SIZE, SearchBar, SummaryCard } from '@/pages/actives/shared'
import { useFilterReportQuery } from '@/store/slice/generic/api'
import { BarChart3 } from 'lucide-react'
import { useState } from 'react'
interface TInventoryItem {
  Product?: { ProductCode?: string; Name?: string; Unit?: { Name?: string }; Price?: number }
  Unit?: { Name?: string }
  QuantityBeginning?: number
  QuantityIn?: number
  QuantityOut?: number
  Amount?: number
}

export default function StockInventoryPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [dateFrom, setDateFrom] = useState(monthToDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())

  const { data, isLoading } = useFilterReportQuery({
    path: 'inventory/filter',
    params: { Keyword: keyword || undefined, DateFrom: dateFrom, DateTo: dateTo, PageIndex: page - 1, PageSize: pageSize },
  })

  const items = (data?.Items ?? []) as TInventoryItem[]
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  const columns: ColumnDef<TInventoryItem>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'code', header: 'Mã hàng', cell: ({ row }) => <CodeTag value={row.original.Product?.ProductCode} /> },
    { id: 'name', header: 'Tên mặt hàng', cell: ({ row }) => <span className="font-medium">{row.original.Product?.Name ?? '—'}</span> },
    { id: 'unit', header: 'ĐVT', cell: ({ row }) => <span className="text-xs">{row.original.Product?.Unit?.Name ?? row.original.Unit?.Name ?? '—'}</span> },
    { id: 'begin', header: 'Tồn đầu kỳ', cell: ({ row }) => <span className="tabular-nums">{row.original.QuantityBeginning?.toLocaleString('vi-VN') ?? '—'}</span> },
    { id: 'in', header: 'Nhập trong kỳ', cell: ({ row }) => <span className="tabular-nums text-emerald-700">{row.original.QuantityIn?.toLocaleString('vi-VN') ?? '—'}</span> },
    { id: 'out', header: 'Xuất trong kỳ', cell: ({ row }) => <span className="tabular-nums text-rose-700">{row.original.QuantityOut?.toLocaleString('vi-VN') ?? '—'}</span> },
    {
      id: 'end', header: 'Tồn cuối kỳ',
      cell: ({ row }) => {
        const q = (row.original.QuantityBeginning ?? 0) + (row.original.QuantityIn ?? 0) - (row.original.QuantityOut ?? 0)
        return <span className={`tabular-nums font-semibold ${q < 0 ? 'text-rose-700' : ''}`}>{q.toLocaleString('vi-VN')}</span>
      },
    },
    { id: 'price', header: 'Đơn giá', cell: ({ row }) => <MoneyTag value={row.original.Product?.Price} /> },
    { id: 'amount', header: 'Thành tiền', cell: ({ row }) => <MoneyTag value={row.original.Amount} /> },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Tồn kho" icon={BarChart3}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm mặt hàng..." />
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={v => { setDateFrom(v); setPage(1) }} onTo={v => { setDateTo(v); setPage(1) }} />
      </ListPageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Nhập trong kỳ" value={s.QuantityIn} />
        <SummaryCard label="Xuất trong kỳ" value={s.QuantityOut} />
        <SummaryCard label="Tồn cuối kỳ" value={s.QuantityEnd} />
        <SummaryCard label="Thành tiền" value={s.Amount} currency />
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize} onPageSizeChange={setPageSize}
        onPageChange={setPage}
        emptyText="Không có dữ liệu tồn kho"
      />
    </div>
  )
}

import { useState } from 'react'
import { Tag } from 'lucide-react'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, StatusBadge, PAGE_SIZE, defaultDateFrom, defaultDateTo, DateRangeFilter } from '@/pages/actives/shared'

interface TPromotion {
  Id?: number
  Name?: string
  Code?: string
  DateFrom?: string
  DateTo?: string
  Type?: number
  Status?: { Id?: number; Name?: string }
}

interface Props {
  type: number
  title: string
}

export default function PromotionListPage({ type, title }: Props) {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())

  const { data, isLoading } = useFilterReportQuery({
    path: 'promotions/filter',
    params: { Keyword: keyword || undefined, DateFrom: dateFrom, DateTo: dateTo, Type: type, PageIndex: page - 1, PageSize: PAGE_SIZE },
  })

  const items = (data?.Items ?? []) as TPromotion[]
  const total = data?.TotalItemCount ?? 0

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'

  const columns: ColumnDef<TPromotion>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * PAGE_SIZE + row.index + 1}</span> },
    { id: 'code', header: 'Mã', cell: ({ row }) => <span className="text-xs text-muted-foreground font-mono">{row.original.Code ?? '—'}</span> },
    { id: 'name', header: 'Tên chương trình', cell: ({ row }) => <span className="font-medium">{row.original.Name ?? '—'}</span> },
    { id: 'from', header: 'Từ ngày', cell: ({ row }) => <span className="text-xs">{fmtDate(row.original.DateFrom)}</span> },
    { id: 'to', header: 'Đến ngày', cell: ({ row }) => <span className="text-xs">{fmtDate(row.original.DateTo)}</span> },
    { id: 'status', header: 'Trạng thái', cell: ({ row }) => <StatusBadge status={row.original.Status} /> },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title={title} icon={Tag}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm chương trình..." />
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
        emptyText={`Không có chương trình ${title.toLowerCase()} nào`}
      />
    </div>
  )
}

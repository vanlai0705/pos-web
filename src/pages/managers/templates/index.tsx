import { useState } from 'react'
import { FileCode } from 'lucide-react'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, StatusBadge, PAGE_SIZE } from '@/pages/actives/shared'

interface TTemplate {
  Id?: number
  Name?: string
  Code?: string
  Type?: { Name?: string }
  IsActive?: boolean
  Status?: { Id?: number; Name?: string }
}

export default function TemplatesPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useFilterReportQuery({
    path: 'report-templates/filter',
    params: { Keyword: keyword || undefined, PageIndex: page - 1, PageSize: PAGE_SIZE },
  })

  const items = (data?.Items ?? []) as TTemplate[]
  const total = data?.TotalItemCount ?? 0

  const columns: ColumnDef<TTemplate>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * PAGE_SIZE + row.index + 1}</span> },
    { id: 'code', header: 'Mã mẫu', cell: ({ row }) => <span className="text-xs font-mono text-muted-foreground">{row.original.Code ?? '—'}</span> },
    { id: 'name', header: 'Tên mẫu', cell: ({ row }) => <span className="font-medium">{row.original.Name ?? '—'}</span> },
    { id: 'type', header: 'Loại', cell: ({ row }) => <span className="text-sm">{row.original.Type?.Name ?? '—'}</span> },
    {
      id: 'active', header: 'Kích hoạt',
      cell: ({ row }) => (
        <span className={`text-xs font-medium ${row.original.IsActive ? 'text-emerald-700' : 'text-muted-foreground'}`}>
          {row.original.IsActive ? 'Đang dùng' : 'Không dùng'}
        </span>
      ),
    },
    { id: 'status', header: 'TT', cell: ({ row }) => <StatusBadge status={row.original.Status} /> },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Mẫu hóa đơn" icon={FileCode}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm mẫu hóa đơn..." />
      </ListPageHeader>

      <DataTable columns={columns} data={items} loading={isLoading} total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} emptyText="Không có mẫu hóa đơn nào" />
    </div>
  )
}

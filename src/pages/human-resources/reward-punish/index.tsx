import { useState } from 'react'
import { Award } from 'lucide-react'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, DateRangeFilter, fmtCurrency, PAGE_SIZE, defaultDateFrom, defaultDateTo, StatusBadge } from '@/pages/actives/shared'

interface TRewardPunish {
  Id?: number
  Name?: string
  Member?: { Name?: string }
  Date?: string
  Reason?: { Name?: string }
  Amount?: number
  Type?: number
  Note?: string
  Status?: { Id?: number; Name?: string }
}

export default function RewardPunishPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())

  const { data, isLoading } = useFilterReportQuery({
    path: 'rewardpunishs/filter',
    params: { Keyword: keyword || undefined, DateFrom: dateFrom, DateTo: dateTo, PageIndex: page - 1, PageSize: PAGE_SIZE },
  })

  const items = (data?.Items ?? []) as TRewardPunish[]
  const total = data?.TotalItemCount ?? 0

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'

  const columns: ColumnDef<TRewardPunish>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * PAGE_SIZE + row.index + 1}</span> },
    { id: 'name', header: 'Mã phiếu', cell: ({ row }) => <span className="font-mono text-xs">{row.original.Name ?? '—'}</span> },
    { id: 'member', header: 'Nhân viên', cell: ({ row }) => <span className="font-medium">{row.original.Member?.Name ?? '—'}</span> },
    { id: 'date', header: 'Ngày', cell: ({ row }) => <span className="text-xs">{fmtDate(row.original.Date)}</span> },
    { id: 'reason', header: 'Lý do', cell: ({ row }) => <span className="text-sm">{row.original.Reason?.Name ?? '—'}</span> },
    {
      id: 'type', header: 'Loại',
      cell: ({ row }) => (
        <span className={`text-xs font-medium ${row.original.Type === 1 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {row.original.Type === 1 ? 'Khen thưởng' : 'Kỷ luật'}
        </span>
      ),
    },
    { id: 'amount', header: 'Số tiền', cell: ({ row }) => <span className="tabular-nums">{fmtCurrency(row.original.Amount)}</span> },
    { id: 'status', header: 'TT', cell: ({ row }) => <StatusBadge status={row.original.Status} /> },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Khen thưởng & Kỷ luật" icon={Award}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm phiếu khen thưởng..." />
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
        emptyText="Không có phiếu khen thưởng / kỷ luật nào"
      />
    </div>
  )
}

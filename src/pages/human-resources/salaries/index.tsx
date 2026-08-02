import { useState } from 'react'
import { Banknote } from 'lucide-react'
import { useFilterSalariesQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, StatusBadge, fmtCurrency, PAGE_SIZE } from '@/pages/actives/shared'
import type { TPosSalaryRecord } from '@/store/slice/users/types/pos-types'
import { Input } from '@/components/ui/input'
import dayjs from 'dayjs'

export default function SalariesPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))

  const { data, isLoading } = useFilterSalariesQuery({
    PageIndex: page - 1,
    PageSize: PAGE_SIZE,
    Keyword: keyword || undefined,
    Month: month,
  })

  const items = (data?.Items ?? []) as TPosSalaryRecord[]
  const total = data?.TotalItemCount ?? 0

  const columns: ColumnDef<TPosSalaryRecord>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * PAGE_SIZE + row.index + 1}</span> },
    { id: 'name', header: 'Số phiếu', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.Name ?? '—'}</span> },
    { id: 'member', header: 'Nhân viên', cell: ({ row }) => <span className="font-medium">{row.original.Member?.Name ?? '—'}</span> },
    { id: 'month', header: 'Tháng', cell: ({ row }) => <span>{row.original.Month ?? '—'}</span> },
    { id: 'base', header: 'Lương cơ bản', cell: ({ row }) => <span className="tabular-nums">{fmtCurrency(row.original.BaseSalary)}</span> },
    { id: 'bonus', header: 'Thưởng', cell: ({ row }) => <span className="tabular-nums text-emerald-700">{fmtCurrency(row.original.Bonus)}</span> },
    { id: 'deduction', header: 'Khấu trừ', cell: ({ row }) => <span className="tabular-nums text-rose-700">{fmtCurrency(row.original.Deduction)}</span> },
    { id: 'net', header: 'Thực nhận', cell: ({ row }) => <span className="tabular-nums font-semibold">{fmtCurrency(row.original.NetSalary)}</span> },
    { id: 'status', header: 'TT', cell: ({ row }) => <StatusBadge status={row.original.Status} /> },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Bảng lương" icon={Banknote}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm nhân viên..." />
        <Input type="month" value={month} onChange={e => { setMonth(e.target.value); setPage(1) }} className="h-8 w-36 text-sm" />
      </ListPageHeader>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        emptyText="Không có dữ liệu bảng lương"
      />
    </div>
  )
}

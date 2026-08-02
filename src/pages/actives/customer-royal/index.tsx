import { useState } from 'react'
import { Crown } from 'lucide-react'
import { useFilterRoyalCustomersQuery, useGetCustomerGroupsSimpleQuery } from '@/store/slice/users/api/api'
import type { TPosCustomer } from '@/store/slice/users/types/pos-types'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, fmtCurrency, fmtDate, PAGE_SIZE } from '../shared'

export default function CustomerRoyalPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [groupId, setGroupId] = useState<number | ''>('')

  const { data, isLoading } = useFilterRoyalCustomersQuery({
    PageIndex: page - 1,
    PageSize: pageSize,
    Keyword: keyword || undefined,
    GroupId: groupId || undefined,
  })

  const { data: groups = [] } = useGetCustomerGroupsSimpleQuery()

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0

  const columns: ColumnDef<TPosCustomer>[] = [
    {
      id: 'stt',
      header: 'STT',
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span>,
    },
    {
      id: 'code',
      header: 'Mã',
      cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.Code ?? '—'}</span>,
    },
    {
      id: 'name',
      header: 'Tên khách hàng',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.Name}</div>
          {row.original.CompanyName && (
            <div className="text-xs text-muted-foreground">{row.original.CompanyName}</div>
          )}
        </div>
      ),
    },
    {
      id: 'group',
      header: 'Nhóm',
      cell: ({ row }) => <span className="text-xs">{row.original.CustomerGroup?.Name ?? '—'}</span>,
    },
    {
      id: 'phone',
      header: 'Điện thoại',
      cell: ({ row }) => row.original.Phone ?? '—',
    },
    {
      id: 'address',
      header: 'Địa chỉ',
      cell: ({ row }) => (
        <span className="text-xs max-w-[160px] truncate block">{row.original.Address ?? '—'}</span>
      ),
    },
    {
      id: 'email',
      header: 'Email',
      cell: ({ row }) => <span className="text-xs">{row.original.Email ?? '—'}</span>,
    },
    {
      id: 'birthday',
      header: 'Sinh nhật',
      cell: ({ row }) => <span className="whitespace-nowrap">{fmtDate(row.original.Birthday)}</span>,
    },
    {
      id: 'totalAmount',
      header: 'Doanh số',
      cell: ({ row }) => <span className="tabular-nums font-medium">{fmtCurrency(row.original.TotalAmount)}</span>,
    },
    {
      id: 'totalOrder',
      header: 'Số đơn',
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.TotalOrder?.toLocaleString('vi-VN') ?? '—'}</span>
      ),
    },
    {
      id: 'point',
      header: 'Điểm',
      cell: ({ row }) => (
        <span className="tabular-nums text-amber-600 dark:text-amber-400 font-medium">
          {row.original.Point?.toLocaleString('vi-VN') ?? '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Khách hàng thân thiết" icon={Crown}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm khách hàng..." />
        <select
          value={groupId}
          onChange={e => { setGroupId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Tất cả nhóm</option>
          {groups.map(g => <option key={g.Id} value={g.Id}>{g.Name}</option>)}
        </select>
      </ListPageHeader>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize} onPageSizeChange={setPageSize}
        onPageChange={setPage}
        emptyText="Không có khách hàng thân thiết"
      />
    </div>
  )
}

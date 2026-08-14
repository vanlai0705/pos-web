import type { TPosCustomer } from '@/store/slice/users/types/pos-types'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { CodeTag, MoneyTag } from '@/components/ui/data-tag'
import { useFilterRoyalCustomersQuery, useGetCustomerGroupsSimpleQuery } from '@/store/slice/customers/api'
import { Crown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ListPageHeader, PAGE_SIZE, SearchBar } from '../shared'
import { fmtDate } from '@/utils'
export default function CustomerRoyalPage() {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [groupId, setGroupId] = useState<number | ''>('')

  const { data, isLoading } = useFilterRoyalCustomersQuery({
    PageIndex: page - 1,
    PageSize: pageSize,
    Keyword: keyword || undefined,
    CustomerGroupId: groupId || undefined,
  })

  const { data: groups = [] } = useGetCustomerGroupsSimpleQuery()

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0

  const columns: ColumnDef<TPosCustomer>[] = [
    {
      id: 'stt',
      header: t('common.index'),
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span>,
    },
    {
      id: 'code',
      header: t('common.code'),
      cell: ({ row }) => <CodeTag value={row.original.Code} />,
    },
    {
      id: 'name',
      header: t('common.customerName'),
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
      header: t('common.group'),
      cell: ({ row }) => <span className="text-xs">{row.original.CustomerGroup?.Name ?? '—'}</span>,
    },
    {
      id: 'phone',
      header: t('common.phone'),
      cell: ({ row }) => row.original.Phone ?? '—',
    },
    {
      id: 'address',
      header: t('common.address'),
      cell: ({ row }) => (
        <span className="text-xs max-w-[160px] truncate block">{row.original.Address ?? '—'}</span>
      ),
    },
    {
      id: 'email',
      header: t('common.email'),
      cell: ({ row }) => <span className="text-xs">{row.original.Email ?? '—'}</span>,
    },
    {
      id: 'birthday',
      header: t('common.birthday'),
      cell: ({ row }) => <span className="whitespace-nowrap">{fmtDate(row.original.Birthday)}</span>,
    },
    {
      id: 'totalAmount',
      header: t('common.revenue'),
      cell: ({ row }) => <MoneyTag value={row.original.TotalAmount} />,
    },
    {
      id: 'totalOrder',
      header: t('common.orderCount'),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.TotalOrder?.toLocaleString('vi-VN') ?? '—'}</span>
      ),
    },
    {
      id: 'point',
      header: t('common.points'),
      cell: ({ row }) => (
        <span className="tabular-nums text-amber-600 dark:text-amber-400 font-medium">
          {row.original.Point?.toLocaleString('vi-VN') ?? '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title={t('pages.actives.customerRoyal.pageTitle')} icon={Crown}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder={t('common.searchCustomer')} />
        <select
          value={groupId}
          onChange={e => { setGroupId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t('pages.actives.customerRoyal.allGroups')}</option>
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
        emptyText={t('pages.actives.customerRoyal.emptyText')}
      />
    </div>
  )
}

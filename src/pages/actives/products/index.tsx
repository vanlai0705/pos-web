import type { TPosActiveProduct } from '@/store/slice/users/types/pos-types'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { CodeTag, MoneyTag } from '@/components/ui/data-tag'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { useGetProductGroupsSimpleQuery } from '@/store/slice/customers/api'
import { useFilterActiveProductsQuery, useUpdateActiveProductStatusMutation } from '@/store/slice/products/api'
import { getImageUrl } from '@/utils/common'
import { Package } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ListPageHeader, PAGE_SIZE, SearchBar, StatusBadge } from '../shared'
import { STATUS } from '@/constants/status'
import { RowActions } from '@/pages/managers/components'

// STATUS in pos_web: 0 = Actived, 1 = Locked, 2 = Deleted.
function imgUrl(url?: string | null) {
  return getImageUrl(url ?? undefined) ?? null
}

export default function ActiveProductsPage() {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [statusId, setStatusId] = useState<number | ''>('')
  const [groupId, setGroupId] = useState<number | ''>('')

  const { data, isLoading, refetch } = useFilterActiveProductsQuery({
    PageIndex: page - 1,
    PageSize: pageSize,
    Keyword: keyword || undefined,
    StatusId: statusId,
    ProductGroupId: groupId || undefined,
  })
  const { data: groups = [] } = useGetProductGroupsSimpleQuery()
  const [updateStatus] = useUpdateActiveProductStatusMutation()

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0

  const changeStatus = async (id: number, statusId: number) => {
    if (statusId === STATUS.DELETED && !await confirmAction({ description: t('pages.actives.products.confirmDelete') })) return
    try {
      await updateStatus({ id, statusId }).unwrap()
      refetch()
    } catch { toast.error(t('pages.actives.products.updateStatusFailed')) }
  }

  const columns: ColumnDef<TPosActiveProduct>[] = [
    {
      id: 'stt',
      header: t('common.index'),
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span>,
    },
    {
      id: 'image',
      header: t('common.image'),
      cell: ({ row }) => {
        const item = row.original
        const url = imgUrl(item.Image?.Url ?? item.Images?.[0]?.Url)
        return url
          ? <img src={url} alt="" className="h-9 w-9 rounded object-cover bg-muted" />
          : (
            <div className="h-9 w-9 rounded bg-muted flex items-center justify-center">
              <Package className="h-4 w-4 text-muted-foreground/50" />
            </div>
          )
      },
    },
    {
      id: 'code',
      header: t('common.productCode'),
      cell: ({ row }) => <CodeTag value={row.original.Code} />,
    },
    {
      id: 'name',
      header: t('common.productName'),
      cell: ({ row }) => <span className="font-medium">{row.original.Name}</span>,
    },
    {
      id: 'group',
      header: t('common.group'),
      cell: ({ row }) => <span className="text-xs">{row.original.ProductGroup?.Name ?? '—'}</span>,
    },
    {
      id: 'unit',
      header: t('common.unit'),
      cell: ({ row }) => <span className="text-xs">{row.original.Unit?.Name ?? '—'}</span>,
    },
    {
      id: 'price',
      header: t('common.salePrice'),
      cell: ({ row }) => <MoneyTag value={row.original.Price} />,
    },
    {
      id: 'importPrice',
      header: t('common.inputPrice'),
      cell: ({ row }) => <MoneyTag value={row.original.ImportPrice} />,
    },
    {
      id: 'quantity',
      header: t('common.inventory'),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.Quantity?.toLocaleString('vi-VN') ?? '—'}</span>
      ),
    },
    {
      id: 'status',
      header: t('common.statusShort'),
      cell: ({ row }) => <StatusBadge status={row.original.Status} />,
    },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) => {
        const item = row.original
        if (!item.Id) return null
        return (
          <RowActions
            statusId={item.Status?.Id}
            onActivate={() => changeStatus(item.Id!, STATUS.ACTIVE)}
            onLock={() => changeStatus(item.Id!, STATUS.LOCKED)}
            onDelete={() => changeStatus(item.Id!, STATUS.DELETED)}
          />
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title={t('pages.actives.products.title')} icon={Package}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder={t('common.searchProduct')} />
        <select
          value={statusId}
          onChange={e => { setStatusId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t('pages.actives.products.allStatusShort')}</option>
          <option value={STATUS.ACTIVE}>{t('common.active')}</option>
          <option value={STATUS.LOCKED}>{t('common.locked')}</option>
        </select>
        <select
          value={groupId}
          onChange={e => { setGroupId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t('pages.actives.products.allGroups')}</option>
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
        emptyText={t('pages.actives.products.emptyText')}
      />
    </div>
  )
}

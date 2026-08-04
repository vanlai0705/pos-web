import { useState } from 'react'
import { Package, MoreHorizontal, Check, Lock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useFilterActiveProductsQuery,
  useUpdateActiveProductStatusMutation,
  useGetProductGroupsSimpleQuery,
} from '@/store/slice/users/api/api'
import type { TPosActiveProduct } from '@/store/slice/users/types/pos-types'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, StatusBadge, PAGE_SIZE } from '../shared'
import { getImageUrl } from '@/utils/common'
import { CodeTag, MoneyTag } from '@/components/ui/data-tag'

// STATUS in pos_web: 0 = Actived, 1 = Locked, 2 = Deleted.
const STATUS = { ACTIVE: 0, LOCKED: 1, DELETED: 2 } as const

function imgUrl(url?: string | null) {
  return getImageUrl(url ?? undefined) ?? null
}

export default function ActiveProductsPage() {
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
    if (statusId === STATUS.DELETED && !window.confirm('Xoá mặt hàng này?')) return
    try {
      await updateStatus({ id, statusId }).unwrap()
      refetch()
    } catch { toast.error('Không thể cập nhật trạng thái') }
  }

  const columns: ColumnDef<TPosActiveProduct>[] = [
    {
      id: 'stt',
      header: 'STT',
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span>,
    },
    {
      id: 'image',
      header: 'Hình',
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
      header: 'Mã hàng',
      cell: ({ row }) => <CodeTag value={row.original.Code} />,
    },
    {
      id: 'name',
      header: 'Tên mặt hàng',
      cell: ({ row }) => <span className="font-medium">{row.original.Name}</span>,
    },
    {
      id: 'group',
      header: 'Nhóm',
      cell: ({ row }) => <span className="text-xs">{row.original.ProductGroup?.Name ?? '—'}</span>,
    },
    {
      id: 'unit',
      header: 'ĐVT',
      cell: ({ row }) => <span className="text-xs">{row.original.Unit?.Name ?? '—'}</span>,
    },
    {
      id: 'price',
      header: 'Giá bán',
      cell: ({ row }) => <MoneyTag value={row.original.Price} />,
    },
    {
      id: 'importPrice',
      header: 'Giá nhập',
      cell: ({ row }) => <MoneyTag value={row.original.ImportPrice} />,
    },
    {
      id: 'quantity',
      header: 'Tồn',
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.Quantity?.toLocaleString('vi-VN') ?? '—'}</span>
      ),
    },
    {
      id: 'status',
      header: 'TT',
      cell: ({ row }) => <StatusBadge status={row.original.Status} />,
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => {
        const item = row.original
        if (!item.Id) return null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {item.Status?.Id !== STATUS.ACTIVE && (
                <DropdownMenuItem onClick={() => changeStatus(item.Id!, STATUS.ACTIVE)}>
                  <Check className="h-3.5 w-3.5 mr-2 text-green-600" /> Kích hoạt
                </DropdownMenuItem>
              )}
              {item.Status?.Id !== STATUS.LOCKED && (
                <DropdownMenuItem onClick={() => changeStatus(item.Id!, STATUS.LOCKED)}>
                  <Lock className="h-3.5 w-3.5 mr-2 text-yellow-600" /> Khoá
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => changeStatus(item.Id!, STATUS.DELETED)}>
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Xoá
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Mặt hàng" icon={Package}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm mặt hàng..." />
        <select
          value={statusId}
          onChange={e => { setStatusId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Tất cả TT</option>
          <option value={STATUS.ACTIVE}>Hoạt động</option>
          <option value={STATUS.LOCKED}>Đã khoá</option>
        </select>
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
        emptyText="Không có mặt hàng nào"
      />
    </div>
  )
}

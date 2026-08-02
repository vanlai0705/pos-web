import { useState } from 'react'
import { PackagePlus, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  useFilterActiveProductsQuery,
  useUpdateActiveProductStatusMutation,
  useGetProductGroupsSimpleQuery,
} from '@/store/slice/users/api/api'
import type { TPosActiveProduct } from '@/store/slice/users/types/pos-types'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, StatusBadge, fmtCurrency, PAGE_SIZE } from '../shared'
import { getImageUrl } from '@/utils/common'

function imgUrl(url?: string | null) {
  return getImageUrl(url ?? undefined) ?? null
}

function ProductForm({
  form, onChange, groups,
}: {
  form: TPosActiveProduct
  onChange: (f: TPosActiveProduct) => void
  groups: { Id?: number; Name?: string }[]
}) {
  const set = (patch: Partial<TPosActiveProduct>) => onChange({ ...form, ...patch })
  return (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Mã hàng</Label>
          <Input value={form.Code ?? ''} onChange={e => set({ Code: e.target.value })} placeholder="Tự động" />
        </div>
        <div className="space-y-1">
          <Label>Mã vạch</Label>
          <Input value={form.Barcode ?? ''} onChange={e => set({ Barcode: e.target.value })} placeholder="Mã vạch" />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Tên mặt hàng <span className="text-destructive">*</span></Label>
        <Input value={form.Name} onChange={e => set({ Name: e.target.value })} placeholder="Tên mặt hàng" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Nhóm mặt hàng</Label>
          <select
            value={form.ProductGroup?.Id ?? ''}
            onChange={e => {
              const id = Number(e.target.value)
              const g = groups.find(x => x.Id === id)
              set({ ProductGroup: g ? { Id: g.Id, Name: g.Name } : undefined })
            }}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— Không có —</option>
            {groups.map(g => <option key={g.Id} value={g.Id}>{g.Name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Đơn vị tính</Label>
          <Input value={form.Unit?.Name ?? ''} onChange={e => set({ Unit: { ...form.Unit, Name: e.target.value } })} placeholder="ĐVT" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Giá bán</Label>
          <Input
            type="number"
            value={form.Price ?? ''}
            onChange={e => set({ Price: Number(e.target.value) })}
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <Label>Giá nhập</Label>
          <Input
            type="number"
            value={form.ImportPrice ?? ''}
            onChange={e => set({ ImportPrice: Number(e.target.value) })}
            placeholder="0"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Ghi chú</Label>
        <Input value={form.Note ?? ''} onChange={e => set({ Note: e.target.value })} placeholder="Ghi chú" />
      </div>
    </div>
  )
}

export default function ProductsNewPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [statusId, setStatusId] = useState<number | ''>('')
  const [groupId, setGroupId] = useState<number | ''>('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TPosActiveProduct>({ Name: '' })

  const { data, isLoading, refetch } = useFilterActiveProductsQuery({
    PageIndex: page - 1,
    PageSize: PAGE_SIZE,
    Keyword: keyword || undefined,
    StatusId: statusId,
    GroupId: groupId || undefined,
  })
  const { data: groups = [] } = useGetProductGroupsSimpleQuery()
  const [updateStatus] = useUpdateActiveProductStatusMutation()

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0

  const openAdd = () => { setForm({ Name: '' }); setModal(true) }

  const handleToggleStatus = async (id: number, currentStatusId?: number) => {
    const newStatusId = currentStatusId === 1 ? 2 : 1
    try {
      await updateStatus({ id, statusId: newStatusId }).unwrap()
      refetch()
    } catch { toast.error('Không thể cập nhật trạng thái') }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Xoá mặt hàng này?')) return
    try {
      await updateStatus({ id, statusId: 4 }).unwrap()
      refetch()
      toast.success('Đã xoá mặt hàng')
    } catch { toast.error('Không thể xoá mặt hàng') }
  }

  const columns: ColumnDef<TPosActiveProduct>[] = [
    {
      id: 'stt',
      header: 'STT',
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * PAGE_SIZE + row.index + 1}</span>,
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
              <PackagePlus className="h-4 w-4 text-muted-foreground/50" />
            </div>
          )
      },
    },
    {
      id: 'code',
      header: 'Mã hàng',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.Code ?? '—'}</span>,
    },
    {
      id: 'name',
      header: 'Tên mặt hàng',
      cell: ({ row }) => <span className="font-medium">{row.original.Name}</span>,
    },
    {
      id: 'unit',
      header: 'ĐVT',
      cell: ({ row }) => <span className="text-xs">{row.original.Unit?.Name ?? '—'}</span>,
    },
    {
      id: 'group',
      header: 'Nhóm',
      cell: ({ row }) => <span className="text-xs">{row.original.ProductGroup?.Name ?? '—'}</span>,
    },
    {
      id: 'note',
      header: 'Ghi chú',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground max-w-[100px] truncate block">{row.original.Note ?? '—'}</span>
      ),
    },
    {
      id: 'price',
      header: 'Giá bán',
      cell: ({ row }) => <span className="tabular-nums">{fmtCurrency(row.original.Price)}</span>,
    },
    {
      id: 'importPrice',
      header: 'Giá nhập',
      cell: ({ row }) => <span className="tabular-nums">{fmtCurrency(row.original.ImportPrice)}</span>,
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
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => item.Id && handleToggleStatus(item.Id, item.Status?.Id)}
              title={item.Status?.Id === 1 ? 'Ngừng hoạt động' : 'Kích hoạt'}
            >
              {item.Status?.Id === 1
                ? <ToggleRight className="h-4 w-4 text-primary" />
                : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
              }
            </Button>
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => item.Id && handleDelete(item.Id)}
              title="Xoá"
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Mặt hàng mới" icon={PackagePlus}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm mặt hàng..." />
        <select
          value={statusId}
          onChange={e => { setStatusId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Tất cả TT</option>
          <option value={1}>Hoạt động</option>
          <option value={2}>Ngừng HĐ</option>
        </select>
        <select
          value={groupId}
          onChange={e => { setGroupId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Tất cả nhóm</option>
          {groups.map(g => <option key={g.Id} value={g.Id}>{g.Name}</option>)}
        </select>
        <Button size="sm" onClick={openAdd} className="h-8">
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm mặt hàng
        </Button>
      </ListPageHeader>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        emptyText="Không có mặt hàng nào"
      />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.Id ? 'Chỉnh sửa mặt hàng' : 'Thêm mặt hàng'}</DialogTitle>
          </DialogHeader>
          <ProductForm form={form} onChange={setForm} groups={groups} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Huỷ</Button>
            <Button onClick={() => { toast.info('Tính năng lưu mặt hàng đang phát triển'); setModal(false) }}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

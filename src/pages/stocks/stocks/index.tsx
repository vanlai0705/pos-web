import { useState } from 'react'
import { Warehouse, Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useFilterWarehousesQuery, useSaveWarehouseMutation, useUpdateWarehouseStatusMutation } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, StatusBadge, PAGE_SIZE } from '@/pages/actives/shared'

interface TWarehouse {
  Id?: number
  Name?: string
  IsAllowNegative?: boolean
  Status?: { Id?: number; Name?: string }
  Note?: string
}

const EMPTY = (): TWarehouse => ({ Name: '', IsAllowNegative: false })

export default function WarehousesPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [statusId, setStatusId] = useState<number | ''>('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TWarehouse>(EMPTY())

  const { data, isLoading, refetch } = useFilterWarehousesQuery({
    PageIndex: page - 1,
    PageSize: pageSize,
    Keyword: keyword || undefined,
    StatusId: statusId,
  })
  const [saveWarehouse, { isLoading: saving }] = useSaveWarehouseMutation()
  const [updateStatus] = useUpdateWarehouseStatusMutation()

  const items = (data?.Items ?? []) as TWarehouse[]
  const total = data?.TotalItemCount ?? 0

  const handleSave = async () => {
    if (!form.Name?.trim()) { toast.error('Vui lòng nhập tên kho'); return }
    try {
      await saveWarehouse(form).unwrap()
      toast.success(form.Id ? 'Đã cập nhật kho' : 'Đã thêm kho')
      setModal(false)
      setForm(EMPTY())
      refetch()
    } catch {
      toast.error('Không thể lưu kho hàng')
    }
  }

  const handleToggleStatus = async (id: number, currentStatusId?: number) => {
    try {
      await updateStatus({ id, statusId: currentStatusId === 1 ? 2 : 1 }).unwrap()
      refetch()
    } catch { toast.error('Không thể cập nhật trạng thái') }
  }

  const columns: ColumnDef<TWarehouse>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'name', header: 'Tên kho', cell: ({ row }) => <span className="font-medium">{row.original.Name}</span> },
    {
      id: 'allowNeg', header: 'Cho phép âm kho',
      cell: ({ row }) => (
        <span className={row.original.IsAllowNegative ? 'text-emerald-600 text-xs font-medium' : 'text-muted-foreground text-xs'}>
          {row.original.IsAllowNegative ? 'Có' : 'Không'}
        </span>
      ),
    },
    { id: 'status', header: 'Trạng thái', cell: ({ row }) => <StatusBadge status={row.original.Status} /> },
    {
      id: 'actions', header: 'Thao tác',
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setForm(item); setModal(true) }}>Sửa</Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => item.Id && handleToggleStatus(item.Id, item.Status?.Id)}
              title={item.Status?.Id === 1 ? 'Ngừng hoạt động' : 'Kích hoạt'}>
              {item.Status?.Id === 1
                ? <ToggleRight className="h-4 w-4 text-primary" />
                : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Danh sách kho" icon={Warehouse}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm kho hàng..." />
        <select value={statusId} onChange={e => { setStatusId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Tất cả TT</option>
          <option value={1}>Hoạt động</option>
          <option value={2}>Ngừng HĐ</option>
        </select>
        <Button size="sm" className="h-8" onClick={() => { setForm(EMPTY()); setModal(true) }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm kho
        </Button>
      </ListPageHeader>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize} onPageSizeChange={setPageSize}
        onPageChange={setPage}
        emptyText="Không có kho hàng nào"
      />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{form.Id ? 'Chỉnh sửa kho' : 'Thêm kho hàng'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tên kho <span className="text-destructive">*</span></Label>
              <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Tên kho hàng" />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.IsAllowNegative ?? false}
                onCheckedChange={v => setForm(f => ({ ...f, IsAllowNegative: v }))}
              />
              <Label>Cho phép âm kho</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Huỷ</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useSaveWarehouseMutation, useUpdateWarehouseStatusMutation, useFilterWarehousesQuery } from '@/store/slice/stocks/api'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/status-badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { STATUS } from '@/constants/status'
import { ListPageHeader, PAGE_SIZE, SearchBar } from '@/pages/actives/shared'
import { Check, Lock, MoreHorizontal, Plus, Trash2, Warehouse } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

// STATUS in pos_web: 0 = Actived, 1 = Locked, 2 = Deleted.
interface TWarehouse {
  Id?: number
  Name?: string
  /** stock-detail.component.ts — field is IsNegative, not IsAllowNegative */
  IsNegative?: boolean
  Note?: string
  Status?: { Id?: number; Name?: string }
}

// Angular defaults IsNegative to true for a new kho.
const EMPTY = (): TWarehouse => ({ Name: '', IsNegative: true, Note: '' })

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

  const changeStatus = async (id: number, statusId: number) => {
    if (statusId === STATUS.DELETED && !await confirmAction({ description: 'Xoá kho này?' })) return
    try {
      await updateStatus({ id, statusId }).unwrap()
      refetch()
    } catch { toast.error('Không thể cập nhật trạng thái') }
  }

  const columns: ColumnDef<TWarehouse>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'name', header: 'Tên kho', cell: ({ row }) => <span className="font-medium">{row.original.Name}</span> },
    {
      id: 'allowNeg', header: 'Cho phép âm kho',
      cell: ({ row }) => (
        <span className={row.original.IsNegative ? 'text-emerald-600 text-xs font-medium' : 'text-muted-foreground text-xs'}>
          {row.original.IsNegative ? 'Có' : 'Không'}
        </span>
      ),
    },
    { id: 'status', header: 'Trạng thái', cell: ({ row }) => <StatusBadge status={row.original.Status} /> },
    {
      id: 'actions', header: 'Thao tác',
      cell: ({ row }) => {
        const item = row.original
        if (!item.Id) return null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setForm(item); setModal(true) }}>Chỉnh sửa</DropdownMenuItem>
              <DropdownMenuSeparator />
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
      <ListPageHeader title="Danh sách kho" icon={Warehouse}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm kho hàng..." />
        <select value={statusId} onChange={e => { setStatusId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Tất cả TT</option>
          <option value={STATUS.ACTIVE}>Hoạt động</option>
          <option value={STATUS.LOCKED}>Đã khoá</option>
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
                checked={form.IsNegative ?? false}
                onCheckedChange={v => setForm(f => ({ ...f, IsNegative: v }))}
              />
              <Label>Cho phép âm kho</Label>
            </div>
            <div className="space-y-1">
              <Label>Ghi chú</Label>
              <Textarea rows={2} value={form.Note ?? ''} onChange={e => setForm(f => ({ ...f, Note: e.target.value }))} />
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

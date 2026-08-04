import { useState } from 'react'
import { Clock, Plus, MoreHorizontal, Check, Lock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NumberInput } from '@/components/ui/number-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useFilterShiftsQuery, useSaveShiftMutation, useUpdateShiftStatusMutation, useLazyGenericGetQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, StatusBadge, PAGE_SIZE } from '@/pages/actives/shared'
import type { TPosShift } from '@/store/slice/users/types/pos-types'

// STATUS in pos_web: 0 = Actived, 1 = Locked, 2 = Deleted.
const STATUS = { ACTIVE: 0, LOCKED: 1, DELETED: 2 } as const

// Angular defaults a new shift to full salary (100%).
const EMPTY = (): TPosShift => ({ Name: '', SalaryPercent: 100, Note: '' })

export default function ShiftsPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [statusId, setStatusId] = useState<number | ''>('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TPosShift>(EMPTY())

  const { data, isLoading, refetch } = useFilterShiftsQuery({
    PageIndex: page - 1,
    PageSize: pageSize,
    Keyword: keyword || undefined,
    StatusId: statusId,
  })
  const [saveShift, { isLoading: saving }] = useSaveShiftMutation()
  const [updateStatus] = useUpdateShiftStatusMutation()
  const [fetchDetail] = useLazyGenericGetQuery()

  const items = (data?.Items ?? []) as TPosShift[]
  const total = data?.TotalItemCount ?? 0

  const handleSave = async () => {
    if (!form.Name?.trim()) { toast.error('Vui lòng nhập tên ca'); return }
    try {
      await saveShift({ ...form, SalaryPercent: Number(form.SalaryPercent) || 0 }).unwrap()
      toast.success(form.Id ? 'Đã cập nhật ca làm việc' : 'Đã thêm ca làm việc')
      setModal(false)
      setForm(EMPTY())
      refetch()
    } catch {
      toast.error('Không thể lưu ca làm việc')
    }
  }

  const changeStatus = async (id: number, statusId: number) => {
    if (statusId === STATUS.DELETED && !window.confirm('Xoá ca làm việc này?')) return
    try {
      await updateStatus({ id, statusId }).unwrap()
      refetch()
    } catch { toast.error('Không thể cập nhật trạng thái') }
  }

  // ShiftModel (list) has no `Note` — only ShiftDetailModel does.
  const openEdit = async (row: TPosShift) => {
    if (!row.Id) return
    try {
      const res = await fetchDetail({ url: 'shift/detail', params: { id: row.Id } }).unwrap()
      setForm({ ...EMPTY(), ...((res?.Data ?? row) as TPosShift) })
      setModal(true)
    } catch {
      setForm(row)
      setModal(true)
    }
  }

  const columns: ColumnDef<TPosShift>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'name', header: 'Tên ca', cell: ({ row }) => <span className="font-medium">{row.original.Name}</span> },
    { id: 'salary', header: 'Tỷ lệ lương', cell: ({ row }) => <span className="tabular-nums">{row.original.SalaryPercent ?? 100}%</span> },
    { id: 'status', header: 'TT', cell: ({ row }) => <StatusBadge status={row.original.Status} /> },
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
              <DropdownMenuItem onClick={() => openEdit(item)}>Chỉnh sửa</DropdownMenuItem>
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
      <ListPageHeader title="Ca làm việc" icon={Clock}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm ca làm việc..." />
        <select value={statusId} onChange={e => { setStatusId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Tất cả TT</option>
          <option value={STATUS.ACTIVE}>Hoạt động</option>
          <option value={STATUS.LOCKED}>Đã khoá</option>
        </select>
        <Button size="sm" className="h-8" onClick={() => { setForm(EMPTY()); setModal(true) }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm ca
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
        emptyText="Không có ca làm việc nào"
      />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{form.Id ? 'Chỉnh sửa ca làm việc' : 'Thêm ca làm việc'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tên ca <span className="text-destructive">*</span></Label>
              <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Tên ca làm việc" />
            </div>
            <div className="space-y-1">
              <Label>Tỷ lệ lương (%)</Label>
              <NumberInput min={0} max={100} value={form.SalaryPercent ?? 100}
                onChange={v => setForm(f => ({ ...f, SalaryPercent: v }))} />
            </div>
            <div className="space-y-1">
              <Label>Ghi chú</Label>
              <Textarea value={form.Note ?? ''} onChange={e => setForm(f => ({ ...f, Note: e.target.value }))} rows={2} placeholder="Ghi chú" />
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

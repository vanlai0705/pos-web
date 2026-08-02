import { useState } from 'react'
import { UserCheck, Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useFilterMembersQuery, useSaveMemberMutation, useUpdateMemberStatusMutation } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, StatusBadge, fmtCurrency, PAGE_SIZE } from '@/pages/actives/shared'
import type { TPosMember } from '@/store/slice/users/types/pos-types'

const EMPTY = (): TPosMember => ({ Name: '', Phone: '', Email: '' })

export default function MembersPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [statusId, setStatusId] = useState<number | ''>('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TPosMember>(EMPTY())

  const { data, isLoading, refetch } = useFilterMembersQuery({
    PageIndex: page - 1,
    PageSize: PAGE_SIZE,
    Keyword: keyword || undefined,
    StatusId: statusId,
  })
  const [saveMember, { isLoading: saving }] = useSaveMemberMutation()
  const [updateStatus] = useUpdateMemberStatusMutation()

  const items = (data?.Items ?? []) as TPosMember[]
  const total = data?.TotalItemCount ?? 0

  const handleSave = async () => {
    if (!form.Name?.trim()) { toast.error('Vui lòng nhập tên nhân viên'); return }
    try {
      await saveMember(form).unwrap()
      toast.success(form.Id ? 'Đã cập nhật nhân viên' : 'Đã thêm nhân viên')
      setModal(false)
      setForm(EMPTY())
      refetch()
    } catch {
      toast.error('Không thể lưu nhân viên')
    }
  }

  const handleToggleStatus = async (id: number, currentStatusId?: number) => {
    try {
      await updateStatus({ id, statusId: currentStatusId === 1 ? 2 : 1 }).unwrap()
      refetch()
    } catch { toast.error('Không thể cập nhật trạng thái') }
  }

  const columns: ColumnDef<TPosMember>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * PAGE_SIZE + row.index + 1}</span> },
    { id: 'code', header: 'Mã NV', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.Code ?? '—'}</span> },
    { id: 'name', header: 'Tên nhân viên', cell: ({ row }) => <span className="font-medium">{row.original.Name}</span> },
    { id: 'phone', header: 'Điện thoại', cell: ({ row }) => <span>{row.original.Phone ?? '—'}</span> },
    { id: 'email', header: 'Email', cell: ({ row }) => <span className="text-xs">{row.original.Email ?? '—'}</span> },
    { id: 'position', header: 'Chức vụ', cell: ({ row }) => <span className="text-xs">{row.original.Position ?? '—'}</span> },
    { id: 'salary', header: 'Lương cơ bản', cell: ({ row }) => <span className="tabular-nums">{fmtCurrency(row.original.BaseSalary)}</span> },
    { id: 'status', header: 'TT', cell: ({ row }) => <StatusBadge status={row.original.Status} /> },
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
      <ListPageHeader title="Nhân viên" icon={UserCheck}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm nhân viên..." />
        <select value={statusId} onChange={e => { setStatusId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Tất cả TT</option>
          <option value={1}>Hoạt động</option>
          <option value={2}>Ngừng HĐ</option>
        </select>
        <Button size="sm" className="h-8" onClick={() => { setForm(EMPTY()); setModal(true) }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm nhân viên
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
        emptyText="Không có nhân viên nào"
      />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.Id ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên'}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Mã nhân viên</Label>
                <Input value={form.Code ?? ''} onChange={e => setForm(f => ({ ...f, Code: e.target.value }))} placeholder="Tự động" />
              </div>
              <div className="space-y-1">
                <Label>Tên nhân viên <span className="text-destructive">*</span></Label>
                <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Họ và tên" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Điện thoại</Label>
                <Input value={form.Phone ?? ''} onChange={e => setForm(f => ({ ...f, Phone: e.target.value }))} placeholder="Số điện thoại" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.Email ?? ''} onChange={e => setForm(f => ({ ...f, Email: e.target.value }))} placeholder="Email" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Chức vụ</Label>
                <Input value={form.Position ?? ''} onChange={e => setForm(f => ({ ...f, Position: e.target.value }))} placeholder="Chức vụ" />
              </div>
              <div className="space-y-1">
                <Label>Phòng ban</Label>
                <Input value={form.Department ?? ''} onChange={e => setForm(f => ({ ...f, Department: e.target.value }))} placeholder="Phòng ban" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Lương cơ bản</Label>
              <Input type="number" value={form.BaseSalary ?? ''} onChange={e => setForm(f => ({ ...f, BaseSalary: Number(e.target.value) }))} placeholder="0" />
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

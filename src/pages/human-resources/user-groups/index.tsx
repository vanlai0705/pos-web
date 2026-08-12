import { useState } from 'react'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { Users, Plus, MoreHorizontal, Check, Lock, Trash2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { buildModelFormData } from '@/utils/multipart'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, StatusBadge, PAGE_SIZE } from '@/pages/actives/shared'
import { useApiMutation } from '@/hooks/use-api-mutation'
import { UserGroupPermissionDialog } from '@/components/pos/user-group-permission-dialog'

// STATUS in pos_web: 0 = Actived, 1 = Locked, 2 = Deleted.
const STATUS = { ACTIVE: 0, LOCKED: 1, DELETED: 2 } as const

interface TUserGroup { Id?: number; Name?: string; Note?: string; IsDefault?: boolean; Status?: { Id?: number; Name?: string } }
const EMPTY = (): TUserGroup => ({ Name: '', IsDefault: false, Note: '' })

export default function UserGroupsPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TUserGroup>(EMPTY())
  const [permGroup, setPermGroup] = useState<TUserGroup | null>(null)

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'usergroup/filter',
    params: { Keyword: keyword || undefined, PageIndex: page - 1, PageSize: pageSize },
  })

  const { mutate: save, isLoading: saving } = useApiMutation(
    (body: TUserGroup) => ({ url: body.Id ? 'usergroup/update' : 'usergroup/create', method: 'POST' as const, body: buildModelFormData(body) }),
    { onSuccess: () => { toast.success(form.Id ? 'Đã cập nhật' : 'Đã thêm'); setModal(false); setForm(EMPTY()); refetch() }, onError: () => toast.error('Không thể lưu') }
  )

  const { mutate: toggleStatus } = useApiMutation(
    ({ id, statusId }: { id: number; statusId: number }) => ({ url: `usergroup/update-status?id=${id}&statusId=${statusId}`, method: 'POST' as const, body: {} }),
    { onSuccess: refetch, onError: () => toast.error('Không thể cập nhật trạng thái') }
  )

  const changeStatus = async (id: number, statusId: number) => {
    if (statusId === STATUS.DELETED && !await confirmAction({ description: 'Xoá nhóm quyền này?' })) return
    toggleStatus({ id, statusId })
  }

  const items = (data?.Items ?? []) as TUserGroup[]
  const total = data?.TotalItemCount ?? 0

  const columns: ColumnDef<TUserGroup>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'name', header: 'Tên nhóm', cell: ({ row }) => <span className="font-medium">{row.original.Name}</span> },
    { id: 'default', header: 'Mặc định', cell: ({ row }) => row.original.IsDefault ? <Check className="h-4 w-4 text-emerald-600" /> : null },
    { id: 'note', header: 'Ghi chú', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.Note ?? '—'}</span> },
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
              <DropdownMenuItem onClick={() => { setForm(item); setModal(true) }}>Chỉnh sửa</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPermGroup(item)}>
                <ShieldCheck className="h-3.5 w-3.5 mr-2" /> Phân quyền
              </DropdownMenuItem>
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
      <ListPageHeader title="Nhóm người dùng" icon={Users}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm nhóm..." />
        <Button size="sm" className="h-8" onClick={() => { setForm(EMPTY()); setModal(true) }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm nhóm
        </Button>
      </ListPageHeader>

      <DataTable columns={columns} data={items} loading={isLoading} total={total} page={page} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={setPage} emptyText="Không có nhóm người dùng nào" />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{form.Id ? 'Chỉnh sửa nhóm' : 'Thêm nhóm người dùng'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tên nhóm <span className="text-destructive">*</span></Label>
              <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Tên nhóm người dùng" />
            </div>
            <label className="flex cursor-pointer select-none items-center gap-2">
              <Switch checked={!!form.IsDefault} onCheckedChange={v => setForm(f => ({ ...f, IsDefault: v }))} />
              <span className="text-sm font-medium">Quyền mặc định</span>
            </label>
            <div className="space-y-1">
              <Label>Ghi chú</Label>
              <Textarea rows={2} value={form.Note ?? ''} onChange={e => setForm(f => ({ ...f, Note: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Huỷ</Button>
            <Button onClick={() => { if (!form.Name?.trim()) { toast.error('Vui lòng nhập tên'); return } save(form) }} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserGroupPermissionDialog
        open={!!permGroup}
        onOpenChange={o => { if (!o) setPermGroup(null) }}
        groupId={permGroup?.Id}
        groupName={permGroup?.Name}
      />
    </div>
  )
}

import { useState } from 'react'
import { Users, Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  useFilterCustomersQuery,
  useSaveCustomerMutation,
  useUpdateCustomerStatusMutation,
  useGetCustomerGroupsSimpleQuery,
  useLazyGetCustomerDetailQuery,
} from '@/store/slice/users/api/api'
import type { TPosCustomer } from '@/store/slice/users/types/pos-types'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, StatusBadge, fmtDate, PAGE_SIZE } from '../shared'

const EMPTY: TPosCustomer = { Name: '' }

function CustomerForm({
  form, onChange, groups,
}: {
  form: TPosCustomer
  onChange: (f: TPosCustomer) => void
  groups: { Id?: number; Name?: string }[]
}) {
  const set = (patch: Partial<TPosCustomer>) => onChange({ ...form, ...patch })
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Mã khách hàng</Label>
          <Input value={form.Code ?? ''} onChange={e => set({ Code: e.target.value })} placeholder="Tự động nếu bỏ trống" />
        </div>
        <div className="space-y-1">
          <Label>Tên khách hàng <span className="text-destructive">*</span></Label>
          <Input value={form.Name} onChange={e => set({ Name: e.target.value })} placeholder="Tên khách hàng" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Nhóm khách hàng</Label>
          <select
            value={form.CustomerGroup?.Id ?? ''}
            onChange={e => {
              const id = Number(e.target.value)
              const g = groups.find(x => x.Id === id)
              set({ CustomerGroup: g ? { Id: g.Id, Name: g.Name } : undefined })
            }}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— Không có —</option>
            {groups.map(g => <option key={g.Id} value={g.Id}>{g.Name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Điện thoại</Label>
          <Input value={form.Phone ?? ''} onChange={e => set({ Phone: e.target.value })} placeholder="Số điện thoại" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" value={form.Email ?? ''} onChange={e => set({ Email: e.target.value })} placeholder="Email" />
        </div>
        <div className="space-y-1">
          <Label>Ngày sinh</Label>
          <Input type="date" value={form.Birthday?.slice(0, 10) ?? ''} onChange={e => set({ Birthday: e.target.value })} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isCompany"
          checked={!!form.IsCompany}
          onChange={e => set({ IsCompany: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="isCompany" className="cursor-pointer">Là doanh nghiệp / công ty</Label>
      </div>
      {form.IsCompany && (
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/20">
          <div className="space-y-1">
            <Label>Mã số thuế</Label>
            <Input value={form.TaxCode ?? ''} onChange={e => set({ TaxCode: e.target.value })} placeholder="MST" />
          </div>
          <div className="space-y-1">
            <Label>Tên công ty / đơn vị</Label>
            <Input value={form.CompanyName ?? ''} onChange={e => set({ CompanyName: e.target.value })} placeholder="Tên công ty" />
          </div>
        </div>
      )}
      <div className="space-y-1">
        <Label>Địa chỉ</Label>
        <Input value={form.Address ?? ''} onChange={e => set({ Address: e.target.value })} placeholder="Địa chỉ" />
      </div>
      <div className="space-y-1">
        <Label>Ghi chú</Label>
        <Input value={form.Note ?? ''} onChange={e => set({ Note: e.target.value })} placeholder="Ghi chú" />
      </div>
    </div>
  )
}

export default function CustomersPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [statusId, setStatusId] = useState<number | ''>('')
  const [groupId, setGroupId] = useState<number | ''>('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TPosCustomer>(EMPTY)

  const { data, isLoading, refetch } = useFilterCustomersQuery({
    PageIndex: page - 1,
    PageSize: PAGE_SIZE,
    Keyword: keyword || undefined,
    StatusId: statusId,
    GroupId: groupId || undefined,
  })
  const { data: groups = [] } = useGetCustomerGroupsSimpleQuery()
  const [getDetail] = useLazyGetCustomerDetailQuery()
  const [save, { isLoading: saving }] = useSaveCustomerMutation()
  const [updateStatus] = useUpdateCustomerStatusMutation()

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0

  const openAdd = () => { setForm(EMPTY); setModal(true) }
  const openEdit = async (id: number) => {
    try {
      const detail = await getDetail(id).unwrap()
      setForm(detail)
      setModal(true)
    } catch { toast.error('Không thể tải thông tin khách hàng') }
  }

  const handleSave = async () => {
    if (!form.Name.trim()) { toast.error('Vui lòng nhập tên khách hàng'); return }
    try {
      await save(form).unwrap()
      toast.success(form.Id ? 'Đã cập nhật khách hàng' : 'Đã thêm khách hàng')
      setModal(false)
      refetch()
    } catch { toast.error('Không thể lưu khách hàng') }
  }

  const handleToggleStatus = async (id: number, currentStatusId?: number) => {
    const newStatusId = currentStatusId === 1 ? 2 : 1
    try {
      await updateStatus({ id, statusId: newStatusId }).unwrap()
      refetch()
    } catch { toast.error('Không thể cập nhật trạng thái') }
  }

  const columns: ColumnDef<TPosCustomer>[] = [
    {
      id: 'stt',
      header: 'STT',
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * PAGE_SIZE + row.index + 1}</span>,
    },
    {
      id: 'code',
      header: 'Mã',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.Code ?? '—'}</span>,
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
      header: 'Nhóm KH',
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
        <span className="text-xs max-w-[140px] truncate block">{row.original.Address ?? '—'}</span>
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
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => item.Id && openEdit(item.Id)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
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
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Khách hàng" icon={Users}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm khách hàng..." />
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
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm khách hàng
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
        emptyText="Không có khách hàng nào"
      />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.Id ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng'}</DialogTitle>
          </DialogHeader>
          <CustomerForm form={form} onChange={setForm} groups={groups} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Huỷ</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

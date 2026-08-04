import { useEffect, useState } from 'react'
import { FolderOpen, Plus, MoreHorizontal, Trash2, Check, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { buildModelFormData } from '@/utils/multipart'
import {
  useFilterReportQuery, useLazyGenericGetQuery, useGenericPostMutation,
} from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, PAGE_SIZE } from '@/pages/actives/shared'
import { StatusBadge } from '@/components/ui/status-badge'
import { LookupSelect, type LookupItem } from '@/components/pos/lookup-select'

const STATUS = { ACTIVE: 0, LOCKED: 1, DELETED: 2 } as const

/** Radio in pos_web: 0 pays money out, 1 takes money in. */
const FUND_TYPE_KIND = [
  { value: 0, label: 'Dùng để thanh toán' },
  { value: 1, label: 'Dùng để thu tiền' },
]

interface TFundType {
  Id?: number
  Name?: string
  Type?: number
  Note?: string
  /** Parent fund type — the list is a tree */
  Parent?: LookupItem | null
  Bank?: LookupItem | null
  AccountNumber?: string
  AccountName?: string
  QrCodeUrl?: string
  Status?: { Id?: number; Name?: string }
}

const EMPTY = (): TFundType => ({
  Name: '', Type: 1, Note: '', Parent: null, Bank: null, AccountNumber: '', AccountName: '',
})

function errMsg(e: any) {
  return e?.data?.Errors?.[0]?.Message || e?.data?.Message || 'Không thể xử lý yêu cầu'
}

export default function FundTypePage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | undefined>()
  const [form, setForm] = useState<TFundType>(EMPTY())

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'fundtype/filter',
    params: { Keyword: keyword || undefined, PageIndex: page - 1, PageSize: pageSize },
  })
  const [fetchDetail] = useLazyGenericGetQuery()
  const [request, { isLoading: saving }] = useGenericPostMutation()

  const items = (data?.Items ?? []) as TFundType[]
  const total = data?.TotalItemCount ?? 0

  // List rows omit Note/Parent, so editing always refetches the full record.
  useEffect(() => {
    if (!modal) return
    if (!editId) { setForm(EMPTY()); return }
    fetchDetail({ url: 'fundtype/detail', params: { id: editId } })
      .unwrap()
      .then(res => setForm({ ...EMPTY(), ...((res?.Data ?? {}) as TFundType) }))
      .catch(e => toast.error(errMsg(e)))
  }, [modal, editId, fetchDetail])

  const openCreate = () => { setEditId(undefined); setModal(true) }
  const openEdit = (row: TFundType) => { if (row.Id) { setEditId(row.Id); setModal(true) } }

  const changeStatus = async (row: TFundType, statusId: number) => {
    if (!row.Id) return
    if (statusId === STATUS.DELETED && !window.confirm('Xoá loại quỹ này?')) return
    try {
      await request({ url: `fundtype/update-status?id=${row.Id}&statusId=${statusId}`, method: 'POST', body: {} }).unwrap()
      toast.success('Lưu thành công')
      refetch()
    } catch (e) { toast.error(errMsg(e)) }
  }

  const handleSave = async () => {
    if (!form.Name?.trim()) { toast.error('Vui lòng nhập tên loại quỹ'); return }
    try {
      await request({
        url: form.Id ? 'fundtype/update' : 'fundtype/create',
        method: 'POST',
        body: buildModelFormData(form),
      }).unwrap()
      toast.success(form.Id ? 'Đã cập nhật' : 'Đã thêm loại quỹ')
      setModal(false)
      refetch()
    } catch (e) { toast.error(errMsg(e)) }
  }

  const columns: ColumnDef<TFundType>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'name', header: 'Tên loại quỹ', cell: ({ row }) => <span className="font-medium">{row.original.Name}</span> },
    {
      id: 'type', header: 'Mục đích',
      cell: ({ row }) => <span className="text-xs">{FUND_TYPE_KIND.find(k => k.value === row.original.Type)?.label ?? '—'}</span>,
    },
    {
      id: 'bank', header: 'Ngân hàng',
      cell: ({ row }) => <span className="text-xs">{(row.original.Bank?.ShortName as string) || row.original.Bank?.Name || '—'}</span>,
    },
    { id: 'account', header: 'Số tài khoản', cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.AccountNumber || '—'}</span> },
    { id: 'accountName', header: 'Người thụ hưởng', cell: ({ row }) => <span className="text-xs">{row.original.AccountName || '—'}</span> },
    { id: 'status', header: 'TT', cell: ({ row }) => <StatusBadge statusId={row.original.Status?.Id} label={row.original.Status?.Name} /> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => {
        const r = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(r)}>Chỉnh sửa</DropdownMenuItem>
              <DropdownMenuSeparator />
              {r.Status?.Id !== STATUS.ACTIVE && (
                <DropdownMenuItem onClick={() => changeStatus(r, STATUS.ACTIVE)}>
                  <Check className="h-3.5 w-3.5 mr-2 text-green-600" /> Kích hoạt
                </DropdownMenuItem>
              )}
              {r.Status?.Id !== STATUS.LOCKED && (
                <DropdownMenuItem onClick={() => changeStatus(r, STATUS.LOCKED)}>
                  <Lock className="h-3.5 w-3.5 mr-2 text-yellow-600" /> Khoá
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => changeStatus(r, STATUS.DELETED)}>
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
      <ListPageHeader title="Loại quỹ" icon={FolderOpen}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm loại quỹ..." />
        <Button size="sm" className="h-8" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm loại quỹ
        </Button>
      </ListPageHeader>

      <DataTable
        columns={columns} data={items} loading={isLoading} total={total}
        page={page} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={setPage}
        onRowDoubleClick={openEdit}
        emptyText="Không có loại quỹ nào"
      />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.Id ? 'Chỉnh sửa loại quỹ' : 'Thêm loại quỹ'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label>Tên loại quỹ <span className="text-destructive">*</span></Label>
              <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Tên loại quỹ" />
            </div>

            <div className="space-y-1">
              <Label>Thuộc</Label>
              <LookupSelect endpoint="fundtype/filter-simple" placeholder="Không thuộc quỹ nào"
                value={form.Parent} onChange={v => setForm(f => ({ ...f, Parent: v }))} />
            </div>

            <div className="space-y-1">
              <Label>Mục đích</Label>
              <div className="flex gap-2">
                {FUND_TYPE_KIND.map(k => (
                  <button key={k.value} type="button" onClick={() => setForm(f => ({ ...f, Type: k.value }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      form.Type === k.value ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Ngân hàng</Label>
              <LookupSelect endpoint="bank/filter-simple" placeholder="Chọn ngân hàng"
                value={form.Bank} onChange={v => setForm(f => ({ ...f, Bank: v }))}
                subtitle={b => b.Code as string | undefined} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Số tài khoản</Label>
                <Input value={form.AccountNumber ?? ''} onChange={e => setForm(f => ({ ...f, AccountNumber: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Người thụ hưởng</Label>
                <Input value={form.AccountName ?? ''} onChange={e => setForm(f => ({ ...f, AccountName: e.target.value }))} />
              </div>
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

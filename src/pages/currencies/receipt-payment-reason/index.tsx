import { useEffect, useState } from 'react'
import { FileText, Plus, MoreHorizontal, Trash2, Check, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  useFilterReportQuery, useLazyGenericGetQuery, useGenericPostMutation,
} from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, PAGE_SIZE } from '@/pages/actives/shared'
import { StatusBadge } from '@/components/ui/status-badge'
import { getImageUrl } from '@/utils/common'
import { buildModelFormData } from '@/utils/multipart'

const STATUS = { ACTIVE: 0, LOCKED: 1, DELETED: 2 } as const

/** Radio in pos_web — 0 is an outgoing reason, 1 an incoming one. */
const REASON_TYPE = [
  { value: 0, label: 'Chi' },
  { value: 1, label: 'Thu' },
]

interface TReason {
  Id?: number
  Name?: string
  Type?: number
  Note?: string
  Image?: { Id?: number; Url?: string } | null
  Status?: { Id?: number; Name?: string }
}

const EMPTY = (): TReason => ({ Name: '', Type: 0, Note: '', Image: null })

function errMsg(e: any) {
  return e?.data?.Errors?.[0]?.Message || e?.data?.Message || 'Không thể xử lý yêu cầu'
}

export default function ReceiptPaymentReasonPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [typeFilter, setTypeFilter] = useState<number | ''>('')
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | undefined>()
  const [form, setForm] = useState<TReason>(EMPTY())
  const [file, setFile] = useState<File | null>(null)

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'receiptpaymentreason/filter',
    params: {
      Keyword: keyword || undefined, PageIndex: page - 1, PageSize: pageSize,
      Type: typeFilter === '' ? undefined : typeFilter,
    },
  })
  const [fetchDetail] = useLazyGenericGetQuery()
  const [request, { isLoading: saving }] = useGenericPostMutation()

  const items = (data?.Items ?? []) as TReason[]
  const total = data?.TotalItemCount ?? 0

  useEffect(() => {
    if (!modal) return
    if (!editId) { setForm(EMPTY()); setFile(null); return }
    fetchDetail({ url: 'receiptpaymentreason/detail', params: { id: editId } })
      .unwrap()
      .then(res => { setForm({ ...EMPTY(), ...((res?.Data ?? {}) as TReason) }); setFile(null) })
      .catch(e => toast.error(errMsg(e)))
  }, [modal, editId, fetchDetail])

  const openCreate = () => { setEditId(undefined); setModal(true) }
  const openEdit = (row: TReason) => { if (row.Id) { setEditId(row.Id); setModal(true) } }

  const changeStatus = async (row: TReason, statusId: number) => {
    if (!row.Id) return
    if (statusId === STATUS.DELETED && !window.confirm('Xoá lý do này?')) return
    try {
      await request({ url: `receiptpaymentreason/update-status?id=${row.Id}&statusId=${statusId}`, method: 'POST', body: {} }).unwrap()
      toast.success('Lưu thành công')
      refetch()
    } catch (e) { toast.error(errMsg(e)) }
  }

  const handleSave = async () => {
    if (!form.Name?.trim()) { toast.error('Vui lòng nhập tên lý do'); return }
    try {
      await request({
        url: form.Id ? 'receiptpaymentreason/update' : 'receiptpaymentreason/create',
        method: 'POST',
        body: buildModelFormData(form, [file]),
      }).unwrap()
      toast.success(form.Id ? 'Đã cập nhật' : 'Đã thêm lý do')
      setModal(false)
      refetch()
    } catch (e) { toast.error(errMsg(e)) }
  }

  const columns: ColumnDef<TReason>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    {
      id: 'icon', header: '',
      cell: ({ row }) => {
        const url = getImageUrl(row.original.Image?.Url ?? undefined)
        return url
          ? <img src={url} alt="" className="h-8 w-8 rounded-md border object-cover" />
          : <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted"><FileText className="h-4 w-4 text-muted-foreground/60" /></div>
      },
    },
    { id: 'name', header: 'Tên lý do', cell: ({ row }) => <span className="font-medium">{row.original.Name}</span> },
    {
      id: 'type', header: 'Loại',
      cell: ({ row }) => (
        <span className={`text-xs font-medium ${row.original.Type === 1 ? 'text-emerald-600' : 'text-red-600'}`}>
          {REASON_TYPE.find(t => t.value === row.original.Type)?.label ?? '—'}
        </span>
      ),
    },
    { id: 'note', header: 'Ghi chú', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.Note || '—'}</span> },
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
      <ListPageHeader title="Lý do thu chi" icon={FileText}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm lý do..." />
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Tất cả loại</option>
          {REASON_TYPE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <Button size="sm" className="h-8" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm lý do
        </Button>
      </ListPageHeader>

      <DataTable
        columns={columns} data={items} loading={isLoading} total={total}
        page={page} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={setPage}
        onRowDoubleClick={openEdit}
        emptyText="Không có lý do nào"
      />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.Id ? 'Chỉnh sửa lý do' : 'Thêm lý do thu chi'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tên lý do <span className="text-destructive">*</span></Label>
              <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Tên lý do thu chi" />
            </div>

            <div className="space-y-1">
              <Label>Loại</Label>
              <div className="flex gap-2">
                {REASON_TYPE.map(t => (
                  <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, Type: t.value }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      form.Type === t.value ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Biểu tượng</Label>
              <Input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
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

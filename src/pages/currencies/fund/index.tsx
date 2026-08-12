import { useEffect, useState } from 'react'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { Wallet, Plus, MoreHorizontal, Trash2, Check, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
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
import { MoneyTag, VoucherTag } from '@/components/ui/data-tag'
import { LookupSelect, type LookupItem } from '@/components/pos/lookup-select'
import dayjs from 'dayjs'

const STATUS = { ACTIVE: 0, LOCKED: 1, DELETED: 2 } as const

/**
 * "Quỹ" is a transfer voucher, not a named account: it moves an amount from one
 * fund type to another. Name is the server-generated voucher number.
 */
interface TFund {
  Id?: number
  Name?: string
  Date?: string
  Amount?: number
  Detail?: string
  Note?: string
  FundTypeFrom?: LookupItem | null
  FundTypeTo?: LookupItem | null
  Status?: { Id?: number; Name?: string }
}

const EMPTY = (): TFund => ({
  Name: '', Date: dayjs().format('YYYY-MM-DD'), Amount: 0,
  Detail: '', Note: '', FundTypeFrom: null, FundTypeTo: null,
})

function errMsg(e: any) {
  return e?.data?.Errors?.[0]?.Message || e?.data?.Message || 'Không thể xử lý yêu cầu'
}

export default function FundPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | undefined>()
  const [form, setForm] = useState<TFund>(EMPTY())

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'fund/filter',
    params: { Keyword: keyword || undefined, PageIndex: page - 1, PageSize: pageSize },
  })
  const [fetchDetail] = useLazyGenericGetQuery()
  const [request, { isLoading: saving }] = useGenericPostMutation()

  const items = (data?.Items ?? []) as TFund[]
  const total = data?.TotalItemCount ?? 0

  // Always refetch on edit — list rows omit Detail and other fields.
  useEffect(() => {
    if (!modal) return
    if (!editId) { setForm(EMPTY()); return }
    fetchDetail({ url: 'fund/detail', params: { id: editId } })
      .unwrap()
      .then(res => {
        const d = (res?.Data ?? {}) as TFund
        setForm({ ...EMPTY(), ...d, Date: d.Date ? dayjs(d.Date).format('YYYY-MM-DD') : EMPTY().Date })
      })
      .catch(e => toast.error(errMsg(e)))
  }, [modal, editId, fetchDetail])

  const openCreate = () => { setEditId(undefined); setModal(true) }
  const openEdit = (row: TFund) => { if (row.Id) { setEditId(row.Id); setModal(true) } }

  const changeStatus = async (row: TFund, statusId: number) => {
    if (!row.Id) return
    if (statusId === STATUS.DELETED && !await confirmAction({ description: 'Xoá phiếu chuyển quỹ này?' })) return
    try {
      await request({ url: `fund/update-status?id=${row.Id}&statusId=${statusId}`, method: 'POST', body: {} }).unwrap()
      toast.success('Lưu thành công')
      refetch()
    } catch (e) { toast.error(errMsg(e)) }
  }

  const handleSave = async () => {
    if (!form.FundTypeFrom?.Id) { toast.error('Vui lòng chọn quỹ nguồn'); return }
    if (!form.FundTypeTo?.Id) { toast.error('Vui lòng chọn quỹ đích'); return }
    if (form.FundTypeFrom.Id === form.FundTypeTo.Id) { toast.error('Quỹ nguồn và quỹ đích phải khác nhau'); return }
    if (!Number(form.Amount)) { toast.error('Vui lòng nhập số tiền'); return }
    try {
      await request({
        url: form.Id ? 'fund/update' : 'fund/create',
        method: 'POST',
        body: buildModelFormData({ ...form, Amount: Number(form.Amount) || 0 }),
      }).unwrap()
      toast.success(form.Id ? 'Đã cập nhật' : 'Đã thêm phiếu chuyển quỹ')
      setModal(false)
      refetch()
    } catch (e) { toast.error(errMsg(e)) }
  }

  const columns: ColumnDef<TFund>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'name', header: 'Số phiếu', cell: ({ row }) => <VoucherTag value={row.original.Name} /> },
    {
      id: 'date', header: 'Ngày',
      cell: ({ row }) => <span className="text-xs">{row.original.Date ? dayjs(row.original.Date).format('DD/MM/YYYY') : '—'}</span>,
    },
    { id: 'from', header: 'Từ quỹ', cell: ({ row }) => <span>{row.original.FundTypeFrom?.Name ?? '—'}</span> },
    { id: 'to', header: 'Đến quỹ', cell: ({ row }) => <span>{row.original.FundTypeTo?.Name ?? '—'}</span> },
    { id: 'amount', header: 'Số tiền', cell: ({ row }) => <MoneyTag value={row.original.Amount} /> },
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
      <ListPageHeader title="Chuyển quỹ" icon={Wallet}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm số phiếu..." />
        <Button size="sm" className="h-8" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm phiếu
        </Button>
      </ListPageHeader>

      <DataTable
        columns={columns} data={items} loading={isLoading} total={total}
        page={page} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={setPage}
        onRowDoubleClick={openEdit}
        emptyText="Không có phiếu chuyển quỹ nào"
      />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.Id ? 'Chỉnh sửa phiếu chuyển quỹ' : 'Thêm phiếu chuyển quỹ'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Ngày</Label>
                <Input type="date" value={form.Date ?? ''} onChange={e => setForm(f => ({ ...f, Date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Số phiếu</Label>
                <Input value={form.Name ?? ''} disabled placeholder="Tự động" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Từ quỹ <span className="text-destructive">*</span></Label>
                <LookupSelect endpoint="fundtype/filter-simple" placeholder="Chọn quỹ nguồn"
                  value={form.FundTypeFrom} onChange={v => setForm(f => ({ ...f, FundTypeFrom: v }))} />
              </div>
              <div className="space-y-1">
                <Label>Đến quỹ <span className="text-destructive">*</span></Label>
                <LookupSelect endpoint="fundtype/filter-simple" placeholder="Chọn quỹ đích"
                  value={form.FundTypeTo} onChange={v => setForm(f => ({ ...f, FundTypeTo: v }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Số tiền <span className="text-destructive">*</span></Label>
              <NumberInput min={0} max={999999999} value={form.Amount ?? 0}
                onChange={v => setForm(f => ({ ...f, Amount: v }))} />
            </div>

            <div className="space-y-1">
              <Label>Diễn giải</Label>
              <Input value={form.Detail ?? ''} onChange={e => setForm(f => ({ ...f, Detail: e.target.value }))} />
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

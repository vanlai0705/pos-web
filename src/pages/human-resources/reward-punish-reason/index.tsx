import { useMemo, useRef, useState } from 'react'
import { Check, Edit2, ImagePlus, ListChecks, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useFilterReportQuery, useGenericPostMutation, useLazyGenericGetQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, StatusBadge, PAGE_SIZE } from '@/pages/actives/shared'
import { Textarea } from '@/components/ui/textarea'
import { PosImage } from '@/components/ui/pos-image'
import { cn } from '@/utils'
import { buildModelFormData } from '@/utils/multipart'

const REWARD_TYPE = 0
const PUNISH_TYPE = 1
const STATUS_DELETED = 2

interface TRPReason {
  Id?: number
  Name?: string
  Note?: string
  Type?: number
  Image?: { Id?: number; Url?: string }
  Status?: { Id?: number; Name?: string }
}

const EMPTY = (): TRPReason => ({ Name: '', Note: '', Type: REWARD_TYPE })

function getDetailData(result: any) {
  return (result?.Data ?? result ?? {}) as TRPReason
}

export default function RewardPunishReasonPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TRPReason>(EMPTY())
  const [imageFile, setImageFile] = useState<File | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'rewardpunishreasons/filter',
    params: { Keyword: keyword || undefined, PageIndex: page - 1, PageSize: pageSize },
  })

  const [request, { isLoading: saving }] = useGenericPostMutation()
  const [getDetail] = useLazyGenericGetQuery()

  const items = (data?.Items ?? []) as TRPReason[]
  const total = data?.TotalItemCount ?? 0
  const previewImage = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : null, [imageFile])

  const closeModal = () => {
    setModal(false)
    setForm(EMPTY())
    setImageFile(null)
  }

  const openCreate = () => {
    setForm(EMPTY())
    setImageFile(null)
    setModal(true)
  }

  const openEdit = async (item: TRPReason) => {
    setImageFile(null)
    setForm({ ...EMPTY(), ...item })
    setModal(true)
    if (!item.Id) return
    try {
      const result = await getDetail({ url: 'rewardpunishreasons/detail', params: { id: item.Id } }, true).unwrap()
      setForm({ ...EMPTY(), ...getDetailData(result) })
    } catch {
      toast.error('Không thể tải chi tiết lý do')
    }
  }

  const saveReason = async () => {
    if (!form.Name?.trim()) {
      toast.error('Vui lòng nhập tên lý do')
      return
    }

    const payload: TRPReason = {
      ...form,
      Name: form.Name.trim(),
      Note: form.Note || '',
      Type: Number(form.Type ?? REWARD_TYPE),
      Image: form.Image,
    }

    try {
      await request({
        url: payload.Id ? 'rewardpunishreasons/update' : 'rewardpunishreasons/create',
        method: 'POST',
        body: buildModelFormData(payload, [imageFile]),
      }).unwrap()
      toast.success(payload.Id ? 'Đã cập nhật lý do' : 'Đã thêm lý do')
      closeModal()
      refetch()
    } catch {
      toast.error('Không thể lưu lý do thưởng phạt')
    }
  }

  const deleteReason = async (item: TRPReason) => {
    if (!item.Id) return
    try {
      await request({
        url: `rewardpunishreasons/update-status?id=${item.Id}&statusId=${STATUS_DELETED}`,
        method: 'POST',
        body: {},
      }).unwrap()
      toast.success('Đã xóa lý do')
      refetch()
    } catch {
      toast.error('Không thể xóa lý do')
    }
  }

  const columns: ColumnDef<TRPReason>[] = [
    { id: 'stt', header: 'STT', meta: { className: 'w-14 text-center' }, cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    {
      id: 'name',
      header: 'Tên',
      cell: ({ row }) => (
        <div className="flex min-w-[220px] items-center gap-2">
          <PosImage url={row.original.Image?.Url} alt="" className="h-8 w-8 rounded-md border" />
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-800">{row.original.Name}</div>
            {row.original.Note ? <div className="truncate text-xs text-muted-foreground">{row.original.Note}</div> : null}
          </div>
        </div>
      ),
    },
    {
      id: 'reward',
      header: 'Thưởng',
      meta: { className: 'w-24 text-center' },
      cell: ({ row }) => Number(row.original.Type) === REWARD_TYPE ? <Check className="mx-auto h-4 w-4 text-emerald-600" /> : null,
    },
    {
      id: 'punish',
      header: 'Phạt',
      meta: { className: 'w-24 text-center' },
      cell: ({ row }) => Number(row.original.Type) === PUNISH_TYPE ? <Check className="mx-auto h-4 w-4 text-rose-600" /> : null,
    },
    { id: 'status', header: 'TT', meta: { className: 'w-28 text-center' }, cell: ({ row }) => <StatusBadge status={row.original.Status} /> },
    {
      id: 'actions', header: 'Thao tác',
      meta: { className: 'w-24 text-right' },
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)} title="Sửa">
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteReason(item)} title="Xóa">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Lý do khen thưởng & kỷ luật" icon={ListChecks}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm lý do..." />
        <Button size="sm" className="h-8" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm
        </Button>
      </ListPageHeader>

      <DataTable columns={columns} data={items} loading={isLoading} total={total} page={page} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={setPage} emptyText="Không có lý do nào" />

      <Dialog open={modal} onOpenChange={open => open ? setModal(true) : closeModal()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.Id ? 'Chỉnh sửa lý do' : 'Thêm lý do'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Tên lý do <span className="text-destructive">*</span></Label>
                <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Tên lý do" />
              </div>
              <div className="space-y-1.5">
                <Label>Loại</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: REWARD_TYPE, label: 'Thưởng', className: 'data-[active=true]:border-emerald-500 data-[active=true]:bg-emerald-50 data-[active=true]:text-emerald-700' },
                    { value: PUNISH_TYPE, label: 'Phạt', className: 'data-[active=true]:border-rose-500 data-[active=true]:bg-rose-50 data-[active=true]:text-rose-700' },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      data-active={Number(form.Type ?? REWARD_TYPE) === option.value}
                      className={cn('h-10 rounded-md border text-sm font-medium transition-colors hover:bg-muted/60', option.className)}
                      onClick={() => setForm(f => ({ ...f, Type: option.value }))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Ghi chú</Label>
                <Textarea value={form.Note ?? ''} onChange={e => setForm(f => ({ ...f, Note: e.target.value }))} rows={4} placeholder="Ghi chú" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hình ảnh</Label>
              <button
                type="button"
                className="flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/20 text-muted-foreground transition-colors hover:bg-muted/40"
                onClick={() => imageInputRef.current?.click()}
              >
                {previewImage ? (
                  <img src={previewImage} alt="" className="h-full w-full object-cover" />
                ) : form.Image?.Url ? (
                  <PosImage url={form.Image.Url} alt="" className="h-full w-full rounded-lg" />
                ) : (
                  <>
                    <ImagePlus className="h-7 w-7" />
                    <span className="mt-2 text-xs">Chọn ảnh</span>
                  </>
                )}
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
              {imageFile ? <Button type="button" variant="outline" className="w-full" onClick={() => setImageFile(null)}>Xóa ảnh mới</Button> : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Huỷ</Button>
            <Button onClick={saveReason} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useState } from 'react'
import { Tag, Plus, MoreHorizontal, Check, Lock, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useFilterReportQuery, useGenericPostMutation } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, StatusBadge, PAGE_SIZE, defaultDateFrom, defaultDateTo, DateRangeFilter } from '@/pages/actives/shared'
import { CodeTag } from '@/components/ui/data-tag'
import { PromotionDialog } from '@/components/pos/promotion-dialog'

const STATUS = { ACTIVE: 0, LOCKED: 1, DELETED: 2 } as const

interface TPromotion {
  Id?: number
  Name?: string
  Code?: string
  DateFrom?: string
  DateTo?: string
  Type?: number
  Priority?: number
  Status?: { Id?: number; Name?: string }
}

interface Props {
  type: number
  title: string
}

function errMsg(e: any) {
  return e?.data?.Errors?.[0]?.Message || e?.data?.Message || 'Không thể xử lý yêu cầu'
}

export default function PromotionListPage({ type, title }: Props) {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())

  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | undefined>()

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'promotions/filter',
    params: { Keyword: keyword || undefined, DateFrom: dateFrom, DateTo: dateTo, Type: type, PageIndex: page - 1, PageSize: pageSize },
  })
  const [request] = useGenericPostMutation()

  const items = (data?.Items ?? []) as TPromotion[]
  const total = data?.TotalItemCount ?? 0

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'

  const openCreate = () => { setEditId(undefined); setModal(true) }
  const openEdit = (row: TPromotion) => { if (row.Id) { setEditId(row.Id); setModal(true) } }

  const changeStatus = async (row: TPromotion, statusId: number) => {
    if (!row.Id) return
    if (statusId === STATUS.DELETED && !window.confirm('Xoá chương trình này?')) return
    try {
      await request({ url: `promotions/update-status?id=${row.Id}&statusId=${statusId}`, method: 'POST', body: {} }).unwrap()
      toast.success('Lưu thành công')
      refetch()
    } catch (e) { toast.error(errMsg(e)) }
  }

  const columns: ColumnDef<TPromotion>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'code', header: 'Mã', cell: ({ row }) => <CodeTag value={row.original.Code} /> },
    { id: 'name', header: 'Tên chương trình', cell: ({ row }) => <span className="font-medium">{row.original.Name ?? '—'}</span> },
    { id: 'from', header: 'Từ ngày', cell: ({ row }) => <span className="text-xs">{fmtDate(row.original.DateFrom)}</span> },
    { id: 'to', header: 'Đến ngày', cell: ({ row }) => <span className="text-xs">{fmtDate(row.original.DateTo)}</span> },
    { id: 'priority', header: 'Ưu tiên', cell: ({ row }) => <span className="text-xs">{row.original.Priority ?? 0}</span> },
    { id: 'status', header: 'Trạng thái', cell: ({ row }) => <StatusBadge status={row.original.Status} /> },
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
                  <Check className="h-3.5 w-3.5 mr-2 text-green-600" /> Áp dụng
                </DropdownMenuItem>
              )}
              {r.Status?.Id !== STATUS.LOCKED && (
                <DropdownMenuItem onClick={() => changeStatus(r, STATUS.LOCKED)}>
                  <Lock className="h-3.5 w-3.5 mr-2 text-yellow-600" /> Ngừng áp dụng
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
      <ListPageHeader title={title} icon={Tag}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm chương trình..." />
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={v => { setDateFrom(v); setPage(1) }} onTo={v => { setDateTo(v); setPage(1) }} />
        <Button size="sm" className="h-8" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm chương trình
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
        onRowDoubleClick={openEdit}
        emptyText={`Không có chương trình ${title.toLowerCase()} nào`}
      />

      <PromotionDialog
        open={modal} onOpenChange={setModal}
        type={type} title={title} editId={editId}
        onSaved={refetch}
      />
    </div>
  )
}

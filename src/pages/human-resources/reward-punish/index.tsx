import { useState } from 'react'
import { Award, Plus, Check, Lock, Trash2, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/ui/status-badge'
import { MoneyTag, VoucherTag } from '@/components/ui/data-tag'
import { useFilterReportQuery, useGenericPostMutation } from '@/store/slice/users/api/api'
import { RewardPunishDialog, REWARD_PUNISH_TYPE } from '@/components/pos/reward-punish-dialog'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import {
  ListPageHeader, SearchBar, DateRangeFilter, PAGE_SIZE,
  defaultDateFrom, defaultDateTo,
} from '@/pages/actives/shared'
import dayjs from 'dayjs'

const STATUS = { ACTIVE: 0, LOCKED: 1, DELETED: 2 } as const

interface TLookup { Id?: number; Name?: string }

interface TRewardPunish {
  Id?: number
  Name?: string
  /** The employee — the API calls this User, not Member */
  User?: TLookup
  Date?: string
  RewardPunishReason?: TLookup
  Amount?: number
  Type?: number
  Note?: string
  Status?: { Id?: number; Name?: string }
}

function errMsg(e: any) {
  return e?.data?.Errors?.[0]?.Message || e?.data?.Message || 'Không thể xử lý yêu cầu'
}

export default function RewardPunishPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())

  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | undefined>()

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'rewardpunishs/filter',
    params: {
      Keyword: keyword || undefined, DateFrom: dateFrom, DateTo: dateTo,
      PageIndex: page - 1, PageSize: pageSize,
    },
  })
  const [request] = useGenericPostMutation()

  const items = (data?.Items ?? []) as TRewardPunish[]
  const total = data?.TotalItemCount ?? 0

  const openCreate = () => { setEditId(undefined); setModal(true) }
  const openEdit = (row: TRewardPunish) => { if (row.Id) { setEditId(row.Id); setModal(true) } }

  const changeStatus = async (row: TRewardPunish, statusId: number) => {
    if (!row.Id) return
    if (statusId === STATUS.DELETED && !window.confirm('Xoá phiếu này?')) return
    try {
      await request({ url: `rewardpunishs/update-status?id=${row.Id}&statusId=${statusId}`, method: 'POST', body: {} }).unwrap()
      toast.success('Lưu thành công')
      refetch()
    } catch (e) { toast.error(errMsg(e)) }
  }

  const columns: ColumnDef<TRewardPunish>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'name', header: 'Số phiếu', cell: ({ row }) => <VoucherTag value={row.original.Name} /> },
    { id: 'user', header: 'Nhân viên', cell: ({ row }) => <span className="font-medium">{row.original.User?.Name || '—'}</span> },
    {
      id: 'date', header: 'Ngày tạo',
      cell: ({ row }) => <span className="text-xs">{row.original.Date ? dayjs(row.original.Date).format('DD/MM/YYYY') : '—'}</span>,
    },
    { id: 'amount', header: 'Số tiền', cell: ({ row }) => <MoneyTag value={row.original.Amount} /> },
    {
      id: 'type', header: 'Loại',
      cell: ({ row }) => (
        <span className={`text-xs font-medium ${row.original.Type === REWARD_PUNISH_TYPE.REWARD ? 'text-emerald-600' : 'text-red-600'}`}>
          {row.original.Type === REWARD_PUNISH_TYPE.REWARD ? 'Thưởng' : 'Phạt'}
        </span>
      ),
    },
    { id: 'reason', header: 'Lý do', cell: ({ row }) => <span className="text-sm">{row.original.RewardPunishReason?.Name || '—'}</span> },
    { id: 'status', header: 'Trạng thái', cell: ({ row }) => <StatusBadge statusId={row.original.Status?.Id} label={row.original.Status?.Name} /> },
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
      <ListPageHeader title="Khen thưởng & Kỷ luật" icon={Award}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm phiếu..." />
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={v => { setDateFrom(v); setPage(1) }} onTo={v => { setDateTo(v); setPage(1) }} />
        <Button size="sm" className="h-8" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm phiếu
        </Button>
      </ListPageHeader>

      <DataTable
        columns={columns} data={items} loading={isLoading} total={total}
        page={page} pageSize={pageSize}
        onPageChange={setPage} onPageSizeChange={setPageSize}
        onRowDoubleClick={openEdit}
        emptyText="Không có phiếu khen thưởng / kỷ luật nào"
      />

      <RewardPunishDialog open={modal} onOpenChange={setModal} editId={editId} onSaved={refetch} />
    </div>
  )
}

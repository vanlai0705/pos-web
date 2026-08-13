import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/ui/number-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Textarea } from '@/components/ui/textarea'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { STATUS } from '@/constants/status'
import { ListPageHeader, PAGE_SIZE, SearchBar } from '@/pages/actives/shared'
import { useFilterReportQuery, useGenericPostMutation, useLazyGenericGetQuery } from '@/store/slice/generic/api'
import { useGetSalaryTypesQuery } from '@/store/slice/human-resources/api'
import { buildModelFormData } from '@/utils/multipart'
import { Banknote, Check, Lock, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { LookupSelect, type LookupItem } from '@/components/pos/lookup-select'

/** Per-employee salary settings the sheet copies from the member record. */
interface TUserSalary {
  SalaryType?: number
  Salary?: number
  IsOffSaturday?: boolean
  IsOffSunday?: boolean
}

interface TSalary {
  Id?: number
  Month?: number
  Year?: number
  Type?: number
  SalaryTypeName?: string
  User?: LookupItem | null
  Shift?: LookupItem | null
  UserSalary?: TUserSalary
  /** Day numbers within the month that were worked */
  WorkingDays?: number[]
  Note?: string
  Status?: { Id?: number; Name?: string }
}

function emptySalary(): TSalary {
  const now = dayjs()
  return {
    Month: now.month() + 1,
    Year: now.year(),
    User: null,
    Shift: null,
    UserSalary: { SalaryType: 0, Salary: 0, IsOffSaturday: false, IsOffSunday: true },
    WorkingDays: [],
    Note: '',
  }
}

function errMsg(e: any) {
  return e?.data?.Errors?.[0]?.Message || e?.data?.Message || 'Không thể xử lý yêu cầu'
}

/** Month grid of toggleable day numbers — WorkingDays holds day-of-month values. */
function WorkingDayCalendar({
  month, year, value, onChange,
}: { month: number; year: number; value: number[]; onChange: (days: number[]) => void }) {
  const first = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
  const daysInMonth = first.daysInMonth()
  // Monday-first grid, matching the Angular calendar.
  const lead = (first.day() + 6) % 7
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const toggle = (d: number) =>
    onChange(value.includes(d) ? value.filter(x => x !== d) : [...value, d].sort((a, b) => a - b))

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => d === null
          ? <div key={`x${i}`} />
          : (
            <button key={d} type="button" onClick={() => toggle(d)}
              className={`h-8 rounded-md border text-xs font-medium transition-colors ${
                value.includes(d) ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
              {d}
            </button>
          ))}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">Đã chọn {value.length} ngày công</p>
    </div>
  )
}

export default function SalariesPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | undefined>()
  const [form, setForm] = useState<TSalary>(emptySalary())

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'salary/filter',
    params: { Keyword: keyword || undefined, PageIndex: page - 1, PageSize: pageSize },
  })
  const [fetchDetail] = useLazyGenericGetQuery()
  const [fetchUserSalary] = useLazyGenericGetQuery()
  const [request, { isLoading: saving }] = useGenericPostMutation()
  const { data: salaryTypes = [] } = useGetSalaryTypesQuery()

  const items = (data?.Items ?? []) as TSalary[]
  const total = data?.TotalItemCount ?? 0

  useEffect(() => {
    if (!modal) return
    if (!editId) { setForm(emptySalary()); return }
    fetchDetail({ url: 'salary/detail', params: { id: editId } })
      .unwrap()
      .then(res => {
        const d = (res?.Data ?? {}) as TSalary
        setForm({ ...emptySalary(), ...d, UserSalary: { ...emptySalary().UserSalary, ...(d.UserSalary ?? {}) } })
      })
      .catch(e => toast.error(errMsg(e)))
  }, [modal, editId, fetchDetail])

  /** Picking an employee pulls their configured salary, like Angular does. */
  const pickUser = async (u: LookupItem | null) => {
    setForm(f => ({ ...f, User: u }))
    if (!u?.Id) return
    try {
      const res = await fetchUserSalary({ url: 'users/get-user-salary', params: { userId: u.Id } }).unwrap()
      const s = (res?.Data ?? {}) as TUserSalary
      setForm(f => ({ ...f, UserSalary: { ...(f.UserSalary ?? {}), ...s } }))
    } catch { /* keep whatever is already in the form */ }
  }

  const setUserSalary = (patch: Partial<TUserSalary>) =>
    setForm(f => ({ ...f, UserSalary: { ...(f.UserSalary ?? {}), ...patch } }))

  const openCreate = () => { setEditId(undefined); setModal(true) }
  const openEdit = (row: TSalary) => { if (row.Id) { setEditId(row.Id); setModal(true) } }

  const changeStatus = async (row: TSalary, statusId: number) => {
    if (!row.Id) return
    if (statusId === STATUS.DELETED && !await confirmAction({ description: 'Xoá bảng lương này?' })) return
    try {
      await request({ url: `salary/update-status?id=${row.Id}&statusId=${statusId}`, method: 'POST', body: {} }).unwrap()
      toast.success('Lưu thành công')
      refetch()
    } catch (e) { toast.error(errMsg(e)) }
  }

  const handleSave = async () => {
    if (!form.User?.Id) { toast.error('Vui lòng chọn nhân viên'); return }
    try {
      await request({
        url: form.Id ? 'salary/update' : 'salary/create',
        method: 'POST',
        body: buildModelFormData({ ...form, Month: Number(form.Month), Year: Number(form.Year) }),
      }).unwrap()
      toast.success(form.Id ? 'Đã cập nhật bảng lương' : 'Đã tạo bảng lương')
      setModal(false)
      refetch()
    } catch (e) { toast.error(errMsg(e)) }
  }

  const columns: ColumnDef<TSalary>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    {
      id: 'user', header: 'Nhân viên',
      cell: ({ row }) => <span className="font-medium">{(row.original.User?.FullName as string) || row.original.User?.Name || '—'}</span>,
    },
    { id: 'shift', header: 'Ca làm việc', cell: ({ row }) => <span className="text-xs">{row.original.Shift?.Name || '—'}</span> },
    { id: 'period', header: 'Kỳ lương', cell: ({ row }) => <span className="tabular-nums">{row.original.Month}/{row.original.Year}</span> },
    { id: 'salaryType', header: 'Loại lương', cell: ({ row }) => <span className="text-xs">{row.original.SalaryTypeName || '—'}</span> },
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
      <ListPageHeader title="Chấm công" icon={Banknote}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm nhân viên..." />
        <Button size="sm" className="h-8" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm bảng lương
        </Button>
      </ListPageHeader>

      <DataTable
        columns={columns} data={items} loading={isLoading} total={total}
        page={page} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={setPage}
        onRowDoubleClick={openEdit}
        emptyText="Không có bảng lương nào"
      />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{form.Id ? 'Chỉnh sửa bảng lương' : 'Thêm bảng lương'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 max-h-[70vh] overflow-y-auto pr-1 md:grid-cols-2">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nhân viên <span className="text-destructive">*</span></Label>
                <LookupSelect endpoint="users/filter-simple" placeholder="Chọn nhân viên"
                  value={form.User} onChange={pickUser} />
              </div>

              <div className="space-y-1">
                <Label>Ca làm việc</Label>
                <LookupSelect endpoint="shift/filter-simple" placeholder="Chọn ca"
                  value={form.Shift} onChange={v => setForm(f => ({ ...f, Shift: v }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tháng</Label>
                  <Select value={String(form.Month ?? 1)} onValueChange={v => setForm(f => ({ ...f, Month: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <SelectItem key={m} value={String(m)}>Tháng {m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Năm</Label>
                  <NumberInput value={form.Year ?? 0} onChange={v => setForm(f => ({ ...f, Year: v }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Loại lương</Label>
                  <Select value={String(form.UserSalary?.SalaryType ?? 0)} onValueChange={v => setUserSalary({ SalaryType: Number(v) })}>
                    <SelectTrigger><SelectValue placeholder="Chọn loại lương" /></SelectTrigger>
                    <SelectContent>
                      {salaryTypes.map(t => <SelectItem key={t.Value} value={String(t.Value)}>{t.Name ?? t.Detail}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Lương</Label>
                  <NumberInput min={0} value={form.UserSalary?.Salary ?? 0}
                    onChange={v => setUserSalary({ Salary: v })} />
                </div>
              </div>

              <div className="flex gap-4">
                {([['IsOffSaturday', 'Nghỉ thứ 7'], ['IsOffSunday', 'Nghỉ chủ nhật']] as const).map(([k, label]) => (
                  <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" className="h-3.5 w-3.5 rounded border-input"
                      checked={!!form.UserSalary?.[k]} onChange={e => setUserSalary({ [k]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>

              <div className="space-y-1">
                <Label>Ghi chú</Label>
                <Textarea rows={2} value={form.Note ?? ''} onChange={e => setForm(f => ({ ...f, Note: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Lịch công</Label>
              <div className="rounded-lg border p-3">
                <WorkingDayCalendar
                  month={form.Month ?? 1} year={form.Year ?? dayjs().year()}
                  value={form.WorkingDays ?? []}
                  onChange={days => setForm(f => ({ ...f, WorkingDays: days }))}
                />
              </div>
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

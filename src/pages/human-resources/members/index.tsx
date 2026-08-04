import { useCallback, useMemo, useState } from 'react'
import { UserCheck, Plus, Lock, Check, Trash2, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { toast } from 'sonner'
import {
  useFilterMembersQuery,
  useLazyGetMemberDetailQuery,
  useSaveMemberMutation,
  useUpdateMemberStatusMutation,
  useLazyGetAccountByMemberQuery,
  useSaveAccountMutation,
  useGetShopsSimpleQuery,
  useGetUserGroupsQuery,
  useGetSalaryTypesQuery,
} from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, PAGE_SIZE } from '@/pages/actives/shared'
import type {
  TPosMember, TPosUserAccount, TPosAccountUserGroup,
} from '@/store/slice/users/types/pos-types'
import { computePasswordSalt } from '@/utils/crypto'

// Mirrors STATUS in the Angular app — note 0 (not 1) is the active state.
const STATUS = { ACTIVE: 0, LOCKED: 1, DELETED: 2 } as const

const WEEK_DAYS = [
  { key: 'IsMonday', label: 'T2' },
  { key: 'IsTuesday', label: 'T3' },
  { key: 'IsWednesday', label: 'T4' },
  { key: 'IsThursday', label: 'T5' },
  { key: 'IsFriday', label: 'T6' },
  { key: 'IsSaturday', label: 'T7' },
  { key: 'IsSunday', label: 'CN' },
] as const

function emptyMember(): TPosMember {
  return {
    Name: '', Surname: '', Phone: '', Email: '', Shops: [], Image: null,
    UserInfo: {
      Address: '', Note: '', SalaryType: 0, Salary: 0,
      IsMonday: true, IsTuesday: true, IsWednesday: true, IsThursday: true,
      IsFriday: true, IsSaturday: true, IsSunday: false,
    },
  }
}

function emptyAccount(): TPosUserAccount {
  return { Id: 0, UserName: '', PasswordSalt: '', Password: '', ConfirmPassword: '', Member: null, UserGroups: [] }
}

/** Suggests a login name from the member's full name, stripping diacritics. */
function defaultUserName(m: TPosMember) {
  return `${m.Surname ?? ''}${m.Name ?? ''}`
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * The API returns rows shaped `{ Id, UserId, UserGroup: { Id, Name }, Actived }`
 * — `Id` is the join-row id, not the group, and `UserGroupId` is absent. Same
 * fallback order Angular uses.
 */
function groupIdOf(item?: TPosAccountUserGroup) {
  return Number(item?.UserGroupId || item?.UserGroup?.Id || 0)
}

export default function MembersPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [statusId, setStatusId] = useState<number | ''>('')

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TPosMember>(emptyMember())
  const [account, setAccount] = useState<TPosUserAccount>(emptyAccount())
  const [groupId, setGroupId] = useState(0)
  const [avatar, setAvatar] = useState<File | null>(null)
  // Creating goes through two steps like Angular: profile first, then account.
  // `wizard` is sticky for the whole flow — form.Id gets set after step 1, so it
  // cannot be used to tell "creating" from "editing".
  const [wizard, setWizard] = useState(false)
  const [createStep, setCreateStep] = useState<1 | 2>(1)

  const { data, isLoading, refetch } = useFilterMembersQuery({
    PageIndex: page - 1, PageSize: pageSize,
    Keyword: keyword || undefined, StatusId: statusId,
  })
  const [loadMember] = useLazyGetMemberDetailQuery()
  const [loadAccount] = useLazyGetAccountByMemberQuery()
  const [saveMember, { isLoading: savingMember }] = useSaveMemberMutation()
  const [saveAccount, { isLoading: savingAccount }] = useSaveAccountMutation()
  const [updateStatus] = useUpdateMemberStatusMutation()
  const { data: shops = [] } = useGetShopsSimpleQuery()
  const { data: userGroups = [] } = useGetUserGroupsQuery()
  const { data: salaryTypes = [] } = useGetSalaryTypesQuery()

  const items = (data?.Items ?? []) as TPosMember[]
  const total = data?.TotalItemCount ?? 0
  const saving = savingMember || savingAccount

  const setUserInfo = useCallback(
    (patch: Partial<NonNullable<TPosMember['UserInfo']>>) =>
      setForm(f => ({ ...f, UserInfo: { ...(f.UserInfo ?? {}), ...patch } })),
    [],
  )

  const openCreate = () => {
    setForm(emptyMember()); setAccount(emptyAccount())
    setGroupId(0); setAvatar(null); setWizard(true); setCreateStep(1); setModal(true)
  }

  /** Always refetch the full record — list rows have no UserInfo/Shops/Image. */
  const openEdit = async (row: TPosMember) => {
    if (!row.Id) return
    try {
      const detail = await loadMember(row.Id).unwrap()
      const merged = { ...emptyMember(), ...(detail ?? row) }
      merged.UserInfo = { ...emptyMember().UserInfo, ...(detail?.UserInfo ?? {}) }
      setForm(merged)
      setAvatar(null)
      setWizard(false)
      setCreateStep(1)

      const acc = await loadAccount(row.Id).unwrap().catch(() => null)
      const normalized = { ...emptyAccount(), ...(acc ?? {}), Password: '', ConfirmPassword: '' }
      setAccount(normalized)
      setGroupId(groupIdOf(normalized.UserGroups?.find(g => g.Actived)))
      setModal(true)
    } catch {
      toast.error('Không lấy được chi tiết nhân viên')
    }
  }

  const changeStatus = async (id?: number, next?: number) => {
    if (!id || next == null) return
    if (next === STATUS.DELETED && !window.confirm('Xoá nhân viên này?')) return
    try {
      await updateStatus({ id, statusId: next }).unwrap()
      toast.success('Lưu thành công')
      refetch()
    } catch { toast.error('Không thể cập nhật trạng thái') }
  }

  const toggleShop = (shop: { Id?: number; Name?: string; LongName?: string }, checked: boolean) => {
    setForm(f => {
      const list = [...(f.Shops ?? [])]
      const i = list.findIndex(s => s.Id === shop.Id)
      if (checked && i < 0) list.push({ Id: shop.Id, Name: shop.Name, LongName: shop.LongName })
      if (!checked && i >= 0) list.splice(i, 1)
      return { ...f, Shops: list }
    })
  }

  /**
   * usergroup/filter only lists currently-active groups, but a member may still
   * hold one that has since been locked. Union them in, or saving would quietly
   * strip the permission they already have.
   */
  const groupOptions = useMemo(() => {
    const merged = userGroups.map(g => ({ Id: g.Id ?? 0, Name: g.Name ?? '' }))
    for (const item of account.UserGroups ?? []) {
      const id = groupIdOf(item)
      if (id && !merged.some(g => g.Id === id)) {
        merged.push({ Id: id, Name: item.UserGroup?.Name ?? `#${id}` })
      }
    }
    return merged
  }, [userGroups, account.UserGroups])

  /** Rebuild the join rows so exactly one group is active, like Angular does. */
  const buildUserGroups = (): TPosAccountUserGroup[] =>
    groupOptions.map(g => ({
      ...(account.UserGroups?.find(x => groupIdOf(x) === g.Id) ?? {}),
      UserGroupId: g.Id,
      Actived: groupId > 0 && g.Id === groupId,
      UserGroup: { Id: g.Id, Name: g.Name },
    }))

  // Only touch user-infos/* when the account section was actually filled in.
  const accountTouched = () =>
    !!(account.Id || account.UserName?.trim() || account.Password?.trim() || groupId > 0)

  const persistAccount = async (memberId: number) => {
    if (!memberId || !accountTouched()) return
    if (!account.UserName?.trim()) { toast.error('Vui lòng nhập tài khoản'); throw new Error('no username') }
    if (account.Password !== account.ConfirmPassword) { toast.error('Nhập lại mật khẩu không đúng'); throw new Error('mismatch') }

    const surname = (form.Surname ?? '').trim()
    const name = (form.Name ?? '').trim()
    await saveAccount({
      ...account,
      Id: account.Id || memberId,
      UserName: account.UserName.trim(),
      Member: { Id: memberId },
      UserGroups: buildUserGroups(),
      Name: name,
      Surname: surname,
      FullName: `${surname} ${name}`.trim(),
      ...(account.Password ? { PasswordSalt: computePasswordSalt(account.Password) } : {}),
    }).unwrap()
  }

  const handleSave = async () => {
    if (!form.Name?.trim()) { toast.error('Vui lòng nhập tên nhân viên'); return }

    // Step 2 of the create wizard only has the account left to save.
    if (wizard && createStep === 2) {
      try { await persistAccount(form.Id!); toast.success('Đã lưu tài khoản'); closeModal(); refetch() } catch { /* reported above */ }
      return
    }

    try {
      const saved = await saveMember({ model: form, file: avatar }).unwrap()
      const memberId = saved?.Id ?? form.Id
      if (wizard && memberId) {
        // Move to the account step instead of closing.
        setForm(f => ({ ...f, ...saved, Id: memberId }))
        setAccount({ ...emptyAccount(), UserName: defaultUserName(form) })
        setGroupId(0)
        setCreateStep(2)
        toast.success('Đã tạo nhân viên — thiết lập tài khoản')
        refetch()
        return
      }
      await persistAccount(memberId!)
      toast.success('Đã cập nhật nhân viên')
      closeModal()
      refetch()
    } catch (e) {
      if (e instanceof Error && ['no username', 'mismatch'].includes(e.message)) return
      toast.error('Không thể lưu nhân viên')
    }
  }

  const closeModal = () => { setModal(false); setWizard(false); setCreateStep(1) }

  const columns: ColumnDef<TPosMember>[] = [
    { id: 'stt', header: '#', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    {
      id: 'name', header: 'Tên',
      cell: ({ row }) => <span className="font-medium">{row.original.FullName || `${row.original.Surname ?? ''} ${row.original.Name ?? ''}`.trim() || '—'}</span>,
    },
    { id: 'phone', header: 'Điện thoại', cell: ({ row }) => <span>{row.original.Phone || '—'}</span> },
    { id: 'email', header: 'Email', cell: ({ row }) => <span className="text-xs">{row.original.Email || '—'}</span> },
    {
      id: 'groups', header: 'Quyền',
      cell: ({ row }) => (
        <span className="text-xs">
          {(row.original.UserGroups ?? []).map(g => g.UserGroup?.Name).filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    { id: 'status', header: 'TT', cell: ({ row }) => <StatusBadge status={row.original.Status} /> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => {
        const m = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(m)}>Chỉnh sửa</DropdownMenuItem>
              <DropdownMenuSeparator />
              {m.Status?.Id !== STATUS.ACTIVE && (
                <DropdownMenuItem onClick={() => changeStatus(m.Id, STATUS.ACTIVE)}>
                  <Check className="h-3.5 w-3.5 mr-2 text-green-600" /> Kích hoạt
                </DropdownMenuItem>
              )}
              {m.Status?.Id !== STATUS.LOCKED && (
                <DropdownMenuItem onClick={() => changeStatus(m.Id, STATUS.LOCKED)}>
                  <Lock className="h-3.5 w-3.5 mr-2 text-yellow-600" /> Khoá
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => changeStatus(m.Id, STATUS.DELETED)}>
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Xoá
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const showProfile = !wizard || createStep === 1
  const showAccount = !wizard || createStep === 2

  return (
    <div className="space-y-4">
      <ListPageHeader title="Nhân viên" icon={UserCheck}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm nhân viên..." />
        <select value={statusId} onChange={e => { setStatusId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Tất cả TT</option>
          <option value={STATUS.ACTIVE}>Hoạt động</option>
          <option value={STATUS.LOCKED}>Khoá</option>
          <option value={STATUS.DELETED}>Đã xoá</option>
        </select>
        <Button size="sm" className="h-8" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm nhân viên
        </Button>
      </ListPageHeader>

      <DataTable
        columns={columns} data={items} loading={isLoading} total={total}
        page={page} pageSize={pageSize}
        onPageChange={setPage} onPageSizeChange={setPageSize}
        onRowDoubleClick={openEdit}
        emptyText="Không có nhân viên nào"
      />

      <Dialog open={modal} onOpenChange={v => (v ? setModal(true) : closeModal())}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {wizard ? `Thêm nhân viên — bước ${createStep}/2` : 'Chỉnh sửa nhân viên'}
            </DialogTitle>
          </DialogHeader>

          {wizard && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
              {[
                { n: 1, title: 'Thông tin nhân viên' },
                { n: 2, title: 'Tài khoản và bộ quyền' },
              ].map((s, i) => (
                <div key={s.n} className="flex flex-1 items-center gap-2">
                  <div className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                    createStep >= s.n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {s.n}
                  </div>
                  <span className="text-xs font-medium">{s.title}</span>
                  {i === 0 && <div className="h-px flex-1 bg-border" />}
                </div>
              ))}
            </div>
          )}

          <div className={`grid gap-4 max-h-[65vh] overflow-y-auto pr-1 ${showProfile && showAccount ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
            {showProfile && (
              <section className="rounded-xl border overflow-hidden">
                <header className="px-3 py-2 border-b bg-muted/40 text-sm font-semibold">Thông tin nhân viên</header>
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Họ</Label>
                      <Input value={form.Surname ?? ''} onChange={e => setForm(f => ({ ...f, Surname: e.target.value }))} placeholder="Họ" />
                    </div>
                    <div className="space-y-1">
                      <Label>Tên <span className="text-destructive">*</span></Label>
                      <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Tên" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Điện thoại</Label>
                      <Input value={form.Phone ?? ''} onChange={e => setForm(f => ({ ...f, Phone: e.target.value }))} />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label>Email</Label>
                      <Input type="email" value={form.Email ?? ''} onChange={e => setForm(f => ({ ...f, Email: e.target.value }))} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Địa chỉ</Label>
                    <Input value={form.UserInfo?.Address ?? ''} onChange={e => setUserInfo({ Address: e.target.value })} />
                  </div>

                  <div className="space-y-1">
                    <Label>Ảnh đại diện</Label>
                    <Input type="file" accept="image/*" onChange={e => setAvatar(e.target.files?.[0] ?? null)} />
                  </div>

                  <div className="rounded-lg border p-2.5">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Cửa hàng</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {shops.map(s => (
                        <label key={s.Id} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" className="h-3.5 w-3.5 rounded border-input"
                            checked={(form.Shops ?? []).some(x => x.Id === s.Id)}
                            onChange={e => toggleShop(s, e.target.checked)} />
                          <span className="text-xs">{s.Name}</span>
                        </label>
                      ))}
                      {shops.length === 0 && <span className="text-xs text-muted-foreground">Không có cửa hàng</span>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Ghi chú</Label>
                    <Textarea rows={2} value={form.UserInfo?.Note ?? ''} onChange={e => setUserInfo({ Note: e.target.value })} />
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-2.5 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Loại lương</Label>
                        <Select value={String(form.UserInfo?.SalaryType ?? 0)} onValueChange={v => setUserInfo({ SalaryType: Number(v) })}>
                          <SelectTrigger><SelectValue placeholder="Chọn loại lương" /></SelectTrigger>
                          <SelectContent>
                            {salaryTypes.map(t => (
                              <SelectItem key={t.Value} value={String(t.Value)}>{t.Name ?? t.Detail}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Lương</Label>
                        <NumberInput min={0} max={999999999} value={form.UserInfo?.Salary ?? 0}
                          onChange={v => setUserInfo({ Salary: v })} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Ngày làm việc</p>
                      <div className="flex flex-wrap gap-1.5">
                        {WEEK_DAYS.map(d => {
                          const on = !!form.UserInfo?.[d.key]
                          return (
                            <button key={d.key} type="button" onClick={() => setUserInfo({ [d.key]: !on })}
                              className={`h-7 w-9 rounded-md border text-xs font-semibold transition-colors ${
                                on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground'}`}>
                              {d.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {showAccount && (
              <section className="rounded-xl border overflow-hidden self-start">
                <header className="px-3 py-2 border-b bg-muted/40 text-sm font-semibold">Tài khoản và bộ quyền</header>
                <div className="p-3 space-y-3">
                  <div className="space-y-1">
                    <Label>Tài khoản</Label>
                    <Input value={account.UserName ?? ''} disabled={!!account.Id}
                      onChange={e => setAccount(a => ({ ...a, UserName: e.target.value }))} placeholder="Tên đăng nhập" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Mật khẩu</Label>
                      <Input type="password" value={account.Password ?? ''}
                        onChange={e => setAccount(a => ({ ...a, Password: e.target.value }))}
                        placeholder={account.Id ? 'Để trống nếu không đổi' : ''} />
                    </div>
                    <div className="space-y-1">
                      <Label>Nhập lại mật khẩu</Label>
                      <Input type="password" value={account.ConfirmPassword ?? ''}
                        onChange={e => setAccount(a => ({ ...a, ConfirmPassword: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Bộ quyền</Label>
                    <Select value={String(groupId)} onValueChange={v => setGroupId(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Không chọn</SelectItem>
                        {groupOptions.map(g => <SelectItem key={g.Id} value={String(g.Id)}>{g.Name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Huỷ</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu...' : wizard && createStep === 1 ? 'Tiếp tục' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

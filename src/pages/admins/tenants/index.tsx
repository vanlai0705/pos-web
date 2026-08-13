import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  Building2,
  DatabaseBackup,
  Download,
  Lock,
  LogIn,
  MoreHorizontal,
  RefreshCcw,
  Search,
  ShieldCheck,
  Store,
  Unlock,
  Upload,
  Users,
} from 'lucide-react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { ListToolbar, ToolbarButton } from '@/components/layout/list-toolbar'
import { Button } from '@/components/ui/button'
import { CodeTag } from '@/components/ui/data-tag'
import { DataPagination } from '@/components/ui/data-pagination'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Dialog, DialogTitle, FormDialogBody, FormDialogContent, FormDialogFooter, FormDialogHeader } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PosImage } from '@/components/ui/pos-image'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  useFilterReportQuery,
  useGenericDownloadMutation,
  useGenericPostMutation,
  useLazyGenericGetQuery,
} from '@/store/slice/generic/api'
import { useLazyGetMeQuery } from '@/store/slice/auth/api'
import { useLazyGetMenuQuery } from '@/store/slice/registration-users/api'
import { useAppDispatch } from '@/store/hooks'
import { setMenu } from '@/store/slice/users/app'
import { useAuth } from '@/hooks/useAuth'
import { cn, query, downloadBlob } from '@/utils'
import { withDomainPath } from '@/utils/domain-route'
import { buildFileFormData, buildModelFormData } from '@/utils/multipart'

const PAGE_SIZE = 15

enum TenantStatusEnum {
  NotConfigured = 0,
  NotActivated = 1,
  Active = 2,
  Trial = 3,
  Expired = 4,
  ExpiringSoon = 5,
  Trash = 6,
}

const TENANT_STATUS_LABEL: Record<TenantStatusEnum, string> = {
  [TenantStatusEnum.NotConfigured]: 'Chưa thiết lập',
  [TenantStatusEnum.NotActivated]: 'Chưa kích hoạt',
  [TenantStatusEnum.Active]: 'Đang sử dụng',
  [TenantStatusEnum.Trial]: 'Dùng thử',
  [TenantStatusEnum.Expired]: 'Hết hạn',
  [TenantStatusEnum.ExpiringSoon]: 'Sắp hết hạn',
  [TenantStatusEnum.Trash]: 'Thùng rác',
}

const STATUS_FILTERS = [
  { label: 'Tất cả', value: undefined },
  { label: TENANT_STATUS_LABEL[TenantStatusEnum.NotConfigured], value: TenantStatusEnum.NotConfigured },
  { label: TENANT_STATUS_LABEL[TenantStatusEnum.NotActivated], value: TenantStatusEnum.NotActivated },
  { label: TENANT_STATUS_LABEL[TenantStatusEnum.Active], value: TenantStatusEnum.Active },
  { label: TENANT_STATUS_LABEL[TenantStatusEnum.Trial], value: TenantStatusEnum.Trial },
  { label: TENANT_STATUS_LABEL[TenantStatusEnum.Expired], value: TenantStatusEnum.Expired },
  { label: TENANT_STATUS_LABEL[TenantStatusEnum.ExpiringSoon], value: TenantStatusEnum.ExpiringSoon },
  { label: TENANT_STATUS_LABEL[TenantStatusEnum.Trash], value: TenantStatusEnum.Trash },
]

type TNamed = { Id?: number; Name?: string; Code?: string }

interface TTenantShop {
  Id?: number
  Name?: string
  LongName?: string
  Phone?: string
  CreationTime?: string
  ExpirationAt?: string
  TenantStatus?: TenantStatusEnum
  IsDefault?: boolean
  License?: string
  Key?: string
  Image?: { Url?: string }
}

interface TTenant {
  Id?: number
  TenancyName?: string
  Name?: string
  Image?: { Url?: string }
  IsActive?: boolean
  ExpiredDate?: string
  TenantStatus?: TenantStatusEnum
  TenantSetting?: {
    Email?: string
    CompanyName?: string
  }
  OrderCount?: number
  Shops?: TTenantShop[]
}

interface TTenantUser {
  Id?: number
  TenantId?: number
  FullName?: string
  Email?: string
  Status?: TNamed
  Image?: { Url?: string }
}

function getData<T = any>(response: any): T | undefined {
  return response?.Data ?? response
}

function toDateInput(value?: string | null) {
  if (!value) return ''
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : ''
}

function fmtDate(value?: string | null) {
  if (!value) return '—'
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : '—'
}

function statusLabel(status?: TenantStatusEnum) {
  return TENANT_STATUS_LABEL[status ?? TenantStatusEnum.NotActivated] || TENANT_STATUS_LABEL[TenantStatusEnum.NotActivated]
}

function tenantStatusTone(status?: TenantStatusEnum): React.ComponentProps<typeof StatusBadge>['tone'] {
  if (status === TenantStatusEnum.Active) return 'active'
  if (status === TenantStatusEnum.Trial) return 'paid'
  if (status === TenantStatusEnum.ExpiringSoon) return 'pending'
  if (status === TenantStatusEnum.Expired || status === TenantStatusEnum.Trash) return 'deleted'
  if (status === TenantStatusEnum.NotConfigured) return 'draft'
  return 'locked'
}

function statusDotClass(status?: TenantStatusEnum) {
  if (status === TenantStatusEnum.Active) return 'bg-emerald-500'
  if (status === TenantStatusEnum.Trial) return 'bg-blue-500'
  if (status === TenantStatusEnum.ExpiringSoon) return 'bg-amber-500'
  if (status === TenantStatusEnum.Expired) return 'bg-red-500'
  if (status === TenantStatusEnum.Trash) return 'bg-slate-500'
  if (status === TenantStatusEnum.NotConfigured) return 'bg-violet-500'
  if (status === TenantStatusEnum.NotActivated) return 'bg-slate-400'
  return 'bg-muted-foreground'
}

function tenantRowClass(item: TTenant) {
  const status = item.TenantStatus
  if (status === TenantStatusEnum.Active) return 'bg-emerald-50/50 dark:bg-emerald-950/10'
  if (status === TenantStatusEnum.Trial) return 'bg-blue-50/50 dark:bg-blue-950/10'
  if (status === TenantStatusEnum.ExpiringSoon) return 'bg-amber-50/60 dark:bg-amber-950/10'
  if (status === TenantStatusEnum.Expired) return 'bg-red-50/50 dark:bg-red-950/10'
  if (status === TenantStatusEnum.Trash) return 'bg-muted/70'
  if (status === TenantStatusEnum.NotConfigured) return 'bg-violet-50/50 dark:bg-violet-950/10'
  return ''
}

function canBackupRestore(item: TTenant) {
  return /^SMS_\s*\d+$/.test(`${item.TenancyName ?? ''}`.trim())
}

export default function AdminTenantsPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { setUser, setUserInfo } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [tenantStatus, setTenantStatus] = useState<TenantStatusEnum | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [shopsTenant, setShopsTenant] = useState<TTenant | null>(null)
  const [loginTenant, setLoginTenant] = useState<TTenant | null>(null)
  const [backupAction, setBackupAction] = useState<{ mode: 'backup' | 'restore'; tenant: TTenant } | null>(null)
  const [backupTokenMap, setBackupTokenMap] = useState<Record<number, string>>({})
  const [restoreFileMap, setRestoreFileMap] = useState<Record<number, File | null>>({})
  const [rowLoadingMap, setRowLoadingMap] = useState<Record<number, boolean>>({})

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'tenants/filter',
    params: {
      Keyword: keyword || undefined,
      TenantStatus: tenantStatus,
      PageIndex: page - 1,
      PageSize: pageSize,
    },
  })
  const [request] = useGenericPostMutation()
  const [fetchDetail] = useLazyGenericGetQuery()
  const [downloadBackup, { isLoading: downloadingBackup }] = useGenericDownloadMutation()
  const [getMe] = useLazyGetMeQuery()
  const [getMenu] = useLazyGetMenuQuery()

  const items = (data?.Items ?? []) as TTenant[]
  const total = data?.TotalItemCount ?? 0

  const setRowLoading = (tenantId: number, value: boolean) => {
    setRowLoadingMap(current => ({ ...current, [tenantId]: value }))
  }

  const updateTenantField = async (
    tenant: TTenant,
    mutator: (detail: TTenant) => void,
    successMessage: string,
  ) => {
    const tenantId = Number(tenant.Id || 0)
    if (!tenantId || rowLoadingMap[tenantId]) return

    setRowLoading(tenantId, true)
    try {
      const detailResponse = await fetchDetail({ url: 'tenants/detail', params: { id: tenantId } }).unwrap()
      const detail = getData<TTenant>(detailResponse)
      if (!detail) {
        toast.error('Không lấy được thông tin đối tác')
        return
      }
      mutator(detail)
      await request({ url: 'tenants/update', method: 'POST', body: buildModelFormData(detail) }).unwrap()
      toast.success(successMessage)
      refetch()
    } catch {
      toast.error('Không thể cập nhật đối tác')
    } finally {
      setRowLoading(tenantId, false)
    }
  }

  const toggleActive = (tenant: TTenant) => {
    const nextActive = !(tenant.IsActive ?? false)
    updateTenantField(
      tenant,
      detail => { detail.IsActive = nextActive },
      nextActive ? 'Đã mở kích hoạt' : 'Đã khoá kích hoạt',
    )
  }

  const submitBackupAction = async () => {
    if (!backupAction?.tenant?.Id) return
    const tenantId = backupAction.tenant.Id
    const token = (backupTokenMap[tenantId] ?? '').trim()
    if (!token) {
      toast.error('Vui lòng nhập backup token')
      return
    }

    try {
      if (backupAction.mode === 'backup') {
        const blob = await downloadBackup({
          url: `tenants/backup${query({ tenantId, backupToken: token })}`,
          method: 'GET',
        }).unwrap()
        downloadBlob(blob, `tenant-${backupAction.tenant.TenancyName || tenantId}-backup.zip`)
        toast.success('Đã bắt đầu tải file backup')
      } else {
        const file = restoreFileMap[tenantId]
        if (!file) {
          toast.error('Vui lòng chọn file backup')
          return
        }
        await request({
          url: `tenants/restore${query({ tenantId, backupToken: token })}`,
          method: 'POST',
          body: buildFileFormData(file),
        }).unwrap()
        toast.success('Khôi phục dữ liệu thành công')
        refetch()
      }
      setBackupAction(null)
    } catch {
      toast.error(backupAction.mode === 'backup' ? 'Không thể backup dữ liệu' : 'Không thể restore dữ liệu')
    }
  }

  const updateShopExpiration = async (shop: TTenantShop, dateValue: string) => {
    const tenantId = Number(shopsTenant?.Id || 0)
    if (!tenantId || !shop.Id) return
    if (!dateValue) {
      toast.error('Vui lòng chọn ngày hết hạn')
      return
    }

    const expirationAt = `${dateValue}T00:00:00Z`
    try {
      await request({
        url: `tenants/update-shop?tenantId=${tenantId}`,
        method: 'POST',
        body: buildModelFormData({ Id: shop.Id, ExpirationAt: expirationAt }),
      }).unwrap()
      toast.success('Cập nhật ngày hết hạn thành công')
      setShopsTenant(current => current ? {
        ...current,
        Shops: (current.Shops || []).map(item => item.Id === shop.Id ? { ...item, ExpirationAt: expirationAt } : item),
      } : current)
      refetch()
    } catch {
      toast.error('Không thể cập nhật ngày hết hạn')
    }
  }

  const loginAsUser = async (user: TTenantUser) => {
    if (!user.TenantId || !user.Id) return
    try {
      const response = await fetchDetail({
        url: 'tenants/login-as',
        params: { tenantId: user.TenantId, userId: user.Id },
      }).unwrap()
      const loginData = getData<any>(response)
      if (!loginData?.SessionToken) {
        toast.error('Không thể đăng nhập đối tác')
        return
      }

      setUser(loginData)
      await Promise.allSettled([
        getMe().then(({ data: meData }) => {
          if (meData?.User) setUserInfo(meData.User as any)
        }),
        getMenu().then(({ data: menuData }) => {
          if (menuData) dispatch(setMenu(menuData))
        }),
      ])
      toast.success('Đã đăng nhập vào đối tác')
      navigate(withDomainPath('/dashboard', loginData.DomainName), { replace: true })
    } catch {
      toast.error('Không thể đăng nhập đối tác')
    }
  }

  const columns: ColumnDef<TTenant>[] = [
    {
      id: 'stt',
      header: 'STT',
      meta: { className: 'w-14 text-center' },
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span>,
    },
    {
      id: 'id',
      header: 'Mã',
      meta: { className: 'min-w-[90px]' },
      cell: ({ row }) => <CodeTag value={row.original.Id} />,
    },
    {
      id: 'tenant',
      header: 'Đối tác',
      meta: { className: 'min-w-[260px]' },
      cell: ({ row }) => {
        const tenant = row.original
        return (
          <div className="flex min-w-0 items-center gap-2">
            <PosImage url={tenant.Image?.Url} alt="" className="h-9 w-9 shrink-0 rounded-md border" variant="avatar" />
            <div className="min-w-0">
              <div className="truncate font-semibold text-foreground">{tenant.Name || '-'}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{tenant.TenancyName || '-'}</span>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      id: 'email',
      header: 'Email',
      meta: { className: 'min-w-[220px]' },
      cell: ({ row }) => <span className="block max-w-[220px] truncate text-sm">{row.original.TenantSetting?.Email || '-'}</span>,
    },
    {
      id: 'company',
      header: 'Công ty',
      meta: { className: 'min-w-[180px]' },
      cell: ({ row }) => <span className="block max-w-[190px] truncate text-sm text-muted-foreground">{row.original.TenantSetting?.CompanyName || '-'}</span>,
    },
    {
      id: 'orders',
      header: 'Số đơn hàng',
      meta: { className: 'min-w-[110px] text-right' },
      cell: ({ row }) => <span className="font-semibold tabular-nums">{(row.original.OrderCount || 0).toLocaleString('vi-VN')}</span>,
    },
    {
      id: 'shops',
      header: 'Thông tin shop',
      meta: { className: 'min-w-[150px]' },
      cell: ({ row }) => {
        const tenant = row.original
        const shopCount = tenant.Shops?.length || 0
        return shopCount ? (
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShopsTenant(tenant)}>
            <Store className="h-3.5 w-3.5" />
            Xem {shopCount} shop
          </Button>
        ) : <span className="text-muted-foreground">-</span>
      },
    },
    {
      id: 'backup',
      header: 'Backup / Restore',
      meta: { className: 'min-w-[180px]' },
      cell: ({ row }) => canBackupRestore(row.original) ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button size="sm" className="h-8 gap-1.5 bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600" onClick={() => setBackupAction({ mode: 'backup', tenant: row.original })}>
            <DatabaseBackup className="h-3.5 w-3.5" />
            Backup
          </Button>
          <Button size="sm" className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600" onClick={() => setBackupAction({ mode: 'restore', tenant: row.original })}>
            <RefreshCcw className="h-3.5 w-3.5" />
            Restore
          </Button>
        </div>
      ) : <span className="text-muted-foreground">-</span>,
    },
    {
      id: 'status',
      header: 'Trạng thái',
      meta: { className: 'min-w-[140px] text-center' },
      cell: ({ row }) => (
        <StatusBadge
          label={statusLabel(row.original.TenantStatus)}
          tone={tenantStatusTone(row.original.TenantStatus)}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      meta: { className: 'w-12 text-right' },
      cell: ({ row }) => {
        const tenant = row.original
        const tenantId = Number(tenant.Id || 0)
        const loading = !!rowLoadingMap[tenantId]
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem disabled={loading} onClick={() => toggleActive(tenant)}>
                {tenant.IsActive ? <Lock className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" /> : <Unlock className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                {tenant.IsActive ? 'Khoá kích hoạt' : 'Mở kích hoạt'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLoginTenant(tenant)}>
                <Users className="mr-2 h-4 w-4" />
                Danh sách đăng nhập
              </DropdownMenuItem>
              {tenant.Shops?.length ? (
                <DropdownMenuItem onClick={() => setShopsTenant(tenant)}>
                  <Store className="mr-2 h-4 w-4" />
                  Xem shop
                </DropdownMenuItem>
              ) : null}
              {canBackupRestore(tenant) ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setBackupAction({ mode: 'backup', tenant })}>
                    <Download className="mr-2 h-4 w-4" />
                    Backup
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBackupAction({ mode: 'restore', tenant })}>
                    <Upload className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="flex min-h-0 gap-3">
      <aside className="hidden w-52 shrink-0 rounded-lg border bg-card text-card-foreground shadow-sm lg:block">
        <div className="border-b bg-muted/30 px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Trạng thái đối tác
        </div>
        <div className="max-h-[calc(100vh-170px)] overflow-auto py-1">
          {STATUS_FILTERS.map(filter => {
            const selected = tenantStatus === filter.value
            return (
              <button
                key={filter.label}
                type="button"
                onClick={() => { setTenantStatus(filter.value); setPage(1) }}
                className={cn(
                  'flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50',
                  selected ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-transparent text-foreground',
                )}
              >
                <span className={cn('h-2 w-2 shrink-0 rounded-full', statusDotClass(filter.value))} />
                <span>{filter.label}</span>
              </button>
            )
          })}
        </div>
      </aside>

      <section className="min-w-0 flex-1 space-y-3">
        <ListToolbar
          left={(
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">Đối tác</h1>
                <p className="text-xs text-muted-foreground">Quản lý tenant, cửa hàng và đăng nhập hỗ trợ</p>
              </div>
            </div>
          )}
          searchValue={keyword}
          searchPlaceholder="Tìm đối tác..."
          onSearchChange={value => { setKeyword(value); setPage(1) }}
          filters={(
            <select
              value={tenantStatus ?? ''}
              onChange={event => {
                setTenantStatus(event.target.value === '' ? undefined : Number(event.target.value))
                setPage(1)
              }}
              className="h-10 min-w-[170px] rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring lg:hidden"
            >
              {STATUS_FILTERS.map(filter => <option key={filter.label} value={filter.value ?? ''}>{filter.label}</option>)}
            </select>
          )}
          actions={(
            <ToolbarButton tone="neutral" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4" />
              Tải lại
            </ToolbarButton>
          )}
        />

        <DataTable
          columns={columns}
          data={items}
          loading={isLoading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={size => { setPageSize(size); setPage(1) }}
          rowClassName={tenantRowClass}
          emptyText="Không có đối tác nào"
        />
      </section>

      <TenantShopsDialog
        tenant={shopsTenant}
        onClose={() => setShopsTenant(null)}
        onExpirationChange={updateShopExpiration}
      />

      <LoginAsDialog
        tenant={loginTenant}
        onClose={() => setLoginTenant(null)}
        onLogin={loginAsUser}
      />

      <BackupActionDialog
        action={backupAction}
        token={backupAction?.tenant?.Id ? backupTokenMap[backupAction.tenant.Id] ?? '' : ''}
        file={backupAction?.tenant?.Id ? restoreFileMap[backupAction.tenant.Id] ?? null : null}
        submitting={downloadingBackup}
        onTokenChange={value => {
          const tenantId = backupAction?.tenant?.Id
          if (tenantId) setBackupTokenMap(current => ({ ...current, [tenantId]: value }))
        }}
        onFileChange={file => {
          const tenantId = backupAction?.tenant?.Id
          if (tenantId) setRestoreFileMap(current => ({ ...current, [tenantId]: file }))
        }}
        onClose={() => setBackupAction(null)}
        onSubmit={submitBackupAction}
      />
    </div>
  )
}

function TenantShopsDialog({
  tenant,
  onClose,
  onExpirationChange,
}: {
  tenant: TTenant | null
  onClose: () => void
  onExpirationChange: (shop: TTenantShop, dateValue: string) => void
}) {
  return (
    <Dialog open={!!tenant} onOpenChange={value => !value && onClose()}>
      <FormDialogContent className="max-w-4xl">
        <FormDialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Danh sách cửa hàng
          </DialogTitle>
        </FormDialogHeader>
        <FormDialogBody className="p-4">
          {tenant?.Shops?.length ? (
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">STT</th>
                  <th className="px-3 py-2">Tên cửa hàng</th>
                  <th className="px-3 py-2">Số điện thoại</th>
                  <th className="px-3 py-2">Ngày tạo</th>
                  <th className="px-3 py-2">Hết hạn</th>
                  <th className="px-3 py-2">Trạng thái</th>
                  <th className="px-3 py-2">License</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tenant.Shops.map((shop, index) => (
                  <tr key={shop.Id || index} className="hover:bg-muted/30">
                    <td className="px-3 py-2 text-center text-muted-foreground">{index + 1}</td>
                    <td className="px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Store className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate font-medium">{shop.Name || shop.LongName || '-'}</span>
                        {shop.IsDefault ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/70">
                            Mặc định
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">{shop.Phone || '-'}</td>
                    <td className="px-3 py-2">{fmtDate(shop.CreationTime)}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="date"
                        value={toDateInput(shop.ExpirationAt)}
                        onChange={event => onExpirationChange(shop, event.target.value)}
                        className="h-8 w-36 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge label={statusLabel(shop.TenantStatus)} tone={tenantStatusTone(shop.TenantStatus)} />
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-2" title={shop.License || shop.Key || '-'}>
                      {shop.License || shop.Key || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Archive className="mx-auto mb-2 h-8 w-8 opacity-50" />
              Không có cửa hàng nào
            </div>
          )}
        </FormDialogBody>
        <FormDialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </FormDialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}

function LoginAsDialog({
  tenant,
  onClose,
  onLogin,
}: {
  tenant: TTenant | null
  onClose: () => void
  onLogin: (user: TTenantUser) => void
}) {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useFilterReportQuery({
    path: 'tenants/filter-user',
    params: {
      TenantId: tenant?.Id,
      Keyword: keyword || undefined,
      StatusId: 0,
      PageIndex: page - 1,
      PageSize: PAGE_SIZE,
    },
  }, { skip: !tenant?.Id })

  const users = (data?.Items ?? []) as TTenantUser[]

  return (
    <Dialog open={!!tenant} onOpenChange={value => !value && onClose()}>
      <FormDialogContent className="max-w-3xl">
        <FormDialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Danh sách đăng nhập
          </DialogTitle>
        </FormDialogHeader>
        <FormDialogBody className="space-y-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={keyword} onChange={event => { setKeyword(event.target.value); setPage(1) }} placeholder="Tìm người dùng..." className="pl-9" />
          </div>
          <div className="max-h-[50vh] overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-16 px-3 py-2"></th>
                  <th className="px-3 py-2">Tên</th>
                  <th className="px-3 py-2 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">Đang tải...</td></tr>
                ) : users.length ? users.map(user => (
                  <tr key={user.Id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 text-center">
                      <Button size="icon" className="h-8 w-8" title="Đăng nhập" onClick={() => onLogin(user)}>
                        <LogIn className="h-4 w-4" />
                      </Button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{user.FullName || '-'}</div>
                      <div className="text-xs text-muted-foreground">{user.Email || '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-center"><StatusBadge status={user.Status} /></td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">Không có người dùng nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <DataPagination page={page} total={data?.TotalItemCount ?? 0} pageSize={PAGE_SIZE} onPageChange={setPage} hideWhenSingle />
        </FormDialogBody>
        <FormDialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </FormDialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}

function BackupActionDialog({
  action,
  token,
  file,
  submitting,
  onTokenChange,
  onFileChange,
  onClose,
  onSubmit,
}: {
  action: { mode: 'backup' | 'restore'; tenant: TTenant } | null
  token: string
  file: File | null
  submitting: boolean
  onTokenChange: (value: string) => void
  onFileChange: (file: File | null) => void
  onClose: () => void
  onSubmit: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const isRestore = action?.mode === 'restore'

  return (
    <Dialog open={!!action} onOpenChange={value => !value && onClose()}>
      <FormDialogContent className="max-w-xl">
        <FormDialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isRestore ? <RefreshCcw className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : <DatabaseBackup className="h-5 w-5 text-sky-600 dark:text-sky-400" />}
            {isRestore ? 'Restore dữ liệu' : 'Backup dữ liệu'}
          </DialogTitle>
        </FormDialogHeader>
        <FormDialogBody className="space-y-4">
          <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
            <span className="font-semibold">{action?.tenant?.Name || '-'}</span>
          </div>
          <div className="space-y-1.5">
            <Label>Backup token</Label>
            <Input value={token} onChange={event => onTokenChange(event.target.value)} placeholder="Nhập backup token" />
          </div>
          {isRestore ? (
            <div className="space-y-1.5">
              <Label>File backup</Label>
              <div className="rounded-md border border-dashed bg-muted/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 truncate text-sm text-muted-foreground">{file?.name || 'Chưa chọn file backup'}</div>
                  <div className="flex items-center gap-2">
                    <input ref={fileRef} type="file" className="hidden" onChange={event => onFileChange(event.target.files?.[0] || null)} />
                    <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>Chọn file</Button>
                    {file ? <Button type="button" variant="ghost" onClick={() => onFileChange(null)}>Bỏ chọn</Button> : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </FormDialogBody>
        <FormDialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button
            onClick={onSubmit}
            disabled={submitting || !token.trim() || (isRestore && !file)}
            className={isRestore ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600' : 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600'}
          >
            {submitting ? 'Đang xử lý...' : isRestore ? 'Restore dữ liệu' : 'Backup dữ liệu'}
          </Button>
        </FormDialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}

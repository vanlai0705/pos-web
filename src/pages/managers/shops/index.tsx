import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Building2,
  CalendarDays,
  Check,
  Image as ImageIcon,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  ShieldOff,
  Store,
  Trash2,
  Warehouse,
} from 'lucide-react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { ListToolbar, ToolbarButton } from '@/components/layout/list-toolbar'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { CodeTag } from '@/components/ui/data-tag'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  useFilterReportQuery,
  useFilterWarehousesQuery,
  useGenericPostMutation,
  useGetProductCategoriesQuery,
  useLazyGenericGetQuery,
} from '@/store/slice/users/api/api'
import { cn } from '@/utils'
import { getImageUrl } from '@/utils/common'
import { withDomainPath } from '@/utils/domain-route'
import { buildModelFormData } from '@/utils/multipart'

const PAGE_SIZE = 15
const STATUS_ACTIVE = 0
const STATUS_LOCKED = 1
const STATUS_DELETED = 2
const INVOICE_TEMPLATE_GROUP_CODE = 'MauHoaDon'

interface TNamed {
  Id?: number
  Code?: string
  Name?: string
  Url?: string
}

interface TShop {
  Id?: number
  Code?: string
  Name?: string
  Phone?: string
  Address?: string
  Email?: string
  License?: string
  Key?: string
  ExpirationAt?: string
  CreationTime?: string
  OtherNode?: string
  Image?: { Url?: string }
  Stock?: TNamed & { Image?: { Url?: string } }
  ProductCategory?: TNamed
  ReportTemplate?: TNamed & { TemplateGroupId?: number; ParentId?: number; TemplateGroup?: TNamed }
  ReportTemplateId?: number
  ReportTemplateTemp?: TNamed & { TemplateGroupId?: number; ParentId?: number; TemplateGroup?: TNamed }
  ReportTemplateTempId?: number
  IsDefault?: boolean
  Status?: { Id?: number; Name?: string }
}

function emptyShop(): TShop {
  return {
    Name: '',
    Phone: '',
    Address: '',
    Email: '',
    OtherNode: '',
    ProductCategory: { Id: 0, Code: '', Name: '' },
    ReportTemplateId: 0,
    ReportTemplateTempId: 0,
    IsDefault: false,
  }
}

function dateInputValue(value?: string | null) {
  if (!value) return ''
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : ''
}

function fmtDate(value?: string | null) {
  if (!value) return '—'
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : '—'
}

function getLicenseValue(shop: TShop) {
  return `${shop.License ?? shop.Key ?? ''}`.trim()
}

function getData<T = any>(response: any): T | undefined {
  return response?.Data ?? response
}

function getItems<T = any>(response: any): T[] {
  const data = response?.Data ?? response
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.Items)) return data.Items
  return []
}

function flattenGroups(groups: any[]): any[] {
  return (groups || []).flatMap(group => [
    group,
    ...flattenGroups(group?.Childrents || group?.Childrens || []),
  ])
}

function buildTemplatePayload(template?: TShop['ReportTemplate']) {
  const id = Number(template?.Id || 0)
  if (!id) return undefined
  return {
    Id: id,
    Code: template?.Code || '',
    Name: template?.Name || '',
    TemplateGroupId: Number(template?.ParentId || template?.TemplateGroupId || template?.TemplateGroup?.Id || 0),
  }
}

function prepareShopPayload(shop: TShop) {
  const payload: TShop = { ...shop }
  const reportTemplate = buildTemplatePayload(payload.ReportTemplate)
  const reportTemplateTemp = buildTemplatePayload(payload.ReportTemplateTemp)

  if (reportTemplate) payload.ReportTemplate = reportTemplate
  else delete payload.ReportTemplate

  if (reportTemplateTemp) payload.ReportTemplateTemp = reportTemplateTemp
  else delete payload.ReportTemplateTemp

  delete payload.ReportTemplateId
  delete payload.ReportTemplateTempId
  return payload
}

function resolveShopFromDetail(detail: TShop): TShop {
  return {
    ...emptyShop(),
    ...(detail || {}),
    ProductCategory: detail?.ProductCategory || { Id: 0, Code: '', Name: '' },
    ReportTemplateId: detail?.ReportTemplate?.Id || detail?.ReportTemplateId || 0,
    ReportTemplateTempId: detail?.ReportTemplateTemp?.Id || detail?.ReportTemplateTempId || 0,
    OtherNode: detail?.OtherNode || '',
    IsDefault: !!detail?.IsDefault,
  }
}

export default function ShopsPage() {
  const params = useParams()
  const navigate = useNavigate()
  const routeId = params.id
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [statusId, setStatusId] = useState<number | ''>('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TShop>(emptyShop())
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [licenseDraftMap, setLicenseDraftMap] = useState<Record<number, string>>({})
  const [rowLoadingMap, setRowLoadingMap] = useState<Record<number, boolean>>({})
  const [templates, setTemplates] = useState<Array<Required<Pick<TNamed, 'Id'>> & TNamed>>([])
  const imageInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'shop/filter',
    params: {
      Keyword: keyword || undefined,
      StatusId: statusId === '' ? undefined : statusId,
      PageIndex: page - 1,
      PageSize: pageSize,
    },
  })
  const { data: stockData } = useFilterWarehousesQuery({ PageIndex: 0, PageSize: 1000, StatusId: STATUS_ACTIVE })
  const { data: productCategories = [] } = useGetProductCategoriesQuery()
  const [fetchDetail, { isFetching: loadingDetail }] = useLazyGenericGetQuery()
  const [request, { isLoading: saving }] = useGenericPostMutation()

  const items = (data?.Items ?? []) as TShop[]
  const total = data?.TotalItemCount ?? 0
  const stocks = (stockData?.Items ?? []) as Array<TNamed & { Image?: { Url?: string } }>

  const closeModal = useCallback(() => {
    setModal(false)
    setImageFile(null)
    if (routeId) navigate(withDomainPath('/managers/shops'), { replace: true })
  }, [navigate, routeId])

  const openCreate = useCallback(() => {
    setForm(emptyShop())
    setImageFile(null)
    setModal(true)
    navigate(withDomainPath('/managers/shops/create'))
  }, [navigate])

  const openEdit = useCallback(async (id?: number) => {
    if (!id) return
    try {
      setModal(true)
      setImageFile(null)
      const response = await fetchDetail({ url: 'shop/detail', params: { id } }).unwrap()
      setForm(resolveShopFromDetail(getData<TShop>(response) || {}))
      navigate(withDomainPath(`/managers/shops/${id}`))
    } catch {
      toast.error('Không lấy được thông tin cửa hàng')
      closeModal()
    }
  }, [closeModal, fetchDetail, navigate])

  useEffect(() => {
    if (!routeId) return
    if (routeId === 'create') {
      setForm(emptyShop())
      setImageFile(null)
      setModal(true)
      return
    }
    openEdit(Number(routeId))
  }, [openEdit, routeId])

  useEffect(() => {
    let mounted = true
    async function loadReportTemplates() {
      try {
        const groupsResponse = await fetchDetail({ url: 'report-template-groups/get-list' }).unwrap()
        const groups = getItems<any>(groupsResponse)
        const invoiceGroup = flattenGroups(groups).find(group => group?.Code === INVOICE_TEMPLATE_GROUP_CODE)
        if (!invoiceGroup?.Id) {
          if (mounted) setTemplates([])
          return
        }

        const templatesResponse = await fetchDetail({
          url: 'report-templates/filter',
          params: { PageIndex: 0, PageSize: 1000, TemplateGroupId: invoiceGroup.Id },
        }).unwrap()
        if (mounted) setTemplates(getItems(templatesResponse))
      } catch {
        if (mounted) setTemplates([])
      }
    }

    loadReportTemplates()
    return () => { mounted = false }
  }, [fetchDetail])

  const set = (patch: Partial<TShop>) => setForm(current => ({ ...current, ...patch }))

  const saveShop = async (mode: 'exit' | 'stay' | 'new' = 'exit') => {
    if (!form.Name?.trim()) {
      toast.error('Vui lòng nhập tên cửa hàng')
      return
    }

    try {
      const response = await request({
        url: form.Id ? 'shop/update' : 'shop/create',
        method: 'POST',
        body: buildModelFormData(prepareShopPayload(form), [imageFile]),
      }).unwrap()
      toast.success(form.Id ? 'Đã cập nhật cửa hàng' : 'Đã thêm cửa hàng')
      refetch()

      if (mode === 'new') {
        setForm(emptyShop())
        setImageFile(null)
        navigate(withDomainPath('/managers/shops/create'), { replace: true })
        return
      }

      if (mode === 'stay') {
        setForm(resolveShopFromDetail(getData<TShop>(response) || form))
        setImageFile(null)
        return
      }

      closeModal()
    } catch {
      toast.error('Không thể lưu cửa hàng')
    }
  }

  const updateStatus = async (id?: number, nextStatusId?: number) => {
    if (!id || nextStatusId == null) return
    try {
      await request({ url: `shop/update-status?id=${id}&statusId=${nextStatusId}`, method: 'POST', body: {} }).unwrap()
      toast.success('Đã cập nhật trạng thái')
      refetch()
    } catch {
      toast.error('Không thể cập nhật trạng thái')
    }
  }

  const saveLicense = async (shop: TShop) => {
    const id = Number(shop.Id || 0)
    const license = (licenseDraftMap[id] ?? '').trim()
    if (!id || !license) {
      toast.error('Vui lòng nhập license')
      return
    }

    setRowLoadingMap(current => ({ ...current, [id]: true }))
    try {
      const detailResponse = await fetchDetail({ url: 'shop/detail', params: { id } }).unwrap()
      const detail = resolveShopFromDetail(getData<TShop>(detailResponse) || {})
      detail.License = license
      await request({ url: 'shop/update', method: 'POST', body: buildModelFormData(prepareShopPayload(detail)) }).unwrap()
      toast.success('Cập nhật license thành công')
      refetch()
    } catch {
      toast.error('Không thể cập nhật license')
    } finally {
      setRowLoadingMap(current => ({ ...current, [id]: false }))
    }
  }

  const templateOptions = useMemo(() => templates.filter(item => Number(item.Id || 0) > 0), [templates])

  const columns: ColumnDef<TShop>[] = [
    {
      id: 'stt',
      header: 'STT',
      meta: { className: 'w-16 text-center' },
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span>,
    },
    {
      id: 'name',
      header: 'Tên',
      meta: { className: 'min-w-[260px]' },
      cell: ({ row }) => {
        const item = row.original
        return (
          <button type="button" className="flex min-w-0 items-center gap-2 text-left" onClick={() => openEdit(item.Id)}>
            <PosImage url={item.Image?.Url} alt="" className="h-9 w-9 shrink-0 rounded-md border" />
            <span className="min-w-0">
              <span className="block truncate font-semibold text-foreground">{item.Name || '—'}</span>
              <CodeTag value={item.Code || item.Id} className="mt-1" />
            </span>
          </button>
        )
      },
    },
    {
      id: 'address',
      header: 'Địa chỉ',
      meta: { className: 'min-w-[260px]' },
      cell: ({ row }) => <span className="line-clamp-2 text-xs text-muted-foreground">{row.original.Address || '—'}</span>,
    },
    {
      id: 'phone',
      header: 'Điện thoại',
      meta: { className: 'min-w-[120px]' },
      cell: ({ row }) => <span className="font-medium tabular-nums">{row.original.Phone || '—'}</span>,
    },
    {
      id: 'created',
      header: 'Ngày tạo',
      meta: { className: 'min-w-[110px] text-center' },
      cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.CreationTime)}</span>,
    },
    {
      id: 'expiration',
      header: 'Hết hạn',
      meta: { className: 'min-w-[120px] text-center' },
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800/70">
          <CalendarDays className="h-3.5 w-3.5" />
          {fmtDate(row.original.ExpirationAt)}
        </span>
      ),
    },
    {
      id: 'license',
      header: 'License',
      meta: { className: 'min-w-[210px]' },
      cell: ({ row }) => {
        const item = row.original
        const id = Number(item.Id || 0)
        const license = getLicenseValue(item)
        if (license) {
          return (
            <span className="inline-flex max-w-[180px] items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/70">
              <KeyRound className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{license}</span>
            </span>
          )
        }
        return (
          <div className="flex items-center gap-1.5" onClick={event => event.stopPropagation()}>
            <Input
              value={licenseDraftMap[id] ?? ''}
              onChange={event => setLicenseDraftMap(current => ({ ...current, [id]: event.target.value }))}
              placeholder="Nhập license"
              className="h-8 w-32 text-xs"
              disabled={!!rowLoadingMap[id]}
            />
            <Button
              type="button"
              size="icon"
              className="h-8 w-8"
              disabled={!!rowLoadingMap[id] || !(licenseDraftMap[id] || '').trim()}
              onClick={() => saveLicense(item)}
              title="Lưu license"
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
    {
      id: 'stock',
      header: 'Kho hàng',
      meta: { className: 'min-w-[170px]' },
      cell: ({ row }) => (
        <span className="inline-flex max-w-[160px] items-center gap-2 rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800/70">
          <PosImage url={row.original.Stock?.Image?.Url} alt="" className="h-5 w-5 shrink-0 rounded" />
          <span className="truncate">{row.original.Stock?.Name || '—'}</span>
        </span>
      ),
    },
    {
      id: 'default',
      header: 'Mặc định',
      meta: { className: 'w-24 text-center' },
      cell: ({ row }) => row.original.IsDefault ? <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'status',
      header: 'Trạng thái',
      meta: { className: 'w-32 text-center' },
      cell: ({ row }) => <StatusBadge status={row.original.Status} />,
    },
    {
      id: 'actions',
      header: '',
      meta: { className: 'w-12 text-right' },
      cell: ({ row }) => {
        const item = row.original
        const currentStatus = Number(item.Status?.Id ?? STATUS_ACTIVE)
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={event => event.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => openEdit(item.Id)}>
                <Pencil className="mr-2 h-4 w-4" />
                Sửa
              </DropdownMenuItem>
              {currentStatus !== STATUS_ACTIVE ? (
                <DropdownMenuItem onClick={() => updateStatus(item.Id, STATUS_ACTIVE)}>
                  <ShieldCheck className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Hoạt động
                </DropdownMenuItem>
              ) : null}
              {currentStatus !== STATUS_LOCKED ? (
                <DropdownMenuItem onClick={() => updateStatus(item.Id, STATUS_LOCKED)}>
                  <ShieldOff className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Ngừng HĐ
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => {
                  if (window.confirm('Xóa cửa hàng này?')) updateStatus(item.Id, STATUS_DELETED)
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <ListToolbar
        left={(
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Danh mục cửa hàng</h1>
              <p className="text-xs text-muted-foreground">Quản lý thông tin, kho mặc định và cấu hình in</p>
            </div>
          </div>
        )}
        searchValue={keyword}
        searchPlaceholder="Tìm cửa hàng..."
        onSearchChange={value => { setKeyword(value); setPage(1) }}
        filters={(
          <select
            value={statusId}
            onChange={event => {
              setStatusId(event.target.value === '' ? '' : Number(event.target.value))
              setPage(1)
            }}
            className="h-10 min-w-[150px] rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Tất cả TT</option>
            <option value={STATUS_ACTIVE}>Hoạt động</option>
            <option value={STATUS_LOCKED}>Ngừng HĐ</option>
          </select>
        )}
        actions={(
          <ToolbarButton tone="primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Thêm mới
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
        onRowDoubleClick={shop => openEdit(shop.Id)}
        emptyText="Không có cửa hàng nào"
      />

      <ShopDialog
        open={modal}
        form={form}
        set={set}
        stocks={stocks}
        productCategories={productCategories}
        templates={templateOptions}
        imageFile={imageFile}
        setImageFile={setImageFile}
        imageInputRef={imageInputRef}
        loading={loadingDetail}
        saving={saving}
        onClose={closeModal}
        onSave={saveShop}
      />
    </div>
  )
}

function ShopDialog({
  open,
  form,
  set,
  stocks,
  productCategories,
  templates,
  imageFile,
  setImageFile,
  imageInputRef,
  loading,
  saving,
  onClose,
  onSave,
}: {
  open: boolean
  form: TShop
  set: (patch: Partial<TShop>) => void
  stocks: Array<TNamed & { Image?: { Url?: string } }>
  productCategories: TNamed[]
  templates: Array<Required<Pick<TNamed, 'Id'>> & TNamed>
  imageFile: File | null
  setImageFile: (file: File | null) => void
  imageInputRef: React.RefObject<HTMLInputElement>
  loading: boolean
  saving: boolean
  onClose: () => void
  onSave: (mode?: 'exit' | 'stay' | 'new') => void
}) {
  const previewImage = imageFile ? URL.createObjectURL(imageFile) : getImageUrl(form.Image?.Url)

  const selectedReportTemplateId = form.ReportTemplate?.Id || form.ReportTemplateId || 0
  const selectedReportTemplateTempId = form.ReportTemplateTemp?.Id || form.ReportTemplateTempId || 0

  const onSelectTemplate = (field: 'ReportTemplate' | 'ReportTemplateTemp', value: string) => {
    const id = Number(value || 0)
    const template = templates.find(item => Number(item.Id) === id)
    set({
      [field]: template || undefined,
      [field === 'ReportTemplate' ? 'ReportTemplateId' : 'ReportTemplateTempId']: id,
    } as Partial<TShop>)
  }

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <FormDialogContent className="max-w-5xl">
        <FormDialogHeader className="bg-primary px-6 py-5 text-primary-foreground">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-foreground/15">
              <Building2 className="h-5 w-5" />
            </span>
            <span>{form.Id ? 'Cập nhật cửa hàng' : 'Thêm cửa hàng'}</span>
          </DialogTitle>
        </FormDialogHeader>

        <FormDialogBody className="px-6 py-5">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Đang tải thông tin cửa hàng...</div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <section className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Mã cửa hàng">
                    <Input value={form.Code || form.Id || ''} readOnly className="bg-muted/50 text-muted-foreground" placeholder="Tự động" />
                  </Field>
                  <Field label="Tên cửa hàng" required>
                    <Input value={form.Name || ''} onChange={event => set({ Name: event.target.value })} placeholder="Tên cửa hàng" />
                  </Field>
                </div>

                <Field label="Địa chỉ">
                  <Textarea rows={3} value={form.Address || ''} onChange={event => set({ Address: event.target.value })} placeholder="Địa chỉ cửa hàng" />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Điện thoại">
                    <Input value={form.Phone || ''} onChange={event => set({ Phone: event.target.value })} placeholder="Số điện thoại" />
                  </Field>
                  <Field label="Email">
                    <Input type="email" value={form.Email || ''} onChange={event => set({ Email: event.target.value })} placeholder="Email" />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Kho hàng">
                    <select
                      value={form.Stock?.Id || ''}
                      onChange={event => {
                        const id = Number(event.target.value || 0)
                        set({ Stock: stocks.find(item => Number(item.Id) === id) })
                      }}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Chọn kho hàng</option>
                      {stocks.map(stock => <option key={stock.Id} value={stock.Id}>{stock.Name}</option>)}
                    </select>
                  </Field>
                  <Field label="Mô hình hoạt động">
                    <select
                      value={form.ProductCategory?.Id || ''}
                      onChange={event => {
                        const id = Number(event.target.value || 0)
                        set({ ProductCategory: productCategories.find(item => Number(item.Id) === id) || { Id: 0, Code: '', Name: '' } })
                      }}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Chọn ngành hàng</option>
                      {productCategories.map(category => <option key={category.Id} value={category.Id}>{category.Name}</option>)}
                    </select>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Ngày hết hạn">
                    <Input
                      type="date"
                      value={dateInputValue(form.ExpirationAt)}
                      onChange={event => set({ ExpirationAt: event.target.value })}
                    />
                  </Field>
                  <Field label="License">
                    <Input value={form.License || form.Key || ''} onChange={event => set({ License: event.target.value })} placeholder="License cửa hàng" />
                  </Field>
                </div>

                <section className="rounded-lg border bg-muted/30 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                    <KeyRound className="h-4 w-4 text-primary" />
                    Cấu hình in
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Mẫu hóa đơn">
                      <select
                        value={selectedReportTemplateId || ''}
                        onChange={event => onSelectTemplate('ReportTemplate', event.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">Chọn mẫu hóa đơn</option>
                        {templates.map(template => <option key={template.Id} value={template.Id}>{template.Name || template.Code}</option>)}
                      </select>
                    </Field>
                    <Field label="Mẫu in tạm tính">
                      <select
                        value={selectedReportTemplateTempId || ''}
                        onChange={event => onSelectTemplate('ReportTemplateTemp', event.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">Chọn mẫu in tạm tính</option>
                        {templates.map(template => <option key={template.Id} value={template.Id}>{template.Name || template.Code}</option>)}
                      </select>
                    </Field>
                  </div>
                </section>

                <Field label="Lời cảm ơn">
                  <Textarea rows={3} value={form.OtherNode || ''} onChange={event => set({ OtherNode: event.target.value })} placeholder="Nội dung hiển thị trên hóa đơn" />
                </Field>
              </section>

              <aside className="space-y-4">
                <section className="rounded-lg border border-dashed bg-card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <Label>Logo / Hình ảnh</Label>
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
                    {previewImage ? <img src={previewImage} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-12 w-12 text-muted-foreground/40" />}
                  </div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={event => setImageFile(event.target.files?.[0] || null)}
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()}>Chọn ảnh</Button>
                    <Button type="button" variant="ghost" onClick={() => setImageFile(null)}>Xóa ảnh mới</Button>
                  </div>
                </section>

                <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
                    <Warehouse className="h-4 w-4" />
                    Vận hành
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2 ring-1 ring-primary/15">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Cửa hàng mặc định</div>
                      <div className="text-xs text-muted-foreground">Ưu tiên khi tạo chứng từ</div>
                    </div>
                    <Switch checked={!!form.IsDefault} onCheckedChange={value => set({ IsDefault: value })} />
                  </div>
                  {form.Stock?.Name ? (
                    <div className="mt-3 flex items-center gap-2 rounded-md bg-background px-3 py-2 text-sm ring-1 ring-primary/15">
                      <PosImage url={form.Stock.Image?.Url} alt="" className="h-8 w-8 rounded" />
                      <span className="min-w-0 truncate font-medium">{form.Stock.Name}</span>
                    </div>
                  ) : null}
                </section>
              </aside>
            </div>
          )}
        </FormDialogBody>

        <FormDialogFooter className="px-6 py-4">
          <Button variant="outline" onClick={onClose}>Hủy bỏ</Button>
          <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" onClick={() => onSave('new')} disabled={saving}>
            Lưu mới
          </Button>
          <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" onClick={() => onSave('stay')} disabled={saving}>
            Lưu
          </Button>
          <Button onClick={() => onSave('exit')} disabled={saving} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600">
            <Save className="h-4 w-4" />
            {saving ? 'Đang lưu...' : 'Lưu thoát'}
          </Button>
        </FormDialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label>{label}{required ? <span className="ml-0.5 text-destructive">*</span> : null}</Label>
      {children}
    </div>
  )
}

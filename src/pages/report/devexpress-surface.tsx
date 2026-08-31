import '@devexpress/analytics-core/dist/css/dx-analytics.common.css'
import '@devexpress/analytics-core/dist/css/dx-analytics.light.css'
import dayjs from 'dayjs'
import 'devexpress-reporting/dist/css/dx-reportdesigner.css'
import 'devexpress-reporting/dist/css/dx-reporting-skeleton-screen.css'
import 'devexpress-reporting/dist/css/dx-webdocumentviewer.css'
import 'devexpress-reporting/dx-reportdesigner-imports'
import 'devexpress-reporting/dx-webdocumentviewer-imports'
import 'devextreme/dist/css/dx.light.css'
import { ajaxSetup, fetchSetup } from '@devexpress/analytics-core/analytics-utils'
import { DxReportDesigner } from 'devexpress-reporting/designer/jsReportDesignerBinding'
import { DxReportViewer } from 'devexpress-reporting/viewer/binding/jsReportViewerBinding.binding'
import { FileText, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STATUS } from '@/constants/status'
import { DateRangeFilter } from '@/pages/actives/shared'
import { useFilterReportQuery } from '@/store/slice/generic/api'
import { useGetSettingOrderQuery } from '@/store/slice/settings/api'
import { cn, toDateInputValue, toUtcEndOfDay, toUtcStartOfDay } from '@/utils'

// DevExpress wants an absolute host ending in "/". Hosted builds point at their
// own origin so the /DXXRDV and /DXXRD rewrites (vercel.json) proxy the calls —
// the API only whitelists posmobile.vn and localhost for CORS. Dev keeps the
// direct host because the vite proxy already covers those paths.
const REPORT_HOST = import.meta.env.DEV
  ? 'https://api.posmobile.vn/'
  : `${window.location.origin}/`
const VIEWER_ACTION = '/DXXRDV'
const DESIGNER_MODEL_ACTION = '/DXXRD/GetDesignerModel'

type ReportRequestBody = {
  FromDate?: string | null
  ToDate?: string | null
  Date?: string | null
  CustomerGroupId?: number | null
  ProductGroupId?: number | null
  StockId?: number | null
  ProductId?: number | null
  SupplierId?: number | null
}

type DevExpressBinding = {
  render: () => void
  dispose?: () => void
}

type ExportRequestData = {
  RequestUrl?: string
  FormData?: Record<string, unknown>
  QueryParameters?: Record<string, unknown>
}

type PosMobileReportWindow = Window & {
  __posmobileReportViewer?: DevExpressBinding | null
}

function isMobileReportMode() {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.get('mobile') === '1' || params.get('mobilePdf') === '1'
}

function formatReportDate(value: string, boundary: 'start' | 'end') {
  if (!value) return null

  const date = boundary === 'start'
    ? dayjs(value).startOf('day')
    : dayjs(value).endOf('day')

  return date.toDate().toISOString()
}

function fromDateInputValue(value: string) {
  return toUtcEndOfDay(dayjs(value))
}

function optionalSelectId(value: string) {
  return value === 'all' ? null : Number(value)
}

function resolveActionKey(data: unknown) {
  if (typeof data === 'string') {
    const query = data.includes('?') ? data.slice(data.indexOf('?') + 1) : data
    const params = new URLSearchParams(query)
    return params.get('actionKey')
  }

  if (data instanceof URLSearchParams) {
    return data.get('actionKey')
  }

  if (data && typeof data === 'object' && 'actionKey' in data) {
    return String((data as { actionKey?: unknown }).actionKey ?? '')
  }

  return null
}

function shouldAppendReportRequestBody(data: unknown) {
  const actionKey = resolveActionKey(data)
  return actionKey === 'openReport'
    || actionKey === 'startBuild'
    || actionKey === 'startExport'
    || actionKey === 'exportTo'
    || actionKey === 'getExportStatus'
    || actionKey === 'getExportResult'
}

function clearFetchSettings() {
  const settings = fetchSetup.fetchSettings as Record<string, unknown>
  Object.keys(settings || {}).forEach(key => {
    delete settings[key]
  })
}

function appendReportRequestBody(data: unknown, requestBody: ReportRequestBody) {
  if (!shouldAppendReportRequestBody(data)) return data

  const payload = JSON.stringify(requestBody)

  if (typeof data === 'string') {
    if (data.includes('ReportRequestBody=')) return data
    const separator = data ? '&' : ''
    return `${data}${separator}ReportRequestBody=${encodeURIComponent(payload)}`
  }

  if (data instanceof URLSearchParams) {
    if (!data.has('ReportRequestBody')) data.append('ReportRequestBody', payload)
    return data
  }

  if (data && typeof data === 'object') {
    if ('ReportRequestBody' in data) return data
    return { ...data, ReportRequestBody: payload }
  }

  return data
}

function appendReportRequestBodyToUrl(url: unknown, requestBody: ReportRequestBody) {
  if (typeof url !== 'string' || !shouldAppendReportRequestBody(url)) return url
  if (url.includes('ReportRequestBody=')) return url

  const payload = encodeURIComponent(JSON.stringify(requestBody))
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}ReportRequestBody=${payload}`
}

function resolveExportRequestData(value: unknown): ExportRequestData | null {
  if (!value || typeof value !== 'object') return null

  const request = value as ExportRequestData & { args?: ExportRequestData }
  if (request.RequestUrl || request.FormData || request.QueryParameters) return request
  if (request.args?.RequestUrl || request.args?.FormData || request.args?.QueryParameters) return request.args

  return null
}

function appendReportRequestBodyToExportRequest(
  request: ExportRequestData,
  requestBody: ReportRequestBody,
) {
  const payload = JSON.stringify(requestBody)

  request.FormData = {
    ...(request.FormData || {}),
    ReportRequestBody: payload,
  }
  request.QueryParameters = {
    ...(request.QueryParameters || {}),
    ReportRequestBody: encodeURIComponent(payload),
  }
}

function setAuthorization(token: string) {
  if (!token) return
  clearFetchSettings()

  ajaxSetup.ajaxSettings.headers = {
    ...(ajaxSetup.ajaxSettings.headers || {}),
    Authorization: `Bearer ${token}`,
  }
}

function clearReportRequestHooks(ajaxHook?: JQueryAjaxSettings['beforeSend']) {
  if (ajaxHook && ajaxSetup.ajaxSettings.beforeSend === ajaxHook) {
    delete ajaxSetup.ajaxSettings.beforeSend
  }
}

function ReportShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-4 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-800">{title}</p>
            <p className="text-[11px] text-slate-500">{subtitle}</p>
          </div>
          {action}
        </div>
      </div>
      {children}
    </div>
  )
}

export function DevExpressReportViewer({
  reportCode,
  token,
  custom = false,
}: {
  reportCode: string
  token: string
  custom?: boolean
}) {
  const mobileMode = useMemo(isMobileReportMode, [])
  const isCustomerLiabilitySampleReport = reportCode === 'sample-data/customer-liability'
  const isInventorySampleReport = reportCode === 'sample-data/inventory'
  const isInventoryImportExportSummarySampleReport = reportCode === 'sample-data/inventory-import-export-summary'
  const isInventoryImportExportDetailSampleReport = reportCode === 'sample-data/inventory-import-export-detail'
  const isInventoryCardSampleReport = reportCode === 'sample-data/inventory-card'
  const hasReportFilter = custom
    || isCustomerLiabilitySampleReport
    || isInventorySampleReport
    || isInventoryImportExportSummarySampleReport
    || isInventoryImportExportDetailSampleReport
    || isInventoryCardSampleReport
  const [dateFrom, setDateFrom] = useState(toUtcStartOfDay(dayjs().startOf('month')))
  const [dateTo, setDateTo] = useState(toUtcEndOfDay(
    isInventoryImportExportSummarySampleReport || isInventoryImportExportDetailSampleReport || isInventoryCardSampleReport
      ? dayjs()
      : dayjs().endOf('month'),
  ))
  const [inventoryDate, setInventoryDate] = useState(toUtcEndOfDay(dayjs()))
  const [customerGroupId, setCustomerGroupId] = useState('all')
  const [productGroupId, setProductGroupId] = useState('all')
  const [stockId, setStockId] = useState('all')
  const [productId, setProductId] = useState('all')
  const [supplierId, setSupplierId] = useState('all')
  const [viewerKey, setViewerKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const { data: settingOrder } = useGetSettingOrderQuery()
  const { data: customerGroupsData } = useFilterReportQuery(
    { path: 'customergroups/filter-simple', params: { PageIndex: 0, PageSize: 1000, StatusId: STATUS.ACTIVE } },
    { skip: !isCustomerLiabilitySampleReport },
  )
  const { data: productGroupsData } = useFilterReportQuery(
    { path: 'productgroups/filter-simple', params: { PageIndex: 0, PageSize: 1000, StatusId: STATUS.ACTIVE } },
    { skip: !isInventorySampleReport && !isInventoryImportExportSummarySampleReport && !isInventoryImportExportDetailSampleReport },
  )
  const { data: stocksData } = useFilterReportQuery(
    { path: 'stock/filter-simple', params: { PageIndex: 0, PageSize: 1000, StatusId: STATUS.ACTIVE } },
    { skip: !isInventorySampleReport && !isInventoryImportExportSummarySampleReport && !isInventoryImportExportDetailSampleReport && !isInventoryCardSampleReport },
  )
  const { data: productsData } = useFilterReportQuery(
    { path: 'products/filter-simple', params: { PageIndex: 0, PageSize: 1000, StatusId: STATUS.ACTIVE } },
    { skip: !isInventorySampleReport && !isInventoryCardSampleReport },
  )
  const { data: suppliersData } = useFilterReportQuery(
    { path: 'suppliers/filter-simple', params: { PageIndex: 0, PageSize: 1000, StatusId: STATUS.ACTIVE } },
    { skip: !isInventoryImportExportSummarySampleReport },
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const bindingRef = useRef<DevExpressBinding | null>(null)
  const ajaxBeforeSendRef = useRef<JQueryAjaxSettings['beforeSend']>()
  const defaultStockAppliedRef = useRef(false)
  const requestBodyRef = useRef<ReportRequestBody>(
    isInventorySampleReport
      ? {
          Date: formatReportDate(toUtcEndOfDay(dayjs()), 'end'),
          ProductGroupId: null,
          StockId: null,
          ProductId: null,
        }
      : isInventoryImportExportSummarySampleReport
        ? {
            FromDate: formatReportDate(toUtcStartOfDay(dayjs().startOf('month')), 'start'),
            ToDate: formatReportDate(toUtcEndOfDay(dayjs()), 'end'),
            StockId: null,
            ProductGroupId: null,
            SupplierId: null,
          }
      : isInventoryImportExportDetailSampleReport
        ? {
            FromDate: formatReportDate(toUtcStartOfDay(dayjs().startOf('month')), 'start'),
            ToDate: formatReportDate(toUtcEndOfDay(dayjs()), 'end'),
            StockId: null,
            ProductGroupId: null,
          }
      : isInventoryCardSampleReport
        ? {
            FromDate: formatReportDate(toUtcStartOfDay(dayjs().startOf('month')), 'start'),
            ToDate: formatReportDate(toUtcEndOfDay(dayjs()), 'end'),
            ProductId: null,
            StockId: null,
          }
      : {
          FromDate: formatReportDate(toUtcStartOfDay(dayjs().startOf('month')), 'start'),
          ToDate: formatReportDate(toUtcEndOfDay(dayjs().endOf('month')), 'end'),
          ...(isCustomerLiabilitySampleReport ? { CustomerGroupId: null } : {}),
        },
  )

  const displayCode = reportCode !== 'TestReport' ? reportCode : 'Báo cáo'
  const customerGroups = customerGroupsData?.Items ?? []
  const productGroups = productGroupsData?.Items ?? []
  const stocks = useMemo(() => {
    const items = stocksData?.Items ?? []
    const defaultStock = settingOrder?.StockDefault
    if (!defaultStock?.Id || items.some(item => item.Id === defaultStock.Id)) return items
    return [defaultStock, ...items]
  }, [settingOrder?.StockDefault, stocksData?.Items])
  const products = productsData?.Items ?? []
  const suppliers = suppliersData?.Items ?? []

  const disposeViewer = useCallback(() => {
    if (bindingRef.current?.dispose) {
      try { bindingRef.current.dispose() } catch { /* ignore */ }
    }
    bindingRef.current = null
  }, [])

  const initViewer = useCallback(() => {
    if (!containerRef.current || !token) return

    try {
      setError(null)
      setAuthorization(token)
      clearReportRequestHooks(ajaxBeforeSendRef.current)

      if (hasReportFilter) {
        const ajaxHook: JQueryAjaxSettings['beforeSend'] = (_xhr, settings) => {
          settings.data = appendReportRequestBody(settings.data, requestBodyRef.current) as JQueryAjaxSettings['data']
          settings.url = appendReportRequestBodyToUrl(settings.url, requestBodyRef.current) as JQueryAjaxSettings['url']
        }

        ajaxBeforeSendRef.current = ajaxHook
        ajaxSetup.ajaxSettings.beforeSend = ajaxHook
      }

      disposeViewer()

      const viewer = new DxReportViewer(containerRef.current, {
        reportUrl: reportCode,
        requestOptions: {
          host: REPORT_HOST,
          invokeAction: VIEWER_ACTION,
        },
        callbacks: {
          BeforeRender: () => setAuthorization(token),
          OnExport: (...args: unknown[]) => {
            if (!hasReportFilter) return
            const request = resolveExportRequestData(args[args.length - 1])
            if (request) appendReportRequestBodyToExportRequest(request, requestBodyRef.current)
          },
        },
        exportSettings: {
          useSameTab: true,
        },
      })

      viewer.render()
      bindingRef.current = viewer
      ;(window as PosMobileReportWindow).__posmobileReportViewer = viewer
    } catch (err) {
      console.error('[DevExpressReportViewer] init failed:', err)
      setError('Không thể khởi tạo DevExpress Report Viewer.')
    }
  }, [disposeViewer, hasReportFilter, mobileMode, reportCode, token])

  useEffect(() => {
    initViewer()

    return () => {
      const currentViewer = bindingRef.current
      clearReportRequestHooks(ajaxBeforeSendRef.current)
      disposeViewer()
      if ((window as PosMobileReportWindow).__posmobileReportViewer === currentViewer) {
        ;(window as PosMobileReportWindow).__posmobileReportViewer = null
      }
    }
  }, [disposeViewer, initViewer, viewerKey])

  useEffect(() => {
    if (
      (!isInventorySampleReport &&
        !isInventoryImportExportSummarySampleReport &&
        !isInventoryImportExportDetailSampleReport &&
        !isInventoryCardSampleReport) ||
      defaultStockAppliedRef.current
    ) {
      return
    }
    const defaultStockId = settingOrder?.StockDefault?.Id
    if (!defaultStockId) return

    defaultStockAppliedRef.current = true
    setStockId(`${defaultStockId}`)
    requestBodyRef.current = isInventorySampleReport
      ? {
          Date: formatReportDate(inventoryDate, 'end'),
          ProductGroupId: optionalSelectId(productGroupId),
          StockId: defaultStockId,
          ProductId: optionalSelectId(productId),
        }
      : {
          FromDate: formatReportDate(dateFrom, 'start'),
          ToDate: formatReportDate(dateTo, 'end'),
          StockId: defaultStockId,
          ProductGroupId: optionalSelectId(productGroupId),
          ...(isInventoryImportExportSummarySampleReport
            ? { SupplierId: optionalSelectId(supplierId) }
            : {}),
          ...(isInventoryCardSampleReport
            ? { ProductId: optionalSelectId(productId) }
            : {}),
        }
    setViewerKey(key => key + 1)
  }, [
    dateFrom,
    dateTo,
    inventoryDate,
    isInventoryImportExportSummarySampleReport,
    isInventoryImportExportDetailSampleReport,
    isInventoryCardSampleReport,
    isInventorySampleReport,
    productGroupId,
    productId,
    settingOrder?.StockDefault?.Id,
    supplierId,
  ])

  const applyDateFilter = () => {
    requestBodyRef.current = isInventorySampleReport
      ? {
          Date: formatReportDate(inventoryDate, 'end'),
          ProductGroupId: optionalSelectId(productGroupId),
          StockId: optionalSelectId(stockId),
          ProductId: optionalSelectId(productId),
        }
      : isInventoryImportExportSummarySampleReport
        ? {
            FromDate: formatReportDate(dateFrom, 'start'),
            ToDate: formatReportDate(dateTo, 'end'),
            StockId: optionalSelectId(stockId),
            ProductGroupId: optionalSelectId(productGroupId),
            SupplierId: optionalSelectId(supplierId),
          }
      : isInventoryImportExportDetailSampleReport
        ? {
            FromDate: formatReportDate(dateFrom, 'start'),
            ToDate: formatReportDate(dateTo, 'end'),
            StockId: optionalSelectId(stockId),
            ProductGroupId: optionalSelectId(productGroupId),
          }
      : isInventoryCardSampleReport
        ? {
            FromDate: formatReportDate(dateFrom, 'start'),
            ToDate: formatReportDate(dateTo, 'end'),
            ProductId: optionalSelectId(productId),
            StockId: optionalSelectId(stockId),
          }
      : {
          FromDate: formatReportDate(dateFrom, 'start'),
          ToDate: formatReportDate(dateTo, 'end'),
          ...(isCustomerLiabilitySampleReport
            ? { CustomerGroupId: optionalSelectId(customerGroupId) }
            : {}),
        }
    setViewerKey(key => key + 1)
  }

  const action = hasReportFilter && !mobileMode ? (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
      {isInventorySampleReport ? (
        <>
          <Input
            type="date"
            className="h-8 w-36 text-xs"
            value={toDateInputValue(inventoryDate)}
            onChange={event => setInventoryDate(fromDateInputValue(event.target.value))}
          />
          <Select value={productGroupId} onValueChange={setProductGroupId}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Tất cả nhóm hàng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nhóm hàng</SelectItem>
              {productGroups.map(group => (
                <SelectItem key={group.Id} value={`${group.Id}`}>
                  {group.Name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stockId} onValueChange={setStockId}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Tất cả kho" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả kho</SelectItem>
              {stocks.map(stock => (
                <SelectItem key={stock.Id} value={`${stock.Id}`}>
                  {stock.Name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="Tất cả mặt hàng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả mặt hàng</SelectItem>
              {products.map(product => (
                <SelectItem key={product.Id} value={`${product.Id}`}>
                  {product.Name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      ) : (
        <DateRangeFilter
          from={dateFrom}
          to={dateTo}
          onFrom={setDateFrom}
          onTo={setDateTo}
          compact
        />
      )}
      {isCustomerLiabilitySampleReport && (
        <Select value={customerGroupId} onValueChange={setCustomerGroupId}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Tất cả" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {customerGroups.map(group => (
              <SelectItem key={group.Id} value={`${group.Id}`}>
                {group.Name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {isInventoryImportExportSummarySampleReport && (
        <>
          <Select value={stockId} onValueChange={setStockId}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Kho hàng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả kho</SelectItem>
              {stocks.map(stock => (
                <SelectItem key={stock.Id} value={`${stock.Id}`}>
                  {stock.Name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={productGroupId} onValueChange={setProductGroupId}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Tất cả nhóm hàng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nhóm hàng</SelectItem>
              {productGroups.map(group => (
                <SelectItem key={group.Id} value={`${group.Id}`}>
                  {group.Name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="Tất cả nhà cung cấp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nhà cung cấp</SelectItem>
              {suppliers.map(supplier => (
                <SelectItem key={supplier.Id} value={`${supplier.Id}`}>
                  {supplier.Name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
      {isInventoryImportExportDetailSampleReport && (
        <>
          <Select value={stockId} onValueChange={setStockId}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Kho hàng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả kho</SelectItem>
              {stocks.map(stock => (
                <SelectItem key={stock.Id} value={`${stock.Id}`}>
                  {stock.Name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={productGroupId} onValueChange={setProductGroupId}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Tất cả nhóm hàng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nhóm hàng</SelectItem>
              {productGroups.map(group => (
                <SelectItem key={group.Id} value={`${group.Id}`}>
                  {group.Name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
      {isInventoryCardSampleReport && (
        <>
          <Select value={productId === 'all' ? undefined : productId} onValueChange={setProductId}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="Chọn mặt hàng" />
            </SelectTrigger>
            <SelectContent>
              {products.map(product => (
                <SelectItem key={product.Id} value={`${product.Id}`}>
                  {product.Name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stockId} onValueChange={setStockId}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Kho hàng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả kho</SelectItem>
              {stocks.map(stock => (
                <SelectItem key={stock.Id} value={`${stock.Id}`}>
                  {stock.Name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
      <Button size="sm" className="h-8 gap-1.5 px-3 text-xs font-semibold" onClick={applyDateFilter}>
        <Search className="h-3.5 w-3.5" />
        Xem báo cáo
      </Button>
    </div>
  ) : null

  const content = (
    <div
      className={cn(
        'relative min-h-0 flex-1 overflow-hidden bg-white',
        mobileMode ? 'mt-0 rounded-none border-0 shadow-none' : 'mt-2 rounded-lg border border-slate-200 shadow-sm',
      )}
    >
        {!token && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-slate-400">
            Đang xác thực...
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-rose-600">
            {error}
          </div>
        )}

        <div ref={containerRef} className="absolute inset-0" />
      </div>
  )

  if (mobileMode) {
    return <div className="flex h-full min-h-0 flex-col">{content}</div>
  }

  return (
    <ReportShell
      title={displayCode}
      subtitle={hasReportFilter ? 'Xem báo cáo tùy chỉnh' : 'Xem báo cáo'}
      action={action}
    >
      {content}
    </ReportShell>
  )
}

export function DevExpressReportDesigner({
  reportCode,
  token,
}: {
  reportCode: string
  token: string
}) {
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const bindingRef = useRef<DevExpressBinding | null>(null)

  const displayCode = useMemo(
    () => reportCode !== 'TestReport' ? reportCode : 'Report Designer',
    [reportCode],
  )

  useEffect(() => {
    if (!containerRef.current || !token) return

    try {
      setError(null)
      setAuthorization(token)

      if (bindingRef.current?.dispose) {
        try { bindingRef.current.dispose() } catch { /* ignore */ }
      }

      const designer = new DxReportDesigner(containerRef.current, {
        reportUrl: reportCode,
        requestOptions: {
          host: REPORT_HOST,
          getDesignerModelAction: DESIGNER_MODEL_ACTION,
        },
        callbacks: {
          BeforeRender: () => setAuthorization(token),
        },
      })

      designer.render()
      bindingRef.current = designer
    } catch (err) {
      console.error('[DevExpressReportDesigner] init failed:', err)
      setError('Không thể khởi tạo DevExpress Report Designer.')
    }

    return () => {
      if (bindingRef.current?.dispose) {
        try { bindingRef.current.dispose() } catch { /* ignore */ }
      }
      bindingRef.current = null
    }
  }, [reportCode, token])

  return (
    <ReportShell title={displayCode} subtitle="Thiết kế báo cáo">
      <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {!token && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-slate-400">
            Đang xác thực...
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-rose-600">
            {error}
          </div>
        )}

        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </ReportShell>
  )
}

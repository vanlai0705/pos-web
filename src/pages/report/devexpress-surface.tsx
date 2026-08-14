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
import { Calendar, FileText, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DateRangeFilter, toUtcEndOfDay, toUtcStartOfDay } from '@/pages/actives/shared'
import { cn } from '@/utils'

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
  FromDate: string | null
  ToDate: string | null
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
        <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-4 py-2.5">
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
  const [dateFrom, setDateFrom] = useState(toUtcStartOfDay(dayjs().startOf('month')))
  const [dateTo, setDateTo] = useState(toUtcEndOfDay(dayjs().endOf('month')))
  const [filterOpen, setFilterOpen] = useState(custom && !mobileMode)
  const [viewerKey, setViewerKey] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const bindingRef = useRef<DevExpressBinding | null>(null)
  const ajaxBeforeSendRef = useRef<JQueryAjaxSettings['beforeSend']>()
  const requestBodyRef = useRef<ReportRequestBody>({
    FromDate: formatReportDate(toUtcStartOfDay(dayjs().startOf('month')), 'start'),
    ToDate: formatReportDate(toUtcEndOfDay(dayjs().endOf('month')), 'end'),
  })

  const displayCode = reportCode !== 'TestReport' ? reportCode : 'Báo cáo'

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

      if (custom) {
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
            if (!custom) return
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
  }, [custom, disposeViewer, mobileMode, reportCode, token])

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

  const applyDateFilter = () => {
    requestBodyRef.current = {
      FromDate: formatReportDate(dateFrom, 'start'),
      ToDate: formatReportDate(dateTo, 'end'),
    }
    setFilterOpen(false)
    setViewerKey(key => key + 1)
  }

  const action = custom && !mobileMode ? (
    <Button
      size="sm"
      variant="outline"
      className="h-8 gap-1.5 text-xs"
      onClick={() => setFilterOpen(value => !value)}
    >
      <Calendar className="h-3.5 w-3.5" />
      Thời gian
    </Button>
  ) : null

  const content = (
    <div
      className={cn(
        'relative min-h-0 flex-1 overflow-hidden bg-white',
        mobileMode ? 'mt-0 rounded-none border-0 shadow-none' : 'mt-2 rounded-lg border border-slate-200 shadow-sm',
      )}
    >
        {custom && !mobileMode && (
          <div
            className={cn(
              'absolute left-3 top-3 z-[120] w-[520px] max-w-[calc(100vw-88px)] rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 transition-all duration-200',
              filterOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-3 opacity-0',
            )}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-50 text-sky-600">
                  <Calendar className="h-4 w-4" />
                </span>
                <span>Thời gian báo cáo</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setFilterOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 p-3">
              <DateRangeFilter
                from={dateFrom}
                to={dateTo}
                onFrom={setDateFrom}
                onTo={setDateTo}
                compact
                disablePortal
              />
              <Button className="h-9 w-full gap-2 text-xs font-semibold" onClick={applyDateFilter}>
                <Search className="h-4 w-4" />
                Xem báo cáo
              </Button>
            </div>
          </div>
        )}

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
      subtitle={custom ? 'Xem báo cáo tùy chỉnh' : 'Xem báo cáo'}
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, FileText, Search, X } from 'lucide-react'
import dayjs from 'dayjs'
import { ajaxSetup, fetchSetup } from '@devexpress/analytics-core/analytics-utils'
import { DxReportViewer } from 'devexpress-reporting/viewer/binding/jsReportViewerBinding.binding'
import { DxReportDesigner } from 'devexpress-reporting/designer/jsReportDesignerBinding'
import 'devexpress-reporting/dx-webdocumentviewer-imports'
import 'devexpress-reporting/dx-reportdesigner-imports'
import 'devextreme/dist/css/dx.light.css'
import '@devexpress/analytics-core/dist/css/dx-analytics.common.css'
import '@devexpress/analytics-core/dist/css/dx-analytics.light.css'
import 'devexpress-reporting/dist/css/dx-reporting-skeleton-screen.css'
import 'devexpress-reporting/dist/css/dx-webdocumentviewer.css'
import 'devexpress-reporting/dist/css/dx-reportdesigner.css'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils'

const REPORT_HOST = import.meta.env.DEV ? '' : 'https://api.posmobile.vn/'
const VIEWER_ACTION = '/DXXRDV'
const DESIGNER_MODEL_ACTION = '/DXXRD/GetDesignerModel'

type ReportRequestBody = {
  FromDate: string | null
  ToDate: string | null
}

type RequestSettings = RequestInit & {
  data?: unknown
  actionKey?: string
  beforeSend?: (settings: RequestSettings) => void | Promise<void>
}

type DevExpressBinding = {
  render: () => void
  dispose?: () => void
}

function formatReportDate(value: string, boundary: 'start' | 'end') {
  if (!value) return null

  const date = boundary === 'start'
    ? dayjs(value).startOf('day')
    : dayjs(value).endOf('day')

  return date.format('YYYY-MM-DDTHH:mm:ss.SSS')
}

function resolveActionKey(data: unknown) {
  if (typeof data === 'string') {
    const params = new URLSearchParams(data)
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
  return actionKey === 'openReport' || actionKey === 'startBuild'
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

function setAuthorization(token: string) {
  if (!token) return

  ajaxSetup.ajaxSettings.headers = {
    ...(ajaxSetup.ajaxSettings.headers || {}),
    Authorization: `Bearer ${token}`,
  }

  fetchSetup.fetchSettings.headers = {
    ...(fetchSetup.fetchSettings.headers || {}),
    Authorization: `Bearer ${token}`,
  }
}

type FetchBeforeSend = NonNullable<RequestSettings['beforeSend']>

function clearReportRequestHooks(ajaxHook?: JQueryAjaxSettings['beforeSend'], fetchHook?: FetchBeforeSend) {
  if (ajaxHook && ajaxSetup.ajaxSettings.beforeSend === ajaxHook) {
    delete ajaxSetup.ajaxSettings.beforeSend
  }

  if (fetchHook && fetchSetup.fetchSettings.beforeSend === fetchHook) {
    delete fetchSetup.fetchSettings.beforeSend
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
  const [dateFrom, setDateFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [dateTo, setDateTo] = useState(dayjs().endOf('month').format('YYYY-MM-DD'))
  const [filterOpen, setFilterOpen] = useState(custom)
  const [viewerKey, setViewerKey] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const bindingRef = useRef<DevExpressBinding | null>(null)
  const ajaxBeforeSendRef = useRef<JQueryAjaxSettings['beforeSend']>()
  const fetchBeforeSendRef = useRef<FetchBeforeSend>()
  const requestBodyRef = useRef<ReportRequestBody>({
    FromDate: formatReportDate(dayjs().startOf('month').format('YYYY-MM-DD'), 'start'),
    ToDate: formatReportDate(dayjs().endOf('month').format('YYYY-MM-DD'), 'end'),
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
      clearReportRequestHooks(ajaxBeforeSendRef.current, fetchBeforeSendRef.current)

      if (custom) {
        const ajaxHook: JQueryAjaxSettings['beforeSend'] = (_xhr, settings) => {
          settings.data = appendReportRequestBody(settings.data, requestBodyRef.current) as JQueryAjaxSettings['data']
        }
        const fetchHook: FetchBeforeSend = settings => {
          const requestSettings = settings
          requestSettings.body = appendReportRequestBody(requestSettings.body, requestBodyRef.current) as BodyInit | null | undefined
          requestSettings.data = appendReportRequestBody(requestSettings.data, requestBodyRef.current)
        }

        ajaxBeforeSendRef.current = ajaxHook
        fetchBeforeSendRef.current = fetchHook
        ajaxSetup.ajaxSettings.beforeSend = ajaxHook
        fetchSetup.fetchSettings.beforeSend = fetchHook
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
        },
      })

      viewer.render()
      bindingRef.current = viewer
    } catch (err) {
      console.error('[DevExpressReportViewer] init failed:', err)
      setError('Không thể khởi tạo DevExpress Report Viewer.')
    }
  }, [custom, disposeViewer, reportCode, token])

  useEffect(() => {
    initViewer()

    return () => {
      clearReportRequestHooks(ajaxBeforeSendRef.current, fetchBeforeSendRef.current)
      disposeViewer()
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

  const action = custom ? (
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

  return (
    <ReportShell
      title={displayCode}
      subtitle={custom ? 'Xem báo cáo tùy chỉnh' : 'Xem báo cáo'}
      action={action}
    >
      <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {custom && (
          <div
            className={cn(
              'absolute left-3 top-3 z-[120] w-[320px] max-w-[calc(100vw-88px)] rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 transition-all duration-200',
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
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">Từ ngày</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={event => setDateFrom(event.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">Đến ngày</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={event => setDateTo(event.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
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

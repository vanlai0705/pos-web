import { useEffect, useRef, useCallback, useState } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { FileText, Calendar, X, Search } from 'lucide-react'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/store/slice/users/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import dayjs from 'dayjs'

const HOST_URL = import.meta.env.DEV ? '' : 'https://api.posmobile.vn'
const INVOKE_ACTION = '/DXXRDV'

export default function ReportCustomViewerPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const auth = useAppSelector(selectAuth)
  const token = auth.data?.SessionToken ?? ''

  const reportCode =
    searchParams.get('code') ||
    location.pathname.split('/').filter(Boolean).pop() ||
    'TestReport'

  const [dateFrom, setDateFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [dateTo, setDateTo] = useState(dayjs().endOf('month').format('YYYY-MM-DD'))
  const [filterOpen, setFilterOpen] = useState(true)
  const [viewerKey, setViewerKey] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const bindingRef = useRef<any>(null)
  const beforeSendRef = useRef<((s: any) => void | Promise<void>) | null>(null)

  // Mutable ref so the beforeSend hook always reads the latest date range
  const dateRangeRef = useRef({
    from: dayjs().startOf('month').format('YYYY-MM-DDTHH:mm:ss.SSS'),
    to: dayjs().endOf('month').format('YYYY-MM-DDTHH:mm:ss.SSS'),
  })

  const initViewer = useCallback(async () => {
    if (!containerRef.current || !token) return

    try {
      // Register all DevExpress templates, bindings, and DevExtreme KO integrations.
      // Without this, getTemplate('dxrd-designer') returns null and the viewer DOM never renders.
      await import(/* @vite-ignore */ 'devexpress-reporting/dx-webdocumentviewer-imports')
      const { DxReportViewer } = await import(
        /* @vite-ignore */
        'devexpress-reporting/viewer/binding/jsReportViewerBinding.binding'
      )
      // DevExpress 26.1.3 uses FetchRequestManager (native fetch).
      // Auth headers and beforeSend hooks must go on fetchSetup, not ajaxSetup.
      const { fetchSetup } = await import(
        /* @vite-ignore */
        '@devexpress/analytics-core/analytics-utils-native'
      )

      if (!fetchSetup.fetchSettings) fetchSetup.fetchSettings = {}

      fetchSetup.fetchSettings.headers = {
        ...(fetchSetup.fetchSettings.headers || {}),
        Authorization: `Bearer ${token}`,
      }

      // Remove stale beforeSend from a previous mount
      if (beforeSendRef.current && fetchSetup.fetchSettings.beforeSend === beforeSendRef.current) {
        delete fetchSetup.fetchSettings.beforeSend
      }

      // Inject ReportRequestBody into openReport / startBuild requests.
      // FetchRequestManager passes settings = { method, headers, body: URLSearchParams, signal }
      const hook = async (settings: any) => {
        const body: unknown = settings.body
        if (body instanceof URLSearchParams) {
          const actionKey = body.get('actionKey')
          if (
            (actionKey === 'openReport' || actionKey === 'startBuild') &&
            !body.has('ReportRequestBody')
          ) {
            body.append(
              'ReportRequestBody',
              JSON.stringify({
                FromDate: dateRangeRef.current.from,
                ToDate: dateRangeRef.current.to,
              }),
            )
          }
        }
      }
      beforeSendRef.current = hook
      fetchSetup.fetchSettings.beforeSend = hook

      if (bindingRef.current) {
        try { bindingRef.current.dispose() } catch { /* ignore */ }
        bindingRef.current = null
      }

      const viewer = new DxReportViewer(containerRef.current, {
        reportUrl: reportCode,
        requestOptions: { host: HOST_URL, invokeAction: INVOKE_ACTION },
        callbacks: {
          BeforeRender: () => {
            if (!fetchSetup.fetchSettings) fetchSetup.fetchSettings = {}
            fetchSetup.fetchSettings.headers = {
              ...(fetchSetup.fetchSettings.headers || {}),
              Authorization: `Bearer ${token}`,
            }
          },
        },
      })
      viewer.render()
      bindingRef.current = viewer
    } catch (err) {
      console.error('[ReportCustomViewer] init failed:', err)
    }
  }, [reportCode, token])

  // Re-run when viewerKey increments (date filter applied) or when token/code changes
  useEffect(() => {
    initViewer()
    return () => {
      import(/* @vite-ignore */ '@devexpress/analytics-core/analytics-utils-native')
        .then(({ fetchSetup }) => {
          if (beforeSendRef.current && fetchSetup.fetchSettings?.beforeSend === beforeSendRef.current) {
            delete fetchSetup.fetchSettings.beforeSend
          }
        })
        .catch(() => {})
      if (bindingRef.current) {
        try { bindingRef.current.dispose() } catch { /* ignore */ }
        bindingRef.current = null
      }
    }
  }, [initViewer, viewerKey])

  const handleApply = () => {
    // Update ref synchronously so the next openReport call picks up the new dates
    dateRangeRef.current = {
      from: dayjs(dateFrom).startOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS'),
      to: dayjs(dateTo).endOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS'),
    }
    setFilterOpen(false)
    setViewerKey(k => k + 1)
  }

  const displayCode = reportCode !== 'TestReport' ? reportCode : 'Báo cáo'

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Header bar */}
      <div className="shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-purple-50 via-white to-indigo-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">{displayCode}</p>
            <p className="text-[11px] text-slate-500">Xem báo cáo</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setFilterOpen(v => !v)}
          >
            <Calendar className="h-3.5 w-3.5" />
            Thời gian
          </Button>
        </div>

        {filterOpen && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-500 font-medium">Từ ngày</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-8 w-[150px] text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-500 font-medium">Đến ngày</label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-8 w-[150px] text-xs"
              />
            </div>
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleApply}>
              <Search className="h-3.5 w-3.5" />
              Xem báo cáo
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setFilterOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* DevExpress viewer */}
      <div className="flex-1 min-h-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden relative">
        {!token && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            Đang xác thực...
          </div>
        )}
        <link rel="stylesheet" href="/devexpress/dx-webdocumentviewer.css" />
        <link rel="stylesheet" href="/devexpress/dx-reporting-skeleton-screen.css" />
        <div ref={containerRef} className="absolute inset-0" style={{ minHeight: 400 }} />
      </div>
    </div>
  )
}

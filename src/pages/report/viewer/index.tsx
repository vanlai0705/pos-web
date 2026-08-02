import { useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/store/slice/users/app'

// Empty host in dev → Vite proxy handles /DXXRDV; full URL in prod
const HOST_URL = import.meta.env.DEV ? '' : 'https://api.posmobile.vn'
const INVOKE_ACTION = '/DXXRDV'

export default function ReportViewerPage() {
  const [searchParams] = useSearchParams()
  const reportCode = searchParams.get('code') || 'TestReport'
  const auth = useAppSelector(selectAuth)
  const token = auth.data?.SessionToken ?? ''

  const containerRef = useRef<HTMLDivElement>(null)
  const bindingRef = useRef<any>(null)

  const initViewer = useCallback(async () => {
    if (!containerRef.current || !token) return

    try {
      // Register all DevExpress templates, bindings, and DevExtreme KO integrations.
      await import(/* @vite-ignore */ 'devexpress-reporting/dx-webdocumentviewer-imports')
      const { DxReportViewer } = await import(
        /* @vite-ignore */
        'devexpress-reporting/viewer/binding/jsReportViewerBinding.binding'
      )
      // DevExpress 26.1.3 uses FetchRequestManager (native fetch) by default.
      // Authorization must be set on fetchSetup.fetchSettings, not ajaxSetup.ajaxSettings.
      const { fetchSetup } = await import(
        /* @vite-ignore */
        '@devexpress/analytics-core/analytics-utils-native'
      )

      if (!fetchSetup.fetchSettings) fetchSetup.fetchSettings = {}
      fetchSetup.fetchSettings.headers = {
        ...(fetchSetup.fetchSettings.headers || {}),
        Authorization: `Bearer ${token}`,
      }

      if (bindingRef.current) {
        try { bindingRef.current.dispose() } catch { /* ignore */ }
        bindingRef.current = null
      }

      const viewer = new DxReportViewer(containerRef.current, {
        reportUrl: reportCode,
        requestOptions: {
          host: HOST_URL,
          invokeAction: INVOKE_ACTION,
        },
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
      console.error('[ReportViewer] Failed to initialize DevExpress viewer:', err)
    }
  }, [reportCode, token])

  useEffect(() => {
    initViewer()
    return () => {
      if (bindingRef.current) {
        try { bindingRef.current.dispose() } catch { /* ignore */ }
        bindingRef.current = null
      }
    }
  }, [initViewer])

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Header */}
      <div className="shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-purple-50 via-white to-indigo-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              {reportCode && reportCode !== 'TestReport' ? reportCode : 'Report Viewer'}
            </p>
            <p className="text-[11px] text-slate-500">Xem báo cáo</p>
          </div>
        </div>
      </div>

      {/* DevExpress viewer container */}
      <div className="flex-1 min-h-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden relative">
        {!token && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            Đang xác thực...
          </div>
        )}

        {/* Load DevExpress CSS */}
        <link
          rel="stylesheet"
          href="/devexpress/dx-webdocumentviewer.css"
        />
        <link
          rel="stylesheet"
          href="/devexpress/dx-reporting-skeleton-screen.css"
        />

        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{ minHeight: 400 }}
        />
      </div>
    </div>
  )
}

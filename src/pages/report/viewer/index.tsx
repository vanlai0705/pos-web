import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/store/slice/users/app'
import { useLocation, useSearchParams } from 'react-router-dom'
import { DevExpressReportViewer } from '../devexpress-surface'
import { resolveReportCode } from '../report-code'
export default function ReportViewerPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const auth = useAppSelector(selectAuth)
  const token = auth.data?.SessionToken ?? ''
  const basePath = location.pathname.startsWith('/reports') ? '/reports' : '/report'
  const reportCode = resolveReportCode(location.pathname, searchParams.get('code'), basePath)

  return <DevExpressReportViewer reportCode={reportCode} token={token} />
}

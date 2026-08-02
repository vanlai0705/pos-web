import { useLocation, useSearchParams } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/store/slice/users/app'
import { DevExpressReportViewer } from '../devexpress-surface'
import { resolveReportCode } from '../report-code'

export default function ReportCustomViewerPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const auth = useAppSelector(selectAuth)
  const token = auth.data?.SessionToken ?? ''
  const reportCode = resolveReportCode(location.pathname, searchParams.get('code'), '/report-custom')

  return <DevExpressReportViewer reportCode={reportCode} token={token} custom />
}

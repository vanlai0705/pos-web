import { useLocation, useSearchParams } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/store/slice/users/app'
import { DevExpressReportDesigner } from '../devexpress-surface'
import { resolveReportCode } from '../report-code'

export default function ReportDesignerPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const auth = useAppSelector(selectAuth)
  const token = auth.data?.SessionToken ?? ''
  const basePath = location.pathname.startsWith('/report-custom') ? '/report-custom' : location.pathname.startsWith('/reports') ? '/reports' : '/report'
  const reportCode = resolveReportCode(location.pathname, searchParams.get('code'), basePath)

  return <DevExpressReportDesigner reportCode={reportCode} token={token} />
}

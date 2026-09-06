import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/store/slice/users/app'
import { useLocation, useSearchParams } from 'react-router-dom'
import { DevExpressReportViewer } from '../devexpress-surface'
import { resolveReportCode } from '../report-code'

function parseTemplateType(value: string | null) {
  if (!value) return undefined
  const templateType = Number(value)
  return Number.isFinite(templateType) ? templateType : undefined
}

export default function ReportCustomViewerPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const auth = useAppSelector(selectAuth)
  const token = auth.data?.SessionToken ?? ''
  const reportCode = resolveReportCode(location.pathname, searchParams.get('code'), '/report-custom')
  const templateType = parseTemplateType(searchParams.get('templateType'))

  return <DevExpressReportViewer reportCode={reportCode} token={token} custom templateType={templateType} />
}

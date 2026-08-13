import { useParams } from 'react-router-dom'
import { SupportListPage } from '../shared'
export default function SupportsPage() {
  const { guid } = useParams()
  return <SupportListPage mode="support" guid={guid} />
}

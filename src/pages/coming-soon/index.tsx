import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'

export default function ComingSoonPage() {
  const { pathname } = useLocation()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
      <Construction className="size-14 text-primary/40" />
      <div className="text-center">
        <p className="text-lg font-semibold text-foreground">Đang phát triển</p>
        <p className="text-sm mt-1">Trang <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{pathname}</code> chưa được triển khai.</p>
      </div>
    </div>
  )
}

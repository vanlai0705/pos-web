import { Link } from 'react-router-dom'
import { FileQuestion, Headset } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'

const items = [
  {
    titleKey: 'supports.helpTitle',
    descriptionKey: 'supports.helpDescription',
    href: '/supports/helps',
    icon: FileQuestion,
  },
  {
    titleKey: 'supports.supportTitle',
    descriptionKey: 'supports.supportDescription',
    href: '/supports/supports',
    icon: Headset,
  },
]

export default function SupportHubPage() {
  const { t } = useTranslation()

  return (
    <div className="p-4">
      <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
        {items.map(item => {
          const Icon = item.icon
          return (
            <Link key={item.href} to={item.href}>
              <Card className="overflow-hidden transition hover:border-blue-200 hover:shadow-md">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{t(item.titleKey)}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t(item.descriptionKey)}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

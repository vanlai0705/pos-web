import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'

export default function QrOrderSuccessPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const guid = searchParams.get('guid') ?? ''

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/10">
          <Check className="h-10 w-10 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
        </div>

        <h2 className="text-2xl font-bold">{t('pages.orderTable.successTitle')}</h2>
        <p className="mt-1 text-muted-foreground">{t('pages.orderTable.successDescription')}</p>

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => navigate(`order-table?guid=${guid}`)}
            className="h-11 flex-1 rounded-xl border border-border font-medium transition hover:bg-accent"
          >
            {t('pages.orderTable.home')}
          </button>
        </div>
      </div>
    </div>
  )
}

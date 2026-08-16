import { cn } from '@/utils'
import { Banknote, BookOpen, FileText, Printer, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { OrderAction } from './order-model'

const ACTION_TONES = {
  neutral: 'border-input text-muted-foreground hover:bg-muted',
  sky: 'border-sky-400 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20',
  emerald: 'border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
  'emerald-strong': 'border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
  indigo: 'border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
  rose: 'border-rose-400 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20',
} as const

interface ActionBtnProps {
  tone: keyof typeof ACTION_TONES
  icon: React.ElementType
  label: string
  onClick: () => void
  disabled?: boolean
}

interface OrderActionsProps {
  fromOrderManager?: boolean
  tableLabel?: string
  hasTableOrder?: boolean
  saving: boolean
  cartLength: number
  onBack?: () => void
  onSave: (action: OrderAction) => void
  onOpenOrderSearch: (kind: 'booking' | 'quotation' | 'temporary') => void
}

function ActionBtn({ tone, icon: Icon, label, onClick, disabled }: ActionBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-semibold transition-all disabled:opacity-40',
        ACTION_TONES[tone],
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

export function OrderActions({
  fromOrderManager,
  tableLabel,
  hasTableOrder,
  saving,
  cartLength,
  onBack,
  onSave,
  onOpenOrderSearch,
}: OrderActionsProps) {
  const { t } = useTranslation()
  const disabled = saving || cartLength === 0

  if (fromOrderManager) {
    return (
      <div className="grid grid-cols-3 gap-1.5">
        <ActionBtn tone="neutral" icon={X} label={t('pages.actives.order.exitButton')} onClick={() => onBack?.()} />
        <ActionBtn tone="sky" icon={Save} label={t('common.save')} disabled={disabled} onClick={() => onSave('update')} />
        <ActionBtn tone="emerald-strong" icon={Printer} label={t('pages.actives.order.saveAndPrintBillButton')} disabled={disabled} onClick={() => onSave('update-print')} />
      </div>
    )
  }

  if (tableLabel) {
    return (
      <>
        <div className="grid grid-cols-4 gap-1.5">
          <ActionBtn tone="neutral" icon={X} label={t('pages.actives.order.exitButton')} onClick={() => onBack?.()} />
          <ActionBtn tone="sky" icon={Save} label={t('pages.actives.order.saveAndExitButton')} disabled={disabled} onClick={() => onSave('save-exit')} />
          <ActionBtn tone="emerald-strong" icon={Printer} label={t('pages.actives.order.payAndPrintButton')} disabled={disabled} onClick={() => onSave('print')} />
          <ActionBtn tone="emerald" icon={Banknote} label={t('pages.actives.order.payNoPrintButton')} disabled={disabled} onClick={() => onSave('pay')} />
        </div>
        <div className={cn('grid gap-1.5', hasTableOrder ? 'grid-cols-4' : 'grid-cols-3')}>
          <ActionBtn tone="neutral" icon={Printer} label={t('pages.actives.order.printTempButton')} disabled={disabled} onClick={() => onSave('print-temp')} />
          <ActionBtn tone="indigo" icon={Printer} label={t('pages.actives.order.printKitchenButton')} disabled={disabled} onClick={() => onSave('print-kitchen')} />
          <ActionBtn tone="indigo" icon={Printer} label={t('pages.actives.order.printLabelButton')} disabled={disabled} onClick={() => onSave('print-label')} />
          {hasTableOrder && (
            <ActionBtn tone="rose" icon={Trash2} label={t('pages.actives.order.deleteOrderButton')} disabled={saving} onClick={() => onSave('cancel-order')} />
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        <button onClick={() => onSave('temp')} disabled={disabled}
          className="flex items-center justify-center gap-1 rounded-lg border border-sky-400 px-2 py-2.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all disabled:opacity-40">
          <Save className="h-3.5 w-3.5" /> {t('pages.actives.order.saveTempButton')}
        </button>
        <button onClick={() => onSave('print')} disabled={disabled}
          className="flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-2 py-2.5 text-xs font-bold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-40 col-span-1">
          <Printer className="h-3.5 w-3.5" /> {t('pages.actives.order.payAndPrintButton')}
        </button>
        <button onClick={() => onSave('pay')} disabled={disabled}
          className="flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-primary to-primary/80 px-2 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-all disabled:opacity-40">
          <Banknote className="h-3.5 w-3.5" /> {t('pages.actives.order.payNoPrintButton')}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <button onClick={() => onOpenOrderSearch('booking')} disabled={saving}
          className="flex items-center justify-center gap-1 rounded-lg border border-orange-400 px-2 py-2.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all disabled:opacity-40">
          <BookOpen className="h-3.5 w-3.5" /> {t('pages.actives.order.bookingButton')}
        </button>
        <button onClick={() => onOpenOrderSearch('quotation')} disabled={saving}
          className="flex items-center justify-center gap-1 rounded-lg border border-violet-400 px-2 py-2.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all disabled:opacity-40">
          <FileText className="h-3.5 w-3.5" /> {t('pages.actives.order.quotationButton')}
        </button>
        <button onClick={() => onOpenOrderSearch('temporary')} disabled={saving}
          className="flex items-center justify-center gap-1 rounded-lg border border-input px-2 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-all disabled:opacity-40">
          <RefreshCw className="h-3.5 w-3.5" /> {t('pages.actives.order.reopenButton')}
        </button>
      </div>
    </>
  )
}

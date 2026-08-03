import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { translateKnownText } from '@/i18n/nav-title-map'
import { cn } from '@/utils'

type StatusValue = {
  Id?: number
  Name?: string
}

type StatusTone = 'active' | 'locked' | 'deleted' | 'pending' | 'success' | 'paid' | 'draft' | 'neutral'

const TONE_CLASS: Record<StatusTone, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  locked: 'border-amber-200 bg-amber-50 text-amber-700',
  deleted: 'border-rose-200 bg-rose-50 text-rose-700',
  pending: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  success: 'border-sky-200 bg-sky-50 text-sky-700',
  paid: 'border-blue-200 bg-blue-50 text-blue-700',
  draft: 'border-slate-200 bg-slate-50 text-slate-700',
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
}

function plain(value?: string) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

function inferTone(id?: number, label?: string): StatusTone {
  const text = plain(label)

  if (/huy|xoa|deleted|cancel|void|loi/.test(text)) return 'deleted'
  if (/thanh toan|paid/.test(text)) return 'paid'
  if (/hoan thanh|da giao|complete|success|phat hanh/.test(text)) return 'success'
  if (/cho|pending|xu ly|doi|draft|nhap/.test(text)) return 'pending'
  if (/khoa|tam khoa|ngung|inactive|lock|khong xuat/.test(text)) return 'locked'
  if (/hoat dong|active|dang hoat dong|kich hoat/.test(text)) return 'active'

  if (id === 0) return 'active'
  if (id === 1) return 'locked'
  if (id === 2) return 'deleted'
  if (id === 3) return 'paid'
  if (id === 4) return 'deleted'
  return 'neutral'
}

export function StatusBadge({
  status,
  statusId,
  label,
  tone,
  className,
}: {
  status?: StatusValue | null
  statusId?: number | null
  label?: string | number | null
  tone?: StatusTone
  className?: string
}) {
  const { t } = useTranslation()
  const id = status?.Id ?? statusId ?? undefined
  const rawLabel = label ?? status?.Name

  if (!status && statusId == null && rawLabel == null) {
    return <span className="text-muted-foreground text-xs">-</span>
  }

  const display = rawLabel == null || rawLabel === ''
    ? id === 0
      ? t('common.active')
      : id === 1
        ? t('common.locked')
        : id === 2
          ? t('common.deleted')
          : t('common.status')
    : String(rawLabel)

  const resolvedTone = tone ?? inferTone(id, display)

  return (
    <Badge
      variant="outline"
      className={cn('whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', TONE_CLASS[resolvedTone], className)}
    >
      {translateKnownText(display, t) ?? display}
    </Badge>
  )
}

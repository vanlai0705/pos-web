import { cn } from '@/utils'
type DataTagTone = 'code' | 'voucher' | 'money' | 'neutral'

const TONE_CLASS: Record<DataTagTone, string> = {
  code: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-300',
  voucher: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/70 dark:bg-indigo-950/40 dark:text-indigo-300',
  money: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300',
}

export function formatMoney(value?: number | null) {
  if (value == null) return '-'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

export function DataTag({
  children,
  tone = 'neutral',
  className,
  title,
}: {
  children?: React.ReactNode
  tone?: DataTagTone
  className?: string
  title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5 shadow-sm',
        'whitespace-nowrap tabular-nums',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children == null || children === '' ? '-' : children}
    </span>
  )
}

export function CodeTag({ value, className }: { value?: string | number | null; className?: string }) {
  const text = value == null || value === '' ? '-' : String(value)
  return <DataTag tone="code" className={className} title={text}>{text}</DataTag>
}

export function VoucherTag({ value, className }: { value?: string | number | null; className?: string }) {
  const text = value == null || value === '' ? '-' : String(value)
  return <DataTag tone="voucher" className={className} title={text}>{text}</DataTag>
}

export function MoneyTag({
  value,
  className,
}: {
  value?: number | null
  className?: string
}) {
  return <DataTag tone="money" className={cn('font-bold', className)}>{formatMoney(value)}</DataTag>
}

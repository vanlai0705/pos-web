import { useNumberDraft } from '@/components/ui/number-input'
import { cn } from '@/utils'
import type { ReactNode } from 'react'

export function MoneyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap w-16 shrink-0">{label}</span>
      {children}
    </div>
  )
}

export function PercentInput({ value, onChange, disabled }: { value: number; onChange: (value: number) => void; disabled?: boolean }) {
  const draft = useNumberDraft(value, onChange, { min: 0, max: 100 })
  return (
    <input
      type="text"
      disabled={disabled}
      {...draft}
      className="w-full text-xs bg-transparent focus:outline-none tabular-nums text-foreground text-center disabled:cursor-not-allowed disabled:opacity-50"
    />
  )
}

export function NumInput({
  value,
  onChange,
  suffix,
  className,
}: {
  value: number
  onChange: (value: number) => void
  suffix?: string
  className?: string
}) {
  const draft = useNumberDraft(value, onChange, { min: 0 })
  return (
    <div className={cn('flex items-center border border-input rounded px-1.5 py-0.5 bg-background', className)}>
      <input
        type="text"
        {...draft}
        className="w-0 flex-1 text-xs bg-transparent focus:outline-none tabular-nums text-foreground text-right"
      />
      {suffix && <span className="text-xs text-muted-foreground ml-0.5">{suffix}</span>}
    </div>
  )
}

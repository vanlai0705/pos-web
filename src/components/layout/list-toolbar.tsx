import type { ComponentProps,ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { translateKnownText } from '@/i18n/nav-title-map'
import { cn } from '@/utils'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
type ToolbarButtonTone = 'primary' | 'neutral' | 'danger'

const toneClass: Record<ToolbarButtonTone, string> = {
  primary: 'border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground',
  neutral: 'border-border bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground',
  danger: 'border-destructive/25 bg-destructive/10 text-destructive shadow-sm hover:bg-destructive/15 hover:text-destructive disabled:border-destructive/10 disabled:bg-destructive/5 disabled:text-destructive/40',
}

export function ToolbarButton({
  tone = 'neutral',
  className,
  children,
  ...props
}: ComponentProps<typeof Button> & { tone?: ToolbarButtonTone }) {
  return (
    <Button
      {...props}
      variant="outline"
      className={cn('h-10 gap-2 rounded-md px-4 font-semibold', toneClass[tone], className)}
    >
      {children}
    </Button>
  )
}

export function ListToolbar({
  left,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  filters,
  actions,
  className,
}: {
  left?: ReactNode
  searchValue?: string
  searchPlaceholder?: string
  onSearchChange?: (value: string) => void
  filters?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <div className={cn('flex shrink-0 flex-wrap items-center gap-2 rounded-lg border bg-card p-3 text-card-foreground shadow-sm', className)}>
      {left ? <div className="flex shrink-0 items-center gap-2">{left}</div> : null}
      <div className="flex min-w-[280px] flex-1 flex-wrap items-center justify-end gap-2">
        {onSearchChange ? (
          <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchValue || ''}
              onChange={event => onSearchChange(event.target.value)}
              placeholder={translateKnownText(searchPlaceholder, t) ?? t('common.search')}
              className="h-10 rounded-md border-input bg-background pl-9 text-foreground shadow-sm placeholder:text-muted-foreground"
            />
          </div>
        ) : null}
        {filters}
        {actions}
      </div>
    </div>
  )
}

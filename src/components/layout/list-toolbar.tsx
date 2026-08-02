import type { ComponentProps, ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils'

type ToolbarButtonTone = 'primary' | 'neutral' | 'danger'

const toneClass: Record<ToolbarButtonTone, string> = {
  primary: 'border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:text-white',
  neutral: 'border-slate-200 bg-white text-slate-800 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700',
  danger: 'border-red-200 bg-red-50 text-red-600 shadow-sm hover:bg-red-100 hover:text-red-700 disabled:border-red-100 disabled:bg-red-50 disabled:text-red-300',
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
  searchPlaceholder = 'Tìm kiếm...',
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
  return (
    <div className={cn('flex shrink-0 flex-wrap items-center gap-2 rounded-lg border bg-white p-3 shadow-sm', className)}>
      {left ? <div className="flex shrink-0 items-center gap-2">{left}</div> : null}
      <div className="flex min-w-[280px] flex-1 flex-wrap items-center justify-end gap-2">
        {onSearchChange ? (
          <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchValue || ''}
              onChange={event => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 rounded-md border-slate-200 bg-white pl-9 shadow-sm"
            />
          </div>
        ) : null}
        {filters}
        {actions}
      </div>
    </div>
  )
}

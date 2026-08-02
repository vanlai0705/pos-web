import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/utils'
import { useLazyFilterCustomersSimpleQuery } from '@/store/slice/users/api/api'
import type { TPosCustomerSimple } from '@/store/slice/users/types/pos-types'

interface CustomerSelectProps {
  value?: TPosCustomerSimple | null
  onChange: (customer: TPosCustomerSimple | null) => void
  placeholder?: string
  className?: string
}

export function CustomerSelect({
  value,
  onChange,
  placeholder = 'Khách hàng...',
  className,
}: CustomerSelectProps) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const [search, { data, isFetching }] = useLazyFilterCustomersSimpleQuery()
  const items = data?.Items ?? []

  // close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setKeyword('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    setOpen(true)
    search({ Keyword: '', PageIndex: 0, PageSize: 10 })
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleSearch = (v: string) => {
    setKeyword(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      search({ Keyword: v, PageIndex: 0, PageSize: 10 })
    }, 300)
  }

  const handleSelect = (item: TPosCustomerSimple) => {
    onChange(item)
    setOpen(false)
    setKeyword('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <div ref={containerRef} className={cn('relative flex-1', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 w-full rounded-lg border border-input px-2.5 py-1.5 bg-background hover:bg-muted/30 transition-colors text-left"
      >
        <span className={cn('flex-1 text-xs truncate', !value && 'text-muted-foreground')}>
          {value ? value.Name : placeholder}
        </span>
        {value ? (
          <X className="h-3 w-3 text-muted-foreground/50 hover:text-destructive shrink-0" onClick={handleClear} />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg">
          <div className="p-1.5 border-b">
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Tìm khách hàng..."
              className="w-full text-xs bg-transparent px-2 py-1 focus:outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {isFetching && <div className="px-3 py-2 text-xs text-muted-foreground">Đang tải...</div>}
            {!isFetching && items.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">Không tìm thấy</div>
            )}
            {items.map(c => (
              <button
                key={c.Id}
                type="button"
                onClick={() => handleSelect(c)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between"
              >
                <span className="font-medium">{c.Name}</span>
                {c.Phone && <span className="text-muted-foreground ml-2">{c.Phone}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

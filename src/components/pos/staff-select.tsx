import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/utils'
import { useLazyFilterUsersSimpleQuery } from '@/store/slice/users/api/api'
import type { TPosUser } from '@/store/slice/users/types/pos-types'

interface StaffSelectProps {
  value?: TPosUser | null
  onChange: (user: TPosUser | null) => void
  placeholder?: string
  className?: string
}

export function StaffSelect({
  value,
  onChange,
  placeholder = 'Nhân viên...',
  className,
}: StaffSelectProps) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const [search, { data, isFetching }] = useLazyFilterUsersSimpleQuery()
  const items = data?.Items ?? []

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

  const handleSelect = (item: TPosUser) => {
    onChange(item)
    setOpen(false)
    setKeyword('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  const displayName = value ? (value.FullName || value.Name) : null

  return (
    <div ref={containerRef} className={cn('relative flex-1', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 w-full rounded-lg border border-input px-2.5 py-1.5 bg-background hover:bg-muted/30 transition-colors text-left"
      >
        <span className={cn('flex-1 text-xs truncate', !displayName && 'text-muted-foreground')}>
          {displayName ?? placeholder}
        </span>
        {displayName ? (
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
              placeholder="Tìm nhân viên..."
              className="w-full text-xs bg-transparent px-2 py-1 focus:outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {isFetching && <div className="px-3 py-2 text-xs text-muted-foreground">Đang tải...</div>}
            {!isFetching && items.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">Không tìm thấy</div>
            )}
            {items.map(u => (
              <button
                key={u.Id}
                type="button"
                onClick={() => handleSelect(u)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between"
              >
                <span className="font-medium">{u.FullName || u.Name}</span>
                {u.Surname && <span className="text-muted-foreground ml-2">{u.Surname}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

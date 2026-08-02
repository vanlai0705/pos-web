import { cn } from '@/utils'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100]

/**
 * Page numbers to render, with `null` marking an ellipsis gap.
 * Always keeps first, last, current and its neighbours visible.
 */
export function pageRange(current: number, totalPages: number, siblings = 1): (number | null)[] {
  // 1 (first) + 1 (last) + 1 (current) + 2 * siblings + 2 (gaps)
  const slots = siblings * 2 + 5
  if (totalPages <= slots) return Array.from({ length: totalPages }, (_, i) => i + 1)

  const left = Math.max(current - siblings, 1)
  const right = Math.min(current + siblings, totalPages)
  const showLeftGap = left > 2
  const showRightGap = right < totalPages - 1

  const pages: (number | null)[] = [1]
  if (showLeftGap) pages.push(null)
  for (let p = Math.max(left, 2); p <= Math.min(right, totalPages - 1); p++) pages.push(p)
  if (showRightGap) pages.push(null)
  pages.push(totalPages)
  return pages
}

export interface DataPaginationProps {
  /** 1-based current page */
  page: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  /** Pass to show the "số dòng / trang" selector */
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  /** Hide the whole bar when there is nothing to page through */
  hideWhenSingle?: boolean
  className?: string
}

/**
 * The one pagination bar used across every list: result count on the left,
 * page-size selector and shadcn pagination on the right.
 */
export function DataPagination({
  page,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  hideWhenSingle = false,
  className,
}: DataPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (hideWhenSingle && totalPages <= 1 && !onPageSizeChange) return null

  const current = Math.min(Math.max(page, 1), totalPages)
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1
  const to = Math.min(current * pageSize, total)

  const go = (p: number) => {
    const next = Math.min(Math.max(p, 1), totalPages)
    if (next !== current) onPageChange(next)
  }

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2 pt-3 border-t', className)}>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {total === 0 ? 'Không có dữ liệu' : `${from}–${to} / ${total}`}
      </span>

      <div className="flex items-center gap-3 ml-auto">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Số dòng</span>
            <Select
              value={String(pageSize)}
              onValueChange={v => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map(size => (
                  <SelectItem key={size} value={String(size)} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {totalPages > 1 && (
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious disabled={current <= 1} onClick={() => go(current - 1)} />
              </PaginationItem>

              {pageRange(current, totalPages).map((p, i) => (
                <PaginationItem key={p ?? `gap-${i}`}>
                  {p === null ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink isActive={p === current} onClick={() => go(p)}>
                      {p}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext disabled={current >= totalPages} onClick={() => go(current + 1)} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  )
}

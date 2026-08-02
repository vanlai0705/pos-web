import { useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Skeleton } from './skeleton'
import { DataPagination } from './data-pagination'
import { cn } from '@/utils'

export type { ColumnDef } from '@tanstack/react-table'

type ColMeta = {
  className?: string
  headClassName?: string
  cellClassName?: string
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  loading?: boolean
  total: number
  page: number
  pageSize?: number
  onPageChange: (page: number) => void
  /** Pass to let the user pick how many rows a page holds */
  onPageSizeChange?: (size: number) => void
  onRowClick?: (row: TData) => void
  onRowDoubleClick?: (row: TData) => void
  rowClassName?: (row: TData) => string
  emptyText?: string
}

export function DataTable<TData>({
  columns,
  data,
  loading = false,
  total,
  page,
  pageSize = 15,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onRowDoubleClick,
  rowClassName,
  emptyText = 'Không có dữ liệu',
}: DataTableProps<TData>) {
  const tableData = useMemo(
    () => loading ? (Array(pageSize).fill({}) as TData[]) : data,
    [loading, data, pageSize],
  )

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => {
                  const m = header.column.columnDef.meta as ColMeta | undefined
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap',
                        m?.headClassName ?? m?.className,
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y">
            {table.getRowModel().rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                  {emptyText}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row.original) : undefined}
                  className={cn(
                    'hover:bg-muted/30 transition-colors',
                    (onRowClick || onRowDoubleClick) && 'cursor-pointer',
                    rowClassName?.(row.original),
                  )}
                >
                  {row.getVisibleCells().map(cell => {
                    const m = cell.column.columnDef.meta as ColMeta | undefined
                    return (
                      <td
                        key={cell.id}
                        className={cn('px-3 py-2.5', m?.cellClassName ?? m?.className)}
                      >
                        {loading ? (
                          <Skeleton className="h-4 w-full" />
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {total > 0 && (
        <DataPagination
          page={page}
          total={total}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          className="px-4 py-3 pt-3"
        />
      )}
    </div>
  )
}

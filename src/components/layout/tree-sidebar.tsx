import type { ReactNode } from 'react'
import { FileText, FolderOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils'
import { useTranslation } from 'react-i18next'
import { translateKnownText, translateMenuTitle } from '@/i18n/nav-title-map'

export interface TreeSidebarNode {
  Id: number
  Code?: string
  Name?: string
  Childrens?: TreeSidebarNode[]
  Childrents?: TreeSidebarNode[]
}

interface TreeSidebarProps<T extends TreeSidebarNode> {
  title: string
  searchPlaceholder?: string
  items: T[]
  selectedId: number
  searchText: string
  loading?: boolean
  emptyText?: string
  onSearchTextChange: (value: string) => void
  onSelect: (item: T) => void
  onCreate?: () => void
  onCreateChild?: (item: T) => void
  onEditItem?: (item: T) => void
  onDeleteItem?: (item: T) => void
  onEditSelected?: () => void
  onDeleteSelected?: () => void
  renderMeta?: (item: T) => ReactNode
}

function getChildren<T extends TreeSidebarNode>(item: T): T[] {
  return ((item.Childrents || item.Childrens || []) as T[]) ?? []
}

function filterTree<T extends TreeSidebarNode>(items: T[], keyword: string): T[] {
  if (!keyword.trim()) return items
  const normalized = keyword.trim().toLowerCase()

  return items
    .map(item => {
      const children = filterTree(getChildren(item), normalized)
      const matched = [item.Name, item.Code]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(normalized))

      if (!matched && children.length === 0) return null
      return { ...item, Childrents: children, Childrens: children } as T
    })
    .filter(Boolean) as T[]
}

function TreeRows<T extends TreeSidebarNode>({
  items,
  level,
  selectedId,
  onSelect,
  onCreateChild,
  onEditItem,
  onDeleteItem,
  renderMeta,
}: {
  items: T[]
  level: number
  selectedId: number
  onSelect: (item: T) => void
  onCreateChild?: (item: T) => void
  onEditItem?: (item: T) => void
  onDeleteItem?: (item: T) => void
  renderMeta?: (item: T) => ReactNode
}) {
  const { t } = useTranslation()
  return (
    <>
      {items.map(item => {
        const children = getChildren(item)
        const selected = selectedId === item.Id
        const Icon = children.length ? FolderOpen : FileText
        const canShowActions = item.Id > 0

        return (
          <div key={item.Id} className="relative">
            {level > 0 ? (
              <span
                className="pointer-events-none absolute bottom-0 top-0 w-px bg-slate-200"
                style={{ left: 18 + Math.min(level - 1, 5) * 18 }}
              />
            ) : null}
            <button
              type="button"
              onClick={() => onSelect(item)}
              className={cn(
                'group mx-1.5 my-0.5 flex h-9 w-[calc(100%-0.75rem)] items-center gap-1.5 rounded-md pr-1.5 text-left text-sm transition-all duration-150',
                selected
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
              )}
              style={{ paddingLeft: 10 + Math.min(level, 5) * 18 }}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors',
                  selected
                    ? 'border-indigo-200 bg-white text-indigo-600'
                    : 'border-slate-200 bg-white text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium" title={item.Name || item.Code}>
                {item.Name || item.Code || `ID: ${item.Id}`}
              </span>
              {renderMeta?.(item)}
              <span className={cn('flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100', selected && 'opacity-100')}>
                {onCreateChild && canShowActions ? (
                  <ItemAction title={t('common.addChildGroup')} className="text-emerald-600 hover:bg-emerald-100" onClick={() => onCreateChild(item)}>
                    <Plus className="h-3.5 w-3.5" />
                  </ItemAction>
                ) : null}
                {onEditItem && canShowActions ? (
                  <ItemAction title={t('common.editGroup')} className="text-indigo-600 hover:bg-indigo-100" onClick={() => onEditItem(item)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </ItemAction>
                ) : null}
                {onDeleteItem && canShowActions ? (
                  <ItemAction title={t('common.deleteGroup')} className="text-red-600 hover:bg-red-100" onClick={() => onDeleteItem(item)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </ItemAction>
                ) : null}
              </span>
            </button>
            {children.length ? (
              <TreeRows
                items={children}
                level={level + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                onCreateChild={onCreateChild}
                onEditItem={onEditItem}
                onDeleteItem={onDeleteItem}
                renderMeta={renderMeta}
              />
            ) : null}
          </div>
        )
      })}
    </>
  )
}

export function TreeSidebar<T extends TreeSidebarNode>({
  title,
  searchPlaceholder,
  items,
  selectedId,
  searchText,
  loading = false,
  emptyText,
  onSearchTextChange,
  onSelect,
  onCreate,
  onCreateChild,
  onEditItem,
  onDeleteItem,
  onEditSelected,
  onDeleteSelected,
  renderMeta,
}: TreeSidebarProps<T>) {
  const { t } = useTranslation()
  const filteredItems = filterTree(items, searchText)

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] lg:h-full lg:w-[236px]">
      <div className="shrink-0 border-b border-indigo-200 bg-gradient-to-br from-indigo-600 via-indigo-600 to-sky-600 px-2.5 py-2.5 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/15 text-white shadow-sm ring-1 ring-white/20">
                <FolderOpen className="h-4 w-4" />
              </span>
              <h2 className="min-w-0 truncate text-xs font-bold uppercase tracking-wide text-white">{translateMenuTitle(title, t)}</h2>
            </div>
            <p className="mt-1 truncate pl-9 text-[10px] font-medium text-indigo-100">
              {loading ? t('common.loading') : `${filteredItems.length} ${t('common.all').toLowerCase()}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onCreate ? (
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-md bg-white/15 text-white hover:bg-white/25 hover:text-white" onClick={onCreate} title={t('common.addNew')}>
                <Plus className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-b border-slate-100 bg-white p-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchText}
            onChange={event => onSearchTextChange(event.target.value)}
            placeholder={translateKnownText(searchPlaceholder, t) ?? t('common.search')}
            className="h-9 rounded-md border-slate-200 bg-slate-50 pl-8 text-sm shadow-none transition-colors focus:bg-white"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        {loading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2 rounded-md px-2 py-1">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-4 flex-1 rounded-md" />
              </div>
            ))}
          </div>
        ) : filteredItems.length ? (
          <div className="py-2">
            <TreeRows
              items={filteredItems}
              level={0}
              selectedId={selectedId}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onEditItem={onEditItem || (onEditSelected ? () => onEditSelected() : undefined)}
              onDeleteItem={onDeleteItem || (onDeleteSelected ? () => onDeleteSelected() : undefined)}
              renderMeta={renderMeta}
            />
          </div>
        ) : (
          <div className="mx-3 mt-4 rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-8 text-center text-sm text-muted-foreground">
            {translateKnownText(emptyText, t) ?? t('common.noData')}
          </div>
        )}
      </div>
    </aside>
  )
}

function ItemAction({
  title,
  className,
  onClick,
  children,
}: {
  title: string
  className?: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      title={title}
      onClick={event => {
        event.stopPropagation()
        onClick()
      }}
      onKeyDown={event => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
      className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors', className)}
    >
      {children}
    </span>
  )
}

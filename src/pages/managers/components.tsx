import { Search, Plus, Check, Lock, Trash2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge as UiStatusBadge } from "@/components/ui/status-badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { DataPagination } from '@/components/ui/data-pagination'
import { useTranslation } from "react-i18next"
import { translateKnownText } from "@/i18n/nav-title-map"
import { cn } from "@/utils"

export function StatusBadge({ statusId }: { statusId?: number }) {
  return <UiStatusBadge statusId={statusId} />
}

// ─── Search bar ────────────────────────────────────────────────────────────────

interface SearchBarProps {
  keyword: string
  onKeyword: (v: string) => void
  statusId: number | ""
  onStatus: (v: number | "") => void
  onAdd: () => void
  addLabel?: string
  placeholder?: string
}

export function SearchBar({
  keyword, onKeyword, statusId, onStatus, onAdd,
  addLabel,
  placeholder,
}: SearchBarProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={keyword}
          onChange={e => onKeyword(e.target.value)}
          placeholder={translateKnownText(placeholder, t) ?? t('common.search')}
          className="pl-8 h-9"
        />
      </div>
      <select
        value={statusId}
        onChange={e => onStatus(e.target.value === "" ? "" : Number(e.target.value) as number)}
        className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-40"
      >
        <option value="">{t('common.allStatuses')}</option>
        <option value={0}>{t('common.active')}</option>
        <option value={1}>{t('common.locked')}</option>
      </select>
      <Button size="sm" className="h-9 gap-1.5" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        {translateKnownText(addLabel, t) ?? t('common.addNew')}
      </Button>
    </div>
  )
}

// ─── Pagination ────────────────────────────────────────────────────────────────

interface PaginationBarProps {
  /** 0-based page index */
  page: number
  total: number
  pageSize: number
  onChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

/** 0-based wrapper around the shared bar. */
export function PaginationBar({ page, total, pageSize, onChange, onPageSizeChange }: PaginationBarProps) {
  return (
    <DataPagination
      page={page + 1}
      total={total}
      pageSize={pageSize}
      onPageChange={p => onChange(p - 1)}
      onPageSizeChange={onPageSizeChange}
    />
  )
}

// ─── Row actions dropdown ─────────────────────────────────────────────────────

interface RowActionsProps {
  statusId?: number
  onEdit?: () => void
  onActivate?: () => void
  onLock?: () => void
  onDelete: () => void
}

export function RowActions({ statusId, onEdit, onActivate, onLock, onDelete }: RowActionsProps) {
  const { t } = useTranslation()
  const actions = [
    onEdit ? {
      key: 'edit',
      label: t('manager.edit'),
      icon: Pencil,
      onClick: onEdit,
      className: 'border-cyan-200 bg-cyan-50 text-cyan-600 hover:border-cyan-300 hover:bg-cyan-100 dark:border-cyan-900/70 dark:bg-cyan-950/40 dark:text-cyan-300',
    } : null,
    statusId !== 0 && onActivate ? {
      key: 'activate',
      label: t('manager.activate'),
      icon: Check,
      onClick: onActivate,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300',
    } : null,
    statusId !== 1 && onLock ? {
      key: 'lock',
      label: t('manager.lock'),
      icon: Lock,
      onClick: onLock,
      className: 'border-amber-200 bg-amber-50 text-amber-600 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300',
    } : null,
    {
      key: 'delete',
      label: t('manager.delete'),
      icon: Trash2,
      onClick: onDelete,
      className: 'border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300',
    },
  ].filter(Boolean) as Array<{
    key: string
    label: string
    icon: typeof Pencil
    onClick: () => void
    className: string
  }>

  return (
    <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
      {actions.map(action => {
        const Icon = action.icon
        return (
          <button
            key={action.key}
            type="button"
            title={action.label}
            aria-label={action.label}
            onClick={action.onClick}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm',
              action.className,
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}

// ─── CRUD Modal ────────────────────────────────────────────────────────────────

interface CrudModalProps {
  open: boolean
  onClose: () => void
  title: string
  onSave: () => void
  loading?: boolean
  children: React.ReactNode
}

export function CrudModal({ open, onClose, title, onSave, loading, children }: CrudModalProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{translateKnownText(title, t)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button onClick={onSave} disabled={loading} className="gap-1.5">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Field helpers ─────────────────────────────────────────────────────────────

export function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium leading-none">
        {translateKnownText(label, t)}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// ─── Table wrapper ─────────────────────────────────────────────────────────────

export function TableCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  )
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-muted/50 border-b">
      <tr>{children}</tr>
    </thead>
  )
}

export function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  const { t } = useTranslation()
  const label = typeof children === "string" ? translateKnownText(children, t) : children
  return <th className={`px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide ${className}`}>{label}</th>
}

export function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-3 ${className}`}>{children}</td>
}

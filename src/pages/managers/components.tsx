import { Search, Plus, MoreHorizontal, Check, Lock, Trash2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Loader2 } from "lucide-react"
import { DataPagination } from '@/components/ui/data-pagination'
import { useTranslation } from "react-i18next"
import { translateKnownText } from "@/i18n/nav-title-map"

// ─── Status ────────────────────────────────────────────────────────────────────

export function StatusBadge({ statusId }: { statusId?: number }) {
  const { t } = useTranslation()
  if (statusId === 1) return <Badge variant="secondary" className="text-yellow-600 bg-yellow-50 border-yellow-200">{t('common.locked')}</Badge>
  if (statusId === 2) return <Badge variant="destructive">{t('common.deleted')}</Badge>
  return <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">{t('common.active')}</Badge>
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
  onEdit: () => void
  onActivate?: () => void
  onLock?: () => void
  onDelete: () => void
}

export function RowActions({ statusId, onEdit, onActivate, onLock, onDelete }: RowActionsProps) {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-2" /> {t('manager.edit')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {statusId !== 0 && onActivate && (
          <DropdownMenuItem onClick={onActivate}>
            <Check className="h-3.5 w-3.5 mr-2 text-green-600" /> {t('manager.activate')}
          </DropdownMenuItem>
        )}
        {statusId !== 1 && onLock && (
          <DropdownMenuItem onClick={onLock}>
            <Lock className="h-3.5 w-3.5 mr-2 text-yellow-600" /> {t('manager.lock')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="h-3.5 w-3.5 mr-2" /> {t('manager.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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

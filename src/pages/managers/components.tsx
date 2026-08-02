import { Search, Plus, ChevronLeft, ChevronRight, MoreHorizontal, Check, Lock, Trash2, Pencil } from "lucide-react"
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

// ─── Status ────────────────────────────────────────────────────────────────────

export function StatusBadge({ statusId }: { statusId?: number }) {
  if (statusId === 1) return <Badge variant="secondary" className="text-yellow-600 bg-yellow-50 border-yellow-200">Khoá</Badge>
  if (statusId === 2) return <Badge variant="destructive">Đã xoá</Badge>
  return <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">Hoạt động</Badge>
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
  addLabel = "Thêm mới",
  placeholder = "Tìm kiếm...",
}: SearchBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={keyword}
          onChange={e => onKeyword(e.target.value)}
          placeholder={placeholder}
          className="pl-8 h-9"
        />
      </div>
      <select
        value={statusId}
        onChange={e => onStatus(e.target.value === "" ? "" : Number(e.target.value) as number)}
        className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-40"
      >
        <option value="">Tất cả trạng thái</option>
        <option value={0}>Hoạt động</option>
        <option value={1}>Khoá</option>
      </select>
      <Button size="sm" className="h-9 gap-1.5" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  )
}

// ─── Pagination ────────────────────────────────────────────────────────────────

interface PaginationBarProps {
  page: number
  total: number
  pageSize: number
  onChange: (page: number) => void
}

export function PaginationBar({ page, total, pageSize, onChange }: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, total)

  return (
    <div className="flex items-center justify-between pt-3 border-t text-sm text-muted-foreground">
      <span>{total === 0 ? "Không có dữ liệu" : `${from}–${to} / ${total}`}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline" size="icon" className="h-7 w-7"
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="w-16 text-center text-xs">{page + 1} / {totalPages}</span>
        <Button
          variant="outline" size="icon" className="h-7 w-7"
          disabled={page >= totalPages - 1}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-2" /> Chỉnh sửa
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {statusId !== 0 && onActivate && (
          <DropdownMenuItem onClick={onActivate}>
            <Check className="h-3.5 w-3.5 mr-2 text-green-600" /> Kích hoạt
          </DropdownMenuItem>
        )}
        {statusId !== 1 && onLock && (
          <DropdownMenuItem onClick={onLock}>
            <Lock className="h-3.5 w-3.5 mr-2 text-yellow-600" /> Khoá
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Xoá
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
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Huỷ</Button>
          <Button onClick={onSave} disabled={loading} className="gap-1.5">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Field helpers ─────────────────────────────────────────────────────────────

export function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium leading-none">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
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
  return <th className={`px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide ${className}`}>{children}</th>
}

export function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-3 ${className}`}>{children}</td>
}

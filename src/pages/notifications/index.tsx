import { useState } from "react"
import { Bell, Check, Trash2, CheckCheck, Circle } from "lucide-react"
import { cn } from "@/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  useFilterNotificationsQuery,
  useUpdateNotificationStatusMutation,
  useMarkAllNotificationsReadMutation,
} from "@/store/slice/users/api/api"
import type { TPosNotificationItem } from "@/store/slice/users/types/pos-types"
import { baseImageUrl } from "@/constants"

function imgUrl(url?: string | null) {
  if (!url) return null
  if (url.startsWith('http')) return url
  const base = (baseImageUrl ?? 'https://api.posmobile.vn').replace(/\/$/, '')
  return `${base}/${url}`
}
const PAGE_SIZE = 20

function formatDate(dateStr?: string) {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function NotificationRow({
  item,
  selected,
  onSelect,
  onMarkRead,
  onDelete,
}: {
  item: TPosNotificationItem
  selected: boolean
  onSelect: () => void
  onMarkRead: () => void
  onDelete: () => void
}) {
  const isUnread = item.Status?.Id === 0
  const avatarUrl = imgUrl(item.Image?.Url)

  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex items-start gap-3 px-4 py-3 cursor-pointer border-b transition-colors",
        selected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-accent/50",
        isUnread && !selected && "bg-muted/30"
      )}
    >
      {/* Avatar / icon */}
      <div className="flex-none w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
        {avatarUrl
          ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          : <Bell className="w-5 h-5 text-primary" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm truncate", isUnread ? "font-semibold text-foreground" : "text-foreground/80")}>
            {item.Name}
          </p>
          {isUnread && <Circle className="flex-none w-2 h-2 fill-primary text-primary mt-1" />}
        </div>
        {item.Detail && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.Detail}</p>
        )}
        <p className="text-[11px] text-muted-foreground/70 mt-1">{formatDate(item.Date)}</p>
      </div>

      {/* Actions on hover */}
      <div className="flex-none flex flex-col gap-1 opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
        {isUnread && (
          <button onClick={onMarkRead} title="Đánh dấu đã đọc" className="p-1 rounded hover:bg-accent transition-colors">
            <Check className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
        <button onClick={onDelete} title="Xoá" className="p-1 rounded hover:bg-destructive/10 transition-colors">
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<TPosNotificationItem | null>(null)

  const { data, isLoading, isFetching, refetch } = useFilterNotificationsQuery({ PageIndex: page, PageSize: PAGE_SIZE })
  const [updateStatus] = useUpdateNotificationStatusMutation()
  const [markAll, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation()

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleMarkRead = async (item: TPosNotificationItem) => {
    try {
      await updateStatus({ id: item.Id, statusId: 1 }).unwrap()
      refetch()
    } catch {
      toast.error("Không thể đánh dấu đã đọc")
    }
  }

  const handleDelete = async (item: TPosNotificationItem) => {
    try {
      await updateStatus({ id: item.Id, statusId: 2 }).unwrap()
      if (selected?.Id === item.Id) setSelected(null)
      refetch()
    } catch {
      toast.error("Không thể xoá thông báo")
    }
  }

  const handleMarkAll = async () => {
    try {
      await markAll().unwrap()
      refetch()
      toast.success("Đã đánh dấu tất cả là đã đọc")
    } catch {
      toast.error("Không thể cập nhật")
    }
  }

  const handleSelect = (item: TPosNotificationItem) => {
    setSelected(item)
    if (item.Status?.Id === 0) handleMarkRead(item)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5" /> Thông báo
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total > 0 ? `${total} thông báo` : "Không có thông báo"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleMarkAll} disabled={markingAll}>
          <CheckCheck className="w-4 h-4 mr-1.5" />
          Đánh dấu tất cả đã đọc
        </Button>
      </div>

      {/* Master-detail layout */}
      <div className="flex gap-4 rounded-xl border bg-card overflow-hidden min-h-[500px]">
        {/* Left: notification list */}
        <div className="w-80 flex-none border-r flex flex-col">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3 px-4 py-3 border-b">
                  <Skeleton className="w-10 h-10 rounded-full flex-none" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))
            : items.length === 0
              ? (
                <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-2 py-12">
                  <Bell className="w-8 h-8 opacity-30" />
                  <p className="text-sm">Không có thông báo</p>
                </div>
              )
              : items.map(item => (
                  <div key={item.Id} className="group">
                    <NotificationRow
                      item={item}
                      selected={selected?.Id === item.Id}
                      onSelect={() => handleSelect(item)}
                      onMarkRead={() => handleMarkRead(item)}
                      onDelete={() => handleDelete(item)}
                    />
                  </div>
                ))
          }

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t mt-auto text-xs text-muted-foreground">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isFetching}
                className="px-2 py-1 rounded hover:bg-accent disabled:opacity-40">‹ Trước</button>
              <span>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || isFetching}
                className="px-2 py-1 rounded hover:bg-accent disabled:opacity-40">Sau ›</button>
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        <div className="flex-1 p-6">
          {selected
            ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-none">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-base">{selected.Name}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(selected.Date)}</p>
                  </div>
                </div>
                {selected.Detail && (
                  <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{selected.Detail}</p>
                )}
              </div>
            )
            : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <Bell className="w-10 h-10 opacity-20" />
                <p className="text-sm">Chọn thông báo để xem chi tiết</p>
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}

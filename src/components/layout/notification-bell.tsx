import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useFirebaseNotifications } from '@/hooks/useFirebaseNotifications'
import type { MessagePayload } from '@/services/firebase-notifications'
import { EUserTagTypes } from '@/store/slice/api/tag-types'
import { useGetNotificationsQuery, useMarkAllNotificationsReadMutation, useUpdateNotificationStatusMutation } from '@/store/slice/notifications/api'
import { tablesApi } from '@/store/slice/tables/api'
import { TPosNotificationItem } from '@/store/slice/users'
import { useAppDispatch } from '@/store/hooks'
import { cn } from '@/utils'
import { getImageUrl } from '@/utils/common'
import { withDomainPath } from '@/utils/domain-route'
import { type TFunction } from 'i18next'
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

function timeAgo(t: TFunction, dateStr?: string) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return t('components.notificationBell.justNow')
  if (m < 60) return t('components.notificationBell.minutesAgo', { count: m })
  const h = Math.floor(m / 60)
  if (h < 24) return t('components.notificationBell.hoursAgo', { count: h })
  return t('components.notificationBell.daysAgo', { count: Math.floor(h / 24) })
}

function getPayloadTitle(payload: MessagePayload, fallback: string) {
  return payload.notification?.title ||
    payload.data?.title ||
    payload.data?.Title ||
    payload.data?.Name ||
    fallback
}

function getPayloadDetail(payload: MessagePayload) {
  return payload.notification?.body ||
    payload.data?.body ||
    payload.data?.Body ||
    payload.data?.Detail ||
    payload.data?.Message ||
    ''
}

export function NotificationBell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [open, setOpen] = useState(false)
  const [localPushItems, setLocalPushItems] = useState<TPosNotificationItem[]>([])

  const { data, refetch, isFetching } = useGetNotificationsQuery(
    { PageIndex: 0, PageSize: 8 },
    { pollingInterval: open ? 0 : 60000 }
  )
  const [updateStatus] = useUpdateNotificationStatusMutation()
  const [markAll, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation()

  const handleForegroundMessage = useCallback((payload: MessagePayload) => {
    const title = getPayloadTitle(payload, t('components.notificationBell.title'))
    const detail = getPayloadDetail(payload)
    const item = {
      Id: `local-${Date.now()}`,
      Name: title,
      Detail: detail,
      Date: new Date().toISOString(),
      Image: { Url: '' },
      IsLocalPush: true,
      Status: { Id: 0, Name: 'Unread' },
    } as unknown as TPosNotificationItem

    setLocalPushItems(items => [item, ...items].slice(0, 20))
    toast.info(title, detail ? { description: detail } : undefined)
    dispatch(tablesApi.util.invalidateTags([{ type: EUserTagTypes.Tables }]))
    refetch()
  }, [dispatch, refetch, t])

  useFirebaseNotifications(handleForegroundMessage)

  const notifications = useMemo(() => {
    const serverItems = data?.Notifications ?? []
    return [...localPushItems, ...serverItems.filter(item => !`${item.Id}`.startsWith('local-'))].slice(0, 50)
  }, [data?.Notifications, localPushItems])
  const unreadCount = (data?.UnReadedCount ?? 0) + localPushItems.length

  const handleMarkRead = async (e: React.MouseEvent, item: TPosNotificationItem) => {
    e.stopPropagation()
    if (item.Status?.Id !== 0) return
    if (`${item.Id}`.startsWith('local-')) {
      setLocalPushItems(items => items.filter(x => x.Id !== item.Id))
      return
    }
    await updateStatus({ id: item.Id, statusId: 1 }).unwrap().catch(() => {})
    refetch()
  }

  const handleItemClick = async (item: TPosNotificationItem) => {
    if (item.Status?.Id === 0) {
      if (`${item.Id}`.startsWith('local-')) {
        setLocalPushItems(items => items.filter(x => x.Id !== item.Id))
      } else {
        await updateStatus({ id: item.Id, statusId: 1 }).unwrap().catch(() => {})
      }
    }
    setOpen(false)
    navigate(withDomainPath('/notifications'))
  }

  const handleMarkAll = async () => {
    setLocalPushItems([])
    await markAll().unwrap().catch(() => {})
    refetch()
  }

  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    if (v) refetch()
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full scale-95 text-white hover:bg-white/10 hover:text-white">
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-[18px] text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <span className="font-semibold text-sm">{t('components.notificationBell.title')}</span>
            {unreadCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {t('components.notificationBell.unreadCount', { count: unreadCount })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={markingAll}
                title={t('common.markAllRead')}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto divide-y">
          {notifications.length === 0
            ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Bell className="w-8 h-8 opacity-25" />
                <p className="text-sm">{t('components.notificationBell.noNotifications')}</p>
              </div>
            )
            : notifications.map(item => {
              const isUnread = item.Status?.Id === 0
              const avatarUrl = getImageUrl(item.Image?.Url) ?? null
              return (
                <div
                  key={item.Id}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent/60 group',
                    isUnread && 'bg-primary/5'
                  )}
                >
                  {/* Avatar */}
                  <div className="flex-none w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      : <Bell className="w-4 h-4 text-primary" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm leading-snug', isUnread ? 'font-semibold' : 'font-normal text-foreground/80')}>
                      {item.Name}
                    </p>
                    {item.Detail && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.Detail}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/60 mt-1">{timeAgo(t, item.Date)}</p>
                  </div>

                  <div className="flex-none flex flex-col items-center gap-1">
                    {isUnread && (
                      <>
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <button
                          onClick={e => handleMarkRead(e, item)}
                          title={t('common.markRead')}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition-all"
                        >
                          <Check className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          }
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2.5">
          <button
            onClick={() => { setOpen(false); navigate(withDomainPath('/notifications')) }}
            className="w-full text-center text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            {t('components.notificationBell.viewAll')}
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

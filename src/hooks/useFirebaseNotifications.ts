import { useAuth } from '@/hooks/useAuth'
import { useUpdateDeviceMutation } from '@/store/slice/notifications/api'
import { firebaseNotifications, type MessagePayload } from '@/services/firebase-notifications'
import { useCallback, useEffect, useState } from 'react'

export function useFirebaseNotifications(onMessage?: (payload: MessagePayload) => void) {
  const { user } = useAuth()
  const [updateDevice] = useUpdateDeviceMutation()
  const sessionToken = user.data?.SessionToken
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => firebaseNotifications.getNotificationPermission())
  const [permissionPromptOpen, setPermissionPromptOpen] = useState(false)

  const syncDeviceToken = useCallback(async (requestPermission: boolean) => {
    await firebaseNotifications.initialize()

    const deviceToken = requestPermission
      ? await firebaseNotifications.requestPermissionAndGetToken()
      : await firebaseNotifications.getTokenIfPossible()

    setPermission(firebaseNotifications.getNotificationPermission())
    setPermissionPromptOpen(firebaseNotifications.shouldShowPermissionPrompt())
    if (!deviceToken || !sessionToken) return ''

    try {
      if (import.meta.env.DEV) console.log('[FirebaseNotifications] devices/update:request', { tokenPreview: `${deviceToken.slice(0, 12)}...` })
      await updateDevice({ deviceType: 3, deviceToken }).unwrap()
      if (import.meta.env.DEV) console.log('[FirebaseNotifications] devices/update:success')
      firebaseNotifications.markDeviceUpdated(deviceToken)
    } catch (error) {
      if (import.meta.env.DEV) console.log('[FirebaseNotifications] devices/update:error', error)
    }
    return deviceToken
  }, [sessionToken, updateDevice])

  useEffect(() => {
    if (!onMessage) return undefined
    return firebaseNotifications.onForegroundMessage(onMessage)
  }, [onMessage])

  useEffect(() => {
    if (!sessionToken) return

    let cancelled = false
    const run = async () => {
      await syncDeviceToken(false)
      if (cancelled) return
      setPermission(firebaseNotifications.getNotificationPermission())
      setPermissionPromptOpen(firebaseNotifications.shouldShowPermissionPrompt())
    }

    run()
    return () => { cancelled = true }
  }, [sessionToken, syncDeviceToken])

  const enableNotifications = useCallback(() => syncDeviceToken(true), [syncDeviceToken])

  return {
    permission,
    permissionPromptOpen,
    setPermissionPromptOpen,
    enableNotifications,
  }
}

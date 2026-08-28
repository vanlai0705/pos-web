import { useAuth } from '@/hooks/useAuth'
import { useUpdateDeviceMutation } from '@/store/slice/notifications/api'
import { firebaseNotifications, type MessagePayload } from '@/services/firebase-notifications'
import { useEffect } from 'react'

export function useFirebaseNotifications(onMessage?: (payload: MessagePayload) => void) {
  const { user } = useAuth()
  const [updateDevice] = useUpdateDeviceMutation()
  const sessionToken = user.data?.SessionToken

  useEffect(() => {
    if (!onMessage) return undefined
    return firebaseNotifications.onForegroundMessage(onMessage)
  }, [onMessage])

  useEffect(() => {
    if (!sessionToken) return

    let cancelled = false
    const run = async () => {
      await firebaseNotifications.initialize()
      if (cancelled) return

      const deviceToken = await firebaseNotifications.requestPermissionAndGetToken()
      if (!deviceToken) return

      try {
        if (import.meta.env.DEV) console.log('[FirebaseNotifications] devices/update:request', { tokenPreview: `${deviceToken.slice(0, 12)}...` })
        await updateDevice({ deviceType: 3, deviceToken }).unwrap()
        if (import.meta.env.DEV) console.log('[FirebaseNotifications] devices/update:success')
        firebaseNotifications.markDeviceUpdated(deviceToken)
      } catch (error) {
        if (import.meta.env.DEV) console.log('[FirebaseNotifications] devices/update:error', error)
      }
    }

    run()
    return () => { cancelled = true }
  }, [sessionToken, updateDevice])
}

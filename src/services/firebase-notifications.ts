import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getMessaging, getToken, isSupported as isMessagingSupported, onMessage, type MessagePayload, type Messaging } from 'firebase/messaging'

const FCM_TOKEN_KEY = 'fcm_token'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY

type TokenMeta = {
  token: string
  updated: boolean
}

class FirebaseNotifications {
  private app: FirebaseApp | null = null
  private messaging: Messaging | null = null
  private initialized = false
  private tokenRequest: Promise<string> | null = null
  private currentToken = ''
  private unsubscribeForeground: (() => void) | null = null
  private listeners = new Set<(payload: MessagePayload) => void>()

  async initialize() {
    if (this.initialized || typeof window === 'undefined') return
    this.initialized = true

    if (!this.hasFirebaseConfig()) {
      this.debug('initialize:missingFirebaseConfig')
      return
    }

    this.app = getApps().length ? getApp() : initializeApp(firebaseConfig)

    const messagingSupported = await isMessagingSupported()
    this.debug('initialize:messagingSupported', { messagingSupported })
    if (!messagingSupported) return
    this.messaging = getMessaging(this.app)
    this.bindForegroundMessage()
    await this.requestPermissionAndGetToken()
  }

  async requestPermissionAndGetToken() {
    if (this.tokenRequest) return this.tokenRequest

    this.tokenRequest = this.requestTokenInternal()
    const token = await this.tokenRequest
    this.tokenRequest = null
    if (!token && !this.currentToken) this.currentToken = this.getStoredToken()
    return token
  }

  onForegroundMessage(listener: (payload: MessagePayload) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getCurrentToken() {
    return this.currentToken
  }

  hasDeviceBeenUpdated(token: string) {
    const meta = this.getStoredTokenMeta()
    return meta?.token === token && meta.updated
  }

  markDeviceUpdated(token: string) {
    this.setStoredToken(token, true)
  }

  private async requestTokenInternal() {
    if (!this.messaging || !('Notification' in window) || !('serviceWorker' in navigator)) {
      this.debug('token:unsupported')
      return ''
    }
    if (!window.isSecureContext) {
      this.debug('token:insecureContext')
      return ''
    }

    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission()
    this.debug('token:permission', { permission })
    if (permission !== 'granted') return ''

    const registration = await navigator.serviceWorker.register(this.getServiceWorkerUrl())
    this.debug('token:serviceWorkerRegistered', { scope: registration.scope })
    const serviceWorkerRegistration = await navigator.serviceWorker.ready

    try {
      this.currentToken = await getToken(this.messaging, { vapidKey, serviceWorkerRegistration })
      this.debug('token:getTokenResult', {
        hasToken: !!this.currentToken,
        tokenPreview: this.currentToken ? `${this.currentToken.slice(0, 12)}...` : '',
      })
      if (this.currentToken) this.setStoredToken(this.currentToken, false)
      return this.currentToken || ''
    } catch (error) {
      this.debug('token:getTokenError', error)
      return ''
    }
  }

  private bindForegroundMessage() {
    if (!this.messaging || this.unsubscribeForeground) return
    this.unsubscribeForeground = onMessage(this.messaging, payload => {
      this.debug('message:foreground', payload)
      this.playNotificationSound()
      this.listeners.forEach(listener => listener(payload))
    })
  }

  private hasFirebaseConfig() {
    return !!(
      firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.storageBucket &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId &&
      vapidKey
    )
  }

  private getServiceWorkerUrl() {
    const params = new URLSearchParams()
    Object.entries(firebaseConfig).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    return `/firebase-messaging-sw.js?${params.toString()}`
  }

  private playNotificationSound() {
    try {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextCtor) return
      const audioContext = new AudioContextCtor()
      const now = audioContext.currentTime
      ;[1318.51, 1567.98, 2093].forEach((freq, index) => {
        const oscillator = audioContext.createOscillator()
        const gain = audioContext.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(freq, now + index * 0.14)
        gain.gain.setValueAtTime(0.0001, now + index * 0.14)
        gain.gain.exponentialRampToValueAtTime(0.3, now + index * 0.14 + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.14 + 0.45)
        oscillator.connect(gain)
        gain.connect(audioContext.destination)
        oscillator.start(now + index * 0.14)
        oscillator.stop(now + index * 0.14 + 0.45)
      })
      window.setTimeout(() => audioContext.close().catch(() => {}), 900)
    } catch {}
  }

  private getStoredToken() {
    return this.getStoredTokenMeta()?.token ?? ''
  }

  private setStoredToken(token: string, updated: boolean) {
    const normalized = token.trim()
    if (!normalized) return
    try {
      localStorage.setItem(FCM_TOKEN_KEY, JSON.stringify({ token: normalized, updated }))
    } catch {}
  }

  private getStoredTokenMeta(): TokenMeta | null {
    try {
      const raw = localStorage.getItem(FCM_TOKEN_KEY) || ''
      if (!raw) return null
      if (!raw.startsWith('{')) return { token: raw.trim(), updated: false }
      const parsed = JSON.parse(raw)
      return { token: `${parsed?.token || ''}`.trim(), updated: !!parsed?.updated }
    } catch {
      return null
    }
  }

  private debug(message: string, data?: unknown) {
    if (!import.meta.env.DEV) return
    if (data === undefined) {
      console.log(`[FirebaseNotifications] ${message}`)
      return
    }
    console.log(`[FirebaseNotifications] ${message}`, data)
  }
}

export const firebaseNotifications = new FirebaseNotifications()
export type { MessagePayload }

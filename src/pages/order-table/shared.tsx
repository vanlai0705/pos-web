import { ReactNode, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const QR_ROUTES = ['order-table', 'order-cart', 'order-success'] as const
type QrRoute = (typeof QR_ROUTES)[number]

/**
 * The three QR-order screens mount at either `/order-table` or, for
 * multi-tenant links, `/:domainName/order-table`. A bare `navigate('order-cart')`
 * is resolved *relative to the current path*, so it becomes
 * `/:domainName/order-table/order-cart` — which no longer matches the public
 * QR routes, falls through to the private catch-all and bounces the diner to
 * `/login`. Always navigate with an absolute path, carrying the tenant prefix
 * when the current URL has one.
 */
export function useQrOrderNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [firstSegment] = pathname.split('/').filter(Boolean)
  const prefix =
    firstSegment && !QR_ROUTES.includes(firstSegment as QrRoute) ? `/${firstSegment}` : ''

  return (route: QrRoute, guid: string) =>
    navigate(`${prefix}/${route}${guid ? `?guid=${guid}` : ''}`)
}

/** Matches pos_web's exact number formatting for prices/quantities on this flow. */
export function fmtNum(val?: number | null) {
  if (val == null) return '0'
  return new Intl.NumberFormat('vi-VN').format(val)
}

/**
 * A diner ordering on their phone must not be able to pinch-zoom or
 * ctrl/cmd-zoom away from the fitted layout — mirrors pos_web's
 * disablePageZoom/bindZoomGuards (qr-order.component.ts) exactly, restoring
 * the original viewport meta and listeners on unmount.
 */
export function useDisablePageZoom() {
  useEffect(() => {
    const viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null
    const meta = viewportMeta ?? (() => {
      const el = document.createElement('meta')
      el.setAttribute('name', 'viewport')
      document.head.appendChild(el)
      return el
    })()
    const originalContent = meta.getAttribute('content') || ''
    meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no')

    const preventDefault = (e: Event) => e.preventDefault()
    const onTouchMove = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault() }
    const onWheel = (e: WheelEvent) => { if (e.ctrlKey || e.metaKey) e.preventDefault() }
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      if (['+', '=', '-', '0'].includes(e.key)) e.preventDefault()
    }

    document.addEventListener('gesturestart', preventDefault, { passive: false } as AddEventListenerOptions)
    document.addEventListener('gesturechange', preventDefault, { passive: false } as AddEventListenerOptions)
    document.addEventListener('gestureend', preventDefault, { passive: false } as AddEventListenerOptions)
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('wheel', onWheel, { passive: false })
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('gesturestart', preventDefault)
      document.removeEventListener('gesturechange', preventDefault)
      document.removeEventListener('gestureend', preventDefault)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('wheel', onWheel)
      document.removeEventListener('keydown', onKeyDown)
      meta.setAttribute('content', originalContent)
    }
  }, [])
}

/** The sticky brand-gradient header shared by all 3 QR-order screens. */
export function QrOrderHeader({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between rounded-b-lg bg-gradient-to-r from-primary to-primary/80 px-4 py-3 text-primary-foreground shadow-lg backdrop-blur">
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="logo" className="h-10 w-10 rounded-lg bg-white/90 p-1 shadow" />
        {left}
      </div>
      {right}
    </div>
  )
}

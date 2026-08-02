import { NavItem } from '@/constants/data'

// ─── POS API menu types ───────────────────────────────────────────────────────

export interface TPosMenuItem {
  Id: number
  Guid: string
  Name: string
  ShortName: string
  Url?: string
  Icon?: string
  Code?: string
  Params?: Record<string, string>
  IsTitle: boolean
  IsDivider: boolean
  Childrens: TPosMenuItem[]
}

// ─── FA icon → Lucide icon key map ───────────────────────────────────────────
// Maps Font Awesome class strings (from POS API) to keys in our Icons object

const FA_ICON_MAP: Record<string, string> = {
  // Hoạt động / bán hàng
  'icon-support':            'actives',
  'fa fa-shopping-bag':      'shoppingBag',
  'fa fa-cutlery':           'utensils',
  'fa fa-list':              'list',
  'fa fa-user':              'user',
  'fa fa-user-o':            'user',
  'fa fa-user-md':           'userCheck',
  'fa fa-file-pdf-o':        'fileText',
  // Kho hàng
  'fa fa-dropbox':           'wareHouse',
  // Quỹ / tiền
  'fa fa-money':             'wallet',
  'fa fa-dollar':            'wallet',
  'fa fa-gg':                'coins',
  // Khuyến mãi
  'fa fa-star-o':            'star',
  'fa fa-star-half-o':       'star',
  // Công nợ
  // (dùng wallet)
  // Nhân sự
  'fa fa-user-circle-o':     'userCircle',
  'fa fa-user-circle':       'userCircle',
  'fa fa-calculator':        'calculator',
  'fa fa-calendar-check-o':  'calendarCheck',
  'fa fa-vcard':             'idCard',
  // Quản trị
  'icon-shuffle':            'arrowLeftRight',
  'fa fa-product-hunt':      'package',
  'fa fa-shopping-basket':   'shoppingCart',
  'fa fa-balance-scale':     'scale',
  'fa fa-users':             'users',
  'product-hunt':            'package',   // typo in API (no "fa " prefix)
  // Báo cáo
  'fa fa-area-chart':        'barChart',
  // Cài đặt
  'icon-settings':           'settings',
  'fa fa-sun-o':             'settings',
}

export function posIconToKey(faClass?: string): string {
  if (!faClass) return 'arrowRight'
  return FA_ICON_MAP[faClass.trim()] ?? 'arrowRight'
}

// ─── URL mapping ─────────────────────────────────────────────────────────────
// Report-custom routes are handled in React too. Items with Code keep the
// Angular behavior of passing Code as reportUrl; leaves without Code fall back
// to path segments so nested custom templates still open.

const REPORT_CUSTOM_MAP: Record<string, string> = {
  '/report-custom/order':    '/report-custom/order',
  '/report-custom/booking':  '/report-custom/booking',
  '/report-custom/currency': '/report-custom/currency',
  '/report-custom/stock':    '/report-custom/stock',
  '/report-custom/viewer':   '/report-custom/viewer',
  '/report-custom/designer': '/report-custom/designer',
}

function resolveMenuUrl(item: TPosMenuItem): string | undefined {
  const url = item.Url ?? ''
  if (url.startsWith('/report-custom/')) {
    if (item.Code) {
      const [path] = url.split('?')
      return `${path}?code=${encodeURIComponent(item.Code)}`
    }
    const mapped = REPORT_CUSTOM_MAP[url]
    if (mapped) return mapped
    return item.Childrens?.length ? undefined : url
  }
  return url || undefined
}

function convertChildren(items: TPosMenuItem[]): import('@/constants/data').TNavChildren[] {
  return items
    .filter(c => !c.IsDivider && !c.IsTitle)
    .map(c => {
      const sub = c.Childrens?.length > 0 ? convertChildren(c.Childrens) : undefined
      return {
        title: c.ShortName || c.Name,
        href: resolveMenuUrl(c),
        icon: posIconToKey(c.Icon) as any,
        role: [],
        children: sub,
      }
    })
}

// ─── Converter ────────────────────────────────────────────────────────────────

export function posMenuToNavItems(items: TPosMenuItem[]): NavItem[] {
  return items
    .filter(item => !item.IsDivider)
    .map(item => {
      if (item.IsTitle) {
        return {
          title: item.Name,
          isTitle: true,
        } as NavItem
      }

      const children = convertChildren(item.Childrens || [])

      return {
        title: item.ShortName || item.Name,
        href: resolveMenuUrl(item),
        icon: posIconToKey(item.Icon) as any,
        children: children.length > 0 ? children : undefined,
      } as NavItem
    })
}

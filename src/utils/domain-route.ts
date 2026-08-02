export const DOMAIN_KEY = 'activeDomainName'

const PUBLIC_FIRST_SEGMENTS = new Set([
  '',
  'home',
  'login',
  'register',
  'forgot-password',
  'renew-password',
  'privacy-policy',
  '403',
])

const PRIVATE_FIRST_SEGMENTS = new Set([
  'dashboard',
  'profile',
  'change-password',
  'actives',
  'invoices',
  'notifications',
  'managers',
  'stocks',
  'currencies',
  'promotions',
  'liabilities',
  'human-resources',
  'report',
  'reports',
  'report-custom',
  'setting',
  'admins',
  'supports',
  'new-product',
])

export function normalizeDomainName(raw?: string | null) {
  return (raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9-]/g, '')
}

export function getStoredDomainName() {
  if (typeof window === 'undefined') return ''
  return normalizeDomainName(window.localStorage.getItem(DOMAIN_KEY))
}

export function setStoredDomainName(domain?: string | null) {
  const normalized = normalizeDomainName(domain)
  if (typeof window !== 'undefined' && normalized) {
    window.localStorage.setItem(DOMAIN_KEY, normalized)
  }
  return normalized
}

function splitPath(pathname: string) {
  return pathname.split('/').filter(Boolean)
}

export function getFirstSegment(pathname: string) {
  return splitPath(pathname)[0] || ''
}

export function isPrivatePath(pathname: string) {
  return PRIVATE_FIRST_SEGMENTS.has(getFirstSegment(pathname))
}

export function isPublicPath(pathname: string) {
  return PUBLIC_FIRST_SEGMENTS.has(getFirstSegment(pathname))
}

export function hasDisplayedDomain(pathname: string) {
  const [first, second] = splitPath(pathname)
  return !!first && !PUBLIC_FIRST_SEGMENTS.has(first) && PRIVATE_FIRST_SEGMENTS.has(second || '')
}

export function stripDisplayedDomain(pathname: string) {
  if (!hasDisplayedDomain(pathname)) return pathname || '/'
  const [, ...rest] = splitPath(pathname)
  return `/${rest.join('/')}` || '/'
}

export function getDisplayedDomain(pathname: string) {
  return hasDisplayedDomain(pathname) ? getFirstSegment(pathname) : ''
}

export function withDomainPath(path: string, domain = getStoredDomainName()) {
  if (!path || path.startsWith('http') || path.startsWith('#')) return path
  if (!path.startsWith('/')) return path

  const normalizedDomain = normalizeDomainName(domain)
  if (!normalizedDomain || !isPrivatePath(path) || hasDisplayedDomain(path)) return path

  return `/${normalizedDomain}${path}`
}

export function isRouteActive(currentPathname: string, href?: string) {
  if (!href) return false
  const current = stripDisplayedDomain(currentPathname)
  return current === href || current.startsWith(`${href}/`)
}

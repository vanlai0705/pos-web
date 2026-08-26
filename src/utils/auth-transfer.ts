export const AUTH_TRANSFER_TOKEN_KEY = 'posAuthToken'
export const AUTH_TRANSFER_DOMAIN_KEY = 'domainName'

export function getAuthTransferHash() {
  if (typeof window === 'undefined') return null

  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return null

  const params = new URLSearchParams(hash)
  const token = params.get(AUTH_TRANSFER_TOKEN_KEY)?.trim()
  const domainName = params.get(AUTH_TRANSFER_DOMAIN_KEY)?.trim()

  if (!token) return null

  return { token, domainName: domainName || '' }
}

export function hasAuthTransferHash() {
  return !!getAuthTransferHash()
}

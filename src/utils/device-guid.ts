/**
 * Stable per-device id the order/table endpoints use to tell devices apart.
 *
 * This is the SAME value the printer-settings screen registers kitchen/invoice
 * printers against — `tables/get-order-kitchen?deviceGuid=` looks printers up by
 * it — so every part of the app must read it from here. Mirrors pos_web's
 * `device-guid.util.ts` and PosMobile's `utils/deviceGuid.ts` (all keyed on
 * `storedGuid`, with a one-time migration from the legacy `guid-app` key).
 */

const DEVICE_GUID_KEY = 'storedGuid'
const LEGACY_DEVICE_GUID_KEY = 'guid-app'

export function newGuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getDeviceGuid(): string {
  const stored = localStorage.getItem(DEVICE_GUID_KEY)
  if (stored) return stored

  const legacy = localStorage.getItem(LEGACY_DEVICE_GUID_KEY)
  const guid = legacy ?? newGuid()
  localStorage.setItem(DEVICE_GUID_KEY, guid)
  return guid
}

export function setDeviceGuid(guid: string): void {
  localStorage.setItem(DEVICE_GUID_KEY, guid)
}

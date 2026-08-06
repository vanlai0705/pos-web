import { toast } from 'sonner'
import { API_ORIGIN } from '@/constants'

/**
 * Talks to the shop's local print bridge (a small HTTP service on the same
 * LAN as the POS terminal, listening at the shop's configured `PrinterUrl`,
 * e.g. `http://192.168.1.100:8000`) — mirrors pos_web's PrintService 1:1.
 *
 * The bridge never receives the print content directly. It is told which
 * printer to use and which real API route to fetch the content from
 * (`hostUrl`, always the absolute `api.posmobile.vn` origin — the bridge is
 * an independent local process, not the browser, so it cannot go through a
 * same-origin proxy); the bridge does the fetch itself and prints the result.
 */

// How long to wait for the local bridge before giving up. A print job that
// never gets a response (bridge hung talking to the physical printer, or
// crashed mid-request) must not hang the caller forever.
const BRIDGE_TIMEOUT_MS = 10_000

function printApiUrl(subUrl: string) {
  return `${API_ORIGIN}/api/v1/${subUrl}`
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), BRIDGE_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fire-and-forget: a printer being offline must never block the POS flow —
 * but a failure (unreachable, timeout, non-2xx) still has to reach the
 * cashier, since otherwise the local bridge silently swallowing it looks
 * exactly like "the print button did nothing", with no way to tell why.
 */
async function postToBridge(url: string, body: unknown, printerName?: string) {
  const who = printerName ? ` (${printerName})` : ''
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.warn('[print-bridge]', url, res.status)
      toast.error(`Không thể in${who}`, { description: `Phần mềm kết nối máy in báo lỗi (mã ${res.status}).` })
    }
  } catch (e) {
    console.warn('[print-bridge] unreachable —', url, e)
    const timedOut = e instanceof DOMException && e.name === 'AbortError'
    toast.error(`Không thể in${who}`, {
      description: timedOut
        ? 'Phần mềm kết nối máy in không phản hồi. Kiểm tra máy in và phần mềm kết nối máy in trên máy tính.'
        : 'Không kết nối được tới phần mềm kết nối máy in. Kiểm tra "Đường dẫn cục bộ máy in" trong Cài đặt đơn hàng.',
    })
  }
}

/** Bill printing — the bridge's own `/Printer/PrintData` endpoint. */
export function printData(printerUrl: string | undefined, api: string, printerName: string | undefined, data: unknown) {
  if (!printerUrl) return
  return postToBridge(`${printerUrl}/Printer/PrintData`, {
    printerName,
    hostUrl: printApiUrl(api),
    jsonData: JSON.stringify(data),
  }, printerName)
}

/** Kitchen ticket / label printing — POSTs directly to the printer's own URL. */
export function printDatas(printerUrl: string | undefined, api: string, printerName: string | undefined, data: unknown) {
  if (!printerUrl) return
  return postToBridge(printerUrl, {
    printerName,
    hostUrl: printApiUrl(api),
    jsonData: JSON.stringify(data),
  }, printerName)
}

/** Lists the printers installed on the machine the bridge runs on (mirrors
 * pos_web's PrintService.getInstalledPrinters) — used to populate the printer
 * picker instead of asking the user to type an exact driver name. */
export async function getInstalledPrinters(printerUrl: string | undefined): Promise<string[]> {
  if (!printerUrl) return []
  try {
    const res = await fetchWithTimeout(`${printerUrl}/Printer/GetInstalledPrinters`, {})
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : (data?.Data ?? data?.data ?? [])
  } catch (e) {
    console.warn('[print-bridge] unreachable —', printerUrl, e)
    return []
  }
}

export interface PrinterSetting {
  PrinterIp?: string
  PrinterPort?: number
  PrinterName?: string
  /** Server-computed from Ip+Port when not set explicitly. */
  PrinterUrl?: string
}

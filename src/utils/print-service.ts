import { API_ORIGIN } from "@/constants";
import { store } from "@/store/store";
import { toast } from "sonner";

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
const BRIDGE_TIMEOUT_MS = 10_000;

function printApiUrl(subUrl: string) {
  return `${API_ORIGIN}/api/v1/${subUrl}`;
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BRIDGE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function getSessionToken() {
  return store.getState().user.auth?.data?.SessionToken ?? "";
}

function getBridgeHeaders(token = getSessionToken()) {
  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Fire-and-forget: a printer being offline must never block the POS flow —
 * but a failure (unreachable, timeout, non-2xx) still has to reach the
 * cashier, since otherwise the local bridge silently swallowing it looks
 * exactly like "the print button did nothing", with no way to tell why.
 */
async function postToBridge(url: string, body: unknown, printerName?: string) {
  const who = printerName ? ` (${printerName})` : "";
  const token = getSessionToken();
  try {
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: getBridgeHeaders(token),
      body: JSON.stringify({
        ...(body && typeof body === "object" ? body : { data: body }),
        token,
        accessToken: token,
      }),
    });
    if (!res.ok) {
      console.warn("[print-bridge]", url, res.status);
      toast.error(`Không thể in${who}`, {
        description: `Phần mềm kết nối máy in báo lỗi (mã ${res.status}).`,
      });
    }
  } catch (e) {
    console.warn("[print-bridge] unreachable —", url, e);
    // const timedOut = e instanceof DOMException && e.name === 'AbortError'
    // toast.error(`Không thể in${who}`, {
    //   description: timedOut
    //     ? 'Phần mềm kết nối máy in không phản hồi. Kiểm tra máy in và phần mềm kết nối máy in trên máy tính.'
    //     : 'Không kết nối được tới phần mềm kết nối máy in. Kiểm tra "Đường dẫn cục bộ máy in" trong Cài đặt đơn hàng.',
    // })
  }
}

/**
 * The bridge (Windows "PrinterService" or the macOS print-agent) exposes a
 * single print endpoint: `POST {printerUrl}/Printer/PrintData`. Kitchen/label
 * tickets go to the exact same endpoint — only the `hostUrl` differs — so
 * `printData` and `printDatas` must build the URL the same way. (pos-mobile's
 * `OrderServices.printData` / `connectPrinter` both hit `/Printer/PrintData`.)
 */
function bridgePrintUrl(printerUrl: string) {
  return `${printerUrl.replace(/\/+$/, "")}/Printer/PrintData`;
}

function sendPrintJob(
  printerUrl: string | undefined,
  api: string,
  printerName: string | undefined,
  data: unknown,
) {
  if (!printerUrl) return;
  return postToBridge(
    bridgePrintUrl(printerUrl),
    {
      printerName,
      hostUrl: printApiUrl(api),
      jsonData: JSON.stringify(data),
    },
    printerName,
  );
}

/** Bill printing — single configured bill printer. */
export function printData(
  printerUrl: string | undefined,
  api: string,
  printerName: string | undefined,
  data: unknown,
) {
  return sendPrintJob(printerUrl, api, printerName, data);
}

/** Kitchen ticket / label printing — one of possibly several group printers. */
export function printDatas(
  printerUrl: string | undefined,
  api: string,
  printerName: string | undefined,
  data: unknown,
) {
  return sendPrintJob(printerUrl, api, printerName, data);
}

/** Lists the printers installed on the machine the bridge runs on (mirrors
 * pos_web's PrintService.getInstalledPrinters) — used to populate the printer
 * picker instead of asking the user to type an exact driver name. */
export async function getInstalledPrinters(
  printerUrl: string | undefined,
): Promise<string[]> {
  if (!printerUrl) return [];
  try {
    const res = await fetchWithTimeout(
      `${printerUrl}/Printer/GetInstalledPrinters`,
      {
        headers: getBridgeHeaders(),
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.Data ?? data?.data ?? []);
  } catch (e) {
    console.warn("[print-bridge] unreachable —", printerUrl, e);
    return [];
  }
}

export interface PrinterSetting {
  PrinterIp?: string;
  PrinterPort?: number;
  PrinterName?: string;
  /** Server-computed from Ip+Port when not set explicitly. */
  PrinterUrl?: string;
}

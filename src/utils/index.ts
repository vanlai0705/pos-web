import CryptoJS from "crypto-js";
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
export * from './format'
// NOTE: "./excel" is dead code from the warehouse project — none of its exports
// are used and it imports store slices that do not exist here. Re-exporting it
// dragged those broken imports into every build.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrMessage(errResponse: unknown): string {
  const hasMessageField =
    typeof errResponse === "object" &&
    errResponse !== null &&
    "message" in errResponse;
  if (!hasMessageField) return "internal server error";

  return errResponse.message !== null && typeof errResponse.message === "string"
    ? errResponse.message
    : JSON.stringify(errResponse.message);
}

export function getMutationErrMessage(errResponse: unknown): string {
  if (typeof errResponse !== "object" || errResponse === null) {
    return "Internal server error";
  }

  if (
    "data" in errResponse &&
    typeof errResponse.data === "object" &&
    errResponse.data !== null
  ) {
    const data = errResponse.data;
    if ("message" in data && typeof data.message === "string") {
      try {
        const parsedMessage = JSON.parse(data.message);
        if (
          typeof parsedMessage === "object" &&
          parsedMessage !== null &&
          "message" in parsedMessage
        ) {
          return parsedMessage.message; // Trả về message từ JSON parsed
        }
      } catch {
        return data.message;
      }
    }
  }
  return "Internal server error";
}

export function query(params: Record<string, any>) {
  const filteredParams: Record<string, any> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      filteredParams[key] = value;
    }
  });

  return (
    "?" +
    Object.keys(filteredParams)
      .map(
        (k) =>
          encodeURIComponent(k) + "=" + encodeURIComponent(filteredParams[k])
      )
      .join("&")
  );
}

export function formData(data: { [key: string]: any }) {
  const form_data = new FormData();
  for (const key in data) {
    form_data.append(key, data[key]);
  }
  return form_data;
}

export function cleanObject(obj: Record<string, any>): any {
  Object.keys(obj).forEach((key) => {
    if (obj[key] == null || obj[key] == "undefined") {
      delete obj[key];
    }
  });
  return obj;
}

export function extractItems<T = any>(data: any): T[] {
  if (!data) return [];

  const rawData = data?.data as any;
  if (Array.isArray(rawData?.items)) {
    return rawData.items.map((x: any) => x?.data ?? x) as T[];
  }

  if (rawData) {
    return Array.isArray(rawData)
      ? rawData.map((x: any) => x?.data ?? x)
      : ([rawData?.data ?? rawData] as T[]);
  }

  if (Array.isArray(data?.items)) {
    return data.items.map((x: any) => x?.data ?? x) as T[];
  }

  if (Array.isArray(data)) {
    return data.map((x: any) => x?.data ?? x) as T[];
  }

  return data ? ([data?.data ?? data] as T[]) : [];
}

function hexStringEncode(algorithm: string, key: string, data: string): string {
  const algo = algorithm.toUpperCase();

  switch (algo) {
    case "SHA256":
      return CryptoJS.HmacSHA256(data, key).toString(CryptoJS.enc.Hex);
    case "SHA1":
      return CryptoJS.HmacSHA1(data, key).toString(CryptoJS.enc.Hex);
    case "SHA512":
      return CryptoJS.HmacSHA512(data, key).toString(CryptoJS.enc.Hex);
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
}

export function sha256(id: number): string {
  const message = `id=${id}`;

  const signature = hexStringEncode(
    "sha256",
    import.meta.env.VITE_SECRET_KEY,
    message
  );
  return signature;
}

export function getEnityByArray(
  array: any[],
  type: string,
  value: number | string
) {
  if (!array) return null;
  return array.find((item) => item[type] === value);
}

export function mapField(data: any, key: any) {
  if (!data || !Array.isArray(data)) {
    return [];
  }
  return data.map((item: any) => item[key]);
}

export function normalizePagingResponse<T>(response: {
  return_code: number;
  return_message: string;
  data: {
    total_items: number;
    total_pages: number;
    current_page: number;
    page_size: number;
    has_next_page: boolean;
    has_prev_page: boolean;
    items: Array<{ data: T } | T>;
  };
}): {
  return_code: number;
  return_message: string;
  data: {
    total_items: number;
    total_pages: number;
    current_page: number;
    page_size: number;
    has_next_page: boolean;
    has_prev_page: boolean;
    items: T[];
  };
} {
  return {
    ...response,
    data: {
      ...response.data,
      items: response.data.items.map((item: any) => ('data' in item && item.data ? item.data : item)) as T[],
    },
  };
}

/** Save a fetched Blob to disk under `fileName`. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

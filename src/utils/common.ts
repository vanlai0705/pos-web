import dayjs from "dayjs";
import { baseImageUrl } from "@/constants";

export const FORMAT_DATE = {
  TIME_DATE: "HH:mm - DD/MM/YYYY",
  DATE: "DD/MM/YYYY",
  TIME_CHAT: "MMM D, YYYY hh:mm A",
} as const;

export type FORMAT_DATE = typeof FORMAT_DATE[keyof typeof FORMAT_DATE];

export const getImageUrl = (imageUrl: string | undefined): string | undefined => {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${baseImageUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
};

export const formatDayWithTimeZone = (date?: string | Date | number) =>
  date
    ? dayjs(date).format("YYYY-MM-DD HH:mm:ss")
    : dayjs().format("YYYY-MM-DD HH:mm:ss");

export function generateAtBySeconds(seconds: number, isSubtraction = false) {
  const date = new Date();
  date.setUTCHours(23, 59, 59, 999);
  date.setSeconds(
    isSubtraction ? date.getSeconds() - seconds : date.getSeconds() + seconds
  );
  return formatDayWithTimeZone(date);
}

export const genPagination = (pageIndex: number, pagSize: number) => {
  return {
    limit: pagSize,
    offset: pageIndex * pagSize,
  };
};

export const formatDate = (
  date: string,
  format: FORMAT_DATE = FORMAT_DATE.TIME_DATE
) => {
  if (!date) {
    return "-";
  }
  // Strip Z / tz-offset — backend stores Vietnam local time but may return with Z suffix
  const localDate = date.replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
  const result = dayjs(localDate).format(format);
  return result;
};

export const formatAmount = (value?: number) => {
  if (value !== undefined && value !== null && !isNaN(value)) {
    const rounded = Math.round(value * 1000) / 1000;
    const parts = rounded.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }
  return "0";
};

export const numberToVietnamese = (num: number) => {
  const ChuSo = [
    "không",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];
  const Tien = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ", "tỷ tỷ"];

  num = Math.floor(num);
  if (isNaN(num)) return "";

  if (num === 0) {
    return "Không đồng";
  }

  let lan = 0;
  let i = 0;
  let so = 0;
  let KetQua = "";
  let tmp = "";

  const arr = [];
  while (num > 0) {
    so = num % 1000;
    num = Math.floor(num / 1000);
    arr[lan] = so;
    lan++;
  }

  for (i = lan - 1; i >= 0; i--) {
    tmp = docSoBaChuSo(arr[i]);
    if (tmp !== "") KetQua += tmp + " " + Tien[i] + " ";
  }

  KetQua = KetQua.trim();
  return KetQua.charAt(0).toUpperCase() + KetQua.slice(1) + " đồng";

  function docSoBaChuSo(baso: number) {
    const tram = Math.floor(baso / 100);
    const chuc = Math.floor((baso % 100) / 10);
    const donvi = baso % 10;
    let KetQua = "";
    if (tram === 0 && chuc === 0 && donvi === 0) return "";
    if (tram !== 0) {
      KetQua += ChuSo[tram] + " trăm ";
      if (chuc === 0 && donvi !== 0) KetQua += "lẻ ";
    }
    if (chuc !== 0 && chuc !== 1) {
      KetQua += ChuSo[chuc] + " mươi";
      if (chuc !== 0 && donvi === 1) KetQua += " mốt";
    } else if (chuc === 1) {
      KetQua += "mười";
      if (donvi === 1) KetQua += " một";
    }
    if (chuc !== 0 && chuc !== 1 && donvi === 5) KetQua += " lăm";
    else if (donvi !== 0 && !(chuc === 1 && donvi === 1))
      KetQua += " " + ChuSo[donvi];
    return KetQua.trim();
  }
};



export const getItemFromResponse = <T extends { id: number }>(
  data: { data?: { items?: Array<{ data?: T } | T> } } | T[] | undefined,
  id: number | undefined
): T | Record<string, never> => {
  if (id === undefined) {
    return {} as Record<string, never>;
  }
  const dataArray = (data && 'data' in data && data.data?.items) || (Array.isArray(data) ? data : []) || [];
  const items = dataArray.map((x) => ('data' in x && x.data ? x.data : x)) as T[];
  return items.find((x) => x.id === id) ?? ({} as Record<string, never>);
};

/**
 * Extract error message from API error response.
 * Handles both RTK Query error shape and raw errors.
 */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const err = error as any;
  return err?.data?.return_message ?? err?.data?.message ?? err?.message ?? fallback;
};

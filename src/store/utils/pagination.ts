import { DEFAULT_PAGE, DEFAULT_SIZE } from "@/constants";

export function paginateItems<T>(items: T[], params: { page?: number; page_size?: number }) {
  const page = params?.page || DEFAULT_PAGE;
  const pageSize = params?.page_size || DEFAULT_SIZE;
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

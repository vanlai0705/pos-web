export * from "./company";

export const baseUrl = import.meta.env.VITE_BASE_URL;
export const baseImageUrl = import.meta.env.VITE_BASE_IMAGE_URL;

export const StorageKey = {
  TOKEN: "TOKEN",
  ENV: "ENV",
  REFRESH_TOKEN: "REFRESH_TOKEN",
  USER_ID: "USER_ID",
} as const;

export type StorageKey = (typeof StorageKey)[keyof typeof StorageKey];

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const DEFAULT_SIZE = 10;

export const REGEX_PASSWORD =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

export const ROLE = {
  STAFF: "staff",
  ADMIN: "admin",
} as const;

export type ROLE = (typeof ROLE)[keyof typeof ROLE];

export const CrudAction = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
} as const;

export type CrudAction = (typeof CrudAction)[keyof typeof CrudAction];

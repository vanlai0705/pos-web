export * from "./company";

const API_ORIGIN = "https://api.posmobile.vn";

/**
 * .env* is gitignored, so a deploy can easily end up without these.
 *
 * The API only whitelists posmobile.vn and localhost for CORS, so a hosted
 * build must go through the host's own /api proxy (see vercel.json) rather than
 * calling the origin directly — same-origin requests are never CORS-checked.
 * Dev keeps the absolute URL because localhost IS whitelisted.
 */
export const baseUrl: string =
  import.meta.env.VITE_BASE_URL ||
  (import.meta.env.DEV ? `${API_ORIGIN}/api/v1` : "/api/v1");

// Images are plain <img src>, which CORS does not apply to.
export const baseImageUrl: string =
  import.meta.env.VITE_BASE_IMAGE_URL || API_ORIGIN;

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

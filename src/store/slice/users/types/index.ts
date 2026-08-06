import type { TPagingResponse, Paging } from "@/types/shared-types";

// Re-export POS types
export * from "./pos-types";
// Re-export state types
export * from "./user-slice-state.type";

// TLoginResponse alias (backward compat)
export type { TPosLoginData as TLoginResponse } from "./pos-types";

// ─── Legacy types (giữ để tránh break import ở nơi khác) ─────────────────────

export interface TRegisterRequest {
  name: string;
  user_name: string;
  email: string;
  password: string;
  confirm_password: string;
  phone?: string;
  department?: string;
}

export interface TCreateUserRequest {
  name: string;
  user_name: string;
  email: string;
  password: string;
  confirm_password?: string;
  phone?: string;
  department?: string;
}

export interface TUpdateUserRequest {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
}

export type TUsersFilter = {
  name?: string;
  user_name?: string;
  email?: string;
};

export type TUsersRequest = Paging & TUsersFilter;

export type TUserItem = {
  id: number;
  name: string;
  user_name: string;
  email: string;
  phone?: string;
  department?: string;
  role?: string;
};

export type TUsersListResponse = TPagingResponse<TUserItem>;

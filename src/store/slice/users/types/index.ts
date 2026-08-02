import type { TPagingResponse, Paging } from "@/types/shared-types";

// Re-export POS types
export * from "./pos-types";
// Re-export state types
export * from "./user-slice-state.type";

// TLoginResponse alias (backward compat)
export type { TPosLoginData as TLoginResponse } from "./pos-types";

// ─── Legacy types (giữ để tránh break import ở nơi khác) ─────────────────────

export interface TChangePasswordRequest {
  old_password: string;
  new_password: string;
  is_force?: boolean;
}

export interface TChangePasswordV1Request {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

/** @deprecated Dùng TPosUser */
export interface TUserInfo {
  username: string;
  name: string;
  email: string;
  phone?: string;
  status: number;
  status_string?: string;
  image_url?: string;
}

/** @deprecated Không dùng với POS API */
export interface TUserProfileData {
  id: number;
  name: string;
  user_name: string;
  avatar_url?: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  role?: string;
  status?: string;
  date_of_birth?: { time: Date | string };
  avatar?: string;
  id_card_number?: string;
  id_card_issue_place?: string;
  last_login_at?: { Time: string; Valid: boolean };
  created_at?: string;
  list_warehouse_id?: number[] | null;
}

export interface TUserProfileResponse {
  data: TUserProfileData;
}

export interface TUpdateProfileRequest {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  avatar?: string;
  id_card_issue_place?: string;
  id_card_number?: string;
  date_of_birth?: string;
}

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

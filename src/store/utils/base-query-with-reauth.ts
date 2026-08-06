import { baseUrl } from "@/constants";
import { logout } from "@/store/slice/users/app/app";
import { TRootState } from "../store";
import {
  BaseQueryFn,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { toast } from "sonner";

const TIME_OUT = 30;

export const getBaseQuery = () => {
  return fetchBaseQuery({
    baseUrl: baseUrl,
    prepareHeaders: (headers: Headers, { getState }) => {
      const state = getState() as TRootState;
      const token = state.user.auth?.data?.SessionToken;
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
    timeout: TIME_OUT * 1000,
  });
};

export const getBaseQueryWithReauth = (): BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> => {
  const baseQuery = getBaseQuery();

  return async (args: string | FetchArgs, api, extraOptions) => {
    const result: any = await baseQuery(args, api, extraOptions);
    const requestUrl =
      typeof args === "string"
        ? args
        : (args as FetchArgs)?.url?.toString?.() ?? "";

    if (result.error) {
      const status = result.error.status;
      // Anonymous QR self-order calls run with no session at all (a diner
      // scanning a table's QR code) — a 401/expired-guid there must never
      // force-redirect to /login, there's no login for them to reach.
      const isAuthEndpoint =
        requestUrl.includes("login") ||
        requestUrl.includes("register") ||
        requestUrl.includes("forgot-password") ||
        requestUrl.includes("renew-password") ||
        requestUrl.includes("logout") ||
        requestUrl.includes("get-anonymous") ||
        requestUrl.includes("order-anonymous") ||
        requestUrl.includes("get-order-items");

      if (status === 401 && !isAuthEndpoint) {
        api.dispatch(logout());
        window.location.replace("/login");
        return result;
      }

      if (!isAuthEndpoint) {
        const message =
          result.error?.data?.Errors?.[0]?.Message ||
          result.error?.data?.return_message ||
          "Đã có lỗi xảy ra";
        toast.error(message);
      }
    }

    return result;
  };
};

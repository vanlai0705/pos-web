import { userApiSlice } from '@/store/slice/api/base'
import type {
  TForgotPasswordRequest,
  TLoginResponse,
  TPosLoginData,
  TPosLoginRequest,
  TPosRegisterRequest,
  TPosResponse,
  TRenewPasswordRequest
} from '@/store/slice/users/types'
export const authApi = userApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── POS Auth ──────────────────────────────────────────────────────────────

    login: builder.mutation<TLoginResponse, TPosLoginRequest>({
      query: (body: TPosLoginRequest) => ({
        url: "user-infos/login",
        method: "POST",
        body,
      }),
      transformResponse: (response: TPosResponse<TPosLoginData>) => {
        return response.Data;
      },
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    register: builder.mutation<TPosResponse<any>, TPosRegisterRequest>({
      query: (body: TPosRegisterRequest) => ({
        url: "user-infos/register",
        method: "POST",
        body,
      }),
      transformResponse: (response: TPosResponse<any>) => response,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getMe: builder.query<TPosLoginData, void>({
      query: () => ({
        url: "user-infos/me",
        method: "GET",
      }),
      transformResponse: (response: TPosResponse<TPosLoginData>) =>
        response.Data,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    posLogout: builder.mutation<void, { token: string }>({
      query: ({ token }) => ({
        url: `user-infos/logout?token=${token}`,
        method: "GET",
      }),
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    forgotPassword: builder.mutation<TPosResponse<any>, TForgotPasswordRequest>(
      {
        query: (body: TForgotPasswordRequest) => ({
          url: "user-infos/forgot-password",
          method: "POST",
          body,
        }),
        transformResponse: (response: TPosResponse<any>) => response,
        transformErrorResponse: (response: any) =>
          response?.data?.Errors?.[0]?.Message || response.status,
      },
    ),

    renewPassword: builder.mutation<TPosResponse<any>, TRenewPasswordRequest>({
      query: (body: TRenewPasswordRequest) => ({
        url: "user-infos/renew-password",
        method: "POST",
        body,
      }),
      transformResponse: (response: TPosResponse<any>) => response,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),
  }),
  overrideExisting: false,
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  usePosLogoutMutation,
  useForgotPasswordMutation,
  useRenewPasswordMutation
} = authApi;

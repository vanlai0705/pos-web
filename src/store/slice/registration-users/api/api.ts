import type { TMessage } from '@/store/slice/users/app'
import type { TPosMenuItem } from '@/utils/pos-menu-converter'
import { userApiSlice } from '@/store/slice/api/base'
import { EUserTagTypes } from '@/store/slice/api/tag-types'
import { normalizePagingResponse, query } from '@/utils'
import type {
  TCreateUserRequest,
  TPosMember,
  TPosProductCategory,
  TPosProvince,
  TPosResponse,
  TRegisterRequest,
  TUpdateUserRequest,
  TUsersListResponse,
  TUsersRequest
} from '@/store/slice/users/types'
export const registrationUsersApi = userApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── POS Register helpers ─────────────────────────────────────────────────

    getProvinces: builder.query<TPosProvince[], void>({
      query: () => ({
        url: "setting/get-provinces",
        method: "GET",
      }),
      transformResponse: (response: TPosResponse<TPosProvince[]>) =>
        response.Data ?? [],
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getProductCategories: builder.query<TPosProductCategory[], void>({
      query: () => ({
        url: "setting/get-product-categories",
        method: "GET",
      }),
      transformResponse: (response: TPosResponse<TPosProductCategory[]>) =>
        response.Data ?? [],
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    initShopData: builder.mutation<TPosResponse<any>, void>({
      query: () => ({
        url: "setting/init-data",
        method: "POST",
      }),
      transformResponse: (response: TPosResponse<any>) => response,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getMenu: builder.query<TPosMenuItem[], void>({
      query: () => ({
        url: "setting/get-menus",
        method: "GET",
      }),
      transformResponse: (response: TPosResponse<TPosMenuItem[]>) =>
        response.Data ?? [],
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getUsers: builder.query<TUsersListResponse, TUsersRequest>({
      query: (payload: TUsersRequest) => ({
        url: `users/filter${query(payload)}`,
        method: "GET",
      }),
      transformResponse: (response: any) =>
        normalizePagingResponse(response) as TUsersListResponse,
      transformErrorResponse: (response: { status: string | number }) =>
        response.status,
      providesTags: () => [{ type: EUserTagTypes.UserInfo }],
    }),

    /**
     * The logged-in user's own profile — GET users/detail?id={selfId} to
     * load (same endpoint the HR member-detail screen uses, just called
     * with your own Id), POST (multipart) user-infos/self-update to save.
     * Mirrors pos_web's user-update.component 1:1; the previous
     * users/profile GET/PUT here never existed on the real API.
     */
    selfUpdateProfile: builder.mutation<
      TPosMember,
      { model: Partial<TPosMember>; file?: File | null }
    >({
      query: ({ model, file }) => {
        const form = new FormData();
        form.append(
          "model",
          new Blob([JSON.stringify(model)], { type: "application/json" }),
        );
        if (file) form.append(file.name, file);
        return { url: "user-infos/self-update", method: "POST", body: form };
      },
      transformResponse: (res: TPosResponse<TPosMember>) => res.Data,
      invalidatesTags: () => [{ type: EUserTagTypes.UserInfo }],
    }),

    /**
     * Mirrors pos_web's UserChangePasswordComponent: POST user-infos/change-password
     * with the OLD and NEW passwords already SHA256-salted client-side
     * (same computePasswordSalt used at login) — the plaintext password is
     * never sent. The previous users/change-password (PUT) here never
     * existed on the real API.
     */
    selfChangePassword: builder.mutation<
      TMessage,
      { PasswordSaltOld: string; PasswordSaltNew: string }
    >({
      query: (body) => ({
        url: "user-infos/change-password",
        method: "POST",
        body,
      }),
      transformResponse: (response: TMessage) => response,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    createUser: builder.mutation<TMessage, TCreateUserRequest>({
      query: (body) => {
        const registerBody: TRegisterRequest = {
          name: body.name,
          user_name: body.user_name,
          email: body.email,
          password: body.password,
          confirm_password: body.confirm_password || body.password,
        };
        if (body.phone && body.phone.trim() !== "") {
          registerBody.phone = body.phone;
        }
        if (body.department && body.department.trim() !== "") {
          registerBody.department = body.department;
        }
        return {
          url: "register",
          method: "POST",
          body: registerBody,
        };
      },
      transformResponse: (response: TMessage) => response,
      transformErrorResponse: (response: { status: string | number }) =>
        response.status,
      invalidatesTags: () => [{ type: EUserTagTypes.UserInfo }],
    }),

    updateUser: builder.mutation<TMessage, TUpdateUserRequest>({
      query: ({ id, ...body }) => ({
        url: `users/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: TMessage) => response,
      transformErrorResponse: (response: { status: string | number }) =>
        response.status,
      invalidatesTags: () => [{ type: EUserTagTypes.UserInfo }],
    }),

    deleteUser: builder.mutation<TMessage, { id: number }>({
      query: ({ id }) => ({
        url: `users/${id}`,
        method: "DELETE",
      }),
      transformResponse: (response: TMessage) => response,
      transformErrorResponse: (response: { status: string | number }) =>
        response.status,
      invalidatesTags: () => [{ type: EUserTagTypes.UserInfo }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetProvincesQuery,
  useLazyGetProvincesQuery,
  useGetProductCategoriesQuery,
  useLazyGetProductCategoriesQuery,
  useInitShopDataMutation,
  useGetMenuQuery,
  useLazyGetMenuQuery,
  useGetUsersQuery,
  useLazyGetUsersQuery,
  useSelfUpdateProfileMutation,
  useSelfChangePasswordMutation,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation
} = registrationUsersApi;

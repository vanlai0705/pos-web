import { userApiSlice } from '@/store/slice/api/base'
import { EUserTagTypes } from '@/store/slice/api/tag-types'
import { query } from '@/utils'
import { buildModelFormData } from '@/utils/multipart'
import type {
  TPosFilterData,
  TPosMember,
  TPosResponse,
  TPosSalaryType,
  TPosShop,
  TPosUserAccount,
  TReportData
} from '@/store/slice/users/types'
export const humanResourcesApi = userApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── HR: Filter queries ───────────────────────────────────────────────────
    filterMembers: builder.query<
      TReportData,
      {
        PageIndex?: number;
        PageSize?: number;
        Keyword?: string;
        StatusId?: number | "";
      }
    >({
      query: (p) => ({
        url: `users/filter${query({ PageIndex: 0, PageSize: 15, ...p })}`,
      }),
      transformResponse: (res: TPosResponse<TReportData>) =>
        res.Data ?? { Items: [], TotalItemCount: 0, Sumary: null },
    }),
    filterSalaries: builder.query<
      TReportData,
      {
        PageIndex?: number;
        PageSize?: number;
        Keyword?: string;
        Month?: string;
      }
    >({
      query: (p) => ({
        url: `salary/filter${query({ PageIndex: 0, PageSize: 15, ...p })}`,
      }),
      transformResponse: (res: TPosResponse<TReportData>) =>
        res.Data ?? { Items: [], TotalItemCount: 0, Sumary: null },
    }),
    filterShifts: builder.query<
      TReportData,
      {
        PageIndex?: number;
        PageSize?: number;
        Keyword?: string;
        StatusId?: number | "";
      }
    >({
      query: (p) => ({
        url: `shift/filter${query({ PageIndex: 0, PageSize: 15, ...p })}`,
      }),
      transformResponse: (res: TPosResponse<TReportData>) =>
        res.Data ?? { Items: [], TotalItemCount: 0, Sumary: null },
    }),
    saveShift: builder.mutation<void, Record<string, any>>({
      query: (data) => ({
        url: data.Id ? "shift/update" : "shift/create",
        method: "POST",
        body: buildModelFormData(data),
      }),
    }),
    updateShiftStatus: builder.mutation<void, { id: number; statusId: number }>(
      {
        query: ({ id, statusId }) => ({
          url: `shift/update-status?id=${id}&statusId=${statusId}`,
          method: "POST",
          body: {},
        }),
      },
    ),
    /** Full member record — the list rows omit UserInfo/Shops/Image. */
    getMemberDetail: builder.query<TPosMember | null, number>({
      query: (id) => ({ url: `users/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosMember>) => res.Data ?? null,
      providesTags: () => [{ type: EUserTagTypes.UserInfo }],
    }),

    /**
     * users/create|update takes multipart: the model as a JSON blob plus any
     * avatar file, same as Angular's `postMultipart`.
     */
    saveMember: builder.mutation<
      TPosMember,
      { model: TPosMember; file?: File | null }
    >({
      query: ({ model, file }) => {
        const form = new FormData();
        form.append(
          "model",
          new Blob([JSON.stringify(model)], { type: "application/json" }),
        );
        if (file) form.append(file.name, file);
        return {
          url: model.Id ? "users/update" : "users/create",
          method: "POST",
          body: form,
        };
      },
      transformResponse: (res: TPosResponse<TPosMember>) => res.Data,
    }),

    updateMemberStatus: builder.mutation<
      void,
      { id: number; statusId: number }
    >({
      query: ({ id, statusId }) => ({
        url: `users/update-status?id=${id}&statusId=${statusId}`,
        method: "POST",
        body: {},
      }),
    }),

    /** Login account attached to a member (may not exist yet). */
    getAccountByMember: builder.query<TPosUserAccount | null, number>({
      query: (id) => ({ url: `user-infos/detail-by-user?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosUserAccount>) =>
        res.Data ?? null,
    }),

    saveAccount: builder.mutation<TPosUserAccount, TPosUserAccount>({
      query: (data) => {
        const form = new FormData();
        form.append(
          "model",
          new Blob([JSON.stringify(data)], { type: "application/json" }),
        );
        // Swagger exposes no user-infos/create — the account row already
        // exists once the member is saved, so this is always an update.
        return { url: "user-infos/update", method: "POST", body: form };
      },
      transformResponse: (res: TPosResponse<TPosUserAccount>) => res.Data,
    }),

    getShopsSimple: builder.query<TPosShop[], void>({
      query: () => ({
        url: `shop/filter-simple${query({ PageIndex: 0, PageSize: 1000 })}`,
      }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosShop>>) =>
        res.Data?.Items ?? [],
    }),

    getUserGroups: builder.query<Array<{ Id?: number; Name?: string }>, void>({
      query: () => ({
        url: `usergroup/filter${query({ PageIndex: 0, PageSize: 1000 })}`,
      }),
      transformResponse: (
        res: TPosResponse<TPosFilterData<{ Id?: number; Name?: string }>>,
      ) => res.Data?.Items ?? [],
    }),

    getSalaryTypes: builder.query<TPosSalaryType[], void>({
      query: () => ({ url: "salary/get-salary-types" }),
      transformResponse: (res: TPosResponse<TPosSalaryType[]>) =>
        res.Data ?? [],
    }),
  }),
  overrideExisting: false,
});

export const {
  useFilterMembersQuery,
  useLazyFilterMembersQuery,
  useFilterSalariesQuery,
  useLazyFilterSalariesQuery,
  useFilterShiftsQuery,
  useLazyFilterShiftsQuery,
  useSaveShiftMutation,
  useUpdateShiftStatusMutation,
  useGetMemberDetailQuery,
  useLazyGetMemberDetailQuery,
  useSaveMemberMutation,
  useUpdateMemberStatusMutation,
  useGetAccountByMemberQuery,
  useLazyGetAccountByMemberQuery,
  useSaveAccountMutation,
  useGetShopsSimpleQuery,
  useLazyGetShopsSimpleQuery,
  useGetUserGroupsQuery,
  useLazyGetUserGroupsQuery,
  useGetSalaryTypesQuery,
  useLazyGetSalaryTypesQuery
} = humanResourcesApi;

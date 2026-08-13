import { userApiSlice } from '@/store/slice/api/base'
import { query } from '@/utils'
import type {
  TPosChartMonth,
  TPosCustomerGroup,
  TPosFilterData,
  TPosFilterParams,
  TPosProductGroup,
  TPosProductGroupFull,
  TPosResponse,
  TPosSupplierGroup,
  TPosUnit
} from '@/store/slice/users/types'
export const managersApi = userApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProductGroups: builder.query<TPosProductGroup[], void>({
      query: () => ({ url: "productgroups/get-list", method: "GET" }),
      transformResponse: (res: TPosResponse<TPosProductGroup[]>) =>
        res.Data ?? [],
      transformErrorResponse: (res: any) =>
        res?.data?.Errors?.[0]?.Message || res.status,
    }),

    // Keep for backward compat
    getChartByMonth: builder.query<TPosChartMonth[], void>({
      query: () => ({ url: "charts/chart-simple-by-month", method: "GET" }),
      transformResponse: (response: TPosResponse<TPosChartMonth[]>) =>
        response.Data ?? [],
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    // ─── Managers: Product Groups ────────────────────────────────────────────

    filterProductGroups: builder.query<
      TPosFilterData<TPosProductGroupFull>,
      TPosFilterParams
    >({
      query: (p) => ({
        url: `productgroups/filter${query({ PageIndex: 0, PageSize: 15, ...p })}`,
      }),
      transformResponse: (
        res: TPosResponse<TPosFilterData<TPosProductGroupFull>>,
      ) => res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getProductGroupDetail: builder.query<TPosProductGroupFull, number>({
      query: (id) => ({ url: `productgroups/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosProductGroupFull>) => res.Data,
    }),

    saveProductGroup: builder.mutation<void, TPosProductGroupFull>({
      query: (data) => {
        const form = new FormData();
        form.append("model", JSON.stringify(data));
        return {
          url: data.Id ? "productgroups/update" : "productgroups/create",
          method: "POST",
          body: form,
        };
      },
    }),

    updateProductGroupStatus: builder.mutation<
      void,
      { id: number; statusId: number }
    >({
      query: ({ id, statusId }) => ({
        url: `productgroups/update-status?id=${id}&statusId=${statusId}`,
        method: "POST",
        body: {},
      }),
    }),

    // ─── Managers: Customer Groups ───────────────────────────────────────────

    filterCustomerGroups: builder.query<
      TPosFilterData<TPosCustomerGroup>,
      TPosFilterParams
    >({
      query: (p) => ({
        url: `customergroups/filter${query({ PageIndex: 0, PageSize: 15, ...p })}`,
      }),
      transformResponse: (
        res: TPosResponse<TPosFilterData<TPosCustomerGroup>>,
      ) => res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getCustomerGroupDetail: builder.query<TPosCustomerGroup, number>({
      query: (id) => ({ url: `customergroups/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosCustomerGroup>) => res.Data,
    }),

    saveCustomerGroup: builder.mutation<void, TPosCustomerGroup>({
      query: (data) => {
        const form = new FormData();
        form.append("model", JSON.stringify(data));
        return {
          url: data.Id ? "customergroups/update" : "customergroups/create",
          method: "POST",
          body: form,
        };
      },
    }),

    updateCustomerGroupStatus: builder.mutation<
      void,
      { id: number; statusId: number }
    >({
      query: ({ id, statusId }) => ({
        url: `customergroups/update-status?id=${id}&statusId=${statusId}`,
        method: "POST",
        body: {},
      }),
    }),

    // ─── Managers: Supplier Groups ───────────────────────────────────────────

    filterSupplierGroups: builder.query<
      TPosFilterData<TPosSupplierGroup>,
      TPosFilterParams
    >({
      query: (p) => ({
        url: `suppliergroups/filter${query({ PageIndex: 0, PageSize: 15, ...p })}`,
      }),
      transformResponse: (
        res: TPosResponse<TPosFilterData<TPosSupplierGroup>>,
      ) => res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getSupplierGroupDetail: builder.query<TPosSupplierGroup, number>({
      query: (id) => ({ url: `suppliergroups/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosSupplierGroup>) => res.Data,
    }),

    saveSupplierGroup: builder.mutation<void, TPosSupplierGroup>({
      query: (data) => {
        const form = new FormData();
        form.append("model", JSON.stringify(data));
        return {
          url: data.Id ? "suppliergroups/update" : "suppliergroups/create",
          method: "POST",
          body: form,
        };
      },
    }),

    updateSupplierGroupStatus: builder.mutation<
      void,
      { id: number; statusId: number }
    >({
      query: ({ id, statusId }) => ({
        url: `suppliergroups/update-status?id=${id}&statusId=${statusId}`,
        method: "POST",
        body: {},
      }),
    }),

    // ─── Managers: Units ─────────────────────────────────────────────────────

    filterUnits: builder.query<TPosFilterData<TPosUnit>, TPosFilterParams>({
      query: (p) => ({
        url: `units/filter${query({ PageIndex: 0, PageSize: 15, ...p })}`,
      }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosUnit>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getUnitDetail: builder.query<TPosUnit, number>({
      query: (id) => ({ url: `units/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosUnit>) => res.Data,
    }),

    saveUnit: builder.mutation<void, TPosUnit>({
      query: (data) => {
        const form = new FormData();
        form.append("model", JSON.stringify(data));
        return {
          url: data.Id ? "units/update" : "units/create",
          method: "POST",
          body: form,
        };
      },
    }),

    updateUnitStatus: builder.mutation<void, { id: number; statusId: number }>({
      query: ({ id, statusId }) => ({
        url: `units/update-status?id=${id}&statusId=${statusId}`,
        method: "POST",
        body: {},
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetProductGroupsQuery,
  useLazyGetProductGroupsQuery,
  useGetChartByMonthQuery,
  useLazyGetChartByMonthQuery,
  useFilterProductGroupsQuery,
  useLazyFilterProductGroupsQuery,
  useGetProductGroupDetailQuery,
  useLazyGetProductGroupDetailQuery,
  useSaveProductGroupMutation,
  useUpdateProductGroupStatusMutation,
  useFilterCustomerGroupsQuery,
  useLazyFilterCustomerGroupsQuery,
  useGetCustomerGroupDetailQuery,
  useLazyGetCustomerGroupDetailQuery,
  useSaveCustomerGroupMutation,
  useUpdateCustomerGroupStatusMutation,
  useFilterSupplierGroupsQuery,
  useLazyFilterSupplierGroupsQuery,
  useGetSupplierGroupDetailQuery,
  useLazyGetSupplierGroupDetailQuery,
  useSaveSupplierGroupMutation,
  useUpdateSupplierGroupStatusMutation,
  useFilterUnitsQuery,
  useLazyFilterUnitsQuery,
  useGetUnitDetailQuery,
  useLazyGetUnitDetailQuery,
  useSaveUnitMutation,
  useUpdateUnitStatusMutation
} = managersApi;

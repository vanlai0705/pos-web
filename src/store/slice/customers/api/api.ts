import { userApiSlice } from '@/store/slice/api/base'
import { query } from '@/utils'
import type {
  TPosCustomer,
  TPosCustomerSimple,
  TPosCustomerSimpleGroup,
  TPosFilterData,
  TPosFilterParams,
  TPosProductGroup,
  TPosResponse,
  TPosUser
} from '@/store/slice/users/types'
export const customersApi = userApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Actives: Customers ─────────────────────────────────────────────────

    filterCustomers: builder.query<
      TPosFilterData<TPosCustomer>,
      TPosFilterParams & { GroupId?: number }
    >({
      query: (p) => ({
        url: `customers/filter${query({ PageIndex: 0, PageSize: 15, ...p })}`,
      }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosCustomer>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    filterCustomersSimple: builder.query<
      TPosFilterData<TPosCustomerSimple>,
      {
        Keyword?: string;
        PageIndex?: number;
        PageSize?: number;
        StatusId?: number;
      }
    >({
      query: (p) => ({
        url: `customers/filter-simple${query({ PageIndex: 0, PageSize: 10, StatusId: 0, ...p })}`,
      }),
      transformResponse: (
        res: TPosResponse<TPosFilterData<TPosCustomerSimple>>,
      ) => res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    filterUsersSimple: builder.query<
      TPosFilterData<TPosUser>,
      {
        Keyword?: string;
        PageIndex?: number;
        PageSize?: number;
        StatusId?: number;
      }
    >({
      query: (p) => ({
        url: `users/filter-simple${query({ PageIndex: 0, PageSize: 10, StatusId: 0, ...p })}`,
      }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosUser>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getCustomerDetail: builder.query<TPosCustomer, number>({
      query: (id) => ({ url: `customers/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosCustomer>) => res.Data,
    }),

    saveCustomer: builder.mutation<TPosCustomer, TPosCustomer>({
      query: (data) => {
        const form = new FormData();
        form.append("model", JSON.stringify(data));
        return {
          url: data.Id ? "customers/update" : "customers/create",
          method: "POST",
          body: form,
        };
      },
      transformResponse: (res: TPosResponse<TPosCustomer>) => res.Data,
    }),

    updateCustomerStatus: builder.mutation<
      void,
      { id: number; statusId: number }
    >({
      query: ({ id, statusId }) => ({
        url: `customers/update-status?id=${id}&statusId=${statusId}`,
        method: "POST",
        body: {},
      }),
    }),

    filterRoyalCustomers: builder.query<
      TPosFilterData<TPosCustomer>,
      TPosFilterParams & { CustomerGroupId?: number }
    >({
      query: (p) => ({
        url: `customers/filter-royal${query({ PageIndex: 0, PageSize: 15, ...p })}`,
      }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosCustomer>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getCustomerGroupsSimple: builder.query<TPosCustomerSimpleGroup[], void>({
      query: () => ({ url: "customergroups/filter-simple" }),
      transformResponse: (res: any) => {
        const d = res.Data;
        if (Array.isArray(d)) return d;
        return d?.Items ?? [];
      },
    }),

    getProductGroupsSimple: builder.query<TPosProductGroup[], void>({
      query: () => ({ url: "productgroups/filter-simple" }),
      transformResponse: (res: any) => {
        const d = res.Data;
        if (Array.isArray(d)) return d;
        return d?.Items ?? [];
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useFilterCustomersQuery,
  useLazyFilterCustomersQuery,
  useFilterCustomersSimpleQuery,
  useLazyFilterCustomersSimpleQuery,
  useFilterUsersSimpleQuery,
  useLazyFilterUsersSimpleQuery,
  useGetCustomerDetailQuery,
  useLazyGetCustomerDetailQuery,
  useSaveCustomerMutation,
  useUpdateCustomerStatusMutation,
  useFilterRoyalCustomersQuery,
  useLazyFilterRoyalCustomersQuery,
  useGetCustomerGroupsSimpleQuery,
  useLazyGetCustomerGroupsSimpleQuery,
  useGetProductGroupsSimpleQuery,
  useLazyGetProductGroupsSimpleQuery
} = customersApi;

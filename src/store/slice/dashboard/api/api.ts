import { userApiSlice } from '@/store/slice/api/base'
import type {
  TPosAppCountInfo,
  TPosAppInfo,
  TPosCustomerActivity,
  TPosFunctionGroup,
  TPosOrderActivity,
  TPosProductStatistic,
  TPosResponse,
  TPosSimpleChart,
  TPosStatisticChart,
  TPosSupportWebRequest,
  TPosSystemInfo
} from '@/store/slice/users/types'
export const dashboardApi = userApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Dashboard ───────────────────────────────────────────────────────────

    getAppCountInfo: builder.query<TPosAppCountInfo, void>({
      query: () => ({ url: "setting/app-count-info", method: "GET" }),
      transformResponse: (response: TPosResponse<TPosAppCountInfo>) =>
        response.Data,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getSystemInfo: builder.query<TPosSystemInfo, void>({
      query: () => ({ url: "setting/system-info", method: "GET" }),
      transformResponse: (response: TPosResponse<TPosSystemInfo>) =>
        response.Data ?? {},
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getAppInfo: builder.query<TPosAppInfo, void>({
      query: () => ({ url: "setting/app-info", method: "GET" }),
      transformResponse: (response: TPosResponse<TPosAppInfo>) =>
        response.Data ?? {},
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getFunctionGroups: builder.query<TPosFunctionGroup[], void>({
      query: () => ({ url: "functions/get-list", method: "GET" }),
      transformResponse: (response: TPosResponse<TPosFunctionGroup[]>) =>
        response.Data ?? [],
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    createSupportWeb: builder.mutation<void, TPosSupportWebRequest>({
      query: (body) => ({ url: "supports/create-web", method: "POST", body }),
      transformResponse: () => undefined,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    /** type: 0=Doanh thu, 1=Đơn hàng, 2=Khách hàng, 3=Thanh toán */
    getSimpleChart: builder.query<
      TPosSimpleChart,
      { type: number; DateFrom: string; DateTo: string }
    >({
      query: ({ type, DateFrom, DateTo }) => ({
        url: `charts/chart-simple-by-month?type=${type}&DateFrom=${encodeURIComponent(DateFrom)}&DateTo=${encodeURIComponent(DateTo)}`,
        method: "GET",
      }),
      transformResponse: (response: TPosResponse<TPosSimpleChart>) =>
        response.Data,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    /** Biểu đồ lợi nhuận — Type: 0=Ngày, 1=Tháng, 2=Năm */
    getStatisticChart: builder.query<
      TPosStatisticChart,
      {
        Type: number;
        Month: number;
        Year: number;
        YearFrom: number;
        YearTo: number;
      }
    >({
      query: ({ Type, Month, Year, YearFrom, YearTo }) => ({
        url: `charts/chart-statistic?Type=${Type}&Month=${Month}&Year=${Year}&YearFrom=${YearFrom}&YearTo=${YearTo}`,
        method: "GET",
      }),
      transformResponse: (response: TPosResponse<TPosStatisticChart>) =>
        response.Data,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getOrderActivity: builder.query<
      TPosOrderActivity,
      {
        PageSize?: number;
        PageIndex?: number;
        dateFrom?: string;
        dateTo?: string;
      }
    >({
      query: ({ PageSize = 10, PageIndex = 0, dateFrom, dateTo }) => {
        let url = `orders/filter-order-activity?PageSize=${PageSize}&PageIndex=${PageIndex}`;
        if (dateFrom) url += `&dateFrom=${encodeURIComponent(dateFrom)}`;
        if (dateTo) url += `&dateTo=${encodeURIComponent(dateTo)}`;
        return { url, method: "GET" };
      },
      transformResponse: (response: TPosResponse<TPosOrderActivity>) =>
        response.Data,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getProductStatistic: builder.query<
      TPosProductStatistic,
      {
        PageSize?: number;
        PageIndex?: number;
        dateFrom?: string;
        dateTo?: string;
      }
    >({
      query: ({ PageSize = 10, PageIndex = 0, dateFrom, dateTo }) => {
        let url = `statistic/filter-product-statistic?PageSize=${PageSize}&PageIndex=${PageIndex}`;
        if (dateFrom) url += `&dateFrom=${encodeURIComponent(dateFrom)}`;
        if (dateTo) url += `&dateTo=${encodeURIComponent(dateTo)}`;
        return { url, method: "GET" };
      },
      transformResponse: (response: TPosResponse<TPosProductStatistic>) =>
        response.Data,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getCustomerActivity: builder.query<
      TPosCustomerActivity,
      { PageSize?: number; PageIndex?: number }
    >({
      query: ({ PageSize = 5, PageIndex = 0 }) => ({
        url: `customers/filter-activity?PageSize=${PageSize}&PageIndex=${PageIndex}`,
        method: "GET",
      }),
      transformResponse: (response: TPosResponse<TPosCustomerActivity>) =>
        response.Data,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAppCountInfoQuery,
  useLazyGetAppCountInfoQuery,
  useGetSystemInfoQuery,
  useLazyGetSystemInfoQuery,
  useGetAppInfoQuery,
  useLazyGetAppInfoQuery,
  useGetFunctionGroupsQuery,
  useLazyGetFunctionGroupsQuery,
  useCreateSupportWebMutation,
  useGetSimpleChartQuery,
  useLazyGetSimpleChartQuery,
  useGetStatisticChartQuery,
  useLazyGetStatisticChartQuery,
  useGetOrderActivityQuery,
  useLazyGetOrderActivityQuery,
  useGetProductStatisticQuery,
  useLazyGetProductStatisticQuery,
  useGetCustomerActivityQuery,
  useLazyGetCustomerActivityQuery
} = dashboardApi;

import { userApiSlice } from '@/store/slice/api/base'
import { query } from '@/utils'
import type {
  TPosProductStatistic,
  TPosResponse,
  TPosRevenueStatResponse,
  TPosRevenueSummaryResponse
} from '@/store/slice/users/types'
export const statisticsApi = userApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Actives: Statistics ────────────────────────────────────────────────

    filterProductStatistics: builder.query<
      TPosProductStatistic,
      {
        PageIndex?: number;
        PageSize?: number;
        DateFrom?: string;
        DateTo?: string;
        ProductGroupId?: number;
        ShopId?: number;
      }
    >({
      query: (p) => ({
        url: `statistic/filter-product-statistic${query({ PageIndex: 0, PageSize: 20, ...p })}`,
      }),
      transformResponse: (res: TPosResponse<TPosProductStatistic>) =>
        res.Data ?? {
          Items: [],
          TotalItemCount: 0,
          Sumary: { Quantity: 0, Amount: 0, AmountInput: 0, Profit: 0 },
        },
    }),

    filterRevenueStatistics: builder.query<
      TPosRevenueStatResponse,
      {
        PageIndex?: number;
        PageSize?: number;
        DateFrom?: string;
        DateTo?: string;
        ShopId?: number;
      }
    >({
      query: (p) => ({
        url: `statistic/filter-revenue-statistic${query({ PageIndex: 0, PageSize: 20, ...p })}`,
      }),
      transformResponse: (res: TPosResponse<TPosRevenueStatResponse>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    filterRevenueStatisticsSummary: builder.query<
      TPosRevenueSummaryResponse,
      { DateFrom?: string; DateTo?: string }
    >({
      query: (p) => ({
        url: `statistic/filter-revenue-statistic-sumary${query(p)}`,
      }),
      transformResponse: (res: TPosResponse<TPosRevenueSummaryResponse>) =>
        res.Data ?? [],
    }),
  }),
  overrideExisting: false,
});

export const {
  useFilterProductStatisticsQuery,
  useLazyFilterProductStatisticsQuery,
  useFilterRevenueStatisticsQuery,
  useLazyFilterRevenueStatisticsQuery,
  useFilterRevenueStatisticsSummaryQuery,
  useLazyFilterRevenueStatisticsSummaryQuery
} = statisticsApi;

import { userApiSlice } from '@/store/slice/api/base'
import { query } from '@/utils'
import type {
  TPosResponse,
  TReportData
} from '@/store/slice/users/types'
export const genericApi = userApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Reports ─────────────────────────────────────────────────────────────
    filterReport: builder.query<
      TReportData,
      { path: string; params?: Record<string, any> }
    >({
      query: ({ path, params }) => ({
        url: `${path}${params ? query({ PageIndex: 0, PageSize: 100, ...params }) : ""}`,
      }),
      transformResponse: (res: TPosResponse<TReportData>) =>
        res.Data ?? { Items: [], TotalItemCount: 0, Sumary: null },
    }),

    // ─── Generic POST mutation ────────────────────────────────────────────────
    genericGet: builder.query<
      any,
      { url: string; params?: Record<string, any> }
    >({
      query: ({ url, params }) => ({
        url: `${url}${params ? query(params) : ""}`,
      }),
    }),
    genericPost: builder.mutation<
      any,
      { url: string; method?: string; body?: any }
    >({
      query: ({ url, method = "POST", body }) => ({ url, method, body }),
    }),
    genericDownload: builder.mutation<
      Blob,
      { url: string; method?: string; body?: any }
    >({
      query: ({ url, method = "GET", body }) => ({
        url,
        method,
        body,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useFilterReportQuery,
  useLazyFilterReportQuery,
  useGenericGetQuery,
  useLazyGenericGetQuery,
  useGenericPostMutation,
  useGenericDownloadMutation
} = genericApi;

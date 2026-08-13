import { userApiSlice } from '@/store/slice/api/base'
import { query } from '@/utils'
import { buildModelFormData } from '@/utils/multipart'
import type {
  TPosResponse,
  TReportData
} from '@/store/slice/users/types'
export const stocksApi = userApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Stocks: Warehouses (danh sách kho) ─────────────────────────────────
    filterWarehouses: builder.query<
      TReportData,
      {
        PageIndex?: number;
        PageSize?: number;
        Keyword?: string;
        StatusId?: number | "";
      }
    >({
      query: (p) => ({
        url: `stock/filter${query({ PageIndex: 0, PageSize: 15, ...p })}`,
      }),
      transformResponse: (res: TPosResponse<TReportData>) =>
        res.Data ?? { Items: [], TotalItemCount: 0, Sumary: null },
    }),
    saveWarehouse: builder.mutation<void, Record<string, any>>({
      query: (data) => ({
        url: data.Id ? "stock/update" : "stock/create",
        method: "POST",
        body: buildModelFormData(data),
      }),
    }),
    updateWarehouseStatus: builder.mutation<
      void,
      { id: number; statusId: number }
    >({
      query: ({ id, statusId }) => ({
        url: `stock/update-status?id=${id}&statusId=${statusId}`,
        method: "POST",
        body: {},
      }),
    }),

    // ─── Stocks: Create mutations ─────────────────────────────────────────────
    createStockInput: builder.mutation<void, Record<string, any>>({
      query: (body) => ({
        url: "stockinputs/create",
        method: "POST",
        body: buildModelFormData(body),
      }),
    }),
    createStockOutput: builder.mutation<void, Record<string, any>>({
      query: (body) => ({
        url: "stockoutputs/create",
        method: "POST",
        body: buildModelFormData(body),
      }),
    }),
    createStockTransfer: builder.mutation<void, Record<string, any>>({
      query: (body) => ({
        url: "stocktransfers/create",
        method: "POST",
        body: buildModelFormData(body),
      }),
    }),
    createStockCheck: builder.mutation<void, Record<string, any>>({
      query: (body) => ({
        url: "stockchecks/create",
        method: "POST",
        body: buildModelFormData(body),
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useFilterWarehousesQuery,
  useLazyFilterWarehousesQuery,
  useSaveWarehouseMutation,
  useUpdateWarehouseStatusMutation,
  useCreateStockInputMutation,
  useCreateStockOutputMutation,
  useCreateStockTransferMutation,
  useCreateStockCheckMutation
} = stocksApi;

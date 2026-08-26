import { userApiSlice } from '@/store/slice/api/base'
import { query } from '@/utils'
import dayjs from 'dayjs'
import type {
  TPosFilterData,
  TPosOrder,
  TPosOrderFilterParams,
  TPosOrderInvoice,
  TPosOrderInvoiceFilterParams,
  TPosOrderItem,
  TPosResponse
} from '@/store/slice/users/types'
export const ordersApi = userApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Actives: Orders ────────────────────────────────────────────────────

    filterOrders: builder.query<
      TPosFilterData<TPosOrder>,
      TPosOrderFilterParams
    >({
      query: (p) => ({
        url: `orders/filter-order${query({ PageIndex: 0, PageSize: 15, ...p })}`,
      }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosOrder>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getOrderDetail: builder.query<TPosOrder, number>({
      // orders/detail takes `orderId`, not `id` — every other */detail endpoint
      // uses `id`, this one is the exception (matches Angular's order-manager).
      query: (id) => ({ url: `orders/detail?orderId=${id}` }),
      transformResponse: (res: TPosResponse<TPosOrder>) => res.Data,
    }),

    /** Read-only line-item preview for the booking/quotation picker dialogs. */
    getOrderItems: builder.query<TPosOrderItem[], number>({
      query: (orderId) => ({
        url: `orders/get-list-order-item?orderId=${orderId}`,
      }),
      transformResponse: (res: TPosResponse<TPosOrderItem[]>) => res.Data ?? [],
    }),

    filterTemporaryReceipts: builder.query<
      TPosFilterData<TPosOrder>,
      TPosOrderFilterParams
    >({
      query: (p) => ({
        url: `orders/filter-temporary-receipt${query({ PageIndex: 0, PageSize: 15, StatusId: 0, ...p })}`,
      }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosOrder>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    deleteTemporaryReceipt: builder.mutation<void, number>({
      query: (orderId) => ({
        url: `orders/delete-temporary-receipt?orderId=${orderId}`,
        method: "POST",
        body: {},
      }),
    }),

    cancelOrder: builder.mutation<void, number>({
      query: (orderId) => ({
        url: `orders/cancel?orderId=${orderId}`,
        method: "POST",
        body: {},
      }),
    }),

    // ─── Actives: Order Invoices ─────────────────────────────────────────────

    filterOrderInvoices: builder.query<
      TPosFilterData<TPosOrderInvoice>,
      TPosOrderInvoiceFilterParams
    >({
      query: (p) => ({
        url: `order-invoices/filter-invoice${query({ PageIndex: 0, PageSize: 15, ...p })}`,
      }),
      transformResponse: (
        res: TPosResponse<TPosFilterData<TPosOrderInvoice>>,
      ) => res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    importOrderInvoice: builder.mutation<void, number>({
      query: (orderInvoiceId) => ({
        url: `order-invoices/import-invoice?orderInvoiceId=${orderInvoiceId}`,
      }),
    }),

    viewOrderInvoiceHtml: builder.query<{ Html: string } | null, number>({
      query: (orderInvoiceId) => ({
        url: `order-invoices/view-invoice?orderInvoiceId=${orderInvoiceId}`,
      }),
      transformResponse: (res: TPosResponse<{ Html: string }>) =>
        res.Data ?? null,
    }),

    checkOrderInvoice: builder.mutation<
      { KeyInvoiceMsg?: { Message?: string } } | null,
      number
    >({
      query: (orderInvoiceId) => ({
        url: `order-invoices/check-invoice?orderInvoiceId=${orderInvoiceId}`,
      }),
      transformResponse: (res: TPosResponse<any>) => res.Data ?? null,
    }),

    // The orders/* endpoints take the order model as the raw request body.
    saveOrder: builder.mutation<TPosOrder, TPosOrder>({
      query: (data) => ({
        url: data.Id ? "orders/update" : "orders/temporary-receipt",
        method: "POST",
        body: data,
      }),
      transformResponse: (res: TPosResponse<TPosOrder>) => res.Data,
    }),

    completeOrder: builder.mutation<TPosOrder, TPosOrder>({
      query: (data) => ({
        url: "orders/completed",
        method: "POST",
        body: {
          ...data,
          Today: dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS'),
        },
      }),
      transformResponse: (res: TPosResponse<TPosOrder>) => res.Data,
    }),
  }),
  overrideExisting: false,
});

export const {
  useFilterOrdersQuery,
  useLazyFilterOrdersQuery,
  useGetOrderDetailQuery,
  useLazyGetOrderDetailQuery,
  useGetOrderItemsQuery,
  useLazyGetOrderItemsQuery,
  useFilterTemporaryReceiptsQuery,
  useLazyFilterTemporaryReceiptsQuery,
  useDeleteTemporaryReceiptMutation,
  useCancelOrderMutation,
  useFilterOrderInvoicesQuery,
  useLazyFilterOrderInvoicesQuery,
  useImportOrderInvoiceMutation,
  useViewOrderInvoiceHtmlQuery,
  useLazyViewOrderInvoiceHtmlQuery,
  useCheckOrderInvoiceMutation,
  useSaveOrderMutation,
  useCompleteOrderMutation
} = ordersApi;

import { userApiSlice } from '@/store/slice/api/base'
import { EUserTagTypes } from '@/store/slice/api/tag-types'
import type {
  TPosActiveProduct,
  TPosArea,
  TPosKitchenPrintGroup,
  TPosOrder,
  TPosOrderItem,
  TPosResponse,
  TPosTable
} from '@/store/slice/users/types'
export const tablesApi = userApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAreas: builder.query<TPosArea[], void>({
      query: () => ({ url: "area/get-list", method: "GET" }),
      transformResponse: (res: TPosResponse<TPosArea[]>) => res.Data ?? [],
      transformErrorResponse: (res: any) =>
        res?.data?.Errors?.[0]?.Message || res.status,
    }),

    getTables: builder.query<
      TPosTable[],
      { areaId?: number; isHasOrder?: boolean; isAnonymous?: boolean }
    >({
      query: (p) => {
        const params = new URLSearchParams();
        if (p.areaId && p.areaId > 0) params.append("areaId", String(p.areaId));
        if (p.isHasOrder) params.append("isHasOrder", "true");
        if (p.isAnonymous) params.append("IsAnonymous", "true");
        const qs = params.toString();
        return { url: `tables/get-list${qs ? "?" + qs : ""}`, method: "GET" };
      },
      transformResponse: (res: TPosResponse<TPosTable[]>) => res.Data ?? [],
      providesTags: () => [{ type: EUserTagTypes.Tables }],
    }),

    // ─── QR self-order (customer-facing, unauthenticated) ────────────────────
    // A diner scans the table's QR code, which links to /order-table?guid=...
    // (see pos_web's qr-order module) — no login, tenant/table context comes
    // entirely from that guid.

    /** The menu a diner sees for their table — a public product list. */
    getAnonymousProducts: builder.query<TPosActiveProduct[], string>({
      query: (tableGuid) => ({
        url: `products/get-anonymous?tableGuid=${tableGuid}`,
      }),
      transformResponse: (res: TPosResponse<TPosActiveProduct[]>) =>
        res.Data ?? [],
    }),

    /** Items already placed on this table's order, keyed by table guid (not tableId — this is the anonymous/public counterpart to getTableOrderDetail). */
    getTableOrderItemsByGuid: builder.query<TPosOrderItem[], string>({
      query: (guid) => ({ url: `tables/get-order-items?guid=${guid}` }),
      transformResponse: (res: TPosResponse<TPosOrderItem[]>) => res.Data ?? [],
    }),

    /** Submits (or appends to) the anonymous order tied to this table guid. */
    submitAnonymousOrder: builder.mutation<void, Record<string, unknown>>({
      query: (body) => ({ url: "tables/order-anonymous", method: "PUT", body }),
    }),

    /**
     * The order currently sitting on a table. Its identity fields (Id, Guid,
     * Name, Type, Table, Shop) must be echoed back on save/pay, otherwise the
     * server cannot match the order to the table and never frees it.
     */
    getTableOrderDetail: builder.query<TPosOrder | null, number>({
      query: (tableId) => ({
        url: `tables/get-order-detail?tableId=${tableId}`,
        method: "GET",
      }),
      transformResponse: (res: TPosResponse<TPosOrder>) => res.Data ?? null,
    }),

    /** Create/update the order sitting on a table (restaurant flow). */
    saveTableOrder: builder.mutation<
      { OrderId?: number; Printers?: TPosOrder["Printers"] },
      { order: TPosOrder; isUpdate: boolean }
    >({
      query: ({ order, isUpdate }) => ({
        url: isUpdate ? "tables/update-order" : "tables/create-order",
        method: isUpdate ? "PUT" : "POST",
        body: order,
      }),
      transformResponse: (
        res: TPosResponse<{
          OrderId?: number;
          Printers?: TPosOrder["Printers"];
        }>,
      ) => res.Data ?? {},
    }),

    deleteTableOrder: builder.mutation<void, number>({
      query: (tableId) => ({
        url: `tables/delete-order?tableId=${tableId}`,
        method: "DELETE",
      }),
    }),

    /** Whole order moves from one table to another; source table empties out. */
    transferTable: builder.mutation<
      void,
      { fromTableId: number; toTableId: number }
    >({
      query: (body) => ({ url: "tables/transfer", method: "PUT", body }),
    }),

    /** Source table's order is merged into the destination table's order. */
    mergeTables: builder.mutation<
      void,
      { fromTableId: number; toTableId: number }
    >({
      query: (body) => ({ url: "tables/merge", method: "PUT", body }),
    }),

    /** Move specific line items (itemIds) from one table's order to another —
     * omitting itemIds moves the whole order (mirrors Angular's "Chuyển bàn"
     * reusing this same endpoint without an item list). */
    splitTable: builder.mutation<
      void,
      { fromTableId: number; toTableId: number; itemIds?: number[] }
    >({
      query: (body) => ({ url: "tables/split", method: "PUT", body }),
    }),

    /**
     * Per-printer breakdown of what still needs a kitchen ticket for this
     * table — the explicit "In bếp" button (as opposed to the plain-save
     * auto-print, which just replays the save response's `Printers`).
     */
    getOrderKitchen: builder.query<
      TPosKitchenPrintGroup[],
      { tableGuid: string; deviceGuid: string }
    >({
      query: ({ tableGuid, deviceGuid }) => ({
        url: `tables/get-order-kitchen?tableGuid=${tableGuid}&deviceGuid=${deviceGuid}`,
        method: "GET",
      }),
      transformResponse: (res: TPosResponse<TPosKitchenPrintGroup[]>) =>
        res.Data ?? [],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAreasQuery,
  useLazyGetAreasQuery,
  useGetTablesQuery,
  useLazyGetTablesQuery,
  useGetAnonymousProductsQuery,
  useLazyGetAnonymousProductsQuery,
  useGetTableOrderItemsByGuidQuery,
  useLazyGetTableOrderItemsByGuidQuery,
  useSubmitAnonymousOrderMutation,
  useGetTableOrderDetailQuery,
  useLazyGetTableOrderDetailQuery,
  useSaveTableOrderMutation,
  useDeleteTableOrderMutation,
  useTransferTableMutation,
  useMergeTablesMutation,
  useSplitTableMutation,
  useGetOrderKitchenQuery,
  useLazyGetOrderKitchenQuery
} = tablesApi;

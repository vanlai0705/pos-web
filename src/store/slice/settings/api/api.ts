import { userApiSlice } from '@/store/slice/api/base'
import { EUserTagTypes } from '@/store/slice/api/tag-types'
import type {
  TPosFundType,
  TPosResponse,
  TPosSettingGeneral,
  TPosSettingInvoice,
  TPosSettingNotification,
  TPosSettingOrder,
  TPosSettingPrinter,
  TPosSettingProduct,
  TPosSettingStock
} from '@/store/slice/users/types'
export const settingsApi = userApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Settings ─────────────────────────────────────────────────────────────

    getSettingGeneral: builder.query<TPosSettingGeneral, void>({
      query: () => ({ url: "setting/get-general", method: "GET" }),
      transformResponse: (res: TPosResponse<TPosSettingGeneral>) =>
        res.Data ?? {},
      transformErrorResponse: (res: any) =>
        res?.data?.Errors?.[0]?.Message || res.status,
    }),

    updateSettingGeneral: builder.mutation<
      void,
      { data: TPosSettingGeneral; file?: File | null }
    >({
      query: ({ data, file }) => {
        const form = new FormData();
        Object.entries(data).forEach(([k, v]) => {
          if (v !== null && v !== undefined && typeof v !== "object")
            form.append(k, String(v));
          else if (typeof v === "object" && v !== null && "Id" in (v as object))
            form.append(k + ".Id", String((v as any).Id));
        });
        if (file) form.append("file", file);
        return { url: "setting/update-general", method: "POST", body: form };
      },
    }),

    removeShopData: builder.mutation<void, void>({
      query: () => ({ url: "setting/remove-data", method: "POST" }),
    }),

    getSettingOrder: builder.query<TPosSettingOrder, void>({
      query: () => ({ url: "setting/get-order", method: "GET" }),
      transformResponse: (res: TPosResponse<TPosSettingOrder>) => res.Data,
      transformErrorResponse: (res: any) =>
        res?.data?.Errors?.[0]?.Message || res.status,
    }),

    updateSettingOrder: builder.mutation<void, TPosSettingOrder>({
      query: (body) => ({ url: "setting/update-order", method: "POST", body }),
    }),

    /** Payment methods, each with its linked bank/wallet accounts. */
    getPaymentTypes: builder.query<TPosFundType[], void>({
      query: () => ({ url: "fundtype/get-payment-type", method: "GET" }),
      transformResponse: (res: TPosResponse<TPosFundType[]>) => res.Data ?? [],
    }),

    getSettingProduct: builder.query<TPosSettingProduct, void>({
      query: () => ({ url: "setting/get-product", method: "GET" }),
      transformResponse: (res: TPosResponse<TPosSettingProduct>) => res.Data,
      transformErrorResponse: (res: any) =>
        res?.data?.Errors?.[0]?.Message || res.status,
    }),

    updateSettingProduct: builder.mutation<void, TPosSettingProduct>({
      query: (body) => ({
        url: "setting/update-product",
        method: "POST",
        body,
      }),
    }),

    getSettingStock: builder.query<TPosSettingStock, void>({
      query: () => ({ url: "setting/get-stock", method: "GET" }),
      transformResponse: (res: TPosResponse<TPosSettingStock>) => res.Data,
      transformErrorResponse: (res: any) =>
        res?.data?.Errors?.[0]?.Message || res.status,
    }),

    updateSettingStock: builder.mutation<void, TPosSettingStock>({
      query: (body) => ({ url: "setting/update-stock", method: "POST", body }),
    }),

    getSettingNotification: builder.query<TPosSettingNotification, void>({
      query: () => ({ url: "setting/get-notification", method: "GET" }),
      transformResponse: (res: TPosResponse<TPosSettingNotification>) =>
        res.Data,
      transformErrorResponse: (res: any) =>
        res?.data?.Errors?.[0]?.Message || res.status,
    }),

    updateSettingNotification: builder.mutation<void, TPosSettingNotification>({
      query: (body) => ({
        url: "setting/update-notification",
        method: "POST",
        body,
      }),
    }),
    getSettingInvoice: builder.query<TPosSettingInvoice, { shopId?: number }>({
      query: ({ shopId }) => ({
        url: shopId
          ? `setting/get-invoice?shopId=${shopId}`
          : "setting/get-invoice",
        method: "GET",
      }),
      // The GET response comes back PascalCase (Id, TaxExportType, Url, ...)
      // like every other setting/* endpoint, but this form's fields are
      // camelCase to match what update-invoice expects on save — remap here
      // instead of matching the response casing, mirroring pos_web's
      // invoice-settings.component getInvoiceSetting(). Without this, every
      // field silently falls back to its default on load (and after any F5),
      // since none of the response keys matched.
      transformResponse: (res: TPosResponse<any>) => {
        const d = res.Data ?? {};
        return {
          id: d.Id,
          taxExportType: d.TaxExportType,
          invoiceType: d.InvoiceType,
          url: d.Url,
          taxNumber: d.TaxNumber,
          userName: d.UserName,
          password: d.Password,
          parttern: d.Parttern,
          isDraft: d.IsDraft,
          shopId: d.ShopId,
        } as TPosSettingInvoice;
      },
      providesTags: () => [{ type: EUserTagTypes.UserInfo }],
      transformErrorResponse: (res: any) =>
        res?.data?.Errors?.[0]?.Message || res.status,
    }),

    updateSettingInvoice: builder.mutation<void, TPosSettingInvoice>({
      query: (body) => ({
        url: body.shopId
          ? `setting/update-invoice?shopId=${body.shopId}`
          : "setting/update-invoice",
        method: "POST",
        body,
      }),
      invalidatesTags: () => [{ type: EUserTagTypes.UserInfo }],
    }),

    getSettingPrinter: builder.query<TPosSettingPrinter, { guid: string }>({
      query: ({ guid }) => ({
        url: `setting/get-printer?guid=${guid}`,
        method: "GET",
      }),
      transformResponse: (res: TPosResponse<TPosSettingPrinter>) =>
        res.Data ?? {},
      transformErrorResponse: (res: any) =>
        res?.data?.Errors?.[0]?.Message || res.status,
    }),

    updateSettingPrinter: builder.mutation<
      void,
      { guid: string; data: TPosSettingPrinter }
    >({
      query: ({ guid, data }) => ({
        url: `setting/update-printer?guid=${guid}`,
        method: "POST",
        body: data,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSettingGeneralQuery,
  useLazyGetSettingGeneralQuery,
  useUpdateSettingGeneralMutation,
  useRemoveShopDataMutation,
  useGetSettingOrderQuery,
  useLazyGetSettingOrderQuery,
  useUpdateSettingOrderMutation,
  useGetPaymentTypesQuery,
  useLazyGetPaymentTypesQuery,
  useGetSettingProductQuery,
  useLazyGetSettingProductQuery,
  useUpdateSettingProductMutation,
  useGetSettingStockQuery,
  useLazyGetSettingStockQuery,
  useUpdateSettingStockMutation,
  useGetSettingNotificationQuery,
  useLazyGetSettingNotificationQuery,
  useUpdateSettingNotificationMutation,
  useGetSettingInvoiceQuery,
  useLazyGetSettingInvoiceQuery,
  useUpdateSettingInvoiceMutation,
  useGetSettingPrinterQuery,
  useLazyGetSettingPrinterQuery,
  useUpdateSettingPrinterMutation
} = settingsApi;

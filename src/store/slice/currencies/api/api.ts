import { userApiSlice } from '@/store/slice/api/base'
import { buildModelFormData } from '@/utils/multipart'
export const currenciesApi = userApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Currencies: Create mutations ─────────────────────────────────────────
    createReceipt: builder.mutation<void, Record<string, any>>({
      query: (body) => ({
        url: "receipt/create",
        method: "POST",
        body: buildModelFormData(body),
      }),
    }),
    createPayment: builder.mutation<void, Record<string, any>>({
      query: (body) => ({
        url: "payment/create",
        method: "POST",
        body: buildModelFormData(body),
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateReceiptMutation,
  useCreatePaymentMutation
} = currenciesApi;

import { userApiSlice } from '@/store/slice/api/base'
import { query } from '@/utils'
import { buildModelFormData } from '@/utils/multipart'
import type {
  TPosFilterData,
  TPosOrderFilterParams,
  TPosQuotation,
  TPosResponse
} from '@/store/slice/users/types'
export const quotationsApi = userApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Actives: Quotations ────────────────────────────────────────────────

    filterQuotations: builder.query<
      TPosFilterData<TPosQuotation>,
      TPosOrderFilterParams
    >({
      query: (p) => ({
        url: `quotations/filter${query({ PageIndex: 0, PageSize: 15, ...p })}`,
      }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosQuotation>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getQuotationDetail: builder.query<TPosQuotation, number>({
      query: (id) => ({ url: `quotations/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosQuotation>) => res.Data,
    }),

    saveQuotation: builder.mutation<void, TPosQuotation>({
      query: (data) => ({
        url: data.Id ? "quotations/update" : "quotations/create",
        method: "POST",
        body: buildModelFormData(data),
      }),
    }),

    updateQuotationStatus: builder.mutation<
      void,
      { id: number; statusId: number }
    >({
      query: ({ id, statusId }) => ({
        url: `quotations/update-status?id=${id}&statusId=${statusId}`,
        method: "POST",
        body: {},
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useFilterQuotationsQuery,
  useLazyFilterQuotationsQuery,
  useGetQuotationDetailQuery,
  useLazyGetQuotationDetailQuery,
  useSaveQuotationMutation,
  useUpdateQuotationStatusMutation
} = quotationsApi;

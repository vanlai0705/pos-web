import { userApiSlice } from '@/store/slice/api/base'
import { query } from '@/utils'
import { buildModelFormData } from '@/utils/multipart'
import type {
  TPosBooking,
  TPosFilterData,
  TPosOrderFilterParams,
  TPosResponse
} from '@/store/slice/users/types'
export const bookingsApi = userApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Actives: Bookings ──────────────────────────────────────────────────

    filterBookings: builder.query<
      TPosFilterData<TPosBooking>,
      TPosOrderFilterParams
    >({
      query: (p) => ({
        url: `bookings/filter${query({ PageIndex: 0, PageSize: 15, ...p })}`,
      }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosBooking>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getBookingDetail: builder.query<TPosBooking, number>({
      query: (id) => ({ url: `bookings/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosBooking>) => res.Data,
    }),

    saveBooking: builder.mutation<void, TPosBooking>({
      query: (data) => ({
        url: data.Id ? "bookings/update" : "bookings/create",
        method: "POST",
        body: buildModelFormData(data),
      }),
    }),

    updateBookingStatus: builder.mutation<
      void,
      { id: number; statusId: number }
    >({
      query: ({ id, statusId }) => ({
        url: `bookings/update-status?id=${id}&statusId=${statusId}`,
        method: "POST",
        body: {},
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useFilterBookingsQuery,
  useLazyFilterBookingsQuery,
  useGetBookingDetailQuery,
  useLazyGetBookingDetailQuery,
  useSaveBookingMutation,
  useUpdateBookingStatusMutation
} = bookingsApi;

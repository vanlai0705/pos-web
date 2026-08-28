import { userApiSlice } from '@/store/slice/api/base'
import type {
  TPosFilterNotificationResponse,
  TPosNotificationListResponse,
  TPosResponse,
  TPosShop
} from '@/store/slice/users/types'
export const notificationsApi = userApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Notifications ────────────────────────────────────────────────────────
    // Quick list dùng cho header bell dropdown
    getNotifications: builder.query<
      TPosNotificationListResponse,
      { PageIndex?: number; PageSize?: number }
    >({
      query: ({ PageIndex = 0, PageSize = 8 } = {}) => ({
        url: `notifications/get-notifications?PageIndex=${PageIndex}&PageSize=${PageSize}`,
        method: "GET",
      }),
      transformResponse: (res: TPosResponse<TPosNotificationListResponse>) =>
        res.Data,
    }),

    // Full list dùng cho trang /notifications
    filterNotifications: builder.query<
      TPosFilterNotificationResponse,
      {
        PageIndex?: number;
        PageSize?: number;
        Keyword?: string;
        StatusIds?: number[];
      }
    >({
      query: ({
        PageIndex = 1,
        PageSize = 20,
        Keyword = "",
        StatusIds,
      } = {}) => {
        const params = new URLSearchParams({
          PageIndex: String(PageIndex),
          PageSize: String(PageSize),
          ...(Keyword ? { Keyword } : {}),
        });
        if (StatusIds?.length)
          StatusIds.forEach((id) => params.append("StatusIds", String(id)));
        return {
          url: `notifications/filter-notifications?${params}`,
          method: "GET",
        };
      },
      transformResponse: (res: TPosResponse<TPosFilterNotificationResponse>) =>
        res.Data,
    }),

    // Mark read (statusId=1) hoặc delete (statusId=2)
    updateNotificationStatus: builder.mutation<
      void,
      { id: number | string; statusId: 1 | 2 }
    >({
      query: ({ id, statusId }) => ({
        url: `notifications/update-status-user?id=${id}&statusId=${statusId}`,
        method: "POST",
        body: {},
      }),
    }),

    // Đánh dấu tất cả đã đọc
    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({
        url: "notifications/update-all-readed",
        method: "POST",
        body: {},
      }),
    }),

    updateDevice: builder.mutation<void, { deviceType: number; deviceToken: string }>({
      query: (body) => ({
        url: "devices/update",
        method: "POST",
        body,
      }),
    }),

    getUserShopSetting: builder.query<
      { Shops: TPosShop[]; SelectedShopId: number },
      void
    >({
      query: () => ({ url: "user-infos/get-setting", method: "GET" }),
      transformResponse: (
        res: TPosResponse<{ Shops: TPosShop[]; SelectedShopId: number }>,
      ) => res.Data,
      transformErrorResponse: (res: any) =>
        res?.data?.Errors?.[0]?.Message || res.status,
    }),

    selectShop: builder.mutation<void, { shops: TPosShop[]; shopId: number }>({
      query: ({ shops, shopId }) => ({
        url: `user-infos/update-setting`,
        method: "POST",
        body: {
          SelectedShopId: shopId,
          Shops: shops.map((s) => ({
            Id: s.Id,
            Name: s.Name,
            Image: s.Image ?? { Id: 0, Url: "" },
          })),
        },
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetNotificationsQuery,
  useLazyGetNotificationsQuery,
  useFilterNotificationsQuery,
  useLazyFilterNotificationsQuery,
  useUpdateNotificationStatusMutation,
  useMarkAllNotificationsReadMutation,
  useUpdateDeviceMutation,
  useGetUserShopSettingQuery,
  useLazyGetUserShopSettingQuery,
  useSelectShopMutation
} = notificationsApi;

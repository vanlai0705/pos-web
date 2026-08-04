import { createApi } from "@reduxjs/toolkit/query/react";
import { buildModelFormData } from "@/utils/multipart";

import {
  TChangePasswordRequest,
  TChangePasswordV1Request,
  TLoginResponse,
  TForgotPasswordRequest,
  TRenewPasswordRequest,
  TPosLoginRequest,
  TPosRegisterRequest,
  TPosResponse,
  TPosProvince,
  TPosProductCategory,
  TPosLoginData,
  TPosAppCountInfo,
  TPosAppInfo,
  TPosChartMonth,
  TPosFunctionGroup,
  TPosSimpleChart,
  TPosStatisticChart,
  TPosSupportWebRequest,
  TPosSystemInfo,
  TPosCustomerActivity,
  TPosOrderActivity,
  TPosProductStatistic,
  TPosSettingGeneral,
  TPosSettingOrder,
  TPosFundType,
  TPosMember,
  TPosUserAccount,
  TPosSalaryType,
  TPosSettingProduct,
  TPosSettingStock,
  TPosSettingNotification,
  TPosSettingInvoice,
  TPosSettingPrinter,
  TPosArea,
  TPosTable,
  TPosProductGroup,
  TPosFilterParams,
  TPosFilterData,
  TPosProductGroupFull,
  TPosCustomerGroup,
  TPosSupplierGroup,
  TPosUnit,
  TPosShop,
  TPosNotificationListResponse,
  TPosFilterNotificationResponse,
  TPosOrder,
  TPosKitchenPrintGroup,
  TPosOrderFilterParams,
  TReportData,
  TPosBooking,
  TPosQuotation,
  TPosActiveProduct,
  TPosProductPriceRow,
  TPosProductRecipeRow,
  TPosRevenueStatResponse,
  TPosRevenueSummaryResponse,
  TPosCustomer,
  TPosCustomerSimple,
  TPosCustomerSimpleGroup,
  TPosUser,
  TPosOrderInvoice,
  TPosOrderInvoiceFilterParams,
  TRegisterRequest,
  TUpdateProfileRequest,
  TUserInfo,
  TUserProfileResponse,
  TUsersRequest,
  TUsersListResponse,
  TCreateUserRequest,
  TUpdateUserRequest,
} from "../types";
import { TPosMenuItem } from "@/utils/pos-menu-converter";
import { EUserTagTypes } from "./tag-types";
import { getBaseQueryWithReauth } from "@/store/utils";
import { TMessage } from "../app";
import { query, normalizePagingResponse } from "@/utils";

export const userApiSlice = createApi({
  baseQuery: getBaseQueryWithReauth(),
  reducerPath: "userApi",
  tagTypes: [EUserTagTypes.UserInfo],
  endpoints: (builder) => ({
    // ─── POS Auth ──────────────────────────────────────────────────────────────

    login: builder.mutation<TLoginResponse, TPosLoginRequest>({
      query: (body: TPosLoginRequest) => ({
        url: "user-infos/login",
        method: "POST",
        body,
      }),
      transformResponse: (response: TPosResponse<TPosLoginData>) => {
        return response.Data;
      },
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    register: builder.mutation<TPosResponse<any>, TPosRegisterRequest>({
      query: (body: TPosRegisterRequest) => ({
        url: "user-infos/register",
        method: "POST",
        body,
      }),
      transformResponse: (response: TPosResponse<any>) => response,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getMe: builder.query<TPosLoginData, void>({
      query: () => ({
        url: "user-infos/me",
        method: "GET",
      }),
      transformResponse: (response: TPosResponse<TPosLoginData>) =>
        response.Data,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    posLogout: builder.mutation<void, { token: string }>({
      query: ({ token }) => ({
        url: `user-infos/logout?token=${token}`,
        method: "GET",
      }),
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    forgotPassword: builder.mutation<TPosResponse<any>, TForgotPasswordRequest>({
      query: (body: TForgotPasswordRequest) => ({
        url: "user-infos/forgot-password",
        method: "POST",
        body,
      }),
      transformResponse: (response: TPosResponse<any>) => response,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    renewPassword: builder.mutation<TPosResponse<any>, TRenewPasswordRequest>({
      query: (body: TRenewPasswordRequest) => ({
        url: "user-infos/renew-password",
        method: "POST",
        body,
      }),
      transformResponse: (response: TPosResponse<any>) => response,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    // ─── POS Register helpers ─────────────────────────────────────────────────

    getProvinces: builder.query<TPosProvince[], void>({
      query: () => ({
        url: "setting/get-provinces",
        method: "GET",
      }),
      transformResponse: (response: TPosResponse<TPosProvince[]>) =>
        response.Data ?? [],
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getProductCategories: builder.query<TPosProductCategory[], void>({
      query: () => ({
        url: "setting/get-product-categories",
        method: "GET",
      }),
      transformResponse: (response: TPosResponse<TPosProductCategory[]>) =>
        response.Data ?? [],
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    initShopData: builder.mutation<TPosResponse<any>, void>({
      query: () => ({
        url: "setting/init-data",
        method: "POST",
      }),
      transformResponse: (response: TPosResponse<any>) => response,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getMenu: builder.query<TPosMenuItem[], void>({
      query: () => ({
        url: "setting/get-menus",
        method: "GET",
      }),
      transformResponse: (response: TPosResponse<TPosMenuItem[]>) =>
        response.Data ?? [],
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    // ─── User management ─────────────────────────────────────────────────────
    // Lưu ý: base URL đã là https://api.posmobile.vn/api/v1
    // Không thêm "api/v1/" vào đây nữa

    getUsers: builder.query<TUsersListResponse, TUsersRequest>({
      query: (payload: TUsersRequest) => ({
        url: `users/filter${query(payload)}`,
        method: "GET",
      }),
      transformResponse: (response: any) =>
        normalizePagingResponse(response) as TUsersListResponse,
      transformErrorResponse: (response: { status: string | number }) =>
        response.status,
      providesTags: () => [{ type: EUserTagTypes.UserInfo }],
    }),

    changePassword: builder.mutation<TMessage, TChangePasswordRequest>({
      query: (body: TChangePasswordRequest) => ({
        url: "user_profile/password",
        method: "POST",
        body: body,
      }),
      transformResponse: (response: TMessage) => response,
      transformErrorResponse: (response: { status: string | number }) =>
        response.status,
    }),

    getUserProfile: builder.query<TUserProfileResponse, void>({
      query: () => ({
        url: "users/profile",
        method: "GET",
      }),
      transformResponse: (response: TUserProfileResponse) => response,
      transformErrorResponse: (response: { status: string | number }) =>
        response.status,
      providesTags: () => [{ type: EUserTagTypes.UserInfo }],
    }),

    updateUserProfile: builder.mutation<TUserProfileResponse, TUpdateProfileRequest>({
      query: (body: TUpdateProfileRequest) => ({
        url: "users/profile",
        method: "PUT",
        body,
      }),
      transformResponse: (response: TUserProfileResponse) => response,
      transformErrorResponse: (response: { status: string | number }) =>
        response.status,
      invalidatesTags: () => [{ type: EUserTagTypes.UserInfo }],
    }),

    changePasswordV1: builder.mutation<TMessage, TChangePasswordV1Request>({
      query: (body: TChangePasswordV1Request) => ({
        url: "users/change-password",
        method: "PUT",
        body,
      }),
      transformResponse: (response: TMessage) => response,
      transformErrorResponse: (response: { status: string | number }) =>
        response.status,
    }),

    getUserInfo: builder.query<TUserInfo, void>({
      query: () => ({
        url: "user_profile",
        method: "GET",
      }),
      transformResponse: (response: TUserInfo) => response,
      transformErrorResponse: (response: { status: string | number }) =>
        response.status,
      providesTags: () => [{ type: EUserTagTypes.UserInfo }],
    }),

    uploadAvatar: builder.mutation<TUserProfileResponse, { file: File }>({
      query: ({ file }) => {
        const formData = new FormData();
        formData.append("image", file);
        return {
          url: "users/avatar",
          method: "POST",
          body: formData,
        };
      },
      transformResponse: (response: TUserProfileResponse) => response,
      transformErrorResponse: (response: { status: string | number }) =>
        response.status,
      invalidatesTags: () => [{ type: EUserTagTypes.UserInfo }],
    }),

    createUser: builder.mutation<TMessage, TCreateUserRequest>({
      query: (body) => {
        const registerBody: TRegisterRequest = {
          name: body.name,
          user_name: body.user_name,
          email: body.email,
          password: body.password,
          confirm_password: body.confirm_password || body.password,
        };
        if (body.phone && body.phone.trim() !== "") {
          registerBody.phone = body.phone;
        }
        if (body.department && body.department.trim() !== "") {
          registerBody.department = body.department;
        }
        return {
          url: "register",
          method: "POST",
          body: registerBody,
        };
      },
      transformResponse: (response: TMessage) => response,
      transformErrorResponse: (response: { status: string | number }) =>
        response.status,
      invalidatesTags: () => [{ type: EUserTagTypes.UserInfo }],
    }),

    updateUser: builder.mutation<TMessage, TUpdateUserRequest>({
      query: ({ id, ...body }) => ({
        url: `users/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: TMessage) => response,
      transformErrorResponse: (response: { status: string | number }) =>
        response.status,
      invalidatesTags: () => [{ type: EUserTagTypes.UserInfo }],
    }),

    deleteUser: builder.mutation<TMessage, { id: number }>({
      query: ({ id }) => ({
        url: `users/${id}`,
        method: "DELETE",
      }),
      transformResponse: (response: TMessage) => response,
      transformErrorResponse: (response: { status: string | number }) =>
        response.status,
      invalidatesTags: () => [{ type: EUserTagTypes.UserInfo }],
    }),

    // ─── Dashboard ───────────────────────────────────────────────────────────

    getAppCountInfo: builder.query<TPosAppCountInfo, void>({
      query: () => ({ url: "setting/app-count-info", method: "GET" }),
      transformResponse: (response: TPosResponse<TPosAppCountInfo>) =>
        response.Data,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getSystemInfo: builder.query<TPosSystemInfo, void>({
      query: () => ({ url: "setting/system-info", method: "GET" }),
      transformResponse: (response: TPosResponse<TPosSystemInfo>) =>
        response.Data ?? {},
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getAppInfo: builder.query<TPosAppInfo, void>({
      query: () => ({ url: "setting/app-info", method: "GET" }),
      transformResponse: (response: TPosResponse<TPosAppInfo>) =>
        response.Data ?? {},
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getFunctionGroups: builder.query<TPosFunctionGroup[], void>({
      query: () => ({ url: "functions/get-list", method: "GET" }),
      transformResponse: (response: TPosResponse<TPosFunctionGroup[]>) =>
        response.Data ?? [],
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    createSupportWeb: builder.mutation<void, TPosSupportWebRequest>({
      query: (body) => ({ url: "supports/create-web", method: "POST", body }),
      transformResponse: () => undefined,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    /** type: 0=Doanh thu, 1=Đơn hàng, 2=Khách hàng, 3=Thanh toán */
    getSimpleChart: builder.query<TPosSimpleChart, { type: number; DateFrom: string; DateTo: string }>({
      query: ({ type, DateFrom, DateTo }) => ({
        url: `charts/chart-simple-by-month?type=${type}&DateFrom=${encodeURIComponent(DateFrom)}&DateTo=${encodeURIComponent(DateTo)}`,
        method: "GET",
      }),
      transformResponse: (response: TPosResponse<TPosSimpleChart>) =>
        response.Data,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    /** Biểu đồ lợi nhuận — Type: 0=Ngày, 1=Tháng, 2=Năm */
    getStatisticChart: builder.query<TPosStatisticChart, {
      Type: number; Month: number; Year: number; YearFrom: number; YearTo: number
    }>({
      query: ({ Type, Month, Year, YearFrom, YearTo }) => ({
        url: `charts/chart-statistic?Type=${Type}&Month=${Month}&Year=${Year}&YearFrom=${YearFrom}&YearTo=${YearTo}`,
        method: "GET",
      }),
      transformResponse: (response: TPosResponse<TPosStatisticChart>) =>
        response.Data,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getOrderActivity: builder.query<TPosOrderActivity, { PageSize?: number; PageIndex?: number; dateFrom?: string; dateTo?: string }>({
      query: ({ PageSize = 10, PageIndex = 0, dateFrom, dateTo }) => {
        let url = `orders/filter-order-activity?PageSize=${PageSize}&PageIndex=${PageIndex}`
        if (dateFrom) url += `&dateFrom=${encodeURIComponent(dateFrom)}`
        if (dateTo) url += `&dateTo=${encodeURIComponent(dateTo)}`
        return { url, method: "GET" }
      },
      transformResponse: (response: TPosResponse<TPosOrderActivity>) =>
        response.Data,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getProductStatistic: builder.query<TPosProductStatistic, { PageSize?: number; PageIndex?: number; dateFrom?: string; dateTo?: string }>({
      query: ({ PageSize = 10, PageIndex = 0, dateFrom, dateTo }) => {
        let url = `statistic/filter-product-statistic?PageSize=${PageSize}&PageIndex=${PageIndex}`
        if (dateFrom) url += `&dateFrom=${encodeURIComponent(dateFrom)}`
        if (dateTo) url += `&dateTo=${encodeURIComponent(dateTo)}`
        return { url, method: "GET" }
      },
      transformResponse: (response: TPosResponse<TPosProductStatistic>) =>
        response.Data,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    getCustomerActivity: builder.query<TPosCustomerActivity, { PageSize?: number; PageIndex?: number }>({
      query: ({ PageSize = 5, PageIndex = 0 }) => ({
        url: `customers/filter-activity?PageSize=${PageSize}&PageIndex=${PageIndex}`,
        method: "GET",
      }),
      transformResponse: (response: TPosResponse<TPosCustomerActivity>) =>
        response.Data,
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    // ─── Settings ─────────────────────────────────────────────────────────────

    getSettingGeneral: builder.query<TPosSettingGeneral, void>({
      query: () => ({ url: "setting/get-general", method: "GET" }),
      transformResponse: (res: TPosResponse<TPosSettingGeneral>) => res.Data ?? {},
      transformErrorResponse: (res: any) => res?.data?.Errors?.[0]?.Message || res.status,
    }),

    updateSettingGeneral: builder.mutation<void, { data: TPosSettingGeneral; file?: File | null }>({
      query: ({ data, file }) => {
        const form = new FormData()
        Object.entries(data).forEach(([k, v]) => {
          if (v !== null && v !== undefined && typeof v !== "object") form.append(k, String(v))
          else if (typeof v === "object" && v !== null && "Id" in (v as object)) form.append(k + ".Id", String((v as any).Id))
        })
        if (file) form.append("file", file)
        return { url: "setting/update-general", method: "POST", body: form }
      },
    }),

    removeShopData: builder.mutation<void, void>({
      query: () => ({ url: "setting/remove-data", method: "POST" }),
    }),

    getSettingOrder: builder.query<TPosSettingOrder, void>({
      query: () => ({ url: "setting/get-order", method: "GET" }),
      transformResponse: (res: TPosResponse<TPosSettingOrder>) => res.Data,
      transformErrorResponse: (res: any) => res?.data?.Errors?.[0]?.Message || res.status,
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
      transformErrorResponse: (res: any) => res?.data?.Errors?.[0]?.Message || res.status,
    }),

    updateSettingProduct: builder.mutation<void, TPosSettingProduct>({
      query: (body) => ({ url: "setting/update-product", method: "POST", body }),
    }),

    getSettingStock: builder.query<TPosSettingStock, void>({
      query: () => ({ url: "setting/get-stock", method: "GET" }),
      transformResponse: (res: TPosResponse<TPosSettingStock>) => res.Data,
      transformErrorResponse: (res: any) => res?.data?.Errors?.[0]?.Message || res.status,
    }),

    updateSettingStock: builder.mutation<void, TPosSettingStock>({
      query: (body) => ({ url: "setting/update-stock", method: "POST", body }),
    }),

    getSettingNotification: builder.query<TPosSettingNotification, void>({
      query: () => ({ url: "setting/get-notification", method: "GET" }),
      transformResponse: (res: TPosResponse<TPosSettingNotification>) => res.Data,
      transformErrorResponse: (res: any) => res?.data?.Errors?.[0]?.Message || res.status,
    }),

    updateSettingNotification: builder.mutation<void, TPosSettingNotification>({
      query: (body) => ({ url: "setting/update-notification", method: "POST", body }),
    }),

    // ─── Notifications ────────────────────────────────────────────────────────
    // Quick list dùng cho header bell dropdown
    getNotifications: builder.query<TPosNotificationListResponse, { PageIndex?: number; PageSize?: number }>({
      query: ({ PageIndex = 0, PageSize = 8 } = {}) => ({
        url: `notifications/get-notifications?PageIndex=${PageIndex}&PageSize=${PageSize}`,
        method: "GET",
      }),
      transformResponse: (res: TPosResponse<TPosNotificationListResponse>) => res.Data,
    }),

    // Full list dùng cho trang /notifications
    filterNotifications: builder.query<TPosFilterNotificationResponse, { PageIndex?: number; PageSize?: number; Keyword?: string; StatusIds?: number[] }>({
      query: ({ PageIndex = 1, PageSize = 20, Keyword = '', StatusIds } = {}) => {
        const params = new URLSearchParams({
          PageIndex: String(PageIndex),
          PageSize: String(PageSize),
          ...(Keyword ? { Keyword } : {}),
        })
        if (StatusIds?.length) StatusIds.forEach(id => params.append('StatusIds', String(id)))
        return { url: `notifications/filter-notifications?${params}`, method: "GET" }
      },
      transformResponse: (res: TPosResponse<TPosFilterNotificationResponse>) => res.Data,
    }),

    // Mark read (statusId=1) hoặc delete (statusId=2)
    updateNotificationStatus: builder.mutation<void, { id: number | string; statusId: 1 | 2 }>({
      query: ({ id, statusId }) => ({
        url: `notifications/update-status-user?id=${id}&statusId=${statusId}`,
        method: "POST",
        body: {},
      }),
    }),

    // Đánh dấu tất cả đã đọc
    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({ url: "notifications/update-all-readed", method: "POST", body: {} }),
    }),

    getUserShopSetting: builder.query<{ Shops: TPosShop[]; SelectedShopId: number }, void>({
      query: () => ({ url: "user-infos/get-setting", method: "GET" }),
      transformResponse: (res: TPosResponse<{ Shops: TPosShop[]; SelectedShopId: number }>) => res.Data,
      transformErrorResponse: (res: any) => res?.data?.Errors?.[0]?.Message || res.status,
    }),

    selectShop: builder.mutation<void, { shops: TPosShop[]; shopId: number }>({
      query: ({ shops, shopId }) => ({
        url: `user-infos/update-setting`,
        method: "POST",
        body: {
          SelectedShopId: shopId,
          Shops: shops.map(s => ({
            Id: s.Id,
            Name: s.Name,
            Image: { Id: 0, Url: '' },
          })),
        },
      }),
    }),

    getSettingInvoice: builder.query<TPosSettingInvoice, { shopId?: number }>({
      query: ({ shopId }) => ({
        url: shopId ? `setting/get-invoice?shopId=${shopId}` : "setting/get-invoice",
        method: "GET",
      }),
      transformResponse: (res: TPosResponse<TPosSettingInvoice>) => res.Data ?? {},
      transformErrorResponse: (res: any) => res?.data?.Errors?.[0]?.Message || res.status,
    }),

    updateSettingInvoice: builder.mutation<void, TPosSettingInvoice>({
      query: (body) => ({
        url: body.shopId ? `setting/update-invoice?shopId=${body.shopId}` : "setting/update-invoice",
        method: "POST",
        body,
      }),
    }),

    getSettingPrinter: builder.query<TPosSettingPrinter, { guid: string }>({
      query: ({ guid }) => ({ url: `setting/get-printer?guid=${guid}`, method: "GET" }),
      transformResponse: (res: TPosResponse<TPosSettingPrinter>) => res.Data ?? {},
      transformErrorResponse: (res: any) => res?.data?.Errors?.[0]?.Message || res.status,
    }),

    updateSettingPrinter: builder.mutation<void, { guid: string; data: TPosSettingPrinter }>({
      query: ({ guid, data }) => ({
        url: `setting/update-printer?guid=${guid}`,
        method: "POST",
        body: data,
      }),
    }),

    getAreas: builder.query<TPosArea[], void>({
      query: () => ({ url: "area/get-list", method: "GET" }),
      transformResponse: (res: TPosResponse<TPosArea[]>) => res.Data ?? [],
      transformErrorResponse: (res: any) => res?.data?.Errors?.[0]?.Message || res.status,
    }),

    getTables: builder.query<TPosTable[], { areaId?: number; isHasOrder?: boolean }>({
      query: (p) => {
        const params = new URLSearchParams()
        if (p.areaId && p.areaId > 0) params.append('areaId', String(p.areaId))
        if (p.isHasOrder) params.append('isHasOrder', 'true')
        const qs = params.toString()
        return { url: `tables/get-list${qs ? '?' + qs : ''}`, method: 'GET' }
      },
      transformResponse: (res: TPosResponse<TPosTable[]>) => res.Data ?? [],
    }),

    /**
     * The order currently sitting on a table. Its identity fields (Id, Guid,
     * Name, Type, Table, Shop) must be echoed back on save/pay, otherwise the
     * server cannot match the order to the table and never frees it.
     */
    getTableOrderDetail: builder.query<TPosOrder | null, number>({
      query: (tableId) => ({ url: `tables/get-order-detail?tableId=${tableId}`, method: "GET" }),
      transformResponse: (res: TPosResponse<TPosOrder>) => res.Data ?? null,
    }),

    /** Create/update the order sitting on a table (restaurant flow). */
    saveTableOrder: builder.mutation<{ OrderId?: number; Printers?: TPosOrder["Printers"] }, { order: TPosOrder; isUpdate: boolean }>({
      query: ({ order, isUpdate }) => ({
        url: isUpdate ? "tables/update-order" : "tables/create-order",
        method: isUpdate ? "PUT" : "POST",
        body: order,
      }),
      transformResponse: (res: TPosResponse<{ OrderId?: number; Printers?: TPosOrder["Printers"] }>) => res.Data ?? {},
    }),

    deleteTableOrder: builder.mutation<void, number>({
      query: (tableId) => ({ url: `tables/delete-order?tableId=${tableId}`, method: "DELETE" }),
    }),

    /**
     * Per-printer breakdown of what still needs a kitchen ticket for this
     * table — the explicit "In bếp" button (as opposed to the plain-save
     * auto-print, which just replays the save response's `Printers`).
     */
    getOrderKitchen: builder.query<TPosKitchenPrintGroup[], { tableGuid: string; deviceGuid: string }>({
      query: ({ tableGuid, deviceGuid }) => ({
        url: `tables/get-order-kitchen?tableGuid=${tableGuid}&deviceGuid=${deviceGuid}`,
        method: "GET",
      }),
      transformResponse: (res: TPosResponse<TPosKitchenPrintGroup[]>) => res.Data ?? [],
    }),

    getProductGroups: builder.query<TPosProductGroup[], void>({
      query: () => ({ url: "productgroups/get-list", method: "GET" }),
      transformResponse: (res: TPosResponse<TPosProductGroup[]>) => res.Data ?? [],
      transformErrorResponse: (res: any) => res?.data?.Errors?.[0]?.Message || res.status,
    }),

    // Keep for backward compat
    getChartByMonth: builder.query<TPosChartMonth[], void>({
      query: () => ({ url: "charts/chart-simple-by-month", method: "GET" }),
      transformResponse: (response: TPosResponse<TPosChartMonth[]>) =>
        response.Data ?? [],
      transformErrorResponse: (response: any) =>
        response?.data?.Errors?.[0]?.Message || response.status,
    }),

    // ─── Managers: Product Groups ────────────────────────────────────────────

    filterProductGroups: builder.query<TPosFilterData<TPosProductGroupFull>, TPosFilterParams>({
      query: (p) => ({ url: `productgroups/filter${query({ PageIndex: 0, PageSize: 15, ...p })}` }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosProductGroupFull>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getProductGroupDetail: builder.query<TPosProductGroupFull, number>({
      query: (id) => ({ url: `productgroups/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosProductGroupFull>) => res.Data,
    }),

    saveProductGroup: builder.mutation<void, TPosProductGroupFull>({
      query: (data) => {
        const form = new FormData()
        form.append("model", JSON.stringify(data))
        return { url: data.Id ? "productgroups/update" : "productgroups/create", method: "POST", body: form }
      },
    }),

    updateProductGroupStatus: builder.mutation<void, { id: number; statusId: number }>({
      query: ({ id, statusId }) => ({
        url: `productgroups/update-status?id=${id}&statusId=${statusId}`,
        method: "POST",
        body: {},
      }),
    }),

    // ─── Managers: Customer Groups ───────────────────────────────────────────

    filterCustomerGroups: builder.query<TPosFilterData<TPosCustomerGroup>, TPosFilterParams>({
      query: (p) => ({ url: `customergroups/filter${query({ PageIndex: 0, PageSize: 15, ...p })}` }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosCustomerGroup>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getCustomerGroupDetail: builder.query<TPosCustomerGroup, number>({
      query: (id) => ({ url: `customergroups/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosCustomerGroup>) => res.Data,
    }),

    saveCustomerGroup: builder.mutation<void, TPosCustomerGroup>({
      query: (data) => {
        const form = new FormData()
        form.append("model", JSON.stringify(data))
        return { url: data.Id ? "customergroups/update" : "customergroups/create", method: "POST", body: form }
      },
    }),

    updateCustomerGroupStatus: builder.mutation<void, { id: number; statusId: number }>({
      query: ({ id, statusId }) => ({
        url: `customergroups/update-status?id=${id}&statusId=${statusId}`,
        method: "POST",
        body: {},
      }),
    }),

    // ─── Managers: Supplier Groups ───────────────────────────────────────────

    filterSupplierGroups: builder.query<TPosFilterData<TPosSupplierGroup>, TPosFilterParams>({
      query: (p) => ({ url: `suppliergroups/filter${query({ PageIndex: 0, PageSize: 15, ...p })}` }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosSupplierGroup>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getSupplierGroupDetail: builder.query<TPosSupplierGroup, number>({
      query: (id) => ({ url: `suppliergroups/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosSupplierGroup>) => res.Data,
    }),

    saveSupplierGroup: builder.mutation<void, TPosSupplierGroup>({
      query: (data) => {
        const form = new FormData()
        form.append("model", JSON.stringify(data))
        return { url: data.Id ? "suppliergroups/update" : "suppliergroups/create", method: "POST", body: form }
      },
    }),

    updateSupplierGroupStatus: builder.mutation<void, { id: number; statusId: number }>({
      query: ({ id, statusId }) => ({
        url: `suppliergroups/update-status?id=${id}&statusId=${statusId}`,
        method: "POST",
        body: {},
      }),
    }),

    // ─── Managers: Units ─────────────────────────────────────────────────────

    filterUnits: builder.query<TPosFilterData<TPosUnit>, TPosFilterParams>({
      query: (p) => ({ url: `units/filter${query({ PageIndex: 0, PageSize: 15, ...p })}` }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosUnit>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getUnitDetail: builder.query<TPosUnit, number>({
      query: (id) => ({ url: `units/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosUnit>) => res.Data,
    }),

    saveUnit: builder.mutation<void, TPosUnit>({
      query: (data) => {
        const form = new FormData()
        form.append("model", JSON.stringify(data))
        return { url: data.Id ? "units/update" : "units/create", method: "POST", body: form }
      },
    }),

    updateUnitStatus: builder.mutation<void, { id: number; statusId: number }>({
      query: ({ id, statusId }) => ({
        url: `units/update-status?id=${id}&statusId=${statusId}`,
        method: "POST",
        body: {},
      }),
    }),

    // ─── Actives: Orders ────────────────────────────────────────────────────

    filterOrders: builder.query<TPosFilterData<TPosOrder>, TPosOrderFilterParams>({
      query: (p) => ({ url: `orders/filter-order${query({ PageIndex: 0, PageSize: 15, ...p })}` }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosOrder>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getOrderDetail: builder.query<TPosOrder, number>({
      // orders/detail takes `orderId`, not `id` — every other */detail endpoint
      // uses `id`, this one is the exception (matches Angular's order-manager).
      query: (id) => ({ url: `orders/detail?orderId=${id}` }),
      transformResponse: (res: TPosResponse<TPosOrder>) => res.Data,
    }),

    cancelOrder: builder.mutation<void, number>({
      query: (orderId) => ({ url: `orders/cancel?orderId=${orderId}`, method: "POST", body: {} }),
    }),

    // ─── Actives: Order Invoices ─────────────────────────────────────────────

    filterOrderInvoices: builder.query<TPosFilterData<TPosOrderInvoice>, TPosOrderInvoiceFilterParams>({
      query: (p) => ({ url: `order-invoices/filter-invoice${query({ PageIndex: 0, PageSize: 15, ...p })}` }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosOrderInvoice>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    importOrderInvoice: builder.mutation<void, number>({
      query: (orderInvoiceId) => ({ url: `order-invoices/import-invoice?orderInvoiceId=${orderInvoiceId}` }),
    }),

    viewOrderInvoiceHtml: builder.query<{ Html: string } | null, number>({
      query: (orderInvoiceId) => ({ url: `order-invoices/view-invoice?orderInvoiceId=${orderInvoiceId}` }),
      transformResponse: (res: TPosResponse<{ Html: string }>) => res.Data ?? null,
    }),

    checkOrderInvoice: builder.mutation<{ KeyInvoiceMsg?: { Message?: string } } | null, number>({
      query: (orderInvoiceId) => ({ url: `order-invoices/check-invoice?orderInvoiceId=${orderInvoiceId}` }),
      transformResponse: (res: TPosResponse<any>) => res.Data ?? null,
    }),

    // The orders/* endpoints take the order model as the raw request body.
    saveOrder: builder.mutation<TPosOrder, TPosOrder>({
      query: (data) => ({
        url: data.Id ? 'orders/update' : 'orders/temporary-receipt',
        method: 'POST',
        body: data,
      }),
      transformResponse: (res: TPosResponse<TPosOrder>) => res.Data,
    }),

    completeOrder: builder.mutation<TPosOrder, TPosOrder>({
      query: (data) => ({
        url: 'orders/completed',
        method: 'POST',
        body: data,
      }),
      transformResponse: (res: TPosResponse<TPosOrder>) => res.Data,
    }),

    // ─── Actives: Bookings ──────────────────────────────────────────────────

    filterBookings: builder.query<TPosFilterData<TPosBooking>, TPosOrderFilterParams>({
      query: (p) => ({ url: `bookings/filter${query({ PageIndex: 0, PageSize: 15, ...p })}` }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosBooking>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getBookingDetail: builder.query<TPosBooking, number>({
      query: (id) => ({ url: `bookings/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosBooking>) => res.Data,
    }),

    saveBooking: builder.mutation<void, TPosBooking>({
      query: (data) => ({
        url: data.Id ? 'bookings/update' : 'bookings/create',
        method: 'POST',
        body: buildModelFormData(data),
      }),
    }),

    updateBookingStatus: builder.mutation<void, { id: number; statusId: number }>({
      query: ({ id, statusId }) => ({
        url: `bookings/update-status?id=${id}&statusId=${statusId}`,
        method: 'POST',
        body: {},
      }),
    }),

    // ─── Actives: Quotations ────────────────────────────────────────────────

    filterQuotations: builder.query<TPosFilterData<TPosQuotation>, TPosOrderFilterParams>({
      query: (p) => ({ url: `quotations/filter${query({ PageIndex: 0, PageSize: 15, ...p })}` }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosQuotation>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getQuotationDetail: builder.query<TPosQuotation, number>({
      query: (id) => ({ url: `quotations/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosQuotation>) => res.Data,
    }),

    saveQuotation: builder.mutation<void, TPosQuotation>({
      query: (data) => ({
        url: data.Id ? 'quotations/update' : 'quotations/create',
        method: 'POST',
        body: buildModelFormData(data),
      }),
    }),

    updateQuotationStatus: builder.mutation<void, { id: number; statusId: number }>({
      query: ({ id, statusId }) => ({
        url: `quotations/update-status?id=${id}&statusId=${statusId}`,
        method: 'POST',
        body: {},
      }),
    }),

    // ─── Actives: Products ──────────────────────────────────────────────────

    filterActiveProducts: builder.query<TPosFilterData<TPosActiveProduct>, TPosFilterParams & { ProductGroupId?: number }>({
      query: (p) => ({ url: `products/filter${query({ PageIndex: 0, PageSize: 15, ...p })}` }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosActiveProduct>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getActiveProductDetail: builder.query<TPosActiveProduct, number>({
      query: (id) => ({ url: `products/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosActiveProduct>) => res.Data,
    }),

    updateActiveProductStatus: builder.mutation<void, { id: number; statusId: number }>({
      query: ({ id, statusId }) => ({
        url: `products/update-status?id=${id}&statusId=${statusId}`,
        method: 'POST',
        body: {},
      }),
    }),

    saveActiveProduct: builder.mutation<TPosActiveProduct, { model: TPosActiveProduct; files: File[] }>({
      query: ({ model, files }) => ({
        url: model.Id ? 'products/update' : 'products/create',
        method: 'POST',
        body: buildModelFormData(model, files),
      }),
      transformResponse: (res: TPosResponse<TPosActiveProduct>) => res.Data,
    }),

    /** Price tab — one row per price level (Bán lẻ/Bán buôn/…), Nhỏ/Vừa/Lớn columns. */
    getProductPrice: builder.query<TPosProductPriceRow[], number>({
      query: (productId) => ({ url: `products/get-product-price?productId=${productId}` }),
      transformResponse: (res: TPosResponse<TPosProductPriceRow[]>) => res.Data ?? [],
    }),
    updateProductPrice: builder.mutation<void, { productId: number; priceList: TPosProductPriceRow[] }>({
      query: ({ productId, priceList }) => ({
        url: `products/update-product-price?productId=${productId}`,
        method: 'POST',
        body: priceList,
      }),
    }),

    /** Định lượng tab — the BOM/ingredient list for a recipe product. */
    getProductRecipes: builder.query<TPosProductRecipeRow[], number>({
      query: (productId) => ({ url: `product-recipes/get-list?productId=${productId}` }),
      transformResponse: (res: TPosResponse<TPosProductRecipeRow[]>) => res.Data ?? [],
    }),
    createProductRecipe: builder.mutation<void, { productId: number; body: unknown }>({
      query: ({ productId, body }) => ({
        url: `product-recipes/create?productId=${productId}`,
        method: 'POST',
        body: buildModelFormData(body, []),
      }),
    }),
    deleteProductRecipe: builder.mutation<void, { productId: number; id: number }>({
      query: ({ productId, id }) => ({
        url: `product-recipes/delete?productId=${productId}&id=${id}`,
        method: 'DELETE',
      }),
    }),

    /** Cửa hàng tab — lists every shop; the checkbox toggles that shop's own IsDefault flag (matches Angular's actual, product-agnostic behavior). */
    filterShopsAll: builder.query<TPosShop[], void>({
      query: () => ({ url: `shop/filter${query({ PageIndex: 0, PageSize: 1000 })}` }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosShop>>) => res.Data?.Items ?? [],
    }),
    updateShop: builder.mutation<void, TPosShop>({
      query: (shop) => ({ url: 'shop/update', method: 'POST', body: buildModelFormData(shop, []) }),
    }),

    // ─── Actives: Statistics ────────────────────────────────────────────────

    filterProductStatistics: builder.query<TPosProductStatistic, { PageIndex?: number; PageSize?: number; DateFrom?: string; DateTo?: string; ProductGroupId?: number; ShopId?: number }>({
      query: (p) => ({ url: `statistic/filter-product-statistic${query({ PageIndex: 0, PageSize: 20, ...p })}` }),
      transformResponse: (res: TPosResponse<TPosProductStatistic>) =>
        res.Data ?? { Items: [], TotalItemCount: 0, Sumary: { Quantity: 0, Amount: 0, AmountInput: 0, Profit: 0 } },
    }),

    filterRevenueStatistics: builder.query<TPosRevenueStatResponse, { PageIndex?: number; PageSize?: number; DateFrom?: string; DateTo?: string; ShopId?: number }>({
      query: (p) => ({ url: `statistic/filter-revenue-statistic${query({ PageIndex: 0, PageSize: 20, ...p })}` }),
      transformResponse: (res: TPosResponse<TPosRevenueStatResponse>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    filterRevenueStatisticsSummary: builder.query<TPosRevenueSummaryResponse, { DateFrom?: string; DateTo?: string }>({
      query: (p) => ({ url: `statistic/filter-revenue-statistic-sumary${query(p)}` }),
      transformResponse: (res: TPosResponse<TPosRevenueSummaryResponse>) =>
        res.Data ?? [],
    }),

    // ─── Actives: Customers ─────────────────────────────────────────────────

    filterCustomers: builder.query<TPosFilterData<TPosCustomer>, TPosFilterParams & { GroupId?: number }>({
      query: (p) => ({ url: `customers/filter${query({ PageIndex: 0, PageSize: 15, ...p })}` }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosCustomer>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    filterCustomersSimple: builder.query<TPosFilterData<TPosCustomerSimple>, { Keyword?: string; PageIndex?: number; PageSize?: number; StatusId?: number }>({
      query: (p) => ({ url: `customers/filter-simple${query({ PageIndex: 0, PageSize: 10, StatusId: 0, ...p })}` }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosCustomerSimple>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    filterUsersSimple: builder.query<TPosFilterData<TPosUser>, { Keyword?: string; PageIndex?: number; PageSize?: number; StatusId?: number }>({
      query: (p) => ({ url: `users/filter-simple${query({ PageIndex: 0, PageSize: 10, StatusId: 0, ...p })}` }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosUser>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getCustomerDetail: builder.query<TPosCustomer, number>({
      query: (id) => ({ url: `customers/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosCustomer>) => res.Data,
    }),

    saveCustomer: builder.mutation<TPosCustomer, TPosCustomer>({
      query: (data) => {
        const form = new FormData()
        form.append('model', JSON.stringify(data))
        return { url: data.Id ? 'customers/update' : 'customers/create', method: 'POST', body: form }
      },
      transformResponse: (res: TPosResponse<TPosCustomer>) => res.Data,
    }),

    updateCustomerStatus: builder.mutation<void, { id: number; statusId: number }>({
      query: ({ id, statusId }) => ({
        url: `customers/update-status?id=${id}&statusId=${statusId}`,
        method: 'POST',
        body: {},
      }),
    }),

    filterRoyalCustomers: builder.query<TPosFilterData<TPosCustomer>, TPosFilterParams & { CustomerGroupId?: number }>({
      query: (p) => ({ url: `customers/filter-royal${query({ PageIndex: 0, PageSize: 15, ...p })}` }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosCustomer>>) =>
        res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getCustomerGroupsSimple: builder.query<TPosCustomerSimpleGroup[], void>({
      query: () => ({ url: 'customergroups/filter-simple' }),
      transformResponse: (res: any) => {
        const d = res.Data
        if (Array.isArray(d)) return d
        return d?.Items ?? []
      },
    }),

    getProductGroupsSimple: builder.query<TPosProductGroup[], void>({
      query: () => ({ url: 'productgroups/filter-simple' }),
      transformResponse: (res: any) => {
        const d = res.Data
        if (Array.isArray(d)) return d
        return d?.Items ?? []
      },
    }),

    // ─── Stocks: Warehouses (danh sách kho) ─────────────────────────────────
    filterWarehouses: builder.query<TReportData, { PageIndex?: number; PageSize?: number; Keyword?: string; StatusId?: number | '' }>({
      query: (p) => ({ url: `stock/filter${query({ PageIndex: 0, PageSize: 15, ...p })}` }),
      transformResponse: (res: TPosResponse<TReportData>) =>
        res.Data ?? { Items: [], TotalItemCount: 0, Sumary: null },
    }),
    saveWarehouse: builder.mutation<void, Record<string, any>>({
      query: (data) => ({ url: data.Id ? 'stock/update' : 'stock/create', method: 'POST', body: buildModelFormData(data) }),
    }),
    updateWarehouseStatus: builder.mutation<void, { id: number; statusId: number }>({
      query: ({ id, statusId }) => ({ url: `stock/update-status?id=${id}&statusId=${statusId}`, method: 'POST', body: {} }),
    }),

    // ─── Stocks: Create mutations ─────────────────────────────────────────────
    createStockInput: builder.mutation<void, Record<string, any>>({
      query: (body) => ({ url: 'stockinputs/create', method: 'POST', body: buildModelFormData(body) }),
    }),
    createStockOutput: builder.mutation<void, Record<string, any>>({
      query: (body) => ({ url: 'stockoutputs/create', method: 'POST', body: buildModelFormData(body) }),
    }),
    createStockTransfer: builder.mutation<void, Record<string, any>>({
      query: (body) => ({ url: 'stocktransfers/create', method: 'POST', body: buildModelFormData(body) }),
    }),
    createStockCheck: builder.mutation<void, Record<string, any>>({
      query: (body) => ({ url: 'stockchecks/create', method: 'POST', body: buildModelFormData(body) }),
    }),

    // ─── Currencies: Create mutations ─────────────────────────────────────────
    createReceipt: builder.mutation<void, Record<string, any>>({
      query: (body) => ({ url: 'receipt/create', method: 'POST', body: buildModelFormData(body) }),
    }),
    createPayment: builder.mutation<void, Record<string, any>>({
      query: (body) => ({ url: 'payment/create', method: 'POST', body: buildModelFormData(body) }),
    }),

    // ─── HR: Filter queries ───────────────────────────────────────────────────
    filterMembers: builder.query<TReportData, { PageIndex?: number; PageSize?: number; Keyword?: string; StatusId?: number | '' }>({
      query: (p) => ({ url: `users/filter${query({ PageIndex: 0, PageSize: 15, ...p })}` }),
      transformResponse: (res: TPosResponse<TReportData>) =>
        res.Data ?? { Items: [], TotalItemCount: 0, Sumary: null },
    }),
    filterSalaries: builder.query<TReportData, { PageIndex?: number; PageSize?: number; Keyword?: string; Month?: string }>({
      query: (p) => ({ url: `salary/filter${query({ PageIndex: 0, PageSize: 15, ...p })}` }),
      transformResponse: (res: TPosResponse<TReportData>) =>
        res.Data ?? { Items: [], TotalItemCount: 0, Sumary: null },
    }),
    filterShifts: builder.query<TReportData, { PageIndex?: number; PageSize?: number; Keyword?: string; StatusId?: number | '' }>({
      query: (p) => ({ url: `shift/filter${query({ PageIndex: 0, PageSize: 15, ...p })}` }),
      transformResponse: (res: TPosResponse<TReportData>) =>
        res.Data ?? { Items: [], TotalItemCount: 0, Sumary: null },
    }),
    saveShift: builder.mutation<void, Record<string, any>>({
      query: (data) => ({ url: data.Id ? 'shift/update' : 'shift/create', method: 'POST', body: buildModelFormData(data) }),
    }),
    updateShiftStatus: builder.mutation<void, { id: number; statusId: number }>({
      query: ({ id, statusId }) => ({ url: `shift/update-status?id=${id}&statusId=${statusId}`, method: 'POST', body: {} }),
    }),
    /** Full member record — the list rows omit UserInfo/Shops/Image. */
    getMemberDetail: builder.query<TPosMember | null, number>({
      query: (id) => ({ url: `users/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosMember>) => res.Data ?? null,
    }),

    /**
     * users/create|update takes multipart: the model as a JSON blob plus any
     * avatar file, same as Angular's `postMultipart`.
     */
    saveMember: builder.mutation<TPosMember, { model: TPosMember; file?: File | null }>({
      query: ({ model, file }) => {
        const form = new FormData()
        form.append('model', new Blob([JSON.stringify(model)], { type: 'application/json' }))
        if (file) form.append(file.name, file)
        return { url: model.Id ? 'users/update' : 'users/create', method: 'POST', body: form }
      },
      transformResponse: (res: TPosResponse<TPosMember>) => res.Data,
    }),

    updateMemberStatus: builder.mutation<void, { id: number; statusId: number }>({
      query: ({ id, statusId }) => ({ url: `users/update-status?id=${id}&statusId=${statusId}`, method: 'POST', body: {} }),
    }),

    /** Login account attached to a member (may not exist yet). */
    getAccountByMember: builder.query<TPosUserAccount | null, number>({
      query: (id) => ({ url: `user-infos/detail-by-user?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosUserAccount>) => res.Data ?? null,
    }),

    saveAccount: builder.mutation<TPosUserAccount, TPosUserAccount>({
      query: (data) => {
        const form = new FormData()
        form.append('model', new Blob([JSON.stringify(data)], { type: 'application/json' }))
        // Swagger exposes no user-infos/create — the account row already
        // exists once the member is saved, so this is always an update.
        return { url: 'user-infos/update', method: 'POST', body: form }
      },
      transformResponse: (res: TPosResponse<TPosUserAccount>) => res.Data,
    }),

    getShopsSimple: builder.query<TPosShop[], void>({
      query: () => ({ url: `shop/filter-simple${query({ PageIndex: 0, PageSize: 1000 })}` }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosShop>>) => res.Data?.Items ?? [],
    }),

    getUserGroups: builder.query<Array<{ Id?: number; Name?: string }>, void>({
      query: () => ({ url: `usergroup/filter${query({ PageIndex: 0, PageSize: 1000 })}` }),
      transformResponse: (res: TPosResponse<TPosFilterData<{ Id?: number; Name?: string }>>) =>
        res.Data?.Items ?? [],
    }),

    getSalaryTypes: builder.query<TPosSalaryType[], void>({
      query: () => ({ url: 'salary/get-salary-types' }),
      transformResponse: (res: TPosResponse<TPosSalaryType[]>) => res.Data ?? [],
    }),

    // ─── Reports ─────────────────────────────────────────────────────────────
    filterReport: builder.query<TReportData, { path: string; params?: Record<string, any> }>({
      query: ({ path, params }) => ({ url: `${path}${params ? query({ PageIndex: 0, PageSize: 100, ...params }) : ''}` }),
      transformResponse: (res: TPosResponse<TReportData>) =>
        res.Data ?? { Items: [], TotalItemCount: 0, Sumary: null },
    }),

    // ─── Generic POST mutation ────────────────────────────────────────────────
    genericGet: builder.query<any, { url: string; params?: Record<string, any> }>({
      query: ({ url, params }) => ({ url: `${url}${params ? query(params) : ''}` }),
    }),
    genericPost: builder.mutation<any, { url: string; method?: string; body?: any }>({
      query: ({ url, method = 'POST', body }) => ({ url, method, body }),
    }),
    genericDownload: builder.mutation<Blob, { url: string; method?: string; body?: any }>({
      query: ({ url, method = 'GET', body }) => ({
        url,
        method,
        body,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  usePosLogoutMutation,
  useForgotPasswordMutation,
  useRenewPasswordMutation,
  useGetProvincesQuery,
  useGetProductCategoriesQuery,
  useInitShopDataMutation,
  useLazyGetMenuQuery,
  useGetUserInfoQuery,
  useChangePasswordMutation,
  useGetUserProfileQuery,
  useLazyGetUserProfileQuery,
  useUpdateUserProfileMutation,
  useChangePasswordV1Mutation,
  useUploadAvatarMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetAppCountInfoQuery,
  useGetSystemInfoQuery,
  useGetAppInfoQuery,
  useGetFunctionGroupsQuery,
  useCreateSupportWebMutation,
  useGetChartByMonthQuery,
  useGetSimpleChartQuery,
  useGetStatisticChartQuery,
  useGetOrderActivityQuery,
  useGetProductStatisticQuery,
  useGetCustomerActivityQuery,
  useGetSettingGeneralQuery,
  useUpdateSettingGeneralMutation,
  useRemoveShopDataMutation,
  useGetSettingOrderQuery,
  useGetPaymentTypesQuery,
  useUpdateSettingOrderMutation,
  useGetSettingProductQuery,
  useUpdateSettingProductMutation,
  useGetSettingStockQuery,
  useUpdateSettingStockMutation,
  useGetSettingNotificationQuery,
  useUpdateSettingNotificationMutation,
  useGetNotificationsQuery,
  useLazyGetNotificationsQuery,
  useFilterNotificationsQuery,
  useLazyFilterNotificationsQuery,
  useUpdateNotificationStatusMutation,
  useMarkAllNotificationsReadMutation,
  useGetUserShopSettingQuery,
  useGetSettingInvoiceQuery,
  useUpdateSettingInvoiceMutation,
  useGetSettingPrinterQuery,
  useUpdateSettingPrinterMutation,
  useGetAreasQuery,
  useGetTablesQuery,
  useLazyGetTableOrderDetailQuery,
  useSaveTableOrderMutation,
  useDeleteTableOrderMutation,
  useLazyGetOrderKitchenQuery,
  useGetProductGroupsQuery,
  useSelectShopMutation,
  useFilterProductGroupsQuery,
  useLazyFilterProductGroupsQuery,
  useGetProductGroupDetailQuery,
  useSaveProductGroupMutation,
  useUpdateProductGroupStatusMutation,
  useFilterCustomerGroupsQuery,
  useLazyFilterCustomerGroupsQuery,
  useGetCustomerGroupDetailQuery,
  useSaveCustomerGroupMutation,
  useUpdateCustomerGroupStatusMutation,
  useFilterSupplierGroupsQuery,
  useLazyFilterSupplierGroupsQuery,
  useGetSupplierGroupDetailQuery,
  useSaveSupplierGroupMutation,
  useUpdateSupplierGroupStatusMutation,
  useFilterUnitsQuery,
  useLazyFilterUnitsQuery,
  useGetUnitDetailQuery,
  useSaveUnitMutation,
  useUpdateUnitStatusMutation,
  // Actives: Orders
  useFilterOrdersQuery,
  useLazyFilterOrdersQuery,
  useGetOrderDetailQuery,
  useLazyGetOrderDetailQuery,
  useCancelOrderMutation,
  useSaveOrderMutation,
  useCompleteOrderMutation,
  // Actives: Order Invoices
  useFilterOrderInvoicesQuery,
  useLazyFilterOrderInvoicesQuery,
  useImportOrderInvoiceMutation,
  useLazyViewOrderInvoiceHtmlQuery,
  useCheckOrderInvoiceMutation,
  // Actives: Bookings
  useFilterBookingsQuery,
  useLazyFilterBookingsQuery,
  useGetBookingDetailQuery,
  useLazyGetBookingDetailQuery,
  useSaveBookingMutation,
  useUpdateBookingStatusMutation,
  // Actives: Quotations
  useFilterQuotationsQuery,
  useLazyFilterQuotationsQuery,
  useGetQuotationDetailQuery,
  useLazyGetQuotationDetailQuery,
  useSaveQuotationMutation,
  useUpdateQuotationStatusMutation,
  // Actives: Products
  useFilterActiveProductsQuery,
  useLazyFilterActiveProductsQuery,
  useGetActiveProductDetailQuery,
  useUpdateActiveProductStatusMutation,
  useSaveActiveProductMutation,
  useGetProductPriceQuery,
  useUpdateProductPriceMutation,
  useGetProductRecipesQuery,
  useCreateProductRecipeMutation,
  useDeleteProductRecipeMutation,
  useFilterShopsAllQuery,
  useUpdateShopMutation,
  // Actives: Statistics
  useFilterProductStatisticsQuery,
  useFilterRevenueStatisticsQuery,
  useFilterRevenueStatisticsSummaryQuery,
  // Actives: Customers
  useFilterCustomersQuery,
  useLazyFilterCustomersQuery,
  useLazyFilterCustomersSimpleQuery,
  useLazyFilterUsersSimpleQuery,
  useGetCustomerDetailQuery,
  useLazyGetCustomerDetailQuery,
  useSaveCustomerMutation,
  useUpdateCustomerStatusMutation,
  useFilterRoyalCustomersQuery,
  useGetCustomerGroupsSimpleQuery,
  useGetProductGroupsSimpleQuery,
  // Stocks: Warehouses
  useFilterWarehousesQuery,
  useSaveWarehouseMutation,
  useUpdateWarehouseStatusMutation,
  // Stocks
  useCreateStockInputMutation,
  useCreateStockOutputMutation,
  useCreateStockTransferMutation,
  useCreateStockCheckMutation,
  // Currencies
  useCreateReceiptMutation,
  useCreatePaymentMutation,
  // HR
  useFilterMembersQuery,
  useLazyFilterMembersQuery,
  useFilterSalariesQuery,
  useFilterShiftsQuery,
  useSaveShiftMutation,
  useUpdateShiftStatusMutation,
  useSaveMemberMutation,
  useLazyGetMemberDetailQuery,
  useLazyGetAccountByMemberQuery,
  useSaveAccountMutation,
  useGetShopsSimpleQuery,
  useGetUserGroupsQuery,
  useGetSalaryTypesQuery,
  useUpdateMemberStatusMutation,
  // Reports
  useFilterReportQuery,
  useLazyFilterReportQuery,
  // Generic
  useLazyGenericGetQuery,
  useGenericPostMutation,
  useGenericDownloadMutation,
} = userApiSlice;

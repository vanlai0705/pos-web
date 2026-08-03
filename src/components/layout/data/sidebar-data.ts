import {
  IconLayoutDashboard,
  IconShoppingCart,
  IconPackage,
  IconBuildingStore,
  IconReceipt,
  IconCash,
  IconUsers,
  IconChartBar,
  IconSettings,
  IconBell,
  IconUserCircle,
  IconArrowsShuffle,
  IconLifebuoy,
  IconStar,
} from "@tabler/icons-react"
import { type SidebarData } from "../types"

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: "Chính",
      items: [
        {
          title: "Tổng quan",
          url: "/dashboard",
          icon: IconLayoutDashboard,
        },
        {
          title: "Bán hàng",
          url: "/actives/order",
          icon: IconShoppingCart,
        },
        {
          title: "Đơn hàng",
          url: "/actives/order-manager",
          icon: IconReceipt,
        },
      ],
    },
    {
      title: "Kho & Sản phẩm",
      items: [
        {
          title: "Sản phẩm",
          url: "/actives/products",
          icon: IconPackage,
        },
        {
          title: "Tồn kho",
          icon: IconBuildingStore,
          items: [
            { title: "Nhập kho", url: "/stocks/stock-inputs" },
            { title: "Xuất kho", url: "/stocks/stock-outputs" },
            { title: "Chuyển kho", url: "/stocks/stock-transfers" },
            { title: "Kiểm kê", url: "/stocks/stock-checks" },
          ],
        },
      ],
    },
    {
      title: "Tài chính",
      items: [
        {
          title: "Thu chi",
          icon: IconCash,
          items: [
            { title: "Phiếu thu", url: "/currencies/receipt" },
            { title: "Phiếu chi", url: "/currencies/payment" },
            { title: "Số dư", url: "/currencies/cash-balance" },
          ],
        },
        {
          title: "Công nợ",
          icon: IconReceipt,
          items: [
            { title: "Khách hàng", url: "/liabilities/customer" },
            { title: "Nhà cung cấp", url: "/liabilities/supplier" },
          ],
        },
        {
          title: "Khuyến mãi",
          icon: IconStar,
          items: [
            { title: "Giảm giá tổng ĐH", url: "/promotions/discount-bill" },
            { title: "Giảm giá theo ĐH", url: "/promotions/discount-bill-total" },
            { title: "Giảm giá theo nhóm", url: "/promotions/categories" },
            { title: "Giảm giá theo MH", url: "/promotions/products" },
            { title: "Giảm giá theo SL MH", url: "/promotions/product-quantity" },
            { title: "Mặt hàng đồng giá", url: "/promotions/product-same-price" },
            { title: "Mua 1 tặng 1", url: "/promotions/bye-1-get-1" },
          ],
        },
      ],
    },
    {
      title: "Quản lý",
      items: [
        {
          title: "Khách hàng",
          url: "/actives/customers",
          icon: IconUsers,
        },
        {
          title: "Nhân sự",
          icon: IconUserCircle,
          items: [
            { title: "Nhân viên", url: "/human-resources/members" },
            { title: "Chấm công", url: "/human-resources/salaries" },
            { title: "Bảng lương", url: "/human-resources/salary-pays" },
            { title: "Thưởng phạt", url: "/human-resources/reward-punish" },
            { title: "Lý do TP", url: "/human-resources/reward-punish-reason" },
            { title: "Nhóm quyền", url: "/human-resources/user-groups" },
            { title: "Ca làm việc", url: "/human-resources/shifts" },
          ],
        },
        {
          title: "Báo cáo",
          url: "/report",
          icon: IconChartBar,
          items: [
            { title: "Báo cáo bán hàng", url: "/report/order" },
            { title: "Báo cáo đặt hàng", url: "/report/booking" },
            { title: "Thu chi", url: "/report/currency" },
            { title: "Kho hàng", url: "/report/stock" },
            { title: "Report Viewer", url: "/report/viewer" },
          ],
        },
        {
          title: "Thông báo",
          url: "/notifications",
          icon: IconBell,
        },
        {
          title: "Hỗ trợ",
          url: "/supports",
          icon: IconLifebuoy,
          items: [
            { title: "Hướng dẫn", url: "/supports/helps" },
            { title: "Hỗ trợ", url: "/supports/supports" },
          ],
        },
        {
          title: "Dữ liệu ban đầu",
          url: "/managers/opening-balances",
          icon: IconArrowsShuffle,
          items: [
            { title: "Công nợ khách hàng", url: "/managers/opening-balances/customer" },
            { title: "Công nợ nhà cung cấp", url: "/managers/opening-balances/supplier" },
            { title: "Tồn kho ban đầu", url: "/managers/opening-balances/inventory" },
          ],
        },
        {
          title: "Cài đặt",
          url: "/setting/general",
          icon: IconSettings,
        },
      ],
    },
  ],
}

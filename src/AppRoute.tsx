import { Navigate, Route, BrowserRouter as Router, Routes, useNavigate } from "react-router-dom"
import { useEffect } from "react"

import AppLayout from "./components/layout"
import PageNotFound from "./PageNotFound"
import PrivateRoute from "./PrivateRoute"
import { setNavigate } from "./utils/navigation-services"

import LoginPage from "./pages/login"
import RegisterPage from "./pages/register"
import ForgotPasswordPage from "./pages/forgot-password"
import RenewPasswordPage from "./pages/renew-password"
import ProfilePage from "./pages/profile"
import ChangePasswordPage from "./pages/change-password"
import ComingSoonPage from "./pages/coming-soon"
import DashboardPage from "./pages/dashboard"
import OrderManagerPage from "./pages/actives/order-manager"
import BookingPage from "./pages/actives/booking"
import QuotationPage from "./pages/actives/quotation"
import ActiveProductsPage from "./pages/actives/products"
import ProductsNewPage from "./pages/actives/products-new"
import ProductStatisticsPage from "./pages/actives/product-statistics"
import RevenueStatisticsPage from "./pages/actives/revenue-statistics"
import CustomersPage from "./pages/actives/customers"
import CustomerRoyalPage from "./pages/actives/customer-royal"
import PosOrderPage from "./pages/actives/order"
import TablesOrderPage from "./pages/actives/tables-order"
import ActiveInvoicesPage from "./pages/actives/invoices"
import SalesInvoicePage from "./pages/invoices/sales"
import RestaurantInvoicePage from "./pages/invoices/restaurant"
import SettingLayout from "./pages/setting/layout"
import SettingGeneralPage from "./pages/setting/general"
import SettingOrderPage from "./pages/setting/order"
import SettingProductPage from "./pages/setting/product"
import SettingStockPage from "./pages/setting/stock"
import SettingInvoicePage from "./pages/setting/invoice"
import NotificationsPage from "./pages/notifications"
import SettingPrinterPage from "./pages/setting/printer"
import SettingNotificationPage from "./pages/setting/notification"
import ProductGroupsPage from "./pages/managers/product-groups"
import CustomerGroupsPage from "./pages/managers/customer-groups"
import SupplierGroupsPage from "./pages/managers/supplier-groups"
import UnitsPage from "./pages/managers/units"
import ReportOrderPage from "./pages/report/order"
import ReportBookingPage from "./pages/report/booking"
import ReportCurrencyPage from "./pages/report/currency"
import ReportStockPage from "./pages/report/stock"
import ReportViewerPage from "./pages/report/viewer"
import ReportCustomViewerPage from "./pages/report/viewer-custom"
import WarehousesPage from "./pages/stocks/stocks"
import StockInventoryPage from "./pages/stocks/stock-inventory"
import StockInputsPage from "./pages/stocks/stock-inputs"
import StockOutputsPage from "./pages/stocks/stock-outputs"
import StockTransfersPage from "./pages/stocks/stock-transfers"
import StockChecksPage from "./pages/stocks/stock-checks"
import SuppliersPage from "./pages/stocks/suppliers"
import ShopsPage from "./pages/managers/shops"
import TemplatesPage from "./pages/managers/templates"
import OpeningBalancesCustomerPage from "./pages/managers/opening-balances/customer"
import OpeningBalancesSupplierPage from "./pages/managers/opening-balances/supplier"
import OpeningInventoryPage from "./pages/managers/opening-balances/inventory"
import ReceiptPage from "./pages/currencies/receipt"
import PaymentPage from "./pages/currencies/payment"
import CashBalancePage from "./pages/currencies/cash-balance"
import FundPage from "./pages/currencies/fund"
import FundTypePage from "./pages/currencies/fund-type"
import ReceiptPaymentReasonPage from "./pages/currencies/receipt-payment-reason"
import LiabilityCustomerPage from "./pages/liabilities/customer"
import LiabilitySupplierPage from "./pages/liabilities/supplier"
import MembersPage from "./pages/human-resources/members"
import SalariesPage from "./pages/human-resources/salaries"
import SalaryPaysPage from "./pages/human-resources/salary-pays"
import ShiftsPage from "./pages/human-resources/shifts"
import RewardPunishPage from "./pages/human-resources/reward-punish"
import RewardPunishReasonPage from "./pages/human-resources/reward-punish-reason"
import UserGroupsPage from "./pages/human-resources/user-groups"
import PromotionListPage from "./pages/promotions/promotion-list"

function NavigationInitializer() {
  const navigate = useNavigate()
  useEffect(() => { setNavigate(navigate) }, [navigate])
  return null
}

function AppRoute() {
  return (
    <Router>
      <NavigationInitializer />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/renew-password" element={<RenewPasswordPage />} />

        {/* Private — có AppLayout */}
        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            {/* Dashboard */}
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Profile */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />

            {/* Hoạt động */}
            <Route path="/actives/order" element={<PosOrderPage />} />
            <Route path="/actives/tables" element={<TablesOrderPage />} />
            <Route path="/actives/tables-order" element={<TablesOrderPage />} />
            <Route path="/actives/order-manager" element={<OrderManagerPage />} />
            <Route path="/actives/booking" element={<BookingPage />} />
            <Route path="/actives/quotation" element={<QuotationPage />} />
            <Route path="/actives/products" element={<ActiveProductsPage />} />
            <Route path="/actives/products/seo_detail/:guid" element={<ActiveProductsPage />} />
            <Route path="/actives/products-new" element={<ProductsNewPage />} />
            <Route path="/actives/products-new/seo_detail/:guid" element={<ProductsNewPage />} />
            <Route path="/actives/product-statistics" element={<ProductStatisticsPage />} />
            <Route path="/actives/revenue-statistics" element={<RevenueStatisticsPage />} />
            <Route path="/actives/customers" element={<CustomersPage />} />
            <Route path="/actives/customer-royal" element={<CustomerRoyalPage />} />
            <Route path="/actives/invoices" element={<ActiveInvoicesPage />} />
            <Route path="/actives/*" element={<ComingSoonPage />} />

            {/* Hoá đơn */}
            <Route path="/invoices" element={<Navigate to="/invoices/sales" replace />} />
            <Route path="/invoices/sales" element={<SalesInvoicePage />} />
            <Route path="/invoices/restaurant" element={<RestaurantInvoicePage />} />
            <Route path="/invoices/*" element={<ComingSoonPage />} />

            {/* Thông báo */}
            <Route path="/notifications" element={<NotificationsPage />} />

            {/* Quản lý danh mục */}
            <Route path="/managers">
              <Route index element={<Navigate to="/managers/product-groups" replace />} />
              <Route path="product-groups" element={<ProductGroupsPage />} />
              <Route path="customer-groups" element={<CustomerGroupsPage />} />
              <Route path="supplier-groups" element={<SupplierGroupsPage />} />
              <Route path="shops" element={<ShopsPage />} />
              <Route path="shops/create" element={<ShopsPage />} />
              <Route path="shops/:id" element={<ShopsPage />} />
              <Route path="units" element={<UnitsPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="opening-balances/customer" element={<OpeningBalancesCustomerPage />} />
              <Route path="opening-balances/supplier" element={<OpeningBalancesSupplierPage />} />
              <Route path="opening-balances/inventory" element={<OpeningInventoryPage />} />
              <Route path="*" element={<ComingSoonPage />} />
            </Route>

            {/* Kho */}
            <Route path="/stocks">
              <Route index element={<StockInputsPage />} />
              <Route path="stocks" element={<WarehousesPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="stock-inventory" element={<StockInventoryPage />} />
              <Route path="stock-inputs" element={<StockInputsPage />} />
              <Route path="stock-outputs" element={<StockOutputsPage />} />
              <Route path="stock-transfers" element={<StockTransfersPage />} />
              <Route path="stock-checks" element={<StockChecksPage />} />
              <Route path="*" element={<ComingSoonPage />} />
            </Route>

            {/* Thu chi / Quỹ */}
            <Route path="/currencies">
              <Route index element={<ReceiptPage />} />
              <Route path="receipt" element={<ReceiptPage />} />
              <Route path="receipt-create" element={<ReceiptPage />} />
              <Route path="payment" element={<PaymentPage />} />
              <Route path="payment-create" element={<PaymentPage />} />
              <Route path="cash-balance" element={<CashBalancePage />} />
              <Route path="fund" element={<FundPage />} />
              <Route path="fund-type" element={<FundTypePage />} />
              <Route path="receipt-payment-reason" element={<ReceiptPaymentReasonPage />} />
              <Route path="*" element={<ComingSoonPage />} />
            </Route>

            {/* Khuyến mãi */}
            <Route path="/promotions">
              <Route index element={<PromotionListPage type={0} title="Khuyến mãi" />} />
              <Route path="discount-bill" element={<PromotionListPage type={0} title="Giảm giá tổng hóa đơn" />} />
              <Route path="discount-bill-total" element={<PromotionListPage type={5} title="Giảm giá theo giá trị đơn hàng" />} />
              <Route path="categories" element={<PromotionListPage type={1} title="Giảm giá theo nhóm" />} />
              <Route path="products" element={<PromotionListPage type={2} title="Giảm giá theo sản phẩm" />} />
              <Route path="product-quantity" element={<PromotionListPage type={4} title="Giảm giá theo số lượng" />} />
              <Route path="product-same-price" element={<PromotionListPage type={3} title="Mặt hàng đồng giá" />} />
              <Route path="bye-1-get-1" element={<PromotionListPage type={6} title="Mua 1 tặng 1" />} />
              <Route path="*" element={<ComingSoonPage />} />
            </Route>

            {/* Công nợ */}
            <Route path="/liabilities">
              <Route index element={<LiabilityCustomerPage />} />
              <Route path="customer" element={<LiabilityCustomerPage />} />
              <Route path="supplier" element={<LiabilitySupplierPage />} />
              <Route path="*" element={<ComingSoonPage />} />
            </Route>

            {/* Nhân sự */}
            <Route path="/human-resources">
              <Route index element={<MembersPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="salaries" element={<SalariesPage />} />
              <Route path="salary-pays" element={<SalaryPaysPage />} />
              <Route path="shifts" element={<ShiftsPage />} />
              <Route path="reward-punish" element={<RewardPunishPage />} />
              <Route path="reward-punish-reason" element={<RewardPunishReasonPage />} />
              <Route path="user-groups" element={<UserGroupsPage />} />
              <Route path="*" element={<ComingSoonPage />} />
            </Route>

            {/* Báo cáo */}
            <Route path="/report" element={<Navigate to="/report/order" replace />} />
            <Route path="/report/order" element={<ReportOrderPage />} />
            <Route path="/report/booking" element={<ReportBookingPage />} />
            <Route path="/report/currency" element={<ReportCurrencyPage />} />
            <Route path="/report/stock" element={<ReportStockPage />} />
            <Route path="/report/viewer" element={<ReportViewerPage />} />
            <Route path="/report/designer" element={<ReportViewerPage />} />
            <Route path="/report/:code" element={<ReportViewerPage />} />
            <Route path="/report/*" element={<ComingSoonPage />} />
            <Route path="/reports/*" element={<ComingSoonPage />} />
            <Route path="/report-custom/*" element={<ReportCustomViewerPage />} />

            {/* Cài đặt */}
            <Route path="/setting" element={<SettingLayout />}>
              <Route index element={<Navigate to="/setting/general" replace />} />
              <Route path="general" element={<SettingGeneralPage />} />
              <Route path="order" element={<SettingOrderPage />} />
              <Route path="product" element={<SettingProductPage />} />
              <Route path="stock" element={<SettingStockPage />} />
              <Route path="notification" element={<SettingNotificationPage />} />
              <Route path="invoice" element={<SettingInvoicePage />} />
              <Route path="printer" element={<SettingPrinterPage />} />
            </Route>

            {/* Admin */}
            <Route path="/admins/*" element={<ComingSoonPage />} />

            {/* Hỗ trợ */}
            <Route path="/supports" element={<ComingSoonPage />} />
            <Route path="/supports/*" element={<ComingSoonPage />} />

            {/* Sản phẩm mới */}
            <Route path="/new-product/*" element={<ComingSoonPage />} />
          </Route>
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Router>
  )
}

export default AppRoute

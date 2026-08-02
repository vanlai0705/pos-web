# Routes & Features — Angular pos_web

## Layout types
- `SimpleLayout` — trang không cần đăng nhập (login, register, forgot, QR order)
- `FullLayout` — trang nội bộ có sidebar (dashboard, actives, invoices, ...)
- `QrOrderComponent` — layout riêng cho QR order (không sidebar)

## Top-level routes

| Path | Layout | Module |
|---|---|---|
| `/` hoặc `/home` | Simple | HomeModule |
| `/login` | Simple | LoginModule |
| `/register` | Simple | RegisterModule |
| `/forgot-password` | Simple | ForgotPasswordModule |
| `/renew-password` | Simple | RenewPasswordModule |
| `/privacy-policy` | Simple | PrivacyPolicyModule |
| `/support` | Simple | SupportModule |
| `/pages` | Simple | PagesModule (404, 500) |
| `/order-table` | QrOrder | QrOrderModule |
| `/order-cart` | QrOrderCart | QrOrderModule |
| `/order-success` | QrOrderSuccess | QrOrderModule |
| `/dashboard` | Full | DashboardModule |
| `/new-product` | Full | NewProductsModule |
| `/actives` | Full | ActivesModule |
| `/actives/order` | SellGroup | SellGroupModule |
| `/actives/tables` | Restaurant | RestaurantModule |
| `/actives/tables-order` | RestaurantSell | RestaurantSellModule |
| `/invoices` | Full | InvoiceModule |
| `/notifications` | Full | NotificationsModule |
| `/managers` | Full | ManagersModule |
| `/stocks` | Full | StocksModule |
| `/currencies` | Full | CurrencyModule |
| `/promotions` | Full | PromotionsModule |
| `/liabilities` | Full | LiabilitiesModule |
| `/human-resources` | Full | HumanResourcesModule |
| `/report` `/reports` `/report-custom` | Full | ReportModule |
| `/setting` | Full | SettingModule |
| `/supports` | Full | SupportsModule |
| `/admins` | Full | AdminsModule |

> Tất cả routes trên được duplicate thêm dưới `/:domainName/...` cho multi-tenant.

---

## Sub-routes từng module

### `/actives/`
- `order` — Bán hàng (giao diện bán, chọn sản phẩm, thanh toán)
- `order-manager` — Quản lý đơn hàng
- `booking` — Đặt lịch
- `quotation` — Báo giá
- `products` — Danh sách sản phẩm
- `products/seo_detail/:guid` — Chi tiết SEO sản phẩm
- `products-new` — Thêm sản phẩm mới
- `product-statistics` — Thống kê sản phẩm
- `revenue-statistics` — Thống kê doanh thu
- `customers` — Khách hàng
- `customer-royal` — Khách hàng thân thiết
- `invoices` — Hoá đơn (trong actives)
- `tables` — Sơ đồ bàn nhà hàng
- `tables-order` — Gọi món tại bàn

### `/managers/`
- `product-groups` — Nhóm sản phẩm
- `customer-groups` — Nhóm khách hàng
- `supplier-groups` — Nhóm nhà cung cấp
- `shops` — Danh sách cửa hàng
- `shops/:id` — Chi tiết cửa hàng
- `shops/create` — Tạo cửa hàng
- `units` — Đơn vị tính
- `templates` — Mẫu in
- `opening-balances/customer` — Số dư đầu kỳ khách hàng
- `opening-balances/supplier` — Số dư đầu kỳ nhà cung cấp
- `opening-balances/inventory` — Số dư đầu kỳ kho

### `/stocks/`
- `stocks` — Tồn kho
- `suppliers` — Nhà cung cấp
- `stock-inputs` — Nhập kho
- `stock-outputs` — Xuất kho
- `stock-transfers` — Chuyển kho
- `stock-checks` — Kiểm kê kho
- `stock-inventory` — Cân bằng tồn kho

### `/currencies/`
- `receipt-payment-reason` — Lý do thu chi
- `fund-type` — Loại quỹ
- `fund` — Quỹ tiền mặt
- `receipt` — Thu tiền
- `receipt-create` — Tạo phiếu thu
- `payment` — Chi tiền
- `payment-create` — Tạo phiếu chi
- `cash-balance` — Số dư tiền mặt

### `/promotions/`
- `categories` — Danh mục khuyến mãi
- `products` — Sản phẩm khuyến mãi
- `discount-bill` — Giảm giá theo hoá đơn
- `discount-bill-total` — Giảm giá tổng hoá đơn
- `product-quantity` — Mua số lượng được giảm
- `product-same-price` — Sản phẩm đồng giá
- `bye-1-get-1` — Mua 1 tặng 1

### `/liabilities/`
- `customer` — Công nợ khách hàng
- `supplier` — Công nợ nhà cung cấp

### `/human-resources/`
- `members` — Nhân viên
- `salaries` — Bảng lương
- `salary-pays` — Thanh toán lương
- `reward-punish` — Thưởng phạt
- `reward-punish-reason` — Lý do thưởng phạt
- `user-groups` — Nhóm người dùng
- `shifts` — Ca làm việc

### `/setting/`
- `general` — Cài đặt chung
- `order` — Cài đặt đơn hàng
- `product` — Cài đặt sản phẩm
- `stock` — Cài đặt kho
- `notification` — Cài đặt thông báo
- `invoice` — Cài đặt hoá đơn
- `printer` — Cài đặt máy in

### `/admins/`
- `tenants` — Danh sách tenant (super admin)
- `partner-list` — Danh sách đối tác

### `/report/`
- `order` — Báo cáo đơn hàng
- `currency` — Báo cáo thu chi
- `booking` — Báo cáo đặt lịch
- `stock` — Báo cáo kho
- `viewer` — Xem báo cáo
- `designer` — Thiết kế báo cáo
- `:code` — Báo cáo theo code động

---

## Không có route guard (CanActivate)
Angular app không dùng guard per-route. Auth được enforce reactively:
- `AppComponent.ngOnInit()`: có cookie → redirect dashboard; không có → redirect home
- API trả 401/402/403 → `RouteService.goLogin()`

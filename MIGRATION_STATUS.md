# Migration Status — Angular pos_web → React pos-web-v2

Cập nhật: 2026-07-31

---

## Đã có trong React (pos-web-v2)

### Infrastructure ✅
- Vite + React 18 + TypeScript + TailwindCSS + shadcn/ui
- Redux Toolkit + RTK Query + redux-persist
- React Router v6
- i18n (vi/en) qua i18next
- Layout: sidebar, header, top-nav, profile dropdown, theme switch, command menu
- Toast (sonner), form validation (react-hook-form + zod)
- Auth guard (`PrivateRoute`) + role guard
- Excel import/export (`exceljs`, `file-saver`)
- Print/PDF (`react-to-print`, `jspdf`, `html2canvas`)
- QR code (`react-qr-code`)
- BigNumber arithmetic (`bignumber.js`)
- Dark/light theme với localStorage

### Pages đã implement ✅
| Route | Trang | Ghi chú |
|---|---|---|
| `/products` | Sản phẩm (Thành Phẩm) | CRUD đầy đủ + BOM dialog + batch import Excel + image upload |
| `/semi-products` | Bán Thành Phẩm | Filter ProductPage với `defaultStatus=2` |
| `/components` | Linh Kiện | CRUD + batch import + image upload |
| `/imported-goods` | Hàng Hóa Nhập Khẩu | CRUD + image upload |
| `/warehouses` | Kho | CRUD |
| `/inventories` | Tồn Kho | CRUD |
| `/serials` | Serial | CRUD + image gallery + set primary |
| `/suppliers` | Nhà Cung Cấp | CRUD |
| `/customers` | Khách Hàng | CRUD |
| `/users` | Nhân Viên (Users) | CRUD (admin only) |
| `/inbounds` | Nhập Kho | CRUD + detail + payment detail + filter + confirm |
| `/outbounds` | Xuất Kho | CRUD + detail + receipt detail + filter + confirm |
| `/quality-inspections` | Kiểm Tra Chất Lượng | CRUD + confirm + preview + certificate print |
| `/login` | Đăng nhập | Form validation + RTK mutation |
| `/register` | Đăng ký | Route tồn tại |
| `/profile` | Hồ sơ | View/edit |
| `/change-password` | Đổi mật khẩu | Wired |

---

## Cần migrate từ Angular (THIẾU)

### Tính năng cốt lõi POS

#### 1. Dashboard (`/dashboard`)
- Thống kê doanh thu, đơn hàng, tồn kho
- Charts: `GET charts/chart-simple-by-month`, `GET charts/chart-statistic`
- App count info: `GET setting/app-count-info`
- **Priority: HIGH**

#### 2. Bán hàng — `/actives/order` (SellGroup)
- Giao diện bán hàng chính: chọn sản phẩm, thêm vào giỏ, thanh toán
- OrderModel (view-model phức tạp nhất): add/remove item, tính tổng, áp promotion
- API: `POST orders/update`, `POST orders/completed`, `POST promotions/get-promotions`
- **Priority: CRITICAL — đây là core feature POS**

#### 3. Quản lý đơn hàng (`/actives/order-manager`)
- Danh sách đơn hàng, lọc theo trạng thái, ngày
- API: `GET orders/filter-order-activity`, `GET orders/detail`
- **Priority: HIGH**

#### 4. Giỏ hàng tạm (`temporary receipt`)
- Lưu / mở giỏ hàng chưa thanh toán
- API: `GET orders/filter-temporary-receipt`, `POST orders/delete-temporary-receipt`
- **Priority: HIGH**

#### 5. Restaurant tables — `/actives/tables` + `/actives/tables-order`
- Sơ đồ bàn ăn (kéo thả / chọn bàn)
- Gọi món tại bàn
- Merge/split/transfer bàn
- API: `GET area/get-list`, `POST tables/batch-create`, `PUT tables/merge|split|transfer`
- QR order: `/order-table`, `/order-cart`, `/order-success`
- **Priority: HIGH (nếu có tính năng nhà hàng)**

#### 6. Hoá đơn (`/invoices`)
- Danh sách hoá đơn
- Cài đặt hoá đơn: `GET setting/get-invoice`
- **Priority: MEDIUM**

#### 7. Thu chi (`/currencies/`)
- Phiếu thu: `GET currencies/receipt`, `POST currencies/receipt-create`
- Phiếu chi: `GET currencies/payment`, `POST currencies/payment-create`
- Loại quỹ: `GET fundType/filter-simple`, `GET fundType/get-payment-type`
- Lý do thu chi: `GET ReceiptPaymentReason/filter-simple`
- Số dư tiền mặt: `GET currencies/cash-balance`
- **Priority: MEDIUM**

#### 8. Khuyến mãi (`/promotions/`)
- Quản lý các chương trình KM: giảm giá bill, mua nhiều giảm giá, mua 1 tặng 1
- API: `promotions/*` endpoints
- **Priority: MEDIUM**

#### 9. Công nợ (`/liabilities/`)
- Công nợ khách hàng, nhà cung cấp
- API: `opening-balances/filter-customer`, `opening-balances/filter-supplier`
- **Priority: MEDIUM**

#### 10. Nhân sự (`/human-resources/`)
- Nhân viên, ca làm việc, bảng lương, thưởng phạt
- API: `salary/*`, `users/filter-simple`, `shift/filter-simple`
- **Priority: LOW**

#### 11. Báo cáo (`/report/`)
- Báo cáo đơn hàng, thu chi, kho, đặt lịch
- API: `charts/*`, `statistic/*`
- **Priority: MEDIUM**

#### 12. Cài đặt (`/setting/`)
- Cài đặt chung, đơn hàng, sản phẩm, kho, thông báo, máy in
- API: `setting/get-*`, `setting/update-*`
- **Priority: LOW (nhưng cần sớm cho các tính năng khác)**

#### 13. Thông báo (`/notifications`)
- Danh sách thông báo, đánh dấu đã đọc
- API: `notifications/*`
- **Priority: LOW**

#### 14. Quản lý (`/managers/`)
- Nhóm SP, nhóm KH, nhóm NCC, cửa hàng, đơn vị tính, mẫu in
- **Priority: LOW**

#### 15. Booking / Đặt lịch (`/actives/booking`)
- API: `bookings/filter`
- **Priority: LOW**

---

## Thứ tự migrate đề xuất

```
1. Dashboard (charts, stats overview)
2. Bán hàng — /actives/order (OrderModel + thanh toán)
3. Quản lý đơn hàng + giỏ hàng tạm
4. Thu chi (currencies)
5. Khuyến mãi
6. Công nợ
7. Báo cáo
8. Restaurant tables (nếu cần)
9. Nhân sự
10. Cài đặt + Thông báo + Quản lý
```

---

## Lưu ý khi migrate

### Auth
- Đổi login endpoint từ `/api/v1/login` → `user-infos/login`
- Thêm password hashing trước khi gửi (`PasswordSalt`)
- Lưu `DomainName` vào store sau login
- Đọc thêm `Permissions[]` và `Shops[]` từ `GET user-infos/me`

### OrderModel
- Đây là class phức tạp nhất, nên dùng Zustand hoặc Redux slice riêng
- Cần track: items, totals, customer, table, promotions, payment info
- Logic tính tiền: subtotal → discount → tax → total → change

### Multi-tenant
- Hiện React chưa có multi-tenant routing
- Nếu cần: thêm `/:domainName` prefix vào routes, lưu domain vào Redux

### Promotions
- API `POST promotions/get-promotions` nhận `{Items:[{Id, Quantity}]}` → trả về danh sách promotion áp được
- Cần call API này real-time khi thay đổi giỏ hàng

### Sidebar data
- File `src/components/layout/data/sidebar-data.ts` hiện là template mẫu shadcn
- Cần cập nhật thành menu thực của POS (theo `_nav.ts` trong Angular)

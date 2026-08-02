# API Endpoints — Angular pos_web

**Base URL:** `https://api.posmobile.vn/api/v1/`

**Response shape chung:**
```json
{ "Success": true, "Data": <any>, "Errors": [{ "Code": "...", "Message": "..." }] }
```

**HTTP methods:** `get`, `post`, `put`, `delete`, `getFile`, `postFile`, `postMultipart`, `putMultipart`, `postFormData`, `deleteWithBody`

---

## Auth / User

| Method | Endpoint | Ghi chú |
|---|---|---|
| POST | `user-infos/login` | Không auth header; body: `{DomainName, PasswordSalt}` |
| GET | `user-infos/me` | Trả về `{User, SettingAdmob, Permissions, Shops}` |
| GET | `user-infos/logout?token=` | Xóa session server-side |
| GET | `user-infos/login-google?token=` | Google id_token → JWT |
| GET | `user-infos/login-facebook?token=` | Facebook accessToken → JWT |
| GET | `tenants/login-as?tenantId=&userId=` | Admin impersonation |
| POST | `user-infos/change-password` | |
| POST | `user-infos/forgot-password` | |
| POST | `user-infos/renew-password` | |
| GET | `user-infos/get-setting` | |

---

## Orders / Sales

| Method | Endpoint | Ghi chú |
|---|---|---|
| POST | `orders/update` | Tạo hoặc cập nhật order |
| POST | `orders/completed` | Hoàn thành / thanh toán |
| GET | `orders/detail` | Chi tiết 1 order |
| GET | `orders/filter-temporary-receipt` | Danh sách giỏ hàng tạm (saved carts) |
| GET | `orders/get-list-order-item` | Danh sách items trong order |
| GET | `orders/filter-order-activity` | Báo cáo hoạt động order |
| POST | `orders/delete-temporary-receipt?orderId=` | Xóa giỏ hàng tạm |
| POST | `promotions/get-promotions` | Body: `{Items:[{Id,Quantity}]}`; trả về khuyến mãi áp dụng được |

**Order data shape (tạo order):**
```json
{
  "Name": "", "Date": "", "Customer": {}, "StockOut": {},
  "FundType": {}, "Member": {}, "CreatorUser": {},
  "Detail": "", "Note": "", "Reserved": false, "OldDebit": 0,
  "Payment": 0, "Voucher": 0, "Change": 0,
  "Type": 1, "PaymentType": 1, "Tax": 0, "Discount": 0, "DiscountPercent": 0,
  "IsCustomersDebt": false, "IsExportInvoice": false,
  "CustomerInvoice": {
    "Id": "", "CompanyName": "", "Address": "", "TaxAgencyCode": "",
    "BuyerName": "", "CitizenId": "", "PaymentMethod": "",
    "PhoneNumber": "", "BankName": "", "BankAccount": "", "Email": ""
  },
  "Items": [], "PromotionItems": [], "Table": {}
}
```

---

## Products

| Method | Endpoint |
|---|---|
| GET | `products/filter` |
| GET | `products/filter-simple` |
| GET | `products/detail-guid` |
| DELETE (with body) | `products/patch-delete` |
| GET | `productgroups/filter-simple` |
| GET | `producttypes/get-list` |

---

## Inventory / Kho hàng

| Method | Endpoint |
|---|---|
| GET | `inventory/get-inventory` |
| POST | `inventory/update-cost-by-average` |
| POST | `inventory/update-cost-by-latest` |
| GET | `stock/filter-simple` |
| GET (file) | `opening-balances/export-excel-inventory` |
| POST | `opening-balances/import-excel-inventory` |
| POST | `opening-balances/update-inventory` |
| GET | `opening-balances/filter-customer` |
| GET | `opening-balances/filter-supplier` |
| POST | `opening-balances/import-excel-customer` |
| POST | `opening-balances/update-customer` |

---

## Settings

| Method | Endpoint |
|---|---|
| GET | `setting/get-menus` |
| GET | `setting/get-tool-bars` |
| GET/POST | `setting/get-layout` / `setting/update-layout` |
| GET/POST | `setting/get-order` / `setting/update-order` |
| GET/POST | `setting/get-product` / `setting/update-product` |
| GET | `setting/get-general` |
| GET | `setting/get-invoice` |
| GET/POST | `setting/get-stock` / `setting/update-stock` |
| GET/POST | `setting/get-notification` / `setting/update-notification` |
| GET | `setting/get-provinces` |
| GET | `setting/get-product-categories` |
| GET | `setting/app-info` |
| GET | `setting/app-count-info` |
| GET | `setting/system-info` |
| POST | `setting/init-data` |
| POST | `setting/remove-data` |
| GET (file) | `setting/download_printer_service` |

---

## Notifications

| Method | Endpoint |
|---|---|
| GET | `notifications/get-notifications?PageIndex=&PageSize=` |
| POST | `notifications/update-status-user?id=&statusId=` |
| POST | `notifications/update-all-readed` |

---

## Restaurant / Bàn ăn

| Method | Endpoint |
|---|---|
| GET | `area/get-list` |
| POST (multipart) | `area/create` |
| POST | `tables/batch-create` |
| PUT | `tables/merge` |
| PUT | `tables/split` |
| PUT | `tables/transfer` |
| PUT | `tables/order-anonymous` |
| GET (file) | `tables/get-qr-image-files` |

---

## Human Resources / Nhân sự

| Method | Endpoint |
|---|---|
| GET | `salary/get-salary-types` |
| GET | `salary/get-salary-working-days` |
| POST | `salary/update-salary-working-days` |
| GET | `users/get-user-salary` |
| GET | `users/filter-simple` |
| GET | `tenants/filter-user` |

---

## Charts / Báo cáo

| Method | Endpoint |
|---|---|
| GET | `charts/chart-simple-by-month` |
| GET | `charts/chart-statistic` |
| GET | `statistic/filter-product-statistic` |
| GET | `customers/filter-activity` |

---

## Comboboxes / Lookup

| Endpoint |
|---|
| `ReceiptPaymentReason/filter-simple` |
| `bank/filter-simple` |
| `bookings/filter` |
| `customergroups/filter-simple` |
| `fundType/filter-simple` |
| `fundType/get-payment-type` |
| `functions/filter-simple` |
| `functions/get-list` |
| `quotations/filter` |
| `rewardpunishreasons/filter-simple` |
| `shift/filter-simple` |
| `shop/filter-simple` |
| `status/get-by-ids` |
| `suppliergroups/filter-simple` |
| `suppliers/filter-simple` |
| `supports/detail-guid` |
| `supports/filter-support-type` |
| `units/filter-simple` |

---

## Misc

| Method | Endpoint | Ghi chú |
|---|---|---|
| POST | `devices/update` | Body: `{deviceType:3, deviceToken}`; đăng ký FCM |
| POST (multipart) | `shop/update` | Cập nhật thông tin cửa hàng |
| POST | `supports/create-web` | Tạo ticket support |
| GET | `https://api.vietqr.io/v2/business?taxCode=` | External: tra mã số thuế |

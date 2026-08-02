# Data Models & Constants — Angular pos_web

## Key Models (TypeScript classes)

### OrderModel (`models/orders/order.model.ts`)
View-model quản lý đơn hàng tại UI. Wrap `OrderService`. Không injectable, được instantiate per-component.

Properties:
```ts
order: {
  Name, Date,
  Customer: { Id, Name, Phone, Address, ... },
  StockOut: {},   // kho xuất hàng
  FundType: {},   // phương thức thanh toán
  Member: {},     // nhân viên bán
  CreatorUser: {},
  Detail, Note, Reserved,
  OldDebit,       // công nợ cũ
  Payment,        // số tiền thanh toán
  Voucher, Change,
  Type, PaymentType,
  Tax, Discount, DiscountPercent,
  IsCustomersDebt, IsExportInvoice,
  CustomerInvoice: {
    Id, CompanyName, Address, TaxAgencyCode,
    BuyerName, CitizenId, PaymentMethod,
    PhoneNumber, BankName, BankAccount, Email
  },
  Items: OrderItem[],
  PromotionItems: [],
  Table: {}
}
```

Methods:
- `addItem(product)` — thêm sản phẩm vào order
- `removeOrderItem(item)` — xóa item
- `getTotal()` — tổng tiền phải trả
- `getSubTotal()` — tổng trước giảm giá
- `getTotalTax()` — tổng thuế
- `getTotalItem()` — tổng số lượng
- `addPromotionItem(promo)` — áp dụng khuyến mãi
- `newOrder()` — khởi tạo order mới
- `reset()` — reset về trạng thái ban đầu

### ComboboxModel (`models/commons/combobox.model.ts`)
```ts
{ Id: string; Name: string; Image: ImageModel }
```

### TableModel (`models/table/table.model.ts`)
Dữ liệu bàn nhà hàng (tên bàn, khu vực, trạng thái, order đang gọi...).

---

## Constants (JavaScript object enums)

### STATUS_ACTION (`constants/status.constant.ts`)
```ts
{
  Actived: 0, Locked: 1, Deleted: 2,
  Info: 3, Payment: 4, User: 5,
  Permission: 6, SalaryMonth: 7,
  RewardPunish: 8, SalaryPay: 9, Detail: 10
}
```

### STATUS
```ts
{ Actived: 0, Locked: 1, Deleted: 2 }
```

### FUNCTION_ORDER (`constants/order.constant.ts`)
```ts
{
  NEW: 1,
  PAYMENT: 2,
  TEMPARARY_RECEIPT: 3,       // lưu giỏ hàng tạm
  TEMPARARY_RECEIPT_OPEN: 4,  // mở giỏ hàng tạm
  BOOKING: 5,
  SAVE: 7,
  SAVE_AND_PRINT: 8,
  PRINT_KITCHEN: 14,
  PRINT_KITCHEN_LABEL: 15
}
```

### INVOICE_SETTING_TYPE (`constants/invoice-type.constant.ts`)
```ts
{ PaymentNotInvoice: 0, Delete: 1, Auto: 2, Payment: 3 }
```

### COOKIE_CONST (`constants/cookie.constant.ts`)
```ts
{ AUTHORIZE_KEY: 'Authorization' }
```

---

## State Management (Angular — services-as-state)

### UserService
- `currentMember` — thông tin user hiện tại (plain object)
- `permissions[]` — danh sách quyền
- `settingAdmob` — cài đặt admob
- Reactive: `EventEmitter<any>` as `settingAdmobObservable`

### SettingService
- `settingProduct`, `settingLayout`, `settingOrder`, `settingProvinces`, `settingProductCategories`
- Reactive: `BehaviorSubject<any>(null)` → `settingOrderObservable`
- Reactive: `EventEmitter<Object>` → `settingLayoutObservable`

### OrderService
- `order` — order đang xử lý (plain object)
- Getter/setter: `getOrder()`, `setOrder()`, `resetOrder()`
- Không reactive, components poll trực tiếp

### NotificationService
- `dataSource: { UnReadedCount, Notifications[], TotalItemCount }`
- Không reactive, plain property

### MenuService
- `_menus`, `_toolbars` — lazy-load, cache lại sau lần đầu

---

## User Info từ API (`GET user-infos/me`)
```ts
{
  User: {
    Id, Name, Phone, Email, Avatar,
    DomainName, ShopId, ...
  },
  SettingAdmob: { ... },
  Permissions: string[],  // danh sách permission codes
  Shops: Shop[]           // danh sách cửa hàng user có quyền
}
```

---

## Migration notes cho React

### OrderService → Zustand hoặc Redux slice
Vì OrderService giữ state phức tạp (order hiện tại), nên dùng Zustand store hoặc Redux slice:
```ts
interface OrderState {
  order: OrderShape
  addItem: (product: Product) => void
  removeItem: (itemId: string) => void
  setCustomer: (customer: Customer) => void
  applyPromotion: (promo: Promotion) => void
  calculateTotals: () => Totals
  resetOrder: () => void
}
```

### SettingService → RTK Query + cache
Load một lần khi mount, cache qua `keepUnusedDataFor` lớn.

### UserService → Redux user slice (đã có skeleton)
- Mở rộng `TLoginResponse` để include `Permissions[]` và `Shops[]`
- Thêm selector `selectPermissions`, `selectShops`

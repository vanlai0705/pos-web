// Tất cả POS API types đặt ở đây để tránh circular import
// File này KHÔNG được import từ types/index.ts

export interface TPosUser {
  TenantId: number;
  Email: string;
  IsActive: boolean;
  Status: { Id: number };
  Id: number;
  Name: string;
  Surname: string;
  FullName: string;
}

export interface TPosShop {
  Id: number;
  Name: string;
  LongName: string;
  ExpirationAt: string;
  Image?: TPosImage;
  IsDefault?: boolean;
  /** The shop's assigned warehouse — used as the default StockOut target when submitting an order. */
  Stock?: { Id: number; Name: string; IsNegative?: boolean } | null;
}

export interface TPosPermissionFunction {
  Id: number;
  Name: string;
  Icon?: string;
  Description?: string;
  FunctionGroup?: { Id: number };
  Status?: { Id: number };
}

export interface TPosPermission {
  Id: number;
  Function: TPosPermissionFunction;
  IsView: boolean;
  IsAdd: boolean;
  IsEdit: boolean;
  IsDelete: boolean;
}

export interface TPosSettingAdmob {
  Id: number;
  IsBannerAd: boolean;
  IsRewarded: boolean;
  IsInterstitial: boolean;
}

/** Data trả về từ user-infos/login và user-infos/me */
export interface TPosLoginData {
  SessionToken?: string;
  DomainName?: string;
  User: TPosUser;
  Permissions: TPosPermission[];
  Shops: TPosShop[];
  SettingAdmob?: TPosSettingAdmob;
}

export interface TPosResponse<T> {
  Success: boolean;
  Data: T;
  Errors?: Array<{ Code: string; Message: string }>;
}

export interface TPosLoginRequest {
  DomainName: string;
  UserName: string;
  PasswordSalt: string;
}

/** Shop registration payload — ABP style, so several name/tenant aliases ride along. */
export interface TPosRegisterRequest {
  DomainName?: string;
  FullName?: string;
  Email: string;
  Phone?: string;
  Address?: string;
  ProvinceId?: number | string | null;
  ProductCategoryId?: number | string | null;
  productCategoryId?: number | string | null;
  ShopName?: string;
  Name?: string;
  Surname?: string;
  TenantDisplayName?: string;
  TenancyName?: string;
  UserName?: string;
  PasswordSalt?: string;
  ConfirmPasswordSalt?: string;
}

export interface TForgotPasswordRequest {
  MemberInfo: string;
}

export interface TRenewPasswordRequest {
  PasswordSalt: string;
  Token: string;
}

export interface TPosProvince {
  Id: number;
  Name: string;
  Code?: string;
}

export interface TPosProductCategory {
  Id: number;
  Name: string;
}

export interface TPosAppCountInfo {
  ShowCount?: number;
  MemberCount?: number;
  ShowManagerCount?: number;
  OrderCount: number;
  CustomerCount: number;
  ProductCount: number;
  TodayRevenue: number;
  ThisMonthRevenue: number;
  TodayOrderCount: number;
}

export interface TPosSystemInfo {
  SystemPhone?: string;
  SystemEmail?: string;
  SystemAddress?: string;
  SystemWebsite?: string;
}

export interface TPosAppInfo {
  RateAndroid?: string;
  RateIos?: string;
  ShareAndroid?: string;
  ShareIos?: string;
}

export interface TPosFunctionItem {
  Name: string;
}

export interface TPosFunctionGroup {
  Name: string;
  Functions?: TPosFunctionItem[];
}

export interface TPosSupportWebRequest {
  Name: string;
  Email: string;
  PhoneNumber: string;
  Description: string;
}

export interface TPosChartMonth {
  Month: number;
  Year: number;
  Revenue: number;
  OrderCount: number;
}

// ─── Dashboard chart types ─────────────────────────────────────────────────────

/** charts/chart-simple-by-month?type=0|1|2|3 */
export interface TPosSimpleChartItem {
  Label: string;
  Value: number;
}
export interface TPosSimpleChart {
  Title: string;
  TotalCount: number;
  ChartItems: TPosSimpleChartItem[];
}

/** charts/chart-statistic */
export interface TPosStatisticChartItem {
  Label: string;
  Values: number[];
}
export interface TPosStatisticChart {
  Titles: string[];
  ChartItems: TPosStatisticChartItem[];
}

// ─── Dashboard activity types ──────────────────────────────────────────────────

/** customers/filter-activity */
export interface TPosCustomerActivityItem {
  Image?: { Url: string };
  Name: string;
  Phone?: string;
  Address?: string;
  Status?: { Id: number };
  Point?: number;
  PointPercent?: number;
  CustomerGroup?: { Name: string; Image?: { Url: string } };
  NextCustomerGroup?: { Name: string; Image?: { Url: string } };
  LastActivity?: { Name: string; Date: string };
}
export interface TPosCustomerActivity {
  TotalItemCount: number;
  Items: TPosCustomerActivityItem[];
}

/** orders/filter-order-activity */
export interface TPosOrderActivityItem {
  Name: string;
  Date: string;
  Customer?: { Name: string; Image?: { Url: string } };
  Total: number;
  Cash: number;
  Card: number;
  Shortage: number;
}
export interface TPosOrderActivity {
  TotalItemCount: number;
  Items: TPosOrderActivityItem[];
}

/** statistic/filter-product-statistic */
export interface TPosProductStatisticItem {
  Product: {
    Name: string;
    ProductCode: string;
    Barcode?: string;
    ProductGroup?: { Id?: number; Name?: string };
  };
  Unit?: { Name: string };
  Quantity: number;
  Price: number;
  PriceInput: number;
  DiscountPercent: number;
  Amount: number;
  AmountInput: number;
  Profit: number;
  ProfitPercent: number;
}
export interface TPosProductStatisticSummary {
  Quantity: number;
  Amount: number;
  AmountInput: number;
  Profit: number;
}
export interface TPosProductStatistic {
  TotalItemCount: number;
  Sumary: TPosProductStatisticSummary;
  Items: TPosProductStatisticItem[];
}

// ─── Date filter preset ────────────────────────────────────────────────────────
export type TDatePreset = "today" | "week" | "month" | "year";

// ─── Setting types ─────────────────────────────────────────────────────────────

export interface TPosSettingGeneral {
  Id?: number;
  CompanyName?: string;
  Email?: string;
  Phone?: string;
  Fax?: string;
  Address?: string;
  ProductCategory?: { Id: number; Name: string };
  Province?: { Id: number; Name: string };
  Image?: TPosImage;
}

export interface TPosSettingOrder {
  IsDupplicateCustomerName: boolean;
  IsDiscount: boolean;
  IsUsingBarcode: boolean;
  IsInputQuantityWithBarcode: boolean;
  OrderShiftEndTime?: string;
  IsChangeDate: boolean;
  IsTranferCost: boolean;
  IsServiceFee?: boolean;
  ServiceFeePercent?: number;
  IsTax: boolean;
  IsTaxPerItemAllowed: boolean;
  IsStock: boolean;
  StockDefault?: { Id: number; Name: string } | null;
  DefaultDiscount: number;
  TaxPercent: number;
  Rounting: number;
  DayOfRetrurn: number;
  IsRequireCustomer: boolean;
  IsRequireUser: boolean;
  IsRequireStock: boolean;
  IsDebit: boolean;
  IsTempOrder: boolean;
  IsRequireRefurnByOrderNo: boolean;
  IsDisplayProductImage: boolean;
  IsAutoPromotion: boolean;
  IsDisplayProductPromotion: boolean;
  IsVoucher: boolean;
  IsTranfer: boolean;
  IsPricePerCustomer: boolean;
  IsDiscountByProduct: boolean;
  PrintCount: number;
  IsPrintProvisionalInvoice: boolean;
  PrinterUrl?: string;
  BillPrinterName?: string;
}

export interface TPosSettingProduct {
  IsUsingProductCode: boolean;
  IsUsingBarcode: boolean;
  IsGenerateBarcode: boolean;
  IsGenerateProductCode: boolean;
  IsDupplicateName: boolean;
  IsMultiUnit: boolean;
  BarcodeLength: number;
  PrinterUrl?: string;
  BarcodePrinterName?: string;
}

export interface TPosSettingStock {
  IsInputDupplicateProduct: boolean;
  IsRequireUser: boolean;
  IsRequireSuppier: boolean;
}

export interface TPosSettingNotification {
  IsShowNotification: boolean;
  IsShowLowStock: boolean;
  IsShowCustomerBirthday: boolean;
}

export interface TPosImage {
  Id?: number;
  Url: string;
}

export interface TPosSettingGeneral {
  Id?: number;
  CompanyName?: string;
  Phone?: string;
  Address?: string;
  Email?: string;
  Image?: TPosImage;
}

export interface TPosNotificationItem {
  Id: number | string;
  Name: string;
  Detail?: string;
  Date?: string;
  Image?: TPosImage;
  Status?: { Id: number; Name?: string };
  Function?: { Icon?: string };
}

export interface TPosNotificationListResponse {
  UnReadedCount: number;
  TotalItemCount: number;
  Notifications: TPosNotificationItem[];
}

export interface TPosFilterNotificationResponse {
  Items: TPosNotificationItem[];
  TotalItemCount: number;
}

export interface TPosSettingInvoice {
  id?: number;
  taxExportType: number;
  invoiceType: number;
  url?: string;
  taxNumber?: string;
  userName?: string;
  password?: string;
  parttern?: string;
  isDraft: boolean;
  shopId?: number;
}

export interface TPosKitchenPrinter {
  PrinterName?: string;
  PrinterIp?: string;
  PrinterPort?: number;
  IsPrintLabel?: boolean;
  Area?: { Id: number; Name: string };
  ProductGroup?: { Id: number; Name: string };
}

export interface TPosInvoicePrinter {
  PrinterName?: string;
  PrinterIp?: string;
  PrinterPort?: number;
  PrinterUrl?: string;
  IsPrintLabel?: boolean;
  Area?: { Id: number; Name: string };
}

export interface TPosSettingPrinter {
  EnableKitchenPrintByArea: boolean;
  InvoicePrintByAreaMode: number;
  KitchenPrinters: TPosKitchenPrinter[];
  InvoicePrinters: TPosInvoicePrinter[];
  BillPrinter?: TPosInvoicePrinter;
  TempBillPrinter?: TPosInvoicePrinter;
}

export interface TPosArea {
  Id: number;
  Name: string;
}

export interface TPosTable {
  Id: number;
  Name: string;
  OrderId?: number;
  Guid?: string;
  AreaId?: number;
  CreationTime?: string;
  IsPrinted?: boolean;
  IsAnonymous?: boolean;
  Total?: number;
  SubTotal?: number;
}

export interface TPosProductGroup {
  Id: number;
  Name: string;
  Image?: TPosItemImage;
}

// ─── Manager shared ───────────────────────────────────────────────────────────

export interface TPosItemStatus {
  Id: number;
  Name: string;
}

export interface TPosItemImage {
  Id?: number;
  Url: string;
}

export interface TPosFilterParams {
  PageIndex?: number;
  PageSize?: number;
  Keyword?: string;
  StatusId?: number | "";
}

export interface TPosFilterData<T> {
  Items: T[];
  TotalItemCount: number;
}

export interface TReportData<T = Record<string, any>> {
  Items: T[];
  TotalItemCount: number;
  Sumary: Record<string, number> | null;
}

// ─── Product Groups ───────────────────────────────────────────────────────────

export interface TPosProductGroupFull {
  Id?: number;
  Code?: string;
  Name: string;
  Note?: string;
  Image?: TPosItemImage;
  ProductGroup?: { Id: number; Name: string };
  Status?: TPosItemStatus;
}

// ─── Customer Groups ──────────────────────────────────────────────────────────

export interface TPosCustomerGroup {
  Id?: number;
  Name: string;
  CustomerCode?: string;
  DiscountPercent?: number;
  Point?: number;
  Note?: string;
  Image?: TPosItemImage;
  Status?: TPosItemStatus;
}

// ─── Supplier Groups ──────────────────────────────────────────────────────────

export interface TPosSupplierGroup {
  Id?: number;
  Name: string;
  Note?: string;
  Image?: TPosItemImage;
  Status?: TPosItemStatus;
}

// ─── Units ───────────────────────────────────────────────────────────────────

export interface TPosUnit {
  Id?: number;
  Name: string;
  Note?: string;
  Image?: TPosItemImage;
  Status?: TPosItemStatus;
}

// ─── Actives: Orders ─────────────────────────────────────────────────────────

/** Product snapshot embedded in an order line — the full product, echoed back. */
export interface TPosOrderItemProduct extends Omit<
  TPosActiveProduct,
  "Name" | "Tax"
> {
  Name?: string;
  Tax?: number | null;
  Total?: number;
  Amount?: number;
}

export interface TPosOrderItem {
  Id?: number;
  Guid?: string;
  Product: TPosOrderItemProduct;
  /** Flattened fields returned by the order list/detail endpoints. */
  ProductId?: number;
  ProductName?: string;
  ProductCode?: string;
  UnitName?: string;
  Unit?: TPosUnit;
  Quantity?: number;
  QuantityGroup?: number;
  QuantitySystem?: number;
  QuantityReal?: number;
  Exchange?: number;
  Price?: number;
  DiscountPercent?: number;
  Discount?: number;
  /** Line total before tax: Price × Quantity − Discount */
  Total?: number;
  /** Line total including tax */
  Amount?: number;
  /** null marks a tax-exempt product, which the server treats differently from 0 */
  Tax?: number | null;
  ParentId?: number | null;
  Type?: number;
  Note?: string;
  IsPromotion?: boolean;
  IsPrinted?: boolean;
  IsAnonymous?: boolean;
  Status?: { Id?: number; Name?: string };
}

/** A bank/wallet account a fund type can be settled into. */
export interface TPosFundAccount {
  Id?: number;
  Name?: string;
  ShortName?: string;
  AccountNumber?: string;
  AccountName?: string;
  QrCodeUrl?: string;
  /** 0=Cash, 1=Card, 2=Transfer, 3=Wallet — authoritative for Cash/Card/Transfer
   * classification; prefer this over matching on Name. */
  FundGroup?: number;
}

/** Payment method from `fundType/get-payment-type`; `Items` are its linked accounts. */
export interface TPosFundType extends TPosFundAccount {
  Items?: TPosFundAccount[];
}

/** E-invoice ("Hoá đơn điện tử") buyer details attached to an order. */
export interface TPosCustomerInvoice {
  Id?: number;
  CompanyName?: string;
  Address?: string;
  TaxAgencyCode?: string;
  BuyerName?: string;
  CitizenId?: string;
  PaymentMethod?: string;
  PhoneNumber?: string;
  BankName?: string;
  BankAccount?: string;
  Email?: string;
}

export interface TPosOrder {
  Id?: number;
  Guid?: string;
  CustomerInvoice?: TPosCustomerInvoice;
  Name?: string;
  Date?: string;
  CreationTime?: string;
  Detail?: string;
  Note?: string;
  Customer?: TPosCustomerSimple | null;
  User?: { Id?: number; Name?: string };
  /** Logged-in user placing the order (Angular's `currentMember`) */
  Member?: (TPosUser & { Shops?: unknown[] }) | null;
  CreatorUser?: {
    Id?: number;
    Name?: string;
    Surname?: string;
    FullName?: string;
  } | null;
  Shop?: { Id?: number };
  StockOut?: { Id?: number; Name?: string } | null;
  /** Restaurant only — which table and browser the order came from */
  Table?: { Id?: number; Name?: string } | null;
  table?: { id?: number; name?: string };
  deviceGuid?: string;
  Status?: TPosItemStatus;
  Items?: TPosOrderItem[];
  PromotionItems?: TPosOrderItem[];
  /** Printer(s) the server assigned this order to — drives local-bridge print dispatch. */
  Printers?: {
    PrinterIp?: string;
    PrinterPort?: number;
    PrinterName?: string;
    PrinterUrl?: string;
  }[];
  /** Sum of line Amount (tax included) */
  SubTotalItems?: number;
  /** Sum of line Total (pre-tax) */
  SubTotal?: number;
  Total?: number;
  Discount?: number;
  DiscountPercent?: number;
  TransferCost?: number;
  ServiceFeePercent?: number;
  OldDebit?: number;
  Cash?: number;
  Card?: number;
  Transfer?: number;
  Shortage?: number;
  Tax?: number;
  TotalTax?: number;
  Round?: number;
  Change?: number;
  Reserved?: number;
  Payment?: number;
  Return?: number;
  Point?: number;
  Voucher?: number;
  PrintNo?: number;
  PriceType?: number;
  Type?: number;
  PaymentType?: number;
  IsCustomersDebt?: boolean;
  IsPrint?: boolean;
  IsExportInvoice?: boolean;
  /** Fields returned by the order list/detail endpoints. */
  Code?: string;
  Stock?: { Id?: number; Name?: string };
  FundType?: { Id?: number; Name?: string; FundGroup?: number } | null;
  IsInvoice?: boolean;
  CustomerDebt?: boolean;
}

/** tables/get-order-kitchen — one group of items per printer they route to. */
export interface TPosKitchenPrintGroup {
  Items?: { ProductName?: string }[];
  Printer?: {
    PrinterIp?: string;
    PrinterPort?: number;
    PrinterName?: string;
    PrinterUrl?: string;
  };
}

export interface TPosOrderFilterParams {
  PageIndex?: number;
  PageSize?: number;
  Keyword?: string;
  DateFrom?: string;
  DateTo?: string;
  StatusId?: number | "";
  CustomerId?: number;
}

// ─── Actives: Bookings ───────────────────────────────────────────────────────

export interface TPosBooking {
  Id?: number;
  Name?: string;
  Date?: string;
  DeliveryDate?: string;
  Customer?: { Id?: number; Name?: string; Phone?: string };
  User?: { Id?: number; Name?: string };
  Stock?: { Id?: number; Name?: string };
  SubTotal?: number;
  Total?: number;
  Status?: TPosItemStatus;
  Note?: string;
  Items?: TPosOrderItem[];
}

// ─── Actives: Quotations ─────────────────────────────────────────────────────

export interface TPosQuotation {
  Id?: number;
  Code?: string;
  Date?: string;
  ExpiredDate?: string;
  Customer?: { Id?: number; Name?: string; Phone?: string };
  User?: { Id?: number; Name?: string };
  Stock?: { Id?: number; Name?: string };
  SubTotal?: number;
  Total?: number;
  Status?: TPosItemStatus;
  Note?: string;
  Items?: TPosOrderItem[];
}

// ─── Actives: Products ───────────────────────────────────────────────────────

export interface TPosActiveProduct {
  Id?: number;
  Code?: string;
  ProductCode?: string;
  Barcode?: string;
  Name: string;
  Unit?: TPosUnit;
  ProductGroup?: { Id?: number; Name?: string; Image?: TPosItemImage };
  ProductType?: { Id?: number; Code?: string; Name?: string };
  Price?: number;
  PriceInput?: number;
  ImportPrice?: number;
  /** Per-item tax percent (used when IsTaxPerItemAllowed) — `null` means "Không có thuế" (no tax). */
  Tax?: number | null;
  Quantity?: number;
  Note?: string;
  Image?: TPosItemImage;
  Images?: TPosItemImage[];
  Status?: TPosItemStatus;
  /** "Định lượng" — this product is a recipe assembled from other products. Backend is inconsistent about casing; both are sent on save. */
  IsRecipe?: boolean;
  isRecipe?: boolean;
  /** Populated by the product detail dialog's Shops tab only when set there; otherwise sent as `[]` on save. */
  Shops?: Array<{ Id?: number; Name?: string }>;
}

export interface TPosProductType {
  Id?: number;
  Name?: string;
  Code?: string;
  [key: string]: unknown;
}

/** products/get-product-price — one row per price level (Bán lẻ/Bán buôn/…), S/M/L columns. */
export interface TPosProductPriceRow {
  PriceLevel?: { Id?: number; Name?: string };
  Price?: number;
  PriceSmall?: number;
  PriceMedium?: number;
  PriceLarge?: number;
}

/** The ingredient product snapshot embedded in a recipe row. */
export interface TPosProductRecipeIngredient {
  Id?: number;
  Barcode?: string;
  ProductCode?: string;
  Name?: string;
  Price?: number;
  Images?: TPosItemImage[];
  Unit?: { Id?: number; Name?: string };
}

/** product-recipes/get-list — one row per ingredient in a recipe product's BOM. */
export interface TPosProductRecipeRow {
  Id?: number;
  ProductRecipe?: TPosProductRecipeIngredient;
  QuantitySmall?: number;
  QuantityMedium?: number;
  QuantityLarge?: number;
}

// ─── Actives: Statistics ─────────────────────────────────────────────────────

export interface TPosRevenueStatItem {
  Id?: number;
  Name?: string;
  Date?: string;
  Note?: string;
  SubTotal?: number;
  Discount?: number;
  DiscountPercent?: number;
  TransferCost?: number;
  Total?: number;
  Change?: number;
  Customer?: { Id?: number; Name?: string };
  User?: { Id?: number; FullName?: string };
  Status?: { Id?: number };
}

export interface TPosRevenueStatSumary {
  SubTotal?: number;
  Discount?: number;
  TransferCost?: number;
  Amount?: number;
  Total?: number;
}

export interface TPosRevenueStatResponse {
  Items: TPosRevenueStatItem[];
  TotalItemCount: number;
  Sumary?: TPosRevenueStatSumary;
}

export interface TPosRevenueSummaryItem {
  FundType?: { Id?: number; Name?: string };
  Total?: number;
}

export type TPosRevenueSummaryResponse = TPosRevenueSummaryItem[];

// ─── Actives: Customers ──────────────────────────────────────────────────────

export interface TPosCustomer {
  Id?: number;
  Code?: string;
  CustomerCode?: string;
  Name: string;
  IsCompany?: boolean;
  CustomerGroup?: { Id?: number; Name?: string };
  TaxCode?: string;
  TaxNumber?: string;
  CompanyName?: string;
  Phone?: string;
  IdCard?: string;
  CitizenId?: string;
  Email?: string;
  Birthday?: string;
  Address?: string;
  Note?: string;
  Image?: TPosItemImage;
  Status?: TPosItemStatus;
  TotalAmount?: number;
  TotalOrder?: number;
  Point?: number;
}

export interface TPosCustomerSimple {
  Id?: number;
  Name: string;
  Email?: string;
  Address?: string;
  Phone?: string;
  TaxNumber?: string;
  CompanyName?: string;
}

export interface TPosCustomerSimpleGroup {
  Id?: number;
  Name?: string;
  TotalCustomer?: number;
}

// ─── Actives: Order Invoices ──────────────────────────────────────────────────

export interface TPosOrderInvoiceHistory {
  Message?: string;
  Date?: string;
}

export interface TPosOrderInvoice {
  Id: number;
  OrderId?: number;
  InvoiceDate?: string;
  PublishStatus?: number;
  PublishStatusName?: string;
  InvoiceType?: number;
  CompanyName?: string;
  TaxAgencyCode?: string;
  PhoneNumber?: string;
  Address?: string;
  BuyerName?: string;
  PaymentMethod?: string;
  BankAccount?: string;
  BankName?: string;
  InvoiceSymbol?: string;
  InvoiceNumber?: string;
  TotalAmount?: number;
  Histories?: TPosOrderInvoiceHistory[];
}

export interface TPosOrderInvoiceFilterParams {
  PageIndex?: number;
  PageSize?: number;
  Keyword?: string;
  DateFrom?: string;
  DateTo?: string;
  PublishStatus?: number | null;
}

// ─── Stocks: Common ───────────────────────────────────────────────────────────

export interface TPosStockVoucherItem {
  Id?: number;
  Product?: {
    Id?: number;
    Code?: string;
    Name?: string;
    Unit?: { Id?: number; Name?: string };
  };
  Quantity?: number;
  Price?: number;
  Total?: number;
  Note?: string;
}

// ─── Stocks: Nhập kho ──────────────────────────────────────────────────────────

export interface TPosStockInput {
  Id?: number;
  Name?: string;
  Date?: string;
  Supplier?: { Id?: number; Name?: string };
  StockIn?: { Id?: number; Name?: string };
  QuantityIn?: number;
  Total?: number;
  Status?: TPosItemStatus;
  Note?: string;
  Items?: TPosStockVoucherItem[];
}

// ─── Stocks: Xuất kho ──────────────────────────────────────────────────────────

export interface TPosStockOutput {
  Id?: number;
  Name?: string;
  Date?: string;
  User?: { Id?: number; Name?: string };
  StockOut?: { Id?: number; Name?: string };
  QuantityOut?: number;
  Total?: number;
  Status?: TPosItemStatus;
  Note?: string;
  Items?: TPosStockVoucherItem[];
}

// ─── Stocks: Chuyển kho ────────────────────────────────────────────────────────

export interface TPosStockTransfer {
  Id?: number;
  Name?: string;
  Date?: string;
  User?: { Id?: number; Name?: string };
  StockIn?: { Id?: number; Name?: string };
  StockOut?: { Id?: number; Name?: string };
  QuantityTransfer?: number;
  Status?: TPosItemStatus;
  Note?: string;
  Items?: TPosStockVoucherItem[];
}

// ─── Stocks: Kiểm kê ──────────────────────────────────────────────────────────

export interface TPosStockCheck {
  Id?: number;
  Name?: string;
  Date?: string;
  User?: { Id?: number; Name?: string };
  StockIn?: { Id?: number; Name?: string };
  StockOut?: { Id?: number; Name?: string };
  QuantityIn?: number;
  QuantityOut?: number;
  Status?: TPosItemStatus;
  Note?: string;
  Items?: TPosStockVoucherItem[];
}

// ─── Currencies: Phiếu thu/chi ───────────────────────────────────────────────

/** CashBalanceModel — a distinct, ledger-shaped report row (not a voucher). */
export interface TPosCashBalanceItem {
  Name?: string;
  Date?: string;
  Detail?: string;
  Receipt?: number;
  Payment?: number;
  Balance?: number;
}

export interface TPosCurrencyVoucher {
  Id?: number;
  Name?: string;
  Date?: string;
  Type?: number;
  ObjectName?: string;
  Address?: string;
  OriginDocument?: string;
  ReceiptPaymentReason?: { Id?: number; Name?: string };
  /** ReceiptPaymentModel — the single money field is Amount, not Receipt/Payment */
  Amount?: number;
  IsTransfer?: boolean;
  Shop?: { Id?: number; Name?: string };
  Detail?: string;
  Status?: TPosItemStatus;
  Note?: string;
}

// ─── Liabilities ──────────────────────────────────────────────────────────────

/**
 * LiabilitiesCustomerModel / LiabilitiesSupplierModel — the only figure the
 * server returns per row is the current outstanding `Total`. There is no
 * beginning/in/out breakdown; that only exists per-voucher in the detail
 * dialog (see TPosLiabilityVoucher below).
 */
export interface TPosDebtItem {
  Customer?: {
    Id?: number;
    Name?: string;
    Phone?: string;
    Address?: string;
    Email?: string;
    CustomerCode?: string;
    TaxCode?: string;
    CustomerGroup?: { Id?: number; Name?: string };
  };
  Supplier?: {
    Id?: number;
    Name?: string;
    Phone?: string;
    Address?: string;
    Email?: string;
    SupplierCode?: string;
    TaxNumber?: string;
    SupplierGroup?: { Id?: number; Name?: string };
  };
  ObjectName?: string;
  Total?: number;
}

/** LiabilitiesDetailModel — one row in the "Chi tiết công nợ" dialog. */
export interface TPosLiabilityVoucher {
  Date?: string;
  Name?: string;
  Detail?: string;
  Total?: number;
  Payment?: number;
}

// ─── HR: Nhân viên ────────────────────────────────────────────────────────────

/** Employment details — the server nests these under the member's `UserInfo`. */
export interface TPosMemberUserInfo {
  Address?: string;
  Note?: string;
  /** Index into `salary/get-salary-types` */
  SalaryType?: number;
  Salary?: number;
  IsMonday?: boolean;
  IsTuesday?: boolean;
  IsWednesday?: boolean;
  IsThursday?: boolean;
  IsFriday?: boolean;
  IsSaturday?: boolean;
  IsSunday?: boolean;
}

export interface TPosMember {
  Id?: number;
  /** Family name — the UI splits the full name into Surname + Name */
  Surname?: string;
  Name?: string;
  FullName?: string;
  Phone?: string;
  Email?: string;
  /** Shops this member may work in */
  Shops?: Array<{
    Id?: number;
    Name?: string;
    LongName?: string;
    Image?: TPosItemImage;
  }>;
  UserInfo?: TPosMemberUserInfo;
  /** Self-service profile fields (address/note) — a separate object from `UserInfo`, only used by `user-infos/self-update`. */
  UserProfile?: { Address?: string; Note?: string };
  Image?: TPosItemImage | null;
  UserGroups?: TPosAccountUserGroup[];
  Status?: TPosItemStatus;
  IsActive?: boolean;
}

/** One row of the account ↔ permission-group join. */
export interface TPosAccountUserGroup {
  Id?: number;
  UserGroupId?: number;
  Actived?: boolean;
  UserGroup?: { Id?: number; Name?: string };
}

/** Login account for a member — `user-infos/*`, separate from the member record. */
export interface TPosUserAccount {
  Id?: number;
  UserName?: string;
  PasswordSalt?: string;
  /** Client-side only; hashed into PasswordSalt before sending */
  Password?: string;
  ConfirmPassword?: string;
  Member?: { Id?: number } | null;
  UserGroups?: TPosAccountUserGroup[];
  Name?: string;
  Surname?: string;
  FullName?: string;
}

export interface TPosSalaryType {
  Value?: number;
  Name?: string;
  Detail?: string;
}

// ─── HR: Bảng lương ───────────────────────────────────────────────────────────

export interface TPosSalaryRecord {
  Id?: number;
  Member?: { Id?: number; Name?: string };
  Name?: string;
  Month?: string;
  BaseSalary?: number;
  Bonus?: number;
  Deduction?: number;
  NetSalary?: number;
  Status?: TPosItemStatus;
  Note?: string;
}

// ─── HR: Ca làm việc ──────────────────────────────────────────────────────────

export interface TPosShift {
  Id?: number;
  Name?: string;
  Image?: TPosItemImage;
  /** Percent of a full day's wage this shift is worth (defaults to 100). */
  SalaryPercent?: number;
  Parent?: { Id?: number; Name?: string } | null;
  Status?: TPosItemStatus;
  Note?: string;
}

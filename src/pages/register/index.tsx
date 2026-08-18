import { Fragment, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useGetProductCategoriesQuery, useGetProvincesQuery, useInitShopDataMutation, useLazyGetMenuQuery } from '@/store/slice/registration-users/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLazyGetMeQuery, useRegisterMutation } from '@/store/slice/auth/api'
import { useAppDispatch } from '@/store/hooks'
import { setMenu } from '@/store/slice/users/app'
import { useAuth } from '@/hooks/useAuth'
import { computePasswordSalt } from '@/utils/crypto'
import { setStoredDomainName, withDomainPath } from '@/utils/domain-route'
import { ArrowRight, Check, Store } from 'lucide-react'

// ─── Constants ──────────────────────────────────────────────────────────────
// pos_web's register flow never lets the user pick credentials — every new
// tenant is always provisioned with UserName/Password = 'admin'/'admin'
// (shown back to the user on the success screen). Mirror that exactly.
const DEFAULT_USERNAME = 'admin'
const DEFAULT_PASSWORD = 'admin'

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Matches pos_web's RegisterComponent.buildTenancyName / removeVietnameseTones
// exactly: strip diacritics, lowercase, collapse anything non [a-z0-9] into a
// single '-', trim leading/trailing '-'. (The previous version stripped all
// separators instead of hyphenating, producing different slugs than pos_web.)

const VIETNAMESE_TONE_MAP: Record<string, string> = {
  à: "a", á: "a", ả: "a", ã: "a", ạ: "a",
  ă: "a", ắ: "a", ằ: "a", ẳ: "a", ẵ: "a", ặ: "a",
  â: "a", ấ: "a", ầ: "a", ẩ: "a", ẫ: "a", ậ: "a",
  è: "e", é: "e", ẻ: "e", ẽ: "e", ẹ: "e",
  ê: "e", ế: "e", ề: "e", ể: "e", ễ: "e", ệ: "e",
  ì: "i", í: "i", ỉ: "i", ĩ: "i", ị: "i",
  ò: "o", ó: "o", ỏ: "o", õ: "o", ọ: "o",
  ô: "o", ố: "o", ồ: "o", ổ: "o", ỗ: "o", ộ: "o",
  ơ: "o", ớ: "o", ờ: "o", ở: "o", ỡ: "o", ợ: "o",
  ù: "u", ú: "u", ủ: "u", ũ: "u", ụ: "u",
  ư: "u", ứ: "u", ừ: "u", ử: "u", ữ: "u", ự: "u",
  ỳ: "y", ý: "y", ỷ: "y", ỹ: "y", ỵ: "y",
  đ: "d",
}

function removeVietnameseTones(value: string): string {
  return (value || '')
    .toLowerCase()
    .split('')
    .map(c => VIETNAMESE_TONE_MAP[c] ?? c)
    .join('')
}

function buildTenancyName(shopName: string): string {
  return removeVietnameseTones(shopName)
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegisterForm {
  ShopName: string;
  Email: string;
  Phone: string;
  ProvinceId: string;
  productCategoryId: string;
}

// ─── Stepper component ─────────────────────────────────────────────────────────

const STEPS = ["Thông tin cửa hàng", "Xác nhận", "Hoàn thành"];

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((label, i) => (
        <Fragment key={i}>
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                i < current
                  ? "bg-primary text-primary-foreground"
                  : i === current
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < current ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`hidden sm:block text-xs whitespace-nowrap ${
                i === current ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`flex-1 h-px mx-1 ${
                i < current ? "bg-primary" : "bg-border"
              }`}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { setUser, setUserInfo } = useAuth();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState("");
  const [registeredDomain, setRegisteredDomain] = useState("");
  const [registeredShopName, setRegisteredShopName] = useState("");

  const [register, { isLoading: isRegistering }] = useRegisterMutation();
  const [initShopData, { isLoading: isIniting }] = useInitShopDataMutation();
  const [getMe] = useLazyGetMeQuery();
  const [getMenu] = useLazyGetMenuQuery();
  const { data: provinces = [] } = useGetProvincesQuery();
  const { data: productCategories = [] } = useGetProductCategoriesQuery();

  const isSubmitting = isRegistering || isIniting;

  const {
    register: formRegister,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    defaultValues: {
      ShopName: "",
      Email: "",
      Phone: "",
      ProvinceId: "",
      productCategoryId: "",
    },
  });

  const shopNameValue = watch("ShopName");
  const selectedCatId = watch("productCategoryId");
  const provinceIdValue = watch("ProvinceId");

  const tenancyName = buildTenancyName(shopNameValue || "");

  // Mirrors pos_web's setDefaultProvince(): once the province list loads,
  // preselect "Hồ Chí Minh" if nothing has been chosen yet.
  useEffect(() => {
    if (provinceIdValue || !provinces.length) return
    const hoChiMinh = provinces.find(p => {
      const normalized = removeVietnameseTones(`${p?.Name ?? ''}`)
        .toLowerCase()
        .replace(/\./g, '')
        .replace(/\s+/g, ' ')
        .trim()
      return normalized === 'ho chi minh' || normalized === 'thanh pho ho chi minh' || normalized === 'tp ho chi minh'
    })
    if (hoChiMinh?.Id) setValue('ProvinceId', String(hoChiMinh.Id))
  }, [provinces, provinceIdValue, setValue])

  const onSubmit = async (values: RegisterForm) => {
    setServerError("");

    const shopName = values.ShopName.trim()
    const tenancyNameToSubmit = buildTenancyName(shopName)
    if (!tenancyNameToSubmit) {
      setServerError("Tên cửa hàng chưa hợp lệ")
      return
    }

    setStep(1); // move to "processing" step immediately

    try {
      const res = await register({
        Surname: DEFAULT_USERNAME,
        Name: shopName,
        TenantDisplayName: shopName,
        TenancyName: tenancyNameToSubmit,
        Email: values.Email.trim(),
        Phone: values.Phone?.trim() || undefined,
        UserName: DEFAULT_USERNAME,
        PasswordSalt: computePasswordSalt(DEFAULT_PASSWORD),
        ConfirmPasswordSalt: computePasswordSalt(DEFAULT_PASSWORD),
        ProvinceId: values.ProvinceId || null,
        productCategoryId: values.productCategoryId || null,
      }).unwrap();

      if (!res.Success) {
        const msg = res.Errors?.[0]?.Message || "Đăng ký thất bại";
        setServerError(msg);
        setStep(0);
        return;
      }

      // Server is authoritative on the actual domain name assigned (it may
      // differ from our client-computed slug, e.g. to dedupe collisions).
      const domainName = `${res.Data?.DomainName ?? ''}`.trim() || tenancyNameToSubmit;

      // Auto-login as the freshly created tenant admin so the init-data call
      // below (and the rest of the app) runs under the correct auth context
      // — pos_web does the equivalent via processLogin() before init-data.
      setUser(res.Data);
      setStoredDomainName(domainName);

      try {
        await initShopData().unwrap();
      } catch {
        // Non-critical — continue even if init-data fails
      }

      await Promise.allSettled([
        getMe().then(({ data: meData }) => {
          if (meData?.User) setUserInfo(meData.User as any);
        }),
        getMenu().then(({ data: menuData }) => {
          if (menuData) dispatch(setMenu(menuData));
        }),
      ]);

      setRegisteredShopName(shopName);
      setRegisteredDomain(domainName);
      setStep(2);
    } catch (err: any) {
      const msg =
        typeof err === "string" ? err : err?.message || "Đăng ký thất bại, vui lòng thử lại";
      setServerError(msg);
      setStep(0);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-6 sm:py-10">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-4 sm:mb-6">
          <Store className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-primary">POS Mobile</span>
        </div>

        <div className="rounded-xl border bg-card p-5 sm:p-6 shadow-sm">
          <Stepper current={step} />

          {/* ── Step 0: Info form ───────────────────────────────────────── */}
          {step === 0 && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Đăng ký cửa hàng</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Điền thông tin để tạo tài khoản POS miễn phí
                </p>
              </div>

              {/* Shop name */}
              <div className="space-y-1.5">
                <Label htmlFor="shop-name">Tên cửa hàng *</Label>
                <Input
                  id="shop-name"
                  placeholder="Tên cửa hàng"
                  {...formRegister("ShopName", {
                    required: "Vui lòng nhập tên cửa hàng",
                  })}
                  className={errors.ShopName ? "border-destructive" : ""}
                />
                {tenancyName && (
                  <p className="text-xs text-muted-foreground">
                    Tên miền: <span className="font-mono text-foreground">{tenancyName}</span>
                  </p>
                )}
                {errors.ShopName && (
                  <p className="text-xs text-destructive">{errors.ShopName.message}</p>
                )}
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    {...formRegister("Email", {
                      required: "Vui lòng nhập email",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Email không hợp lệ",
                      },
                    })}
                    className={errors.Email ? "border-destructive" : ""}
                  />
                  {errors.Email && (
                    <p className="text-xs text-destructive">{errors.Email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Điện thoại"
                    autoComplete="tel"
                    {...formRegister("Phone")}
                  />
                </div>
              </div>

              {/* Province */}
              <div className="space-y-1.5">
                <Label>Tỉnh / Thành phố</Label>
                <Controller
                  name="ProvinceId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn tỉnh / thành phố" />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces.map((p) => (
                          <SelectItem key={p.Id} value={String(p.Id)}>
                            {p.Name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Product category */}
              {productCategories.length > 0 && (
                <div className="space-y-2">
                  <Label>Ngành hàng kinh doanh</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {productCategories.map((cat) => (
                      <button
                        key={cat.Id}
                        type="button"
                        onClick={() => {
                          const input = document.querySelector<HTMLInputElement>(
                            `input[name="productCategoryId"][value="${cat.Id}"]`
                          );
                          input?.click();
                        }}
                        className={`rounded-lg border px-3 py-2.5 text-sm text-left transition-colors ${
                          selectedCatId === String(cat.Id)
                            ? "border-primary bg-primary/5 text-primary font-medium"
                            : "border-border hover:border-primary/50 text-foreground"
                        }`}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          value={cat.Id}
                          {...formRegister("productCategoryId")}
                        />
                        {cat.Name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {serverError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                  {serverError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Tạo tài khoản
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Đã có tài khoản?{" "}
                <a
                  href="/login"
                  className="text-primary font-medium hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/login");
                  }}
                >
                  Đăng nhập
                </a>
              </p>
            </form>
          )}

          {/* ── Step 1: Processing ──────────────────────────────────────── */}
          {step === 1 && (
            <div className="py-12 text-center space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
              <p className="text-foreground font-medium">Đang tạo cửa hàng...</p>
              <p className="text-muted-foreground text-sm">
                Vui lòng chờ trong giây lát
              </p>
            </div>
          )}

          {/* ── Step 2: Success ──────────────────────────────────────────── */}
          {step === 2 && (
            <div className="py-8 text-center space-y-5">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Đăng ký thành công! 🎉
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Cửa hàng{" "}
                  <span className="font-semibold text-foreground">{registeredShopName}</span>{" "}
                  đã sẵn sàng để truy cập
                </p>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 text-left space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Thông tin đăng nhập:
                </p>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>
                    Tên miền:{" "}
                    <span className="font-mono text-foreground font-medium">
                      {registeredDomain}
                    </span>
                  </p>
                  <p>
                    Tài khoản đăng nhập:{" "}
                    <span className="font-mono text-foreground font-medium">{DEFAULT_USERNAME}</span>
                  </p>
                  <p>
                    Mật khẩu mặc định:{" "}
                    <span className="font-mono text-foreground font-medium">{DEFAULT_PASSWORD}</span>
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    ⚠️ Hãy lưu lại tên miền và mật khẩu để đăng nhập lần sau
                  </p>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => navigate(withDomainPath("/dashboard", registeredDomain), { replace: true })}
              >
                Vào cửa hàng ngay
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

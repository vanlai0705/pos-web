import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { ArrowRight, Check, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useRegisterMutation,
  useInitShopDataMutation,
  useGetProvincesQuery,
  useGetProductCategoriesQuery,
} from "@/store/slice/users/api/api";
import { computePasswordSalt } from "@/utils/crypto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTenancyName(shopName: string): string {
  const map: Record<string, string> = {
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
  };
  return shopName
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 32);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegisterForm {
  ShopName: string;
  Email: string;
  Phone: string;
  ProvinceId: string;
  productCategoryId: string;
  Password: string;
  ConfirmPassword: string;
}

// ─── Stepper component ─────────────────────────────────────────────────────────

const STEPS = ["Thông tin cửa hàng", "Xác nhận", "Hoàn thành"];

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
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
            className={`hidden sm:block text-xs ${
              i === current ? "text-foreground font-medium" : "text-muted-foreground"
            }`}
          >
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className={`flex-1 h-px mx-2 ${
                i < current ? "bg-primary" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState("");
  const [registeredDomain, setRegisteredDomain] = useState("");

  const [register, { isLoading: isRegistering }] = useRegisterMutation();
  const [initShopData, { isLoading: isIniting }] = useInitShopDataMutation();
  const { data: provinces = [] } = useGetProvincesQuery();
  const { data: productCategories = [] } = useGetProductCategoriesQuery();

  const isSubmitting = isRegistering || isIniting;

  const {
    register: formRegister,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    defaultValues: {
      ShopName: "",
      Email: "",
      Phone: "",
      ProvinceId: "",
      productCategoryId: "",
      Password: "",
      ConfirmPassword: "",
    },
  });

  const shopNameValue = watch("ShopName");
  const passwordValue = watch("Password");
  const selectedCatId = watch("productCategoryId");

  const tenancyName = buildTenancyName(shopNameValue || "");

  const onSubmit = async (values: RegisterForm) => {
    setServerError("");
    setStep(1); // move to "processing" step immediately

    try {
      const res = await register({
        ShopName: values.ShopName,
        Name: values.ShopName,
        TenantDisplayName: values.ShopName,
        TenancyName: tenancyName,
        Surname: values.ShopName,
        Email: values.Email.trim(),
        Phone: values.Phone?.trim() || undefined,
        UserName: "admin",
        PasswordSalt: computePasswordSalt(values.Password),
        ConfirmPasswordSalt: computePasswordSalt(values.ConfirmPassword),
        ProvinceId: values.ProvinceId || null,
        productCategoryId: values.productCategoryId || null,
      }).unwrap();

      if (!res.Success) {
        const msg = res.Errors?.[0]?.Message || "Đăng ký thất bại";
        setServerError(msg);
        setStep(0);
        return;
      }

      // Initialize shop data
      try {
        await initShopData().unwrap();
      } catch {
        // Non-critical — continue even if init-data fails
      }

      setRegisteredDomain(tenancyName);
      setStep(2);
    } catch (err: any) {
      const msg =
        typeof err === "string" ? err : err?.message || "Đăng ký thất bại, vui lòng thử lại";
      setServerError(msg);
      setStep(0);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Store className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-primary">POS Mobile</span>
        </div>

        <div className="rounded-xl border bg-card p-6 sm:p-8 shadow-sm">
          <Stepper current={step} />

          {/* ── Step 0: Info form ───────────────────────────────────────── */}
          {step === 0 && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                  placeholder="vd: Cửa hàng Minh Anh"
                  {...formRegister("ShopName", {
                    required: "Vui lòng nhập tên cửa hàng",
                  })}
                  className={errors.ShopName ? "border-destructive" : ""}
                />
                {tenancyName && (
                  <p className="text-xs text-muted-foreground">
                    Tên miền:{" "}
                    <span className="font-mono text-foreground">
                      {tenancyName}.posmobile.vn
                    </span>
                  </p>
                )}
                {errors.ShopName && (
                  <p className="text-xs text-destructive">{errors.ShopName.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
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

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0901234567"
                  autoComplete="tel"
                  {...formRegister("Phone")}
                />
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
                        <SelectValue placeholder="Chọn tỉnh thành" />
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
                  <div className="grid grid-cols-2 gap-2">
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

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Mật khẩu *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mật khẩu đăng nhập"
                  autoComplete="new-password"
                  {...formRegister("Password", {
                    required: "Vui lòng nhập mật khẩu",
                    minLength: {
                      value: 6,
                      message: "Mật khẩu tối thiểu 6 ký tự",
                    },
                  })}
                  className={errors.Password ? "border-destructive" : ""}
                />
                {errors.Password && (
                  <p className="text-xs text-destructive">{errors.Password.message}</p>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Xác nhận mật khẩu *</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
                  {...formRegister("ConfirmPassword", {
                    required: "Vui lòng xác nhận mật khẩu",
                    validate: (v) =>
                      v === passwordValue || "Mật khẩu không khớp",
                  })}
                  className={errors.ConfirmPassword ? "border-destructive" : ""}
                />
                {errors.ConfirmPassword && (
                  <p className="text-xs text-destructive">
                    {errors.ConfirmPassword.message}
                  </p>
                )}
              </div>

              {serverError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                  {serverError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Tiếp theo
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
                  Cửa hàng của bạn đã được tạo
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
                      {registeredDomain}.posmobile.vn
                    </span>
                  </p>
                  <p>
                    Tài khoản quản trị:{" "}
                    <span className="font-mono text-foreground font-medium">admin</span>
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    ⚠️ Hãy lưu lại tên miền để đăng nhập lần sau
                  </p>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() =>
                  navigate("/login", {
                    state: {
                      message: `Đăng ký thành công! Tên miền: ${registeredDomain}. Tài khoản: admin`,
                    },
                  })
                }
              >
                Đăng nhập ngay
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

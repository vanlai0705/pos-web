import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from '@/components/ui/label'
import { useRenewPasswordMutation } from '@/store/slice/auth/api'
import { computePasswordSalt } from "@/utils/crypto"
import { Eye, EyeOff, Store } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
interface RenewForm {
  Password: string;
  ConfirmPassword: string;
}

export default function RenewPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [renewPassword, { isLoading }] = useRenewPasswordMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RenewForm>();

  const passwordValue = watch("Password");

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-xl font-bold text-foreground">Link không hợp lệ</h2>
          <p className="text-muted-foreground text-sm">
            Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
          </p>
          <Button onClick={() => navigate("/forgot-password")} className="w-full">
            Gửi lại yêu cầu
          </Button>
        </div>
      </div>
    );
  }

  const onSubmit = async (values: RenewForm) => {
    setServerError("");
    try {
      const res = await renewPassword({
        PasswordSalt: computePasswordSalt(values.Password),
        Token: token,
      }).unwrap();

      if (res.Success) {
        toast.success("Đặt lại mật khẩu thành công!");
        navigate("/login", {
          state: { message: "Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại." },
        });
      } else {
        const msg =
          res.Errors?.[0]?.Message || "Có lỗi xảy ra, vui lòng thử lại";
        setServerError(msg);
      }
    } catch (err: any) {
      const msg =
        typeof err === "string" ? err : err?.message || "Có lỗi xảy ra, vui lòng thử lại";
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Store className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Đặt lại mật khẩu</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tạo mật khẩu mới cho tài khoản của bạn
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* New password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">Mật khẩu mới</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu mới"
                autoComplete="new-password"
                {...register("Password", {
                  required: "Vui lòng nhập mật khẩu mới",
                  minLength: {
                    value: 6,
                    message: "Mật khẩu phải có ít nhất 6 ký tự",
                  },
                })}
                className={errors.Password ? "border-destructive pr-10" : "pr-10"}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.Password && (
              <p className="text-xs text-destructive">{errors.Password.message}</p>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
                {...register("ConfirmPassword", {
                  required: "Vui lòng xác nhận mật khẩu",
                  validate: (v) =>
                    v === passwordValue || "Mật khẩu xác nhận không khớp",
                })}
                className={
                  errors.ConfirmPassword ? "border-destructive pr-10" : "pr-10"
                }
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Đang xử lý..." : "Xác nhận đặt lại mật khẩu"}
          </Button>
        </form>
      </div>
    </div>
  );
}

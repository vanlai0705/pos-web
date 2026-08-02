import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ArrowLeft, Store } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPasswordMutation } from "@/store/slice/users/api/api";

interface ForgotForm {
  MemberInfo: string;
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [serverError, setServerError] = useState("");
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>();

  const onSubmit = async (values: ForgotForm) => {
    setServerError("");
    try {
      const res = await forgotPassword({
        MemberInfo: values.MemberInfo.trim(),
      }).unwrap();

      if (res.Success) {
        setSent(true);
        toast.success("Yêu cầu đặt lại mật khẩu đã được gửi!");
      } else {
        const msg = res.Errors?.[0]?.Message || "Có lỗi xảy ra, vui lòng thử lại";
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
          <h1 className="text-2xl font-bold text-foreground">Quên mật khẩu</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Nhập email, số điện thoại hoặc tên đăng nhập để nhận link đặt lại
            mật khẩu
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg border bg-card p-6 text-center space-y-4">
            <div className="text-4xl">📧</div>
            <p className="text-foreground font-medium">Kiểm tra email của bạn</p>
            <p className="text-muted-foreground text-sm">
              Chúng tôi đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra hộp
              thư đến (và thư mục spam).
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại đăng nhập
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="member-info">Email / Số điện thoại / Tên đăng nhập</Label>
              <Input
                id="member-info"
                placeholder="Nhập thông tin tài khoản"
                autoComplete="email"
                {...register("MemberInfo", {
                  required: "Vui lòng nhập thông tin tài khoản",
                })}
                className={errors.MemberInfo ? "border-destructive" : ""}
              />
              {errors.MemberInfo && (
                <p className="text-xs text-destructive">
                  {errors.MemberInfo.message}
                </p>
              )}
            </div>

            {serverError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Đang gửi..." : "Gửi yêu cầu"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại đăng nhập
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from '@/components/ui/label'
import { useSelfChangePasswordMutation } from '@/store/slice/registration-users/api'
import { cn } from "@/utils"
import { computePasswordSalt } from "@/utils/crypto"
import { Eye, EyeOff, Lock } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="pl-9 pr-9"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function ChangePasswordForm({ className }: { className?: string }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePassword, { isLoading }] = useSelfChangePasswordMutation();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      await changePassword({
        PasswordSaltOld: computePasswordSalt(oldPassword),
        PasswordSaltNew: computePasswordSalt(newPassword),
      }).unwrap();
      toast.success("Đổi mật khẩu thành công");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.data?.Errors?.[0]?.Message || err?.message || "Đổi mật khẩu thất bại");
    }
  };

  return (
    <form onSubmit={onSubmit} className={cn("space-y-4", className)}>
      <PasswordField
        id="old_password"
        label="Mật khẩu hiện tại"
        value={oldPassword}
        onChange={setOldPassword}
        autoComplete="current-password"
      />
      <PasswordField
        id="new_password"
        label="Mật khẩu mới"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
      />
      <PasswordField
        id="confirm_password"
        label="Xác nhận mật khẩu mới"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
      />
      <div className="flex justify-end pt-2">
        <Button type="submit" loading={isLoading} disabled={isLoading}>
          Đổi mật khẩu
        </Button>
      </div>
    </form>
  );
}

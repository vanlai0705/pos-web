import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useChangePasswordV1Mutation } from "@/store/slice/users";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [
    changePassword,
    { isLoading, isSuccess, isError, error: changePasswordError }
  ] = useChangePasswordV1Mutation();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    changePassword({ old_password: oldPassword, new_password: newPassword, confirm_password: confirmPassword });
  };

  useEffect(() => {
    if (!isSuccess) return;
    toast.success("Đổi mật khẩu thành công");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, [isSuccess]);

  useEffect(() => {
    if (!isError) return;
    const message =
      (changePasswordError as any)?.data?.return_message ||
      (changePasswordError as any)?.data?.message ||
      (changePasswordError as any)?.message ||
      "Đổi mật khẩu thất bại";
    toast.error(message);
  }, [isError, changePasswordError]);

  return (
    <div className="min-h-screentext-white bg-card p-4">
      <h2 className="text-2xl font-bold mb-4">Đổi mật khẩu</h2>
      <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
        <div className="space-y-2">
          <Label htmlFor="old_password">Mật khẩu hiện tại</Label>
          <Input id="old_password" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new_password">Mật khẩu mới</Label>
          <Input id="new_password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm_password">Xác nhận mật khẩu mới</Label>
          <Input id="confirm_password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        <div className="pt-2">
          <Button type="submit" loading={isLoading} disabled={isLoading}>Đổi mật khẩu</Button>
        </div>
      </form>
    </div>
  );
}



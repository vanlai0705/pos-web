'use client'

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TUserProfileData, useGetUserProfileQuery, useUpdateUserProfileMutation, useUploadAvatarMutation } from "@/store/slice/users";
import dayjs from "dayjs";
import { Camera, ChevronDownIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getImageUrl } from "@/utils/common";


export default function ProfilePage() {
  const { data: user, isLoading } = useGetUserProfileQuery();
  const [
    updateProfile,
    { isLoading: isUpdating, isSuccess: isUpdateSuccess, isError: isUpdateError, error: updateError }
  ] = useUpdateUserProfileMutation();
  const [
    uploadAvatar,
    { isError: isUploadError, error: uploadError }
  ] = useUploadAvatarMutation();
  const [open, setOpen] = useState(false)

  const profile = user?.data;
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [userInfo, setUserInfo] = useState<Partial<TUserProfileData> | null>(null);

  useEffect(() => {
    if (profile) {
      setUserInfo(profile);
    }
  }, [profile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        uploadAvatar({ file });

      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = () => {
    const { name, email, phone, department, avatar, id_card_issue_place, id_card_number, date_of_birth } = userInfo || {};
    updateProfile({ name, email, phone, department, avatar, id_card_issue_place, id_card_number, date_of_birth: dayjs(date_of_birth?.time).format('YYYY-MM-DD') });
  };

  useEffect(() => {
    if (!isUploadError) return;
    const message =
      (uploadError as any)?.data?.return_message ||
      (uploadError as any)?.data?.message ||
      (uploadError as any)?.message ||
      "Upload avatar thất bại";
    setAvatarPreview(null);
    toast.error(message);
  }, [isUploadError, uploadError]);

  useEffect(() => {
    if (isUpdateSuccess) {
      toast.success("Cập nhật hồ sơ thành công");
    }
  }, [isUpdateSuccess]);

  useEffect(() => {
    if (!isUpdateError) return;
    const message =
      (updateError as any)?.data?.return_message ||
      (updateError as any)?.data?.message ||
      (updateError as any)?.message ||
      "Cập nhật thất bại";
    toast.error(message);
  }, [isUpdateError, updateError])


  const onChangeUserInfo = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInfo(prev => ({
      ...(prev || {}),
      [e.target.name]: e.target.value,
    }));
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-card">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-balance mb-2">
            Thông tin cá nhân
          </h1>
          <div className="h-1 w-50 bg-gradient-to-r from-primary to-accent rounded-full"></div>
        </div>

        {userInfo && <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-2xl p-8 sticky top-8">
              <div className="flex flex-col items-center mb-8">
                <div className="relative w-32 h-32 mb-6 group cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl opacity-20 blur-lg"></div>
                  <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-primary/30 bg-muted">
                    <img
                      src={avatarPreview || `${getImageUrl(userInfo.avatar_url)}`}
                      alt={userInfo.name}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        img.src = '/admin-avatar.png'
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl"
                      aria-label="Change avatar"
                    >
                      <Camera className="w-8 h-8 text-white" />
                    </button>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    aria-label="Upload avatar"
                    ref={fileInputRef}
                  />
                </div>
                <h2 className="text-2xl font-bold text-center mb-1">{userInfo.name}</h2>
                <div className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 text-primary rounded-full text-sm font-semibold mb-6">
                  {userInfo.role ? (userInfo.role.charAt(0).toUpperCase() + userInfo.role.slice(1)) : ''}
                </div>
                <div className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 text-primary rounded-full text-sm font-semibold mb-6">
                  Tên đăng nhập: {userInfo?.user_name}
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Họ tên</label>
                  <Input id="name" name="name" value={userInfo.name ?? ''} onChange={onChangeUserInfo} disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
                  <Input id="email" name="email" value={userInfo.email ?? ''} onChange={onChangeUserInfo} disabled={isLoading} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Số điện thoại</label>
                  <Input id="phone" name="phone" value={userInfo.phone ?? ''} onChange={onChangeUserInfo} disabled={isLoading} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phòng ban</label>
                  <Input id="department" name="department" value={userInfo.department ?? ''} onChange={onChangeUserInfo} disabled={isLoading} />
                </div>

                <div className="space-y-2 flex-col">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ngày sinh</label>
                  <div>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          id="date"
                          className="w-48 justify-between font-normal"
                        >
                          {dayjs(userInfo?.date_of_birth?.time).format('DD/MM/YYYY')}
                          <ChevronDownIcon />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="overflow-hidden p-0" align="start">
                        <Calendar
                          mode="single"
                          className="w-auto"
                          selected={userInfo?.date_of_birth?.time ? dayjs(userInfo.date_of_birth.time).toDate() : undefined}
                          onSelect={(date: Date | undefined) => {
                            if (!date) return;
                            setUserInfo({
                              ...userInfo,
                              date_of_birth: {
                                ...userInfo.date_of_birth,
                                time: date
                              }
                            });
                            setOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">CCCD</label>
                  <Input id="id_card_number" name="id_card_number" value={userInfo.id_card_number ?? ''} onChange={onChangeUserInfo} disabled={isLoading} />

                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID Issued Place</label>
                  <Input id="id_card_issue_place" name="id_card_issue_place" value={userInfo.id_card_issue_place ?? ''} onChange={onChangeUserInfo} disabled={isLoading} />
                </div>
              </div>
              <div className="flex items-center justify-center mt-6">
                <Button type="submit" onClick={onSubmit} loading={isUpdating} disabled={isUpdating}>Lưu thay đổi</Button>
              </div>
            </div>
          </div>
        </div>}
      </div>
    </main>
  )
}

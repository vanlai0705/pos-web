import type { TPosMember } from "@/store/slice/users/types/pos-types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from '@/hooks/useAuth'
import { useGetMemberDetailQuery } from '@/store/slice/human-resources/api'
import { useSelfUpdateProfileMutation } from '@/store/slice/registration-users/api'
import { getImageUrl } from "@/utils/common"
import { Camera, KeyRound, UserRound } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { ChangePasswordForm } from "./change-password-form"
function getInitials(name?: string): string {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function emptyForm(): TPosMember {
  return { Name: "", Phone: "", Email: "", UserProfile: { Address: "" } };
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const selfId = user.data?.User?.Id;

  const { data: member, isLoading } = useGetMemberDetailQuery(selfId!, { skip: !selfId });
  const [selfUpdate, { isLoading: isSaving }] = useSelfUpdateProfileMutation();

  const [form, setForm] = useState<TPosMember>(emptyForm());
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (member) setForm(member);
  }, [member]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const onChangeField = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "Address") {
      setForm((prev) => ({ ...prev, UserProfile: { ...prev.UserProfile, Address: value } }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const onSubmit = async () => {
    if (!form.Name?.trim()) {
      toast.error(t("profile.requiredFullName"));
      return;
    }
    try {
      // Send the full loaded record back (Shops/Status/UserInfo work-schedule
      // included) — self-update replaces the whole record, so submitting only
      // the edited fields would wipe the rest. `Image` is excluded: the new
      // avatar goes in as its own multipart file part, matching pos_web's
      // real self-update request.
      const { Image: _image, ...model } = form;
      const saved = await selfUpdate({
        model,
        file: avatarFile,
      }).unwrap();

      toast.success(t("profile.updateSuccess"));
      setForm((prev) => ({ ...prev, ...saved }));
      setAvatarFile(null);
      setAvatarPreview(null);

      if (user.data) {
        setUser({
          ...user.data,
          User: { ...user.data.User, Name: saved.Name ?? form.Name, FullName: saved.FullName ?? form.Name, Email: saved.Email ?? form.Email },
        });
      }
    } catch (err: any) {
      toast.error(err?.data?.Errors?.[0]?.Message || err?.message || t("profile.updateFailed"));
    }
  };

  const avatarUrl = avatarPreview || getImageUrl(form.Image?.Url);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
        <h1 className="text-xl font-semibold">{t("profile.personalInfo")}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-6 py-4">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
                <UserRound className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-semibold">{t("profile.profile")}</h2>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Avatar className="h-16 w-16 ring-2 ring-primary/20 ring-offset-2 ring-offset-card">
                    <AvatarImage src={avatarUrl} alt={form.Name} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                      {getInitials(form.Name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    aria-label={t("profile.uploadAvatar")}
                    ref={fileInputRef}
                  />
                </div>
                <div>
                  <div className="font-medium">{form.Name || "—"}</div>
                  {form.Email && <div className="text-sm text-muted-foreground">{form.Email}</div>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("common.fullName")}</label>
                  <Input name="Name" value={form.Name ?? ""} onChange={onChangeField} disabled={isLoading} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("common.email")}</label>
                  <Input name="Email" value={form.Email ?? ""} onChange={onChangeField} disabled={isLoading} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("common.phone")}</label>
                  <Input name="Phone" value={form.Phone ?? ""} onChange={onChangeField} disabled={isLoading} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("common.address")}</label>
                  <Input name="Address" value={form.UserProfile?.Address ?? ""} onChange={onChangeField} disabled={isLoading} />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button type="button" onClick={onSubmit} loading={isSaving} disabled={isSaving}>
                  {t("common.saveChanges")}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-6 py-4">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
                <KeyRound className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-semibold">{t("common.changePassword")}</h2>
            </div>
            <div className="p-6">
              <ChangePasswordForm />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

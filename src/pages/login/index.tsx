import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoginMutation, useLazyGetMeQuery, useLazyGetMenuQuery } from "@/store/slice/users/api/api";
import { useAuth } from "@/hooks/useAuth";
import { useAppDispatch } from "@/store/hooks";
import { setMenu } from "@/store/slice/users/app";
import { computePasswordSalt } from "@/utils/crypto";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

const DOMAIN_KEY = "activeDomainName";

interface LoginForm {
  DomainName: string;
  UserName: string;
  Password: string;
}

function normalizeDomainName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9-]/g, "");
}

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { setUser, setUserInfo } = useAuth();
  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [getMe] = useLazyGetMeQuery();
  const [getMenu] = useLazyGetMenuQuery();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const stateMessage = (location.state as any)?.message ?? "";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: { DomainName: "", UserName: "", Password: "" },
  });

  useEffect(() => {
    const saved = localStorage.getItem(DOMAIN_KEY);
    if (saved) setValue("DomainName", saved);
  }, [setValue]);

  const domainValue = watch("DomainName");

  const onSubmit = async (values: LoginForm) => {
    setServerError("");
    const domain = normalizeDomainName(values.DomainName);
    if (!domain) {
      setServerError(t("auth.emptyDomain"));
      return;
    }

    localStorage.setItem(DOMAIN_KEY, domain);

    try {
      const loginData = await login({
        DomainName: domain,
        UserName: values.UserName.trim(),
        PasswordSalt: computePasswordSalt(values.Password),
      }).unwrap();

      setUser(loginData);

      await Promise.allSettled([
        getMe().then(({ data: meData }) => {
          if (meData?.User) setUserInfo(meData.User as any);
        }),
        getMenu().then(({ data: menuData }) => {
          if (menuData) dispatch(setMenu(menuData));
        }),
      ]);

      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      const msg =
        typeof err === "string"
          ? err
          : err?.message || t("auth.loginFailed");
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ─── Left: form ─────────────────────────────────────────── */}
      <div className="flex flex-col justify-center w-full max-w-md px-8 py-12 lg:px-12 bg-background">
        {/* Language switcher top-right */}
        <div className="absolute top-4 right-4 flex items-center">
          <LanguageSwitcherPlain />
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Store className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-primary">POS Mobile</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("auth.loginTitle")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("auth.loginSubtitle")}</p>
        </div>

        {stateMessage && (
          <div className="mb-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400">
            {stateMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Domain */}
          <div className="space-y-1.5">
            <Label htmlFor="domain">{t("auth.shopDomain")}</Label>
            <div className="relative">
              <Input
                id="domain"
                placeholder={t("auth.domainPlaceholder")}
                autoComplete="organization"
                {...register("DomainName", { required: t("auth.requiredDomain") })}
                className={errors.DomainName ? "border-destructive" : ""}
              />
              {domainValue && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  .posmobile.vn
                </span>
              )}
            </div>
            {errors.DomainName && (
              <p className="text-xs text-destructive">{errors.DomainName.message}</p>
            )}
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username">{t("auth.username")}</Label>
            <Input
              id="username"
              placeholder={t("auth.usernamePlaceholder")}
              autoComplete="username"
              {...register("UserName", { required: t("auth.requiredUsername") })}
              className={errors.UserName ? "border-destructive" : ""}
            />
            {errors.UserName && (
              <p className="text-xs text-destructive">{errors.UserName.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => navigate("/forgot-password")}
              >
                {t("auth.forgotPassword")}
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.passwordPlaceholder")}
                autoComplete="current-password"
                {...register("Password", { required: t("auth.requiredPassword") })}
                className={errors.Password ? "border-destructive pr-10" : "pr-10"}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.Password && (
              <p className="text-xs text-destructive">{errors.Password.message}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoggingIn}>
            {isLoggingIn ? t("auth.loggingIn") : t("auth.login")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <button
            className="text-primary font-medium hover:underline"
            onClick={() => navigate("/register")}
          >
            {t("auth.registerFree")}
          </button>
        </p>
      </div>

      {/* ─── Right: branding ──────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-primary/5 border-l">
        <div className="text-center max-w-sm px-8">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <Store className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            {t("auth.brandingTitle")}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t("auth.brandingSubtitle")}
          </p>
        </div>
      </div>
    </div>
  );
}

// Standalone language switcher for the login page (no parent text-white override)
function LanguageSwitcherPlain() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const LANGUAGES = [
    { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
    { code: "km", label: "ភាសាខ្មែរ", flag: "🇰🇭" },
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "zh", label: "中文", flag: "🇨🇳" },
  ] as const;

  const current = LANGUAGES.find(l => l.code === (i18n.resolvedLanguage ?? i18n.language)) ?? LANGUAGES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        title={current.label}
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span>{current.label}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[170px] rounded-xl border border-slate-200 bg-white shadow-xl py-1 overflow-hidden">
            {LANGUAGES.map(lang => {
              const active = i18n.language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:bg-slate-50"
                  style={{ color: active ? "#2563eb" : "#374151", fontWeight: active ? 600 : 400 }}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span>{lang.label}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

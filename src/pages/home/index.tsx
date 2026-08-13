import { useGetAppCountInfoQuery, useGetFunctionGroupsQuery, useGetSystemInfoQuery, useCreateSupportWebMutation } from '@/store/slice/dashboard/api'
import { useAuth } from '@/hooks/useAuth'
import { translateMenuTitle } from '@/i18n/nav-title-map'
import { TPosSupportWebRequest } from '@/store/slice/users'
import { withDomainPath } from '@/utils/domain-route'
import { BarChart3, Boxes, CheckCircle2, Headphones, ReceiptText, ShieldCheck, ShoppingCart, Store } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

const initialContact: TPosSupportWebRequest = {
  Name: "",
  Email: "",
  PhoneNumber: "",
  Description: "",
}

const highlights = [
  { titleKey: "home.fastSales", detailKey: "home.fastSalesDesc", icon: ShoppingCart },
  { titleKey: "home.accurateStock", detailKey: "home.accurateStockDesc", icon: Boxes },
  { titleKey: "home.instantReports", detailKey: "home.instantReportsDesc", icon: BarChart3 },
]

const workflows = [
  "home.workflowProducts",
  "home.workflowCustomers",
  "home.workflowFinance",
  "home.workflowReports",
]

export default function HomePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: systemInfo } = useGetSystemInfoQuery()
  const { data: appCountInfo } = useGetAppCountInfoQuery()
  const { data: functionGroups } = useGetFunctionGroupsQuery()
  const [createSupport, { isLoading }] = useCreateSupportWebMutation()
  const [contact, setContact] = useState<TPosSupportWebRequest>(initialContact)

  useEffect(() => {
    if (user.data?.SessionToken) navigate(withDomainPath("/dashboard", user.data.DomainName), { replace: true })
  }, [navigate, user.data?.DomainName, user.data?.SessionToken])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousOverflowX = document.body.style.overflowX
    const previousOverflowY = document.body.style.overflowY
    document.body.style.overflow = "auto"
    document.body.style.overflowX = "hidden"
    document.body.style.overflowY = "auto"

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overflowX = previousOverflowX
      document.body.style.overflowY = previousOverflowY
    }
  }, [])

  function setField<K extends keyof TPosSupportWebRequest>(key: K, value: TPosSupportWebRequest[K]) {
    setContact(current => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await createSupport(contact).unwrap()
    toast.success(t("home.supportSuccess"))
    setContact(initialContact)
  }

  const groups = functionGroups?.filter(group => group.Functions?.length).slice(0, 6) ?? []

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-950">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/15 bg-slate-950/80 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-400 font-black text-slate-950">P</span>
            <span className="text-lg font-black tracking-wide">POS MOBILE</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-200 md:flex">
            <a href="#features" className="hover:text-emerald-300">{t("home.navFeatures")}</a>
            <a href="#modules" className="hover:text-emerald-300">{t("home.navModules")}</a>
            <a href="#contact" className="hover:text-emerald-300">{t("home.navContact")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white">
              {t("home.login")}
            </Link>
            <Link to="/register" className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300">
              {t("home.register")}
            </Link>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="relative min-h-[720px] overflow-hidden bg-slate-950 pt-16 text-white">
          <img src="/assets/generated/home-hero-pos.png" alt="POS Mobile checkout and inventory workspace" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/82 to-slate-950/10" />
          <div className="relative mx-auto grid min-h-[656px] max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="inline-flex items-center rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
                {t("home.badge")}
              </p>
              <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                {t("home.title")}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
                {t("home.subtitle")}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className="inline-flex h-12 items-center justify-center rounded-lg bg-emerald-400 px-6 text-sm font-black text-slate-950 shadow-lg shadow-emerald-400/25 hover:bg-emerald-300">
                  {t("home.startTrial")}
                </Link>
                <Link to="/login" className="inline-flex h-12 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-6 text-sm font-bold text-white hover:bg-white/15">
                  {t("home.enterSystem")}
                </Link>
              </div>
              <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
                <Metric value={appCountInfo?.ShowCount ?? 0} label={t("home.stores")} />
                <Metric value={appCountInfo?.MemberCount ?? 0} label={t("home.members")} />
                <Metric value={appCountInfo?.ShowManagerCount ?? 0} label={t("home.managers")} />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle eyebrow={t("home.strengths")} title={t("home.featureTitle")} />
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {highlights.map(item => (
                <article key={item.titleKey} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <item.icon className="h-8 w-8 text-emerald-600" />
                  <h3 className="mt-5 text-lg font-black">{t(item.titleKey)}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{t(item.detailKey)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <SectionTitle eyebrow={t("home.operations")} title={t("home.operationsTitle")} align="left" />
              <div className="mt-8 grid gap-3">
                {workflows.map(item => (
                  <div key={item} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
                    <span className="text-sm font-semibold text-slate-700">{t(item)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">{t("home.liveOverview")}</p>
                  <h3 className="mt-2 text-2xl font-black">{t("home.dashboardPreview")}</h3>
                </div>
                <ShieldCheck className="h-9 w-9 text-emerald-300" />
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <PreviewCard label={t("home.revenue")} value="128.5M" />
                <PreviewCard label={t("common.order")} value="842" />
                <PreviewCard label={t("home.lowStock")} value="18" />
                <PreviewCard label={t("home.debt")} value="36.2M" />
              </div>
              <div className="mt-6 h-28 rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.2),rgba(14,165,233,0.14))] p-4">
                <div className="flex h-full items-end gap-2">
                  {[32, 54, 38, 72, 58, 86, 64, 92, 76, 96].map((height, index) => (
                    <span key={index} className="flex-1 rounded-t bg-emerald-300/80" style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="modules" className="bg-slate-100 py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle eyebrow={t("home.module")} title={t("home.moduleTitle")} />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(groups.length ? groups : fallbackGroups).map(group => (
                <article key={group.Name} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-black">{translateMenuTitle(group.Name, t)}</h3>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(group.Functions ?? []).slice(0, 6).map(item => (
                      <span key={item.Name} className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                        {item.Name}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="bg-slate-950 py-16 text-white lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">{t("home.navContact")}</p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">{t("home.contactTitle")}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                {t("home.contactDesc")}
              </p>
              <div className="mt-8 grid gap-3">
                <InfoRow icon={Headphones} label={t("common.phone")} value={systemInfo?.SystemPhone || "-"} />
                <InfoRow icon={ReceiptText} label={t("common.email")} value={systemInfo?.SystemEmail || "-"} />
                <InfoRow icon={Store} label={t("common.address")} value={systemInfo?.SystemAddress || "-"} />
              </div>
            </div>
            <form onSubmit={onSubmit} className="rounded-lg border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="grid gap-4">
                <ContactInput value={contact.Name} onChange={value => setField("Name", value)} placeholder={t("home.namePlaceholder")} />
                <ContactInput value={contact.Email} onChange={value => setField("Email", value)} placeholder={t("home.emailPlaceholder")} type="email" />
                <ContactInput value={contact.PhoneNumber} onChange={value => setField("PhoneNumber", value)} placeholder={t("home.phonePlaceholder")} type="tel" />
                <textarea value={contact.Description} onChange={event => setField("Description", event.target.value)} rows={5} placeholder={t("home.messagePlaceholder")} className="w-full resize-none rounded-lg border border-white/15 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-emerald-300" />
                <button type="submit" disabled={isLoading} className="h-12 rounded-lg bg-emerald-400 text-sm font-black text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">
                  {isLoading ? t("home.sending") : t("home.send")}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}

const fallbackGroups = [
  { Name: "Bán hàng", Functions: [{ Name: "Tạo hóa đơn" }, { Name: "Quản lý đơn" }, { Name: "Báo giá" }] },
  { Name: "Kho", Functions: [{ Name: "Nhập kho" }, { Name: "Xuất kho" }, { Name: "Kiểm kê" }] },
  { Name: "Tài chính", Functions: [{ Name: "Thu chi" }, { Name: "Quỹ" }, { Name: "Công nợ" }] },
]

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 p-3">
      <p className="text-2xl font-black text-emerald-200">{value.toLocaleString("vi-VN")}</p>
      <p className="mt-1 text-xs font-semibold text-slate-300">{label}</p>
    </div>
  )
}

function SectionTitle({ eyebrow, title, align = "center" }: { eyebrow: string; title: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-xl"}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{title}</h2>
    </div>
  )
}

function PreviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-4">
      <p className="text-xs font-semibold text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function ContactInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-11 rounded-lg border border-white/15 bg-slate-900/70 px-4 text-sm text-white outline-none placeholder:text-slate-400 focus:border-emerald-300"
    />
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/10 p-4">
      <Icon className="h-5 w-5 flex-none text-emerald-300" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-bold text-white">{value}</p>
      </div>
    </div>
  )
}

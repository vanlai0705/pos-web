import { useMemo } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowDownRight,
  ArrowUpRight,
  Package,
  ReceiptText,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react"

import {
  useFilterOrdersQuery,
  useFilterRevenueStatisticsQuery,
  useGetProductGroupsSimpleQuery,
  useGetProductStatisticQuery,
  useGetSimpleChartQuery,
} from "@/store/slice/users/api/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/utils"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

/** `+07:00` date-range params every chart/statistic endpoint here expects. */
function toRangeParam(date: Date, end = false) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${end ? "23:59:59" : "00:00:00"}+07:00`
}

/** orders/filter-order is the odd one out — plain YYYY-MM-DD, no time/offset. */
function toDateOnly(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(date: Date, delta: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + delta)
  return next
}

function formatNumber(value = 0) {
  return Math.round(value).toLocaleString("vi-VN")
}

function formatShort(value = 0) {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}K`
  return formatNumber(value)
}

/** `null` means "no basis for comparison" (both days are zero) — hide the badge rather than claim 0%. */
function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? null : 100
  return ((curr - prev) / prev) * 100
}

// Same validated categorical palette as the old dashboard's profit chart —
// theme-aware CSS vars so the exact hues swap with light/dark.
const SERIES_COLORS = [
  "hsl(var(--series-1))",
  "hsl(var(--series-2))",
  "hsl(var(--series-3))",
  "hsl(var(--series-4))",
  "hsl(var(--series-5))",
]

export default function DashboardPage() {
  const today = new Date()
  const yesterday = addDays(today, -1)
  const todayFrom = toRangeParam(today, false)
  const todayTo = toRangeParam(today, true)
  const yestFrom = toRangeParam(yesterday, false)
  const yestTo = toRangeParam(yesterday, true)
  const weekStart = addDays(today, -6)
  const prevWeekStart = addDays(today, -13)
  const prevWeekEnd = addDays(today, -7)

  // ── Row 1: today's KPIs, each compared to yesterday ──────────────────────
  const { data: salesToday, isFetching: salesTodayLoading } = useGetSimpleChartQuery({ type: 0, DateFrom: todayFrom, DateTo: todayTo })
  const { data: salesYesterday } = useGetSimpleChartQuery({ type: 0, DateFrom: yestFrom, DateTo: yestTo })
  const { data: ordersToday, isFetching: ordersTodayLoading } = useGetSimpleChartQuery({ type: 1, DateFrom: todayFrom, DateTo: todayTo })
  const { data: ordersYesterday } = useGetSimpleChartQuery({ type: 1, DateFrom: yestFrom, DateTo: yestTo })
  const { data: customersToday, isFetching: customersTodayLoading } = useGetSimpleChartQuery({ type: 2, DateFrom: todayFrom, DateTo: todayTo })
  const { data: customersYesterday } = useGetSimpleChartQuery({ type: 2, DateFrom: yestFrom, DateTo: yestTo })

  const { data: productStatToday, isFetching: productStatTodayLoading } = useGetProductStatisticQuery({ PageIndex: 0, PageSize: 500, dateFrom: todayFrom, dateTo: todayTo })
  const { data: productStatYesterday } = useGetProductStatisticQuery({ PageIndex: 0, PageSize: 500, dateFrom: yestFrom, dateTo: yestTo })

  const todayItems = productStatToday?.Items ?? []
  const yesterdayItems = productStatYesterday?.Items ?? []
  const profitToday = todayItems.reduce((s, i) => s + (i.Profit ?? 0), 0)
  const profitYesterday = yesterdayItems.reduce((s, i) => s + (i.Profit ?? 0), 0)
  const qtyToday = todayItems.reduce((s, i) => s + (i.Quantity ?? 0), 0)
  const qtyYesterday = yesterdayItems.reduce((s, i) => s + (i.Quantity ?? 0), 0)

  // ── Row 2: 7-day trend + today-by-hour both come from one order list —
  // each order already carries its own timestamp, so both charts are just
  // different ways of bucketing the same rows. ─────────────────────────────
  const { data: revenueWeek, isFetching: weekLoading } = useFilterRevenueStatisticsQuery({
    PageIndex: 0, PageSize: 1000, DateFrom: toRangeParam(weekStart, false), DateTo: todayTo,
  })
  const { data: revenuePrevWeek } = useFilterRevenueStatisticsQuery({
    PageIndex: 0, PageSize: 1000, DateFrom: toRangeParam(prevWeekStart, false), DateTo: toRangeParam(prevWeekEnd, true),
  })
  const weekItems = revenueWeek?.Items ?? []
  const weekTotal = weekItems.reduce((s, i) => s + (i.Total ?? 0), 0)
  const prevWeekTotal = (revenuePrevWeek?.Items ?? []).reduce((s, i) => s + (i.Total ?? 0), 0)

  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart.getTime()])
  const dailyTrend = useMemo(() => {
    const totals = new Map<string, number>()
    weekItems.forEach(item => {
      if (!item.Date) return
      const key = dayKey(new Date(item.Date))
      totals.set(key, (totals.get(key) ?? 0) + (item.Total ?? 0))
    })
    return last7Days.map(d => ({ label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, value: totals.get(dayKey(d)) ?? 0 }))
  }, [weekItems, last7Days])

  const todayKeyStr = dayKey(today)
  const hourlyToday = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}h`, value: 0 }))
    weekItems.forEach(item => {
      if (!item.Date) return
      const d = new Date(item.Date)
      if (dayKey(d) !== todayKeyStr) return
      buckets[d.getHours()].value += item.Total ?? 0
    })
    return buckets
  }, [weekItems, todayKeyStr])

  // "Tình hình đơn hàng" — whatever statuses actually occur today, not a
  // fixed Hoàn thành/Đang xử lý/Đã hủy/Trả hàng set the backend may not have.
  const { data: ordersTodayList, isFetching: statusLoading } = useFilterOrdersQuery({ PageIndex: 0, PageSize: 200, DateFrom: toDateOnly(today), DateTo: toDateOnly(today) })
  const statusBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    ;(ordersTodayList?.Items ?? []).forEach(o => {
      const name = o.Status?.Name || "Không rõ"
      counts.set(name, (counts.get(name) ?? 0) + 1)
    })
    return [...counts.entries()].map(([name, count]) => ({ name, count }))
  }, [ordersTodayList])
  const statusTotal = statusBreakdown.reduce((s, i) => s + i.count, 0)

  // ── Row 3: top products + revenue by group, both derived from today's
  // per-product statistic rows (already fetched above for the KPI cards). ──
  const topProducts = useMemo(
    () => [...todayItems].sort((a, b) => (b.Amount ?? 0) - (a.Amount ?? 0)).slice(0, 5),
    [todayItems],
  )
  const maxTopAmount = topProducts[0]?.Amount ?? 0

  const { data: productGroups = [] } = useGetProductGroupsSimpleQuery()
  const groupRevenue = useMemo(() => {
    const totals = new Map<number | "none", number>()
    todayItems.forEach(item => {
      const gid = item.Product?.ProductGroup?.Id ?? "none"
      totals.set(gid, (totals.get(gid) ?? 0) + (item.Amount ?? 0))
    })
    const rows = [...totals.entries()]
      .map(([gid, amount]) => ({
        name: gid === "none" ? "Khác" : productGroups.find(g => g.Id === gid)?.Name || "Khác",
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
    return rows.slice(0, 5)
  }, [todayItems, productGroups])
  const groupRevenueTotal = groupRevenue.reduce((s, i) => s + i.amount, 0)

  return (
    <div className="animate-fadeIn space-y-4 pb-6">
      {/* Row 1 — today's KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          icon={Wallet} tone="blue" label="Doanh thu hôm nay"
          loading={salesTodayLoading} value={formatNumber(salesToday?.TotalCount ?? 0) + "đ"}
          delta={pctDelta(salesToday?.TotalCount ?? 0, salesYesterday?.TotalCount ?? 0)}
        />
        <KpiCard
          icon={TrendingUp} tone="emerald" label="Lợi nhuận hôm nay"
          loading={productStatTodayLoading} value={formatNumber(profitToday) + "đ"}
          delta={pctDelta(profitToday, profitYesterday)}
        />
        <KpiCard
          icon={ReceiptText} tone="amber" label="Hoá đơn hôm nay"
          loading={ordersTodayLoading} value={formatNumber(ordersToday?.TotalCount ?? 0)}
          delta={pctDelta(ordersToday?.TotalCount ?? 0, ordersYesterday?.TotalCount ?? 0)}
        />
        <KpiCard
          icon={UserPlus} tone="violet" label="Khách hàng mới"
          loading={customersTodayLoading} value={formatNumber(customersToday?.TotalCount ?? 0)}
          delta={pctDelta(customersToday?.TotalCount ?? 0, customersYesterday?.TotalCount ?? 0)}
        />
        <KpiCard
          icon={Package} tone="cyan" label="Sản phẩm đã bán"
          loading={productStatTodayLoading} value={formatNumber(qtyToday)}
          delta={pctDelta(qtyToday, qtyYesterday)}
        />
      </div>

      {/* Row 2 — trends */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Doanh thu 7 ngày qua</CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tabular-nums text-foreground">{formatNumber(weekTotal)}đ</span>
              <DeltaBadge value={pctDelta(weekTotal, prevWeekTotal)} suffix="so với kỳ trước" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {weekLoading ? <Skeleton className="h-[180px] w-full" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={dailyTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="week-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES_COLORS[0]} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={SERIES_COLORS[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tickFormatter={v => formatShort(Number(v))} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={40} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [formatNumber(Number(v)) + "đ", "Doanh thu"]} />
                  <Area dataKey="value" type="monotone" stroke={SERIES_COLORS[0]} strokeWidth={2} fill="url(#week-fill)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Doanh thu theo giờ hôm nay</CardTitle>
            <span className="text-xl font-bold tabular-nums text-foreground">{formatNumber(hourlyToday.reduce((s, h) => s + h.value, 0))}đ</span>
          </CardHeader>
          <CardContent className="pt-0">
            {weekLoading ? <Skeleton className="h-[180px] w-full" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={hourlyToday} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="hour" interval={3} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tickFormatter={v => formatShort(Number(v))} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={40} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [formatNumber(Number(v)) + "đ", "Doanh thu"]} />
                  <Bar dataKey="value" fill={SERIES_COLORS[0]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Tình hình đơn hàng</CardTitle>
            <span className="text-xs text-muted-foreground">hôm nay</span>
          </CardHeader>
          <CardContent className="pt-0">
            {statusLoading ? <Skeleton className="h-[180px] w-full" /> : statusTotal === 0 ? (
              <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">Chưa có đơn hàng nào</div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="relative h-[140px] w-[140px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusBreakdown} dataKey="count" nameKey="name" innerRadius={42} outerRadius={62} paddingAngle={2} strokeWidth={0}>
                        {statusBreakdown.map((_, i) => <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [formatNumber(Number(v)), n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-foreground">{statusTotal}</span>
                    <span className="text-[10px] text-muted-foreground">Tổng phiếu</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {statusBreakdown.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5 truncate">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                        <span className="truncate text-muted-foreground">{s.name}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-foreground">
                        {s.count} ({Math.round((s.count / statusTotal) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — breakdowns */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top sản phẩm bán chạy hôm nay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-0">
            {productStatTodayLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : topProducts.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Chưa bán sản phẩm nào</div>
            ) : topProducts.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{item.Product?.Name}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatNumber(item.Amount)}đ</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${maxTopAmount ? Math.max(4, (item.Amount / maxTopAmount) * 100) : 0}%` }} />
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">Đã bán {formatNumber(item.Quantity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Doanh thu theo nhóm hàng hôm nay</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {productStatTodayLoading ? <Skeleton className="h-[160px] w-full" /> : groupRevenueTotal === 0 ? (
              <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">Chưa có dữ liệu</div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative h-[150px] w-[150px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={groupRevenue} dataKey="amount" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={2} strokeWidth={0}>
                        {groupRevenue.map((_, i) => <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={v => [formatNumber(Number(v)) + "đ", ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-base font-bold text-foreground">{formatShort(groupRevenueTotal)}</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {groupRevenue.map((g, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5 truncate">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                        <span className="truncate text-muted-foreground">{g.name}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-foreground">
                        {Math.round((g.amount / groupRevenueTotal) * 100)}% · {formatShort(g.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const tooltipStyle = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }

const KPI_TONES = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
} as const

function KpiCard({ icon: Icon, tone, label, value, delta, loading }: {
  icon: React.ElementType
  tone: keyof typeof KPI_TONES
  label: string
  value: string
  delta: number | null
  loading?: boolean
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-3.5">
        <div className="flex items-center gap-2">
          <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", KPI_TONES[tone])}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="truncate text-xs text-muted-foreground">{label}</span>
        </div>
        {loading ? <Skeleton className="h-6 w-24" /> : <div className="truncate text-lg font-bold tabular-nums text-foreground">{value}</div>}
        <DeltaBadge value={delta} />
      </CardContent>
    </Card>
  )
}

function DeltaBadge({ value, suffix = "so với hôm qua" }: { value: number | null; suffix?: string }) {
  if (value == null) return <span className="block text-xs text-muted-foreground">Chưa có dữ liệu so sánh</span>
  const isUp = value >= 0
  const Icon = isUp ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
      <Icon className="h-3 w-3 shrink-0" />
      {Math.abs(value).toFixed(0)}% {suffix}
    </span>
  )
}

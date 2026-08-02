import { useState, useMemo } from "react"
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { useAuth } from "@/hooks/useAuth"
import {
  useGetAppCountInfoQuery,
  useGetSimpleChartQuery,
  useGetStatisticChartQuery,
  useGetOrderActivityQuery,
  useGetProductStatisticQuery,
  useGetCustomerActivityQuery,
} from "@/store/slice/users/api/api"
import type { TDatePreset } from "@/store/slice/users/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp, ShoppingCart, Users, Package,
  BarChart3, RefreshCw, DollarSign,
} from "lucide-react"

// ─── Date utils ───────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, "0") }
function fmtDate(d: Date, isEnd = false) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${isEnd ? "23:59:59" : "00:00:00"}+07:00`
}

function getRange(preset: TDatePreset): { from: string; to: string } {
  const now = new Date()
  switch (preset) {
    case "today":
      return { from: fmtDate(now), to: fmtDate(now, true) }
    case "week": {
      const day = now.getDay() || 7
      const mon = new Date(now); mon.setDate(now.getDate() - day + 1)
      return { from: fmtDate(mon), to: fmtDate(now, true) }
    }
    case "month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: fmtDate(first), to: fmtDate(now, true) }
    }
    case "year": {
      const first = new Date(now.getFullYear(), 0, 1)
      const last = new Date(now.getFullYear(), 11, 31)
      return { from: fmtDate(first), to: fmtDate(last, true) }
    }
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtCurrency(n: number = 0): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString("vi-VN")
}

function fmtDateShort(iso: string): string {
  try {
    const d = new Date(iso)
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return iso
  }
}

// ─── Sparkline card ───────────────────────────────────────────────────────────

interface SparkCardProps {
  title: string
  value: string
  sub: string
  icon: React.ElementType
  iconBg: string
  chartData: { Label: string; Value: number }[]
  color: string
  loading: boolean
}

function SparkCard({ title, value, sub, icon: Icon, iconBg, chartData, color, loading }: SparkCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start justify-between p-4 pb-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            {loading ? (
              <Skeleton className="mt-1.5 h-7 w-28" />
            ) : (
              <p className="mt-1 text-2xl font-bold">{value}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </div>
          <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className="h-5 w-5 text-white" />
          </span>
        </div>
        <div className="h-16 w-full">
          {!loading && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="Value"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#spark-${color.replace("#", "")})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full bg-muted/20" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Date preset buttons ──────────────────────────────────────────────────────

const DATE_PRESETS: { key: TDatePreset; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "week", label: "Tuần này" },
  { key: "month", label: "Tháng này" },
  { key: "year", label: "Năm nay" },
]

const CHART_TYPES = [
  { key: 0, label: "Ngày" },
  { key: 1, label: "Tháng" },
  { key: 2, label: "Năm" },
]

const SERIES_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const posUser = (user.data as any)?.User
  const name = posUser?.FullName ?? posUser?.Name ?? "bạn"

  const [tablePreset, setTablePreset] = useState<TDatePreset>("today")
  const tableRange = useMemo(() => getRange(tablePreset), [tablePreset])
  const yearRange = useMemo(() => getRange("year"), [])
  const [chartType, setChartType] = useState(1)
  const now = new Date()

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: counts, isFetching: countLoading, refetch: refetchCounts } = useGetAppCountInfoQuery()

  const { data: revenueChart, isFetching: rev0Loading } = useGetSimpleChartQuery(
    { type: 0, DateFrom: yearRange.from, DateTo: yearRange.to }
  )
  const { data: orderChart, isFetching: ord1Loading } = useGetSimpleChartQuery(
    { type: 1, DateFrom: yearRange.from, DateTo: yearRange.to }
  )
  const { data: customerChart, isFetching: cus2Loading } = useGetSimpleChartQuery(
    { type: 2, DateFrom: yearRange.from, DateTo: yearRange.to }
  )
  const { data: paymentChart, isFetching: pay3Loading } = useGetSimpleChartQuery(
    { type: 3, DateFrom: yearRange.from, DateTo: yearRange.to }
  )

  const { data: statChart, isFetching: statLoading } = useGetStatisticChartQuery({
    Type: chartType,
    Month: now.getMonth() + 1,
    Year: now.getFullYear(),
    YearFrom: now.getFullYear() - 5,
    YearTo: now.getFullYear(),
  })

  const { data: orders, isFetching: ordersLoading } = useGetOrderActivityQuery({
    PageSize: 10, PageIndex: 0,
    dateFrom: tableRange.from, dateTo: tableRange.to,
  })

  const { data: products, isFetching: productsLoading } = useGetProductStatisticQuery({
    PageSize: 10, PageIndex: 0,
    dateFrom: tableRange.from, dateTo: tableRange.to,
  })

  const { data: customers, isFetching: customersLoading } = useGetCustomerActivityQuery({
    PageSize: 5, PageIndex: 0,
  })

  // ── Stat chart data ───────────────────────────────────────────────────────────
  const statChartData = useMemo(() => {
    if (!statChart?.Titles?.length || !statChart?.ChartItems?.length) return []
    return statChart.Titles.map((label, i) => {
      const row: Record<string, unknown> = { label }
      statChart.ChartItems.forEach(series => {
        row[series.Label] = series.Values[i] ?? 0
      })
      return row
    })
  }, [statChart])

  const statSeriesKeys = statChart?.ChartItems?.map(s => s.Label) ?? []

  return (
    <div className="space-y-5 p-1">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Xin chào, {name} 👋</h1>
          <p className="text-sm text-muted-foreground">Tổng quan hoạt động kinh doanh</p>
        </div>
        <button
          onClick={() => refetchCounts()}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Làm mới
        </button>
      </div>

      {/* ── 4 Sparkline stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SparkCard
          title="Doanh thu hôm nay"
          value={counts ? fmtCurrency(counts.TodayRevenue) + " ₫" : "—"}
          sub={`Tháng: ${counts ? fmtCurrency(counts.ThisMonthRevenue) + " ₫" : "—"}`}
          icon={TrendingUp}
          iconBg="bg-blue-500"
          chartData={revenueChart?.ChartItems ?? []}
          color="#3b82f6"
          loading={countLoading || rev0Loading}
        />
        <SparkCard
          title="Đơn hàng hôm nay"
          value={String(counts?.TodayOrderCount ?? "—")}
          sub={`Tổng: ${counts?.OrderCount ?? "—"} đơn`}
          icon={ShoppingCart}
          iconBg="bg-emerald-500"
          chartData={orderChart?.ChartItems ?? []}
          color="#10b981"
          loading={countLoading || ord1Loading}
        />
        <SparkCard
          title="Khách hàng"
          value={String(counts?.CustomerCount ?? "—")}
          sub={`Hoạt động trong năm: ${customerChart?.TotalCount ?? "—"}`}
          icon={Users}
          iconBg="bg-violet-500"
          chartData={customerChart?.ChartItems ?? []}
          color="#8b5cf6"
          loading={countLoading || cus2Loading}
        />
        <SparkCard
          title="Sản phẩm"
          value={String(counts?.ProductCount ?? "—")}
          sub={`Thanh toán năm: ${paymentChart ? fmtCurrency(paymentChart.TotalCount) + " ₫" : "—"}`}
          icon={Package}
          iconBg="bg-orange-500"
          chartData={paymentChart?.ChartItems ?? []}
          color="#f59e0b"
          loading={countLoading || pay3Loading}
        />
      </div>

      {/* ── Main profit/revenue chart ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-primary" />
            Biểu đồ lợi nhuận
          </CardTitle>
          <div className="flex rounded-lg border overflow-hidden">
            {CHART_TYPES.map(ct => (
              <button
                key={ct.key}
                onClick={() => setChartType(ct.key)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  chartType === ct.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {statLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : statChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={statChartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={v => fmtCurrency(v as number)}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: unknown) => [fmtCurrency(v as number), ""]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {statSeriesKeys.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
              Không có dữ liệu
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Date preset filter for tables ──────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Lọc theo:</span>
        <div className="flex rounded-lg border overflow-hidden">
          {DATE_PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => setTablePreset(p.key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                tablePreset === p.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Two-column: Orders + Products ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

        {/* Orders table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Đơn hàng gần đây
              {orders && (
                <Badge variant="secondary" className="ml-auto">{orders.TotalItemCount} đơn</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : !orders?.Items?.length ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Không có đơn hàng</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Hóa đơn</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Khách hàng</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Thời gian</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.Items.map((o, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-primary">{o.Name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{o.Customer?.Name ?? "—"}</td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{fmtDateShort(o.Date)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{fmtCurrency(o.Total)} ₫</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/20">
                      <td colSpan={3} className="px-4 py-2 text-sm font-semibold">Tổng cộng</td>
                      <td className="px-4 py-2 text-right text-sm font-bold text-primary">
                        {fmtCurrency(orders.Items.reduce((s, o) => s + o.Total, 0))} ₫
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Package className="h-4 w-4 text-primary" />
              Top sản phẩm bán chạy
              {products?.Sumary && (
                <Badge variant="secondary" className="ml-auto">
                  Lợi nhuận: {fmtCurrency(products.Sumary.Profit)} ₫
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {productsLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : !products?.Items?.length ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Không có dữ liệu</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Sản phẩm</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">SL</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">Doanh thu</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">Lợi nhuận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.Items.map((p, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <p className="font-medium leading-tight">{p.Product.Name}</p>
                          <p className="text-xs text-muted-foreground">{p.Product.ProductCode}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{p.Quantity}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtCurrency(p.Amount)} ₫</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`font-semibold ${p.Profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {fmtCurrency(p.Profit)} ₫
                          </span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({(p.ProfitPercent * 100).toFixed(0)}%)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent customers ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-primary" />
            Khách hàng hoạt động gần đây
            {customers && (
              <Badge variant="secondary" className="ml-auto">{customers.TotalItemCount} khách</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {customersLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !customers?.Items?.length ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Không có dữ liệu</p>
          ) : (
            <div className="divide-y">
              {customers.Items.map((c, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    {c.Name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-tight truncate">{c.Name}</p>
                    <p className="text-xs text-muted-foreground">{c.Phone ?? c.Address ?? "—"}</p>
                  </div>
                  <div className="text-right flex-none">
                    {c.CustomerGroup && (
                      <Badge variant="outline" className="text-xs">{c.CustomerGroup.Name}</Badge>
                    )}
                    {c.LastActivity && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.LastActivity.Name} · {fmtDateShort(c.LastActivity.Date)}
                      </p>
                    )}
                  </div>
                  {c.Point !== undefined && (
                    <div className="flex items-center gap-1 text-xs text-amber-600 font-medium flex-none">
                      <DollarSign className="h-3 w-3" />
                      {c.Point.toLocaleString()}đ
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}

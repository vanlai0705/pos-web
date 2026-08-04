import { useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { BarChart3, Package, ReceiptText, Users } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  useGetCustomerActivityQuery,
  useGetOrderActivityQuery,
  useGetProductStatisticQuery,
  useGetSimpleChartQuery,
  useGetStatisticChartQuery,
} from "@/store/slice/users/api/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function toInputDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toApiDate(value: string, isEnd = false) {
  return `${value}T${isEnd ? "23:59:59" : "00:00:00"}+07:00`
}

function formatDisplayDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

function formatDateTime(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} | ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatNumber(value = 0) {
  return value.toLocaleString("vi-VN")
}

function formatShort(value = 0) {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}K`
  return formatNumber(value)
}

const SIMPLE_CHARTS = [
  { type: 0, color: "#2563eb" },
  { type: 1, color: "#059669" },
  { type: 3, color: "#d97706" },
  { type: 2, color: "#7c3aed" },
]

const CHART_TYPES = [
  { key: 0, labelKey: "dashboard.day" },
  { key: 1, labelKey: "dashboard.month" },
  { key: 2, labelKey: "dashboard.year" },
]

// Validated categorical order (blue, green, magenta, yellow, aqua) — passes
// CVD + normal-vision separation in both themes on the adjacent-pair (line
// chart) check. Defined as theme-aware CSS vars in globals.css so the exact
// step swaps with light/dark, same mechanism as --border/--popover below.
const SERIES_COLORS = [
  "hsl(var(--series-1))",
  "hsl(var(--series-2))",
  "hsl(var(--series-3))",
  "hsl(var(--series-4))",
  "hsl(var(--series-5))",
]

export default function DashboardPage() {
  const { t } = useTranslation()
  const now = new Date()
  const [simpleFrom, setSimpleFrom] = useState(toInputDate(new Date(now.getFullYear(), 0, 1)))
  const [simpleTo, setSimpleTo] = useState(toInputDate(new Date(now.getFullYear(), 11, 31)))
  const [activityFrom, setActivityFrom] = useState(toInputDate(now))
  const [activityTo, setActivityTo] = useState(toInputDate(now))
  const [chartType, setChartType] = useState(0)

  const simpleRange = useMemo(
    () => ({ DateFrom: toApiDate(simpleFrom), DateTo: toApiDate(simpleTo, true) }),
    [simpleFrom, simpleTo]
  )
  const activityRange = useMemo(
    () => ({ dateFrom: toApiDate(activityFrom), dateTo: toApiDate(activityTo, true) }),
    [activityFrom, activityTo]
  )

  const { data: statChart, isFetching: statLoading } = useGetStatisticChartQuery({
    Type: chartType,
    Month: now.getMonth() + 1,
    Year: now.getFullYear(),
    YearFrom: now.getFullYear() - 10,
    YearTo: now.getFullYear(),
  })

  const { data: customers, isFetching: customersLoading } = useGetCustomerActivityQuery({ PageSize: 10, PageIndex: 0 })
  const { data: orders, isFetching: ordersLoading } = useGetOrderActivityQuery({
    PageSize: 10,
    PageIndex: 0,
    ...activityRange,
  })
  const { data: products, isFetching: productsLoading } = useGetProductStatisticQuery({
    PageSize: 10,
    PageIndex: 0,
    ...activityRange,
  })

  const statChartData = useMemo(() => {
    if (!statChart?.Titles?.length || !statChart?.ChartItems?.length) return []
    return statChart.Titles.map((label, index) => {
      const row: Record<string, string | number> = { label }
      statChart.ChartItems.forEach(item => {
        row[item.Label] = item.Values[index] ?? 0
      })
      return row
    })
  }, [statChart])

  const statSeriesKeys = statChart?.ChartItems?.map(item => item.Label) ?? []

  return (
    <div className="animate-fadeIn space-y-4 pb-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <CardTitle className="text-lg">{t("dashboard.monthlyActivity")}</CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">
                <div>{t("common.from")} {formatDisplayDate(simpleFrom)}</div>
                <div>{t("common.to")} {formatDisplayDate(simpleTo)}</div>
              </div>
            </div>
            <DateRangeInputs from={simpleFrom} to={simpleTo} onFromChange={setSimpleFrom} onToChange={setSimpleTo} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SIMPLE_CHARTS.map(item => (
              <SimpleChartCard key={item.type} type={item.type} color={item.color} range={simpleRange} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="chart" className="space-y-3">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b bg-card p-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">{t("nav.dashboard")}</h2>
              <p className="text-xs text-muted-foreground">{t("dashboard.monthlyActivity")}</p>
            </div>
            <TabsList className="grid h-auto w-full grid-cols-2 rounded-lg bg-muted p-1 md:w-auto md:grid-cols-4">
              <TabsTrigger value="chart" className="gap-2 rounded-md px-3 py-2 text-xs">
                <BarChart3 className="h-4 w-4" />
                {t("dashboard.profitChart")}
              </TabsTrigger>
              <TabsTrigger value="customers" className="gap-2 rounded-md px-3 py-2 text-xs">
                <Users className="h-4 w-4" />
                {t("common.customer")}
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-2 rounded-md px-3 py-2 text-xs">
                <ReceiptText className="h-4 w-4" />
                {t("dashboard.salesActivity")}
              </TabsTrigger>
              <TabsTrigger value="products" className="gap-2 rounded-md px-3 py-2 text-xs">
                <Package className="h-4 w-4" />
                {t("dashboard.productActivity")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chart" className="m-0">
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  {t("dashboard.profitChart")}
                </CardTitle>
                <div className="flex w-fit items-center rounded-xl border bg-muted/40 p-1">
                  {CHART_TYPES.map(type => (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => setChartType(type.key)}
                      className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                        chartType === type.key
                          ? "bg-background text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t(type.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {statLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : statChartData.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={statChartData} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
                    <defs>
                      {statSeriesKeys.map((key, index) => {
                        const color = SERIES_COLORS[index % SERIES_COLORS.length]
                        return (
                          <linearGradient key={key} id={`profit-fill-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                          </linearGradient>
                        )
                      })}
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tickFormatter={value => formatShort(Number(value))} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={64} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={value => [formatNumber(Number(value)), ""]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {statSeriesKeys.map((key, index) => (
                      <Area key={key} dataKey={key} type="monotone" stroke="none" fill={`url(#profit-fill-${index})`} legendType="none" isAnimationActive={false} />
                    ))}
                    {statSeriesKeys.map((key, index) => (
                      <Line key={key} dataKey={key} type="monotone" stroke={SERIES_COLORS[index % SERIES_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }} />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState height="h-[300px]" />
              )}
            </CardContent>
          </TabsContent>

          <TabsContent value="customers" className="m-0">
            <div className="p-4">
              <CustomerActivityTable loading={customersLoading} data={customers} />
            </div>
          </TabsContent>

          <TabsContent value="orders" className="m-0">
            <div className="space-y-3 p-4">
              <ActivitySectionHeader title={t("dashboard.salesActivity")} from={activityFrom} to={activityTo} onFromChange={setActivityFrom} onToChange={setActivityTo} />
              <OrderActivityTable loading={ordersLoading} data={orders} />
            </div>
          </TabsContent>

          <TabsContent value="products" className="m-0">
            <div className="space-y-3 p-4">
              <ActivitySectionHeader title={t("dashboard.productActivity")} from={activityFrom} to={activityTo} onFromChange={setActivityFrom} onToChange={setActivityTo} />
              <ProductActivityTable loading={productsLoading} data={products} />
            </div>
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  )
}

function SimpleChartCard({ type, color, range }: { type: number; color: string; range: { DateFrom: string; DateTo: string } }) {
  const { data, isFetching } = useGetSimpleChartQuery({ type, ...range })
  const chartItems = data?.ChartItems ?? []

  return (
    <div className="overflow-hidden rounded-lg bg-blue-600 text-white shadow">
      <div className="p-6 pb-0">
        {isFetching ? <Skeleton className="h-8 w-24 bg-white/25" /> : <h4 className="text-2xl font-bold">{formatNumber(data?.TotalCount ?? 0)}</h4>}
        <p className="text-sm font-medium text-blue-100">{data?.Title || "..."}</p>
      </div>
      <div className="h-[70px] px-3">
        {!isFetching && chartItems.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartItems} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
              <Area dataKey="Value" type="monotone" stroke={color} strokeWidth={2} fill="rgba(255,255,255,0.22)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </div>
  )
}

function DateRangeInputs({ from, to, onFromChange, onToChange }: { from: string; to: string; onFromChange: (value: string) => void; onToChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <input type="date" value={from} onChange={event => onFromChange(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm" />
      <input type="date" value={to} onChange={event => onToChange(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm" />
    </div>
  )
}

function ActivitySectionHeader({ title, from, to, onFromChange, onToChange }: { title: string; from: string; to: string; onFromChange: (value: string) => void; onToChange: (value: string) => void }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-5">
          <div className="md:col-span-3">
            <CardTitle className="text-lg">{title}</CardTitle>
            <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
              <span>{t("common.from")}: {formatDisplayDate(from)}</span>
              <span>{t("common.to")}: {formatDisplayDate(to)}</span>
            </div>
          </div>
          <div className="md:col-span-2">
            <DateRangeInputs from={from} to={to} onFromChange={onFromChange} onToChange={onToChange} />
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}

function CustomerActivityTable({ loading, data }: { loading: boolean; data?: { TotalItemCount: number; Items: Array<any> } }) {
  const { t } = useTranslation()
  return (
    <Card className="overflow-hidden">
      <TableLoadingOrEmpty loading={loading} empty={!data?.Items?.length}>
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
            <tr>
              <th className="px-6 py-4 text-center"><Users className="mx-auto h-4 w-4" /></th>
              <th className="px-6 py-4">{t("common.customer")}</th>
              <th className="px-6 py-4 text-right">{t("common.points")}</th>
              <th className="px-6 py-4 text-center">{t("dashboard.level")}</th>
              <th className="px-6 py-4">{t("dashboard.levelProgress")}</th>
              <th className="px-6 py-4">{t("dashboard.lastActivity")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.Items.map((item, index) => (
              <tr key={`${item.Name}-${index}`} className="transition-colors hover:bg-muted/30">
                <td className="px-6 py-4 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    {item.Name?.charAt(0)?.toUpperCase() || "K"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-foreground">{item.Name}</div>
                  <div className="text-xs text-muted-foreground">ĐT: {item.Phone || ""} | {item.Address || ""}</div>
                </td>
                <td className="px-6 py-4 text-right font-mono font-medium">{formatNumber(item.Point ?? 0)}</td>
                <td className="px-6 py-4 text-center text-xs font-medium">{item.CustomerGroup?.Name || "N/A"}</td>
                <td className="min-w-[200px] px-6 py-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-bold text-primary">{formatNumber(item.PointPercent ?? 0)}%</span>
                      <span className="text-xs text-muted-foreground">{item.NextCustomerGroup?.Name || ""}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(item.PointPercent ?? 0, 100)}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">{item.LastActivity?.Name || ""}</div>
                  <div>{formatDateTime(item.LastActivity?.Date)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableLoadingOrEmpty>
      <TableFooter total={data?.TotalItemCount} />
    </Card>
  )
}

function OrderActivityTable({ loading, data }: { loading: boolean; data?: { TotalItemCount: number; Items: Array<any> } }) {
  const { t } = useTranslation()
  return (
    <Card className="overflow-hidden">
      <TableLoadingOrEmpty loading={loading} empty={!data?.Items?.length}>
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-4 text-center">#</th>
              <th className="px-4 py-4 text-center">{t("common.receiptNo")}</th>
              <th className="px-4 py-4 text-left">{t("common.customer")}</th>
              <th className="px-4 py-4 text-right">{t("common.total")}</th>
              <th className="px-4 py-4 text-right">{t("common.cash")}</th>
              <th className="px-4 py-4 text-right">{t("common.transfer")}</th>
              <th className="px-4 py-4 text-right">{t("common.debt")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.Items.map((item, index) => (
              <tr key={`${item.Name}-${index}`} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-4 text-center text-muted-foreground">{index + 1}</td>
                <td className="px-4 py-4 text-center">
                  <div className="font-medium text-foreground">{item.Name}</div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(item.Date)}</div>
                </td>
                <td className="px-4 py-4 font-medium">{item.Customer?.Name || t("common.retailCustomer")}</td>
                <td className="px-4 py-4 text-right font-semibold">{formatNumber(item.Total)}</td>
                <td className="px-4 py-4 text-right text-muted-foreground">{formatNumber(item.Cash)}</td>
                <td className="px-4 py-4 text-right text-muted-foreground">{formatNumber(item.Card)}</td>
                <td className="px-4 py-4 text-right font-medium text-rose-600">{formatNumber(item.Shortage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableLoadingOrEmpty>
      <TableFooter total={data?.TotalItemCount} />
    </Card>
  )
}

function ProductActivityTable({ loading, data }: { loading: boolean; data?: { TotalItemCount: number; Items: Array<any> } }) {
  const { t } = useTranslation()
  return (
    <Card className="overflow-hidden">
      <TableLoadingOrEmpty loading={loading} empty={!data?.Items?.length}>
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-4 text-center">#</th>
              <th className="px-4 py-4 text-left">{t("common.product")}</th>
              <th className="px-4 py-4 text-center">{t("common.unit")}</th>
              <th className="px-4 py-4 text-right">{t("common.quantity")}</th>
              <th className="px-4 py-4 text-right">{t("common.price")}</th>
              <th className="px-4 py-4 text-right">{t("common.discount")}</th>
              <th className="px-4 py-4 text-right">{t("common.amount")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.Items.map((item, index) => (
              <tr key={`${item.Product?.ProductCode}-${index}`} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-4 text-center text-muted-foreground">{index + 1}</td>
                <td className="px-4 py-4">
                  <div className="font-medium text-foreground">{item.Product?.Name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {t("common.code")}: <span className="font-mono">{item.Product?.ProductCode}</span> | {t("common.barcode")}: <span className="font-mono">{item.Product?.Barcode || ""}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-center text-xs">{item.Unit?.Name || ""}</td>
                <td className="px-4 py-4 text-right font-medium">{formatNumber(item.Quantity)}</td>
                <td className="px-4 py-4 text-right text-muted-foreground">{formatNumber(item.Price)}</td>
                <td className="px-4 py-4 text-right text-muted-foreground">{formatNumber((item.DiscountPercent ?? 0) * 100)}%</td>
                <td className="px-4 py-4 text-right font-semibold text-primary">{formatNumber(item.Amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableLoadingOrEmpty>
      <TableFooter total={data?.TotalItemCount} />
    </Card>
  )
}

function TableLoadingOrEmpty({ loading, empty, children }: { loading: boolean; empty: boolean; children: React.ReactNode }) {
  if (loading) {
    return (
      <div className="space-y-2 p-6">
        {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}
      </div>
    )
  }

  if (empty) return <EmptyState height="h-32" />

  return <div className="w-full overflow-x-auto">{children}</div>
}

function EmptyState({ height }: { height: string }) {
  const { t } = useTranslation()
  return <div className={`flex ${height} items-center justify-center text-sm text-muted-foreground`}>{t("common.noData")}</div>
}

function TableFooter({ total }: { total?: number }) {
  const { t } = useTranslation()
  return (
    <div className="border-t bg-muted/30 px-6 py-4 text-sm text-muted-foreground">
      {t("common.total")}: <span className="font-semibold text-foreground">{formatNumber(total ?? 0)}</span>
    </div>
  )
}

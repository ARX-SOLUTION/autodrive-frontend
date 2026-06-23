import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useDashboardAnalytics } from "@/services/dashboardService";
import { useBranches } from "@/services/branchService";
import { SummaryCard } from "@/components/ui/SummaryCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GraduationCap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Wallet,
  UserPlus,
  Car,
  BadgeCheck,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import { CourseType } from "@/types/student";

const CHART_STYLE = {
  contentStyle: {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    color: "hsl(var(--popover-foreground))",
    fontSize: 12,
  },
  labelStyle: { color: "hsl(var(--popover-foreground))" },
  itemStyle: { color: "hsl(var(--popover-foreground))" },
  cursor: { fill: "hsl(var(--muted))" },
};

const AXIS_PROPS = {
  stroke: "hsl(220, 10%, 55%)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

const formatMillion = (n: number) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " mlrd";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " mln";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + " ming";
  return String(n);
};

const formatSum = (n: number) =>
  new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";

const trendLabel = (current: number, previous: number) => {
  if (!previous) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { text: `${pct >= 0 ? "+" : ""}${pct}% o'tgan oyga`, down: pct < 0 };
};

const PIE_COLORS = [
  "hsl(142, 70%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
];
const RESULT_COLORS = [
  "hsl(217, 85%, 63%)",
  "hsl(142, 70%, 45%)",
  "hsl(0, 72%, 51%)",
];

const DashboardPage = () => {
  const isOwner = useAuthStore((s) => s.isOwner);
  const user = useAuthStore((s) => s.user);
  const [courseType, setCourseType] = useState<CourseType | undefined>();
  const [branchId, setBranchId] = useState<string | undefined>(
    isOwner() ? undefined : user?.branch_id || undefined,
  );
  const { data: analytics, isLoading } = useDashboardAnalytics(branchId, courseType);
  const { data: branches } = useBranches();

  const owner = isOwner();

  // ── Derived values ────────────────────────────────────────────────────────
  const revenueTrend = analytics
    ? trendLabel(analytics.this_month_revenue, analytics.last_month_revenue)
    : null;
  const studentTrend = analytics
    ? trendLabel(analytics.new_this_month, analytics.new_last_month)
    : null;

  const totalPieStudents =
    (analytics?.payment_status.paid ?? 0) +
    (analytics?.payment_status.partial ?? 0) +
    (analytics?.payment_status.debt ?? 0);

  const pieData = [
    {
      name: "To'liq to'lagan",
      value: analytics?.payment_status.paid ?? 0,
      pct: totalPieStudents
        ? Math.round(((analytics?.payment_status.paid ?? 0) / totalPieStudents) * 100)
        : 0,
    },
    {
      name: "Qisman",
      value: analytics?.payment_status.partial ?? 0,
      pct: totalPieStudents
        ? Math.round(((analytics?.payment_status.partial ?? 0) / totalPieStudents) * 100)
        : 0,
    },
    {
      name: "To'lamagan",
      value: analytics?.payment_status.debt ?? 0,
      pct: totalPieStudents
        ? Math.round(((analytics?.payment_status.debt ?? 0) / totalPieStudents) * 100)
        : 0,
    },
  ];

  const resultData = [
    { name: "O'qimoqda", value: analytics?.result_stats.oqimoqda ?? 0 },
    { name: "Topshirdi", value: analytics?.result_stats.topshirdi ?? 0 },
    { name: "Yiqildi", value: analytics?.result_stats.yiqildi ?? 0 },
  ];

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (isLoading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-balance">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Biznes ko'rsatkichlari</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs
            value={courseType || "all"}
            onValueChange={(v) =>
              setCourseType(v === "all" ? undefined : (v as CourseType))
            }
          >
            <TabsList className="bg-secondary">
              <TabsTrigger value="all">Barchasi</TabsTrigger>
              <TabsTrigger value="tezkor">Tezkor</TabsTrigger>
              <TabsTrigger value="avto_maktab">Avto maktab</TabsTrigger>
            </TabsList>
          </Tabs>
          {owner && (
            <Select
              value={branchId || "all"}
              onValueChange={(v) => setBranchId(v === "all" ? undefined : v)}
            >
              <SelectTrigger className="w-40 bg-secondary border-border">
                <SelectValue placeholder="Barcha filiallar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha filiallar</SelectItem>
                {(branches || []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ── Row 1: Student KPIs ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 text-balance">
          Talabalar
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <SummaryCard
            title="Faol talabalar"
            value={analytics.total_students}
            icon={<GraduationCap className="h-5 w-5" />}
            trend={`+${analytics.new_this_month} bu oy`}
          />
          <SummaryCard
            title="Bu oy yangi"
            value={analytics.new_this_month}
            icon={<UserPlus className="h-5 w-5" />}
            trend={studentTrend?.text}
            trendDown={studentTrend?.down}
          />
          <SummaryCard
            title="Tezkor"
            value={analytics.active_tezkor}
            icon={<Car className="h-5 w-5" />}
          />
          <SummaryCard
            title="Avto maktab"
            value={analytics.active_avto}
            icon={<Users className="h-5 w-5" />}
          />
        </div>
      </section>

      {/* ── Row 2: Financial KPIs ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 text-balance">
          Moliya
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {owner && (
            <SummaryCard
              title="Bu oy daromad"
              value={formatSum(analytics.this_month_revenue)}
              icon={<TrendingUp className="h-5 w-5" />}
              trend={revenueTrend?.text}
              trendDown={revenueTrend?.down}
            />
          )}
          {owner && (
            <SummaryCard
              title="Jami daromad"
              value={formatSum(analytics.total_revenue)}
              icon={<Wallet className="h-5 w-5" />}
            />
          )}
          <SummaryCard
            title="Jami qarzdorlik"
            value={formatSum(analytics.total_debt)}
            icon={<AlertTriangle className="h-5 w-5" />}
            trendDown
            trend={analytics.total_debt > 0 ? `${analytics.payment_status.debt} ta talaba` : undefined}
          />
          <SummaryCard
            title="O'rtacha qarz"
            value={analytics.avg_debt > 0 ? formatSum(analytics.avg_debt) : "Yo'q"}
            icon={<TrendingDown className="h-5 w-5" />}
            trendDown={analytics.avg_debt > 0}
          />
          <SummaryCard
            title="Bitiruvchilar"
            value={analytics.result_stats.topshirdi}
            icon={<BadgeCheck className="h-5 w-5" />}
            trend={
              analytics.result_stats.topshirdi + analytics.result_stats.yiqildi > 0
                ? `${Math.round((analytics.result_stats.topshirdi / (analytics.result_stats.topshirdi + analytics.result_stats.yiqildi)) * 100)}% o'tish`
                : undefined
            }
          />
        </div>
      </section>

      {/* ── Charts row 1 ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly revenue */}
        {owner && (
          <div className="glass-card p-5">
            <h3 className="font-heading text-sm font-semibold mb-4 text-balance">
              Oylik daromad (so'm)
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={analytics.monthly_revenue} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 12%, 18%)" vertical={false} />
                <XAxis dataKey="month" {...AXIS_PROPS} />
                <YAxis
                  {...AXIS_PROPS}
                  tickFormatter={formatMillion}
                  width={56}
                />
                <Tooltip
                  {...CHART_STYLE}
                  formatter={(v: number) => [formatSum(v), "Daromad"]}
                />
                <Bar
                  dataKey="amount"
                  fill="hsl(217, 85%, 63%)"
                  radius={[4, 4, 0, 0]}
                  name="Daromad"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly enrollment */}
        <div className="glass-card p-5">
          <h3 className="font-heading text-sm font-semibold mb-4 text-balance">
            Oylik ro'yxatga olish
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={analytics.monthly_enrollment} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 12%, 18%)" vertical={false} />
              <XAxis dataKey="month" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} allowDecimals={false} width={30} />
              <Tooltip {...CHART_STYLE} />
              <Bar dataKey="tezkor" fill="hsl(217, 85%, 63%)" radius={[4, 4, 0, 0]} name="Tezkor" />
              <Bar dataKey="avto_maktab" fill="hsl(142, 70%, 45%)" radius={[4, 4, 0, 0]} name="Avto maktab" />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "hsl(220, 10%, 65%)" }}
                iconType="circle"
                iconSize={8}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Charts row 2 ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment status pie */}
        <div className="glass-card p-5">
          <h3 className="font-heading text-sm font-semibold mb-4 text-balance">To'lov holati</h3>
          {totalPieStudents === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              Ma'lumot yo'q
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="value"
                    stroke="none"
                    label={({ pct }) => `${pct}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...CHART_STYLE}
                    formatter={(v: number, _: string, props: { payload?: { pct?: number } }) => [
                      `${v} ta (${props.payload?.pct ?? 0}%)`,
                      "",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-5 mt-1">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                    {d.name}: {d.value} ({d.pct}%)
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Result stats */}
        <div className="glass-card p-5">
          <h3 className="font-heading text-sm font-semibold mb-4 text-balance">Talabalar natijalari</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={resultData} layout="vertical" barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 12%, 18%)" horizontal={false} />
              <XAxis type="number" {...AXIS_PROPS} allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...AXIS_PROPS} width={80} />
              <Tooltip {...CHART_STYLE} formatter={(v: number) => [`${v} ta`, ""]} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {resultData.map((_, i) => (
                  <Cell key={i} fill={RESULT_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-5 mt-2">
            {resultData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: RESULT_COLORS[i] }} />
                {d.name}: {d.value}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Branch comparison (owner only, full width) ──────────────────────── */}
      {owner && analytics.branch_stats.length > 1 && (
        <div className="glass-card p-5">
          <h3 className="font-heading text-sm font-semibold mb-4 text-balance">
            Filiallar taqqoslamasi
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics.branch_stats} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 12%, 18%)" vertical={false} />
              <XAxis dataKey="branch" {...AXIS_PROPS} />
              <YAxis
                yAxisId="students"
                orientation="left"
                {...AXIS_PROPS}
                allowDecimals={false}
                width={30}
              />
              <YAxis
                yAxisId="money"
                orientation="right"
                {...AXIS_PROPS}
                tickFormatter={formatMillion}
                width={56}
              />
              <Tooltip
                {...CHART_STYLE}
                formatter={(v: number, name: string) =>
                  name === "Talabalar" ? [`${v} ta`, name] : [formatSum(v), name]
                }
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "hsl(220, 10%, 65%)" }}
                iconType="circle"
                iconSize={8}
              />
              <Bar yAxisId="students" dataKey="students" fill="hsl(217, 85%, 63%)" radius={[4, 4, 0, 0]} name="Talabalar" />
              <Bar yAxisId="money" dataKey="revenue" fill="hsl(142, 70%, 45%)" radius={[4, 4, 0, 0]} name="Daromad" />
              <Bar yAxisId="money" dataKey="debt" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Qarz" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;

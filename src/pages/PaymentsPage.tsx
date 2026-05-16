import PaginationControls from "@/components/ui/PaginationControls";
import PaymentModal, {
  CreatePaymentPayload,
} from "@/components/ui/PaymentModal";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { DataCard } from "@/components/ui/DataCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import
  {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover";
import
  {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";
import { useBranches } from "@/services/branchService";
import
  {
    useCreatePayment,
    usePayments,
    usePaymentSnapshot,
  } from "@/services/paymentService";
import { useStudents } from "@/services/studentService";
import { useAuthStore } from "@/store/authStore";
import { format } from "date-fns";
import
  {
    AlertTriangle,
    CalendarIcon,
    ChevronDown,
    ChevronsUpDown,
    ChevronUp,
    CreditCard,
    Download,
    Loader2,
    Plus,
    Receipt,
    Search,
    Sun,
    TrendingUp,
    Users,
    Wallet,
    X,
  } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const formatDate = (d: string) => {
  try {
    if (!d) return "—";
    return format(new Date(d), "dd.MM.yyyy HH:mm:ss");
  } catch {
    return d;
  }
};

const formatMoney = (n: number) =>
  new Intl.NumberFormat("uz-UZ").format(n || 0) + " so'm";

// Date preset helpers
const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const weekAgo = () => {
  const d = today();
  d.setDate(d.getDate() - 6);
  return d;
};
const monthStart = () => {
  const d = today();
  d.setDate(1);
  return d;
};
const lastMonthStart = () => {
  const d = today();
  d.setMonth(d.getMonth() - 1, 1);
  return d;
};
const lastMonthEnd = () => {
  const d = today();
  d.setDate(0);
  return d;
};

const PaymentsPage = () => {
  const { isOwner, user } = useAuthStore();
  const [branchId, setBranchId] = useState<string | undefined>(
    isOwner() ? undefined : user?.branch_id || undefined,
  );
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [courseTypeFilter, setCourseTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const hasDebt =
    paymentStatus === "unpaid"
      ? true
      : paymentStatus === "paid"
        ? false
        : undefined;

  const { data: payments, isLoading, isFetching } = usePayments(
    branchId,
    courseTypeFilter !== "all" ? courseTypeFilter : undefined,
    dateFrom,
    dateTo,
  );
  const hasDateFilter = !!dateFrom || !!dateTo;
  const { data: snapshot } = usePaymentSnapshot(branchId);
  const { data: branches } = useBranches();
  const { data: tezkorStudents } = useStudents("tezkor", branchId, 1, 500);
  const { data: avtoStudents } = useStudents("avto_maktab", branchId, 1, 500);
  const allStudents = [...(tezkorStudents ?? []), ...(avtoStudents ?? [])];
  const createPayment = useCreatePayment();

  useEffect(() => {
    if (isOwner()) {
      toast.info("Excel yuklab olish mavjud", {
        description: "Filterlangan to'lovlarni Excel formatida yuklab olishingiz mumkin.",
        duration: 5000,
        icon: <Download className="h-4 w-4" />,
      });
    }
  }, []);

  // Client-side filter for search/status/method (date is server-side)
  const filtered = useMemo(
    () =>
      (payments || []).filter((p) => {
        const matchSearch = (p.student_name || "")
          .toLowerCase()
          .includes(search.toLowerCase());
        let matchStatus = true;
        if (paymentStatus === "paid") matchStatus = p.remaining_debt <= 0;
        else if (paymentStatus === "unpaid") matchStatus = p.remaining_debt > 0;
        let matchPaymentMethod = true;
        if (paymentMethodFilter !== "all")
          matchPaymentMethod = p.payment_method === paymentMethodFilter;
        return matchSearch && matchStatus && matchPaymentMethod;
      }),
    [payments, search, paymentStatus, paymentMethodFilter],
  );

  const displayedSummary = useMemo(() => ({
    period_collected: filtered.reduce((sum, p) => sum + (p.amount_paid || 0), 0),
    period_payments_count: filtered.length,
    period_debt: filtered.reduce((sum, p) => sum + (p.remaining_debt || 0), 0),
  }), [filtered]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortField as keyof typeof a];
    const vb = b[sortField as keyof typeof b];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "string" && typeof vb === "string") {
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return sortDir === "asc" ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
  });

  const { currentPage, totalPages, paginatedItems, setCurrentPage } =
    usePagination(sorted);

  const handlePaymentSubmit = (data: CreatePaymentPayload) => {
    createPayment.mutate(data, {
      onSuccess: () => {
        toast.success("To'lov muvaffaqiyatli qo'shildi");
        setModalOpen(false);
      },
      onError: () => toast.error("Xatolik yuz berdi"),
    });
  };

  const exportToExcel = () => {
    const rows = sorted.map((p, idx) => ({
      "#": idx + 1,
      Talaba: p.student_name,
      Filial: p.branch_name,
      Kurs: p.course_type === "tezkor" ? "Tezkor" : "Avto maktab",
      "Umumiy narx": p.total_price,
      "Bu to'lov": p.amount_paid,
      "Joriy qoldiq": p.remaining_debt,
      Turi:
        p.payment_method === "naqd"
          ? "Naqd"
          : p.payment_method === "karta"
            ? "Karta"
            : "Perechisleniya",
      Operator: p.recorded_by || "—",
      Sana: formatDate(p.date),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "To'lovlar");
    XLSX.writeFile(wb, `tolovlar_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
  };

  const startIndex = (currentPage - 1) * 10;
  const hasAnyFilter =
    hasDateFilter ||
    paymentStatus !== "all" ||
    paymentMethodFilter !== "all" ||
    courseTypeFilter !== "all" ||
    !!search;

  const setPreset = (
    preset: "today" | "week" | "month" | "lastMonth" | "all",
  ) => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    switch (preset) {
      case "today":
        setDateFrom(today());
        setDateTo(now);
        break;
      case "week":
        setDateFrom(weekAgo());
        setDateTo(now);
        break;
      case "month":
        setDateFrom(monthStart());
        setDateTo(now);
        break;
      case "lastMonth":
        setDateFrom(lastMonthStart());
        setDateTo(lastMonthEnd());
        break;
      case "all":
        setDateFrom(undefined);
        setDateTo(undefined);
        break;
    }
  };

  const clearAllFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setPaymentStatus("all");
    setPaymentMethodFilter("all");
    setCourseTypeFilter("all");
    setSearch("");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">To'lovlar</h1>
          <p className="text-sm text-muted-foreground">
            Talabalar to'lovlarini boshqarish va hisob-kitob
          </p>
        </div>
        <div className="flex gap-2">
          {isOwner() && (
            <Button
              variant="outline"
              className="gap-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950 font-semibold"
              onClick={exportToExcel}
            >
              <Download className="h-4 w-4" /> Excel yuklab olish
            </Button>
          )}
          <Button className="gap-2" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> To'lov qo'shish
          </Button>
        </div>
      </div>

      {/* SECTION 1: Joriy holat (Always visible snapshot) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Joriy holat
          </h2>
          <span className="text-xs text-muted-foreground">
            Filterga bog'liq emas
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Bugungi daromad"
            value={formatMoney(snapshot?.today_income || 0)}
            icon={<Sun className="h-5 w-5" />}
          />
          <SummaryCard
            title="Bu oygi daromad"
            value={formatMoney(snapshot?.this_month_income || 0)}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <SummaryCard
            title="Joriy qarzdorlik"
            value={formatMoney(snapshot?.current_total_debt || 0)}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <SummaryCard
            title="Qarzdor talabalar"
            value={`${snapshot?.students_with_debt || 0} ta`}
            icon={<Users className="h-5 w-5" />}
          />
        </div>
      </section>

      {/* SECTION 2: Filterlar */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filterlash
          </h2>
          {hasAnyFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 gap-1 text-xs"
            >
              <X className="h-3 w-3" /> Hammasini tozalash
            </Button>
          )}
        </div>

        {/* Quick date presets */}
        <div className="flex flex-wrap gap-2 mb-3">
          <Button variant="outline" size="sm" onClick={() => setPreset("today")}>
            Bugun
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreset("week")}>
            So'nggi 7 kun
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreset("month")}>
            Bu oy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreset("lastMonth")}
          >
            O'tgan oy
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreset("all")}>
            Barcha vaqt
          </Button>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3">
          {isOwner() && (
            <Select
              value={branchId || "all"}
              onValueChange={(v) => setBranchId(v === "all" ? undefined : v)}
            >
              <SelectTrigger className="w-40 bg-secondary border-border">
                <SelectValue placeholder="Filial" />
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

          <Select value={paymentStatus} onValueChange={setPaymentStatus}>
            <SelectTrigger className="w-44 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha holatlar</SelectItem>
              <SelectItem value="paid">To'liq to'lagan</SelectItem>
              <SelectItem value="unpaid">Qarzi bor</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={paymentMethodFilter}
            onValueChange={setPaymentMethodFilter}
          >
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha turi</SelectItem>
              <SelectItem value="naqd">Naqd</SelectItem>
              <SelectItem value="karta">Karta</SelectItem>
            </SelectContent>
          </Select>

          <Select value={courseTypeFilter} onValueChange={setCourseTypeFilter}>
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha kurslar</SelectItem>
              <SelectItem value="avto_maktab">Avto maktab</SelectItem>
              <SelectItem value="tezkor">Tezkor</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "min-w-[200px] justify-start text-left font-normal bg-secondary border-border",
                  !dateFrom && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {!dateFrom
                  ? "Sana tanlang"
                  : dateTo && dateTo.getTime() !== dateFrom.getTime()
                    ? `${format(dateFrom, "dd.MM.yyyy")} → ${format(dateTo, "dd.MM.yyyy")}`
                    : format(dateFrom, "dd.MM.yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateFrom, to: dateTo }}
                onSelect={(range) => {
                  if (!range) {
                    setDateFrom(undefined);
                    setDateTo(undefined);
                  } else {
                    setDateFrom(range.from);
                    setDateTo(range.to ?? range.from);
                  }
                }}
                numberOfMonths={2}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Talaba ismi bo'yicha qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-border"
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: Tanlangan davr natijasi (only when date filter active) */}
      {hasAnyFilter && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">
              Tanlangan natija
            </h2>
            <span className="text-xs text-muted-foreground">
              {filtered.length} ta to'lov bo'yicha
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              title="Yig'ilgan summa"
              value={formatMoney(displayedSummary.period_collected)}
              icon={<Wallet className="h-5 w-5" />}
            />
            <SummaryCard
              title="To'lovlar soni"
              value={`${displayedSummary.period_payments_count} ta`}
              icon={<Receipt className="h-5 w-5" />}
            />
            <SummaryCard
              title="Qarzdorlik"
              value={formatMoney(displayedSummary.period_debt)}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </div>
        </section>
      )}

      {/* SECTION 4: Table */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            To'lovlar ro'yxati
          </h2>
          <span className="text-xs text-muted-foreground">
            {filtered.length} ta natija
          </span>
        </div>
        <div className="relative">
          {isFetching && !isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[2px]">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        <div className={cn("glass-card overflow-hidden transition-opacity duration-200", isFetching && !isLoading && "opacity-50")}>
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    #
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    <button onClick={() => toggleSort("student_name")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      Talaba
                      {sortField === "student_name" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Filial
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Kurs
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Umumiy narx
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    <button onClick={() => toggleSort("amount_paid")} className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto">
                      Bu to'lov
                      {sortField === "amount_paid" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    <button onClick={() => toggleSort("remaining_debt")} className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto">
                      Joriy qoldiq
                      {sortField === "remaining_debt" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    Turi
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Operator
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      Sana
                      {sortField === "date" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={10} className="p-4">
                        <Skeleton className="h-5" />
                      </td>
                    </tr>
                  ))
                ) : paginatedItems?.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-0">
                      <EmptyState
                        icon={CreditCard}
                        title="To'lovlar topilmadi"
                        description="Filtrlarni o'zgartiring yoki yangi to'lov qo'shing."
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedItems?.map((p, idx) => (
                    <tr
                      key={p.id}
                      className="table-row-striped border-b border-border/50"
                    >
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {startIndex + idx + 1}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {p.student_name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.branch_name}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {p.course_type === "tezkor"
                          ? "Tezkor"
                          : "Avto maktab"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {new Intl.NumberFormat("uz-UZ").format(p.total_price)}
                      </td>
                      <td className="px-4 py-3 text-right text-success font-medium">
                        +{new Intl.NumberFormat("uz-UZ").format(p.amount_paid)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={
                            p.remaining_debt > 0
                              ? "text-destructive"
                              : "text-success"
                          }
                        >
                          {p.remaining_debt > 0
                            ? new Intl.NumberFormat("uz-UZ").format(
                                p.remaining_debt,
                              )
                            : "To'liq"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        {p.payment_method === "naqd" ? "Naqd" : p.payment_method === "karta" ? "Karta" : "Perechisleniya"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {p.recorded_by || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(p.date)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>

          <div className="grid gap-3 md:hidden p-3">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))
            ) : paginatedItems && paginatedItems.length > 0 ? (
              paginatedItems.map((p) => (
                <DataCard
                  key={p.id}
                  title={p.student_name}
                  subtitle={p.branch_name}
                  fields={[
                    { label: "Sana", value: formatDate(p.date) },
                    { label: "Summa", value: formatMoney(p.amount_paid) },
                    {
                      label: "To'lov turi",
                      value:
                        p.payment_method === "naqd"
                          ? "Naqd"
                          : p.payment_method === "karta"
                            ? "Karta"
                            : "Perechisleniya",
                    },
                    { label: "Operator", value: p.recorded_by || "—" },
                    {
                      label: "Kurs turi",
                      value: p.course_type === "tezkor" ? "Tezkor" : "Avto maktab",
                    },
                  ]}
                />
              ))
            ) : (
              <EmptyState
                icon={CreditCard}
                title="To'lovlar topilmadi"
                description="Filtrlarni o'zgartiring yoki yangi to'lov qo'shing."
              />
            )}
          </div>
        </div>
        </div>

        <div className="mt-4">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </section>

      <PaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handlePaymentSubmit}
        loading={createPayment.isPending}
        students={allStudents}
      />
    </div>
  );
};

export default PaymentsPage;

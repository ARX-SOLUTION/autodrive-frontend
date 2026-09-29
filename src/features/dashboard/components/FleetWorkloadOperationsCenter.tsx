import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  GasPump,
  UserCheck,
  WarningCircle,
  WarningOctagon,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  UsersThree,
  Speedometer,
  MagnifyingGlass,
  ArrowsClockwise,
  CalendarCheck,
  Receipt,
  Sparkle,
} from '@phosphor-icons/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type OperationTab = 'radar' | 'instructors' | 'fuel';
export type FuelType = 'methane' | 'propane' | 'petrol' | 'diesel';

export interface InstructorWorkloadItem {
  id: string;
  name: string;
  avatarUrl?: string;
  branchName: string;
  assignedCarPlate: string;
  assignedCarModel: string;
  weeklyPlannedHours: number;
  weeklyActualHours: number;
  activeStudentsCount: number;
  completedLessonsCount: number;
  cancellationRatePercent: number;
  status: 'normal' | 'overloaded' | 'underloaded' | 'on_leave';
  riskScore: number;
}

export interface VehicleFuelItem {
  id: string;
  plateNumber: string;
  model: string;
  branchName: string;
  fuelType: FuelType;
  primaryInstructorName: string;
  normPer100Km: number;
  actualPer100Km: number;
  mileageKm: number;
  totalRefueledAmount: number;
  totalExpenseUzs: number;
  variancePercent: number;
  lastOdometerKm: number;
  status: 'optimal' | 'anomaly' | 'high_excess';
  hasOdometerWarning: boolean;
}

export interface AnomalyAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category:
    'fuel_excess' | 'instructor_fatigue' | 'phantom_refuel' | 'odometer_jump';
  title: string;
  description: string;
  entityName: string;
  branchName: string;
  timestamp: string;
  suggestedAction: string;
  resolved?: boolean;
}

const INITIAL_INSTRUCTORS: InstructorWorkloadItem[] = [
  {
    id: 'inst-01',
    name: 'Rustam Qosimov',
    branchName: 'Chilonzor filiali',
    assignedCarPlate: '01 777 AAA',
    assignedCarModel: 'Chevrolet Lacetti',
    weeklyPlannedHours: 40,
    weeklyActualHours: 49.5,
    activeStudentsCount: 14,
    completedLessonsCount: 33,
    cancellationRatePercent: 2.1,
    status: 'overloaded',
    riskScore: 88,
  },
  {
    id: 'inst-02',
    name: 'Dilshod Karimov',
    branchName: 'Chilonzor filiali',
    assignedCarPlate: '01 423 BBA',
    assignedCarModel: 'Chevrolet Cobalt',
    weeklyPlannedHours: 40,
    weeklyActualHours: 37.0,
    activeStudentsCount: 11,
    completedLessonsCount: 25,
    cancellationRatePercent: 4.0,
    status: 'normal',
    riskScore: 24,
  },
  {
    id: 'inst-03',
    name: 'Farhod Aliyev',
    branchName: 'Yunusobod filiali',
    assignedCarPlate: '01 982 CCA',
    assignedCarModel: 'Chevrolet Nexia-3',
    weeklyPlannedHours: 40,
    weeklyActualHours: 19.5,
    activeStudentsCount: 6,
    completedLessonsCount: 12,
    cancellationRatePercent: 12.5,
    status: 'underloaded',
    riskScore: 65,
  },
  {
    id: 'inst-04',
    name: 'Sherzod Toirov',
    branchName: 'Mirzo Ulug‘bek filiali',
    assignedCarPlate: '01 311 DDA',
    assignedCarModel: 'Chevrolet Spark',
    weeklyPlannedHours: 40,
    weeklyActualHours: 41.0,
    activeStudentsCount: 12,
    completedLessonsCount: 28,
    cancellationRatePercent: 1.5,
    status: 'normal',
    riskScore: 32,
  },
];

const INITIAL_VEHICLES: VehicleFuelItem[] = [
  {
    id: 'veh-01',
    plateNumber: '01 777 AAA',
    model: 'Chevrolet Lacetti',
    branchName: 'Chilonzor filiali',
    fuelType: 'methane',
    primaryInstructorName: 'Rustam Qosimov',
    normPer100Km: 9.5,
    actualPer100Km: 12.8,
    mileageKm: 940,
    totalRefueledAmount: 120.3,
    totalExpenseUzs: 457140,
    variancePercent: 34.7,
    lastOdometerKm: 142300,
    status: 'high_excess',
    hasOdometerWarning: false,
  },
  {
    id: 'veh-02',
    plateNumber: '01 423 BBA',
    model: 'Chevrolet Cobalt',
    branchName: 'Chilonzor filiali',
    fuelType: 'petrol',
    primaryInstructorName: 'Dilshod Karimov',
    normPer100Km: 8.2,
    actualPer100Km: 8.5,
    mileageKm: 810,
    totalRefueledAmount: 68.8,
    totalExpenseUzs: 653600,
    variancePercent: 3.6,
    lastOdometerKm: 89400,
    status: 'optimal',
    hasOdometerWarning: false,
  },
  {
    id: 'veh-03',
    plateNumber: '01 982 CCA',
    model: 'Chevrolet Nexia-3',
    branchName: 'Yunusobod filiali',
    fuelType: 'methane',
    primaryInstructorName: 'Farhod Aliyev',
    normPer100Km: 9.0,
    actualPer100Km: 11.2,
    mileageKm: 420,
    totalRefueledAmount: 47.0,
    totalExpenseUzs: 178600,
    variancePercent: 24.4,
    lastOdometerKm: 198300,
    status: 'anomaly',
    hasOdometerWarning: true,
  },
  {
    id: 'veh-04',
    plateNumber: '01 311 DDA',
    model: 'Chevrolet Spark',
    branchName: 'Mirzo Ulug‘bek filiali',
    fuelType: 'propane',
    primaryInstructorName: 'Sherzod Toirov',
    normPer100Km: 8.0,
    actualPer100Km: 8.1,
    mileageKm: 760,
    totalRefueledAmount: 61.5,
    totalExpenseUzs: 369000,
    variancePercent: 1.2,
    lastOdometerKm: 65120,
    status: 'optimal',
    hasOdometerWarning: false,
  },
];

const INITIAL_ALERTS: AnomalyAlert[] = [
  {
    id: 'al-01',
    severity: 'critical',
    category: 'fuel_excess',
    title: 'Me’yordan yuqori yoqilg‘i sarfi aniqlandi',
    description:
      'Lacetti (01 777 AAA) so‘nggi haftada me’yordan +34.7% ortiq gaz (metan) sarfladi.',
    entityName: '01 777 AAA (Rustam Qosimov)',
    branchName: 'Chilonzor filiali',
    timestamp: 'Bugun, 18:30',
    suggestedAction: 'Dvigatel diagnostikasi va marshrut qaydlarini tekshirish',
  },
  {
    id: 'al-02',
    severity: 'critical',
    category: 'instructor_fatigue',
    title: 'Instruktorda haddan tashqari yuklama: toliqish xavfi',
    description:
      'Rustam Qosimov haftalik 49.5 soat amaliyot o‘tdi (norma: 40 soat). Dam olish talab etiladi.',
    entityName: 'Rustam Qosimov',
    branchName: 'Chilonzor filiali',
    timestamp: 'Bugun, 17:00',
    suggestedAction: 'Darslar taqsimotini qayta ko‘rib chiqish',
  },
  {
    id: 'al-03',
    severity: 'warning',
    category: 'odometer_jump',
    title: 'Odometr ko‘rsatkichida nomuvofiqlik',
    description:
      'Nexia-3 (01 982 CCA) chekdagi odometr ko‘rsatkichi avvalgi darsdan 80 km kam qayd etildi.',
    entityName: '01 982 CCA (Farhod Aliyev)',
    branchName: 'Yunusobod filiali',
    timestamp: 'Kecha, 20:15',
    suggestedAction: 'Fiskal chek va haydovchi ko‘rsatkichini solishtirish',
  },
];

export function FleetWorkloadOperationsCenter() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<OperationTab>('radar');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'overloaded' | 'excess'
  >('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>(INITIAL_ALERTS);

  // Modal resolution state
  const [activeAlertModal, setActiveAlertModal] = useState<AnomalyAlert | null>(
    null,
  );
  const [selectedResolutionAction, setSelectedResolutionAction] =
    useState<string>('warn');
  const [actionNote, setActionNote] = useState<string>('');

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success(
        t(
          'operations.refreshed_toast',
          'Ma’lumotlar Soliq OFD va darslar bazasi bilan yangilandi',
        ),
      );
    }, 600);
  };

  const handleOpenActionModal = (alert: AnomalyAlert) => {
    setActiveAlertModal(alert);
    setSelectedResolutionAction('warn');
    setActionNote('');
  };

  const handleConfirmResolution = () => {
    if (!activeAlertModal) return;
    setAlerts((prev) =>
      prev.map((al) =>
        al.id === activeAlertModal.id ? { ...al, resolved: true } : al,
      ),
    );
    toast.success(
      t(
        'operations.toast_action_success',
        'Signal bo‘yicha chora muvaffaqiyatli qayd etildi',
      ),
    );
    setActiveAlertModal(null);
  };

  // Filtering instructors and vehicles based on selected branch and search query
  const filteredInstructors = useMemo(() => {
    return INITIAL_INSTRUCTORS.filter((inst) => {
      const matchBranch =
        selectedBranch === 'all' || inst.branchName.includes(selectedBranch);
      const matchQuery =
        inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inst.assignedCarPlate.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'overloaded'
            ? inst.status === 'overloaded'
            : true;
      return matchBranch && matchQuery && matchStatus;
    });
  }, [selectedBranch, searchQuery, statusFilter]);

  const filteredVehicles = useMemo(() => {
    return INITIAL_VEHICLES.filter((veh) => {
      const matchBranch =
        selectedBranch === 'all' || veh.branchName.includes(selectedBranch);
      const matchQuery =
        veh.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        veh.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        veh.primaryInstructorName
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'excess'
            ? veh.status === 'high_excess' || veh.status === 'anomaly'
            : true;
      return matchBranch && matchQuery && matchStatus;
    });
  }, [selectedBranch, searchQuery, statusFilter]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((al) => {
      const matchBranch =
        selectedBranch === 'all' || al.branchName.includes(selectedBranch);
      const matchQuery =
        al.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        al.entityName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchBranch && matchQuery;
    });
  }, [selectedBranch, searchQuery, alerts]);

  // Executive cockpit metrics
  const kpiData = useMemo(() => {
    const totalWeeklyHours = INITIAL_INSTRUCTORS.reduce(
      (acc, i) => acc + i.weeklyActualHours,
      0,
    );
    const avgLoadPercent = Math.round(
      (totalWeeklyHours / (INITIAL_INSTRUCTORS.length * 40)) * 100,
    );
    const overloadedCount = INITIAL_INSTRUCTORS.filter(
      (i) => i.status === 'overloaded',
    ).length;
    const underloadedCount = INITIAL_INSTRUCTORS.filter(
      (i) => i.status === 'underloaded',
    ).length;
    const highExcessCount = INITIAL_VEHICLES.filter(
      (v) => v.status === 'high_excess',
    ).length;
    const totalExpense = INITIAL_VEHICLES.reduce(
      (acc, v) => acc + v.totalExpenseUzs,
      0,
    );
    const activeAlertsCount = alerts.filter((a) => !a.resolved).length;

    return {
      totalWeeklyHours,
      avgLoadPercent,
      overloadedCount,
      underloadedCount,
      highExcessCount,
      totalExpenseFormatted: totalExpense.toLocaleString('uz-UZ'),
      activeAlertsCount,
    };
  }, [alerts]);

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="px-2 py-0.5 text-xs font-medium border-primary/30 text-primary bg-primary/10"
            >
              <Sparkle className="mr-1 h-3 w-3" />
              {t('operations.live_center', 'Markaz Rahbari Operatsion Radari')}
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Jonli monitoring
            </span>
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {t(
              'operations.title',
              'Instruktorlar Yuklamasi va Avtopark Yoqilg‘i Nazorati',
            )}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {t(
              'operations.subtitle',
              'Filiallar kesimida amaliyot soatlari, toliqish xavfi va yoqilg‘i sarfi me’yorlari monitoringi',
            )}
          </p>
        </div>

        {/* Global Controls & Branch Select */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <MagnifyingGlass className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(
                'operations.search_placeholder',
                'Instruktor yoki mashina...',
              )}
              className="h-9 w-44 rounded-md border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:w-56"
            />
          </div>

          <select
            value={selectedBranch}
            aria-label={t('operations.select_branch', 'Filialni tanlash')}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">
              {t('operations.all_branches', 'Barcha filiallar')}
            </option>
            <option value="Chilonzor">
              {t('operations.branch_chilonzor', 'Chilonzor filiali')}
            </option>
            <option value="Yunusobod">
              {t('operations.branch_yunusobod', 'Yunusobod filiali')}
            </option>
            <option value="Mirzo Ulug‘bek">
              {t('operations.branch_mirzo_ulugbek', 'Mirzo Ulug‘bek filiali')}
            </option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 gap-1.5 px-3 text-xs"
          >
            <ArrowsClockwise
              className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')}
            />
            <span>{t('operations.refresh_button', 'Yangilash')}</span>
          </Button>
        </div>
      </div>

      {/* KPI 4-Card Executive Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Haftalik Amaliyot Soatlari */}
        <Card className="p-4 border-border bg-card transition-colors hover:border-border/80">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-mono uppercase tracking-wider">
              {t('operations.kpi_hours', 'Haftalik Amaliyot')}
            </span>
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {kpiData.totalWeeklyHours}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('operations.hours_unit', 'soat')}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('operations.avg_occupancy', 'O‘rtacha bandlik:')}</span>
            <span className="font-mono font-medium text-foreground">
              {kpiData.avgLoadPercent}%
            </span>
          </div>
          <Progress
            value={Math.min(kpiData.avgLoadPercent, 100)}
            className="h-1.5 mt-1.5"
          />
        </Card>

        {/* Card 2: Instruktorlar Yuklamasi va Toliqish */}
        <Card className="p-4 border-border bg-card transition-colors hover:border-border/80">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-mono uppercase tracking-wider">
              {t('operations.kpi_instructors', 'Toliqish Nazorati')}
            </span>
            <UserCheck className="h-4 w-4 text-warning" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-destructive tracking-tight">
              {kpiData.overloadedCount}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('operations.overloaded_label', 'instruktor toliqish xavfida')}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {t('operations.underloaded_label', 'Kam yuklama:')}
            </span>
            <span className="font-mono text-warning font-medium">
              {kpiData.underloadedCount} ta instruktor
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {t(
              'operations.norm_rule',
              'Haftalik norma: 40 soat (maksimal 42 soat)',
            )}
          </div>
        </Card>

        {/* Card 3: Avtopark Yoqilg‘i Sarfi */}
        <Card className="p-4 border-border bg-card transition-colors hover:border-border/80">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-mono uppercase tracking-wider">
              {t('operations.kpi_fuel_risk', 'Yoqilg‘i Og‘ishi')}
            </span>
            <GasPump className="h-4 w-4 text-destructive" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-destructive tracking-tight">
              {kpiData.highExcessCount}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('operations.excess_cars', 'mashinada ortiqcha sarf')}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('operations.max_variance', 'Maksimal og‘ish:')}</span>
            <span className="font-mono text-destructive font-medium">
              +34.7% (Lacetti)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {t('operations.norm_passport', 'Metan normasi: 9.0 - 9.5 m³/100km')}
          </div>
        </Card>

        {/* Card 4: Jami Yoqilg‘i Xarajati */}
        <Card className="p-4 border-border bg-card transition-colors hover:border-border/80">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-mono uppercase tracking-wider">
              {t('operations.kpi_expense', 'Yoqilg‘i Xarajati')}
            </span>
            <Speedometer className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-foreground tracking-tight">
              {kpiData.totalExpenseFormatted}
            </span>
            <span className="text-xs text-muted-foreground">so‘m</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('operations.active_signals', 'Tezkor signallar:')}</span>
            <Badge
              variant="outline"
              className="h-5 px-1.5 font-mono text-[10px] border-destructive/40 bg-destructive/10 text-destructive"
            >
              {kpiData.activeAlertsCount} ta signal
            </Badge>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {t(
              'operations.verified_receipts',
              'Barcha cheklar Soliq OFD bilan solishtiriladi',
            )}
          </div>
        </Card>
      </div>

      {/* Navigation Sub-Tabs and Quick Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('radar')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors',
              activeTab === 'radar'
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <WarningCircle className="h-4 w-4" aria-hidden="true" />
            {t('operations.tab_alerts', 'Tezkor Signallar va Xulosalar')}
            <span className="ml-1 rounded-full bg-destructive/20 px-1.5 py-0.5 font-mono text-[10px] text-destructive">
              {kpiData.activeAlertsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('instructors')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors',
              activeTab === 'instructors'
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <UsersThree className="h-4 w-4" aria-hidden="true" />
            {t('operations.tab_instructors', 'Instruktorlar Yuklamasi')}
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {filteredInstructors.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fuel')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors',
              activeTab === 'fuel'
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <GasPump className="h-4 w-4" aria-hidden="true" />
            {t('operations.tab_fleet_fuel', 'Mashinalar va Yoqilg‘i Sarfi')}
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {filteredVehicles.length}
            </span>
          </button>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-1.5 pb-2 sm:pb-0">
          <Button
            variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            className="h-7 text-xs"
          >
            {t('operations.filter_all_status', 'Barcha holatlar')}
          </Button>
          <Button
            variant={statusFilter === 'overloaded' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('overloaded')}
            className="h-7 text-xs text-destructive hover:text-destructive"
          >
            {t(
              'operations.filter_overloaded_only',
              'Faqat toliqish xavfidagilar',
            )}
          </Button>
          <Button
            variant={statusFilter === 'excess' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('excess')}
            className="h-7 text-xs text-warning hover:text-warning"
          >
            {t('operations.filter_excess_only', 'Faqat ortiqcha sarf')}
          </Button>
        </div>
      </div>

      {/* Tab 1: Tezkor Signallar va Radar Xulosalari */}
      {activeTab === 'radar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {t(
                'operations.radar_heading',
                'Markaz Rahbari Uchun Faol Signallar Ro‘yxati',
              )}
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              {t(
                'operations.sync_status',
                'Avtomatik sinxron: Har 15 daqiqada yangilanadi',
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-3 transition-colors',
                  alert.resolved
                    ? 'border-border bg-muted/20 opacity-70'
                    : alert.severity === 'critical'
                      ? 'border-destructive/40 bg-destructive/5'
                      : alert.severity === 'warning'
                        ? 'border-warning/40 bg-warning/5'
                        : 'border-border bg-card',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {alert.resolved ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    ) : alert.severity === 'critical' ? (
                      <WarningOctagon className="h-5 w-5 text-destructive" />
                    ) : (
                      <WarningCircle className="h-5 w-5 text-warning" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {alert.title}
                      </span>
                      {alert.resolved ? (
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0 font-mono text-[10px] border-emerald-500/40 text-emerald-500"
                        >
                          Chora ko‘rildi
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn(
                            'px-1.5 py-0 font-mono text-[10px]',
                            alert.severity === 'critical'
                              ? 'border-destructive/40 text-destructive'
                              : 'border-warning/40 text-warning',
                          )}
                        >
                          {alert.severity.toUpperCase()}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground font-mono">
                        {alert.branchName}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {alert.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className="text-foreground font-medium">
                        {alert.entityName}
                      </span>
                      <span className="text-muted-foreground">
                        Tavsiya: {alert.suggestedAction}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {alert.timestamp}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenActionModal(alert)}
                    className="h-8 text-xs rounded-md"
                  >
                    {t('operations.action_inspect', 'Tekshirish')}
                  </Button>
                  {!alert.resolved && (
                    <Button
                      size="sm"
                      onClick={() => handleOpenActionModal(alert)}
                      className="h-8 text-xs rounded-md bg-primary text-primary-foreground"
                    >
                      {t('operations.action_resolve', 'Chora ko‘rish')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Instruktorlar Yuklamasi */}
      {activeTab === 'instructors' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t(
                'operations.instructors_heading',
                'Instruktorlar Haftalik Ish Rejimi va Yuklamasi',
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t(
                'operations.instructors_desc',
                'Haftalik amaliyot darslari: 40 soat me’yor (qizil: toliqish xavfi, sariq: kam yuklama)',
              )}
            </p>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-mono uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">
                    {t('operations.col_instructor', 'Instruktor')}
                  </th>
                  <th className="p-3 font-medium">
                    {t('operations.col_car', 'Biriktirilgan Mashina')}
                  </th>
                  <th className="p-3 font-medium">
                    {t('operations.col_branch', 'Filial')}
                  </th>
                  <th className="p-3 font-medium">
                    {t('operations.col_hours', 'Haftalik Soat (Norma: 40h)')}
                  </th>
                  <th className="p-3 font-medium">
                    {t('operations.col_students', 'O‘quvchilar')}
                  </th>
                  <th className="p-3 font-medium">
                    {t('operations.col_cancellations', 'Bekor Qilish')}
                  </th>
                  <th className="p-3 font-medium">
                    {t('operations.col_status', 'Holat')}
                  </th>
                  <th className="p-3 font-medium text-right">
                    {t('operations.col_action', 'Amal')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInstructors.map((inst) => (
                  <tr
                    key={inst.id}
                    className="transition-colors hover:bg-muted/20"
                  >
                    <td className="p-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {inst.name.charAt(0)}
                        </div>
                        <div>
                          <span>{inst.name}</span>
                          {inst.status === 'overloaded' && (
                            <span className="block text-[11px] text-destructive font-mono font-normal">
                              Toliqish xavfi: {inst.riskScore}%
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-mono font-medium">
                        {inst.assignedCarPlate}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {inst.assignedCarModel}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {inst.branchName}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'font-mono font-bold',
                            inst.weeklyActualHours > 42
                              ? 'text-destructive'
                              : inst.weeklyActualHours < 30
                                ? 'text-warning'
                                : 'text-foreground',
                          )}
                        >
                          {inst.weeklyActualHours}h
                        </span>
                        <div className="w-16">
                          <Progress
                            value={Math.min(
                              (inst.weeklyActualHours / 40) * 100,
                              100,
                            )}
                            className={cn(
                              'h-1.5',
                              inst.weeklyActualHours > 42
                                ? '[&>div]:bg-destructive'
                                : inst.weeklyActualHours < 30
                                  ? '[&>div]:bg-warning'
                                  : '[&>div]:bg-primary',
                            )}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono">
                      {inst.activeStudentsCount} nafar
                    </td>
                    <td className="p-3 font-mono">
                      <span
                        className={
                          inst.cancellationRatePercent > 10
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                        }
                      >
                        {inst.cancellationRatePercent}%
                      </span>
                    </td>
                    <td className="p-3">
                      {inst.status === 'overloaded' && (
                        <Badge
                          variant="outline"
                          className="border-destructive/40 bg-destructive/10 text-destructive text-[10px]"
                        >
                          {t(
                            'operations.status_overload',
                            'Haddan tashqari yuklama',
                          )}
                        </Badge>
                      )}
                      {inst.status === 'normal' && (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-500 text-[10px]"
                        >
                          {t('operations.status_normal', 'Me’yorda')}
                        </Badge>
                      )}
                      {inst.status === 'underloaded' && (
                        <Badge
                          variant="outline"
                          className="border-warning/40 bg-warning/10 text-warning text-[10px]"
                        >
                          {t('operations.status_underload', 'Kam yuklama')}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate({ to: '/attendance' })}
                        className="h-7 px-2 text-xs rounded-md"
                      >
                        <CalendarCheck className="mr-1 h-3.5 w-3.5" />
                        {t('operations.btn_schedule', 'Jadval')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredInstructors.map((inst) => (
              <Card
                key={inst.id}
                className="p-4 border-border bg-card space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">
                      {inst.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {inst.branchName}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5">
                      {inst.assignedCarPlate} ({inst.assignedCarModel})
                    </p>
                  </div>
                  {inst.status === 'overloaded' && (
                    <Badge
                      variant="outline"
                      className="border-destructive/40 bg-destructive/10 text-destructive text-[10px]"
                    >
                      {t(
                        'operations.status_overload',
                        'Haddan tashqari yuklama',
                      )}
                    </Badge>
                  )}
                  {inst.status === 'normal' && (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 bg-emerald-500/10 text-emerald-500 text-[10px]"
                    >
                      {t('operations.status_normal', 'Me’yorda')}
                    </Badge>
                  )}
                  {inst.status === 'underloaded' && (
                    <Badge
                      variant="outline"
                      className="border-warning/40 bg-warning/10 text-warning text-[10px]"
                    >
                      {t('operations.status_underload', 'Kam yuklama')}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      Soat (40h)
                    </span>
                    <p
                      className={cn(
                        'font-mono font-bold text-xs mt-0.5',
                        inst.weeklyActualHours > 42
                          ? 'text-destructive'
                          : 'text-foreground',
                      )}
                    >
                      {inst.weeklyActualHours}h
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      O‘quvchilar
                    </span>
                    <p className="font-mono text-xs mt-0.5">
                      {inst.activeStudentsCount}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      Bekor qilish
                    </span>
                    <p className="font-mono text-xs mt-0.5">
                      {inst.cancellationRatePercent}%
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate({ to: '/attendance' })}
                    className="h-8 text-xs w-full rounded-md"
                  >
                    <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
                    {t('operations.btn_schedule', 'Jadvalni ko‘rish')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Mashinalar va Yoqilg‘i Sarfi */}
      {activeTab === 'fuel' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t(
                'operations.fleet_fuel_heading',
                'Avtopark Mashinalari va Yoqilg‘i Sarfi Nazorati',
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t(
                'operations.fleet_fuel_desc',
                'Pasport normasi va haqiqiy sarf solishtiruvi (Metan m³, Benzin va Propan L)',
              )}
            </p>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-mono uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">
                    {t('operations.col_car_info', 'Davlat Raqami / Rusumi')}
                  </th>
                  <th className="p-3 font-medium">
                    {t('operations.col_fuel_type', 'Yoqilg‘i Turi')}
                  </th>
                  <th className="p-3 font-medium">
                    {t('operations.col_mileage', 'Bosilgan Masofa')}
                  </th>
                  <th className="p-3 font-medium">
                    {t(
                      'operations.col_norm_vs_actual',
                      'Me’yor vs Haqiqiy (100 km ga)',
                    )}
                  </th>
                  <th className="p-3 font-medium">
                    {t('operations.col_variance', 'Og‘ish (% delta)')}
                  </th>
                  <th className="p-3 font-medium">
                    {t('operations.col_total_cost', 'Jami Xarajat')}
                  </th>
                  <th className="p-3 font-medium text-right">
                    {t('operations.col_action', 'Amal')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredVehicles.map((veh) => {
                  const unit = veh.fuelType === 'methane' ? 'm³' : 'L';
                  const isHighExcess = veh.variancePercent > 15;
                  return (
                    <tr
                      key={veh.id}
                      className="transition-colors hover:bg-muted/20"
                    >
                      <td className="p-3">
                        <span className="font-mono font-bold text-foreground">
                          {veh.plateNumber}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {veh.model} · {veh.branchName}
                        </span>
                        <span className="block text-[10px] text-muted-foreground/80">
                          Instruktor: {veh.primaryInstructorName}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className="capitalize text-[10px] font-mono"
                        >
                          {veh.fuelType} ({unit})
                        </Badge>
                      </td>
                      <td className="p-3 font-mono">
                        {veh.mileageKm.toLocaleString('uz-UZ')} km
                        <span className="block text-[10px] text-muted-foreground">
                          Odometr: {veh.lastOdometerKm.toLocaleString('uz-UZ')}{' '}
                          km
                        </span>
                      </td>
                      <td className="p-3 font-mono">
                        <span className="text-muted-foreground">
                          {veh.normPer100Km} {unit}
                        </span>
                        <span className="mx-1 text-muted-foreground">vs</span>
                        <span
                          className={cn(
                            'font-bold',
                            isHighExcess
                              ? 'text-destructive'
                              : 'text-foreground',
                          )}
                        >
                          {veh.actualPer100Km} {unit}
                        </span>
                      </td>
                      <td className="p-3 font-mono">
                        <span
                          className={cn(
                            'inline-flex items-center gap-0.5 font-bold',
                            isHighExcess
                              ? 'text-destructive'
                              : veh.variancePercent > 0
                                ? 'text-warning'
                                : 'text-emerald-500',
                          )}
                        >
                          {veh.variancePercent > 0 ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {veh.variancePercent > 0
                            ? `+${veh.variancePercent}%`
                            : `${veh.variancePercent}%`}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-foreground font-medium">
                        {veh.totalExpenseUzs.toLocaleString('uz-UZ')} so‘m
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate({ to: '/vehicles' })}
                          className="h-7 px-2 text-xs rounded-md"
                        >
                          <Receipt className="mr-1 h-3.5 w-3.5" />
                          {t('operations.btn_fuel_logs', 'Cheklar')}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredVehicles.map((veh) => {
              const unit = veh.fuelType === 'methane' ? 'm³' : 'L';
              const isHighExcess = veh.variancePercent > 15;
              return (
                <Card
                  key={veh.id}
                  className="p-4 border-border bg-card space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-mono font-bold text-sm text-foreground">
                        {veh.plateNumber}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {veh.model} · {veh.branchName}
                      </p>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">
                        Instruktor: {veh.primaryInstructorName}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-mono',
                        isHighExcess
                          ? 'border-destructive/40 text-destructive bg-destructive/10'
                          : 'border-emerald-500/40 text-emerald-500',
                      )}
                    >
                      {veh.variancePercent > 0
                        ? `+${veh.variancePercent}%`
                        : `${veh.variancePercent}%`}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-mono uppercase">
                        100km sarf
                      </span>
                      <p className="font-mono mt-0.5">
                        <span className="text-muted-foreground">
                          {veh.normPer100Km}
                        </span>
                        {' -> '}
                        <span
                          className={cn(
                            'font-bold',
                            isHighExcess
                              ? 'text-destructive'
                              : 'text-foreground',
                          )}
                        >
                          {veh.actualPer100Km} {unit}
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-mono uppercase">
                        Jami xarajat
                      </span>
                      <p className="font-mono font-bold mt-0.5 text-foreground">
                        {veh.totalExpenseUzs.toLocaleString('uz-UZ')} so‘m
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate({ to: '/vehicles' })}
                      className="h-8 text-xs w-full rounded-md"
                    >
                      <Receipt className="mr-1.5 h-3.5 w-3.5" />
                      {t(
                        'operations.btn_fuel_logs',
                        'Cheklar va Odometr Tarixi',
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Resolution Modal for Director */}
      <Dialog
        open={!!activeAlertModal}
        onOpenChange={(open) => !open && setActiveAlertModal(null)}
      >
        <DialogContent className="sm:max-w-lg border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {t(
                'operations.modal_title',
                'Operatsion Signalni Ko‘rib Chiqish va Chora Ko‘rish',
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t(
                'operations.modal_subtitle',
                'Markaz rahbari tomonidan aniqlangan og‘ishga munosabat bildirish',
              )}
            </DialogDescription>
          </DialogHeader>

          {activeAlertModal && (
            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-muted-foreground uppercase text-[10px]">
                    {t('operations.modal_entity', 'Obyekt / Xodim')}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-mono',
                      activeAlertModal.severity === 'critical'
                        ? 'border-destructive text-destructive'
                        : 'border-warning text-warning',
                    )}
                  >
                    {activeAlertModal.severity.toUpperCase()}
                  </Badge>
                </div>
                <p className="font-semibold text-sm text-foreground">
                  {activeAlertModal.entityName}
                </p>
                <p className="text-muted-foreground">
                  {activeAlertModal.description}
                </p>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-foreground">
                  {t(
                    'operations.modal_select_action',
                    'Ko‘riladigan chora turini tanlang',
                  )}
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted/30 cursor-pointer">
                    <input
                      type="radio"
                      name="resolution_action"
                      value="warn"
                      checked={selectedResolutionAction === 'warn'}
                      onChange={() => setSelectedResolutionAction('warn')}
                      className="text-primary"
                    />
                    <span>
                      {t(
                        'operations.action_warn_instructor',
                        'Instruktorga rasmiy ogohlantirish va tushuntirish so‘rash',
                      )}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted/30 cursor-pointer">
                    <input
                      type="radio"
                      name="resolution_action"
                      value="manager"
                      checked={selectedResolutionAction === 'manager'}
                      onChange={() => setSelectedResolutionAction('manager')}
                      className="text-primary"
                    />
                    <span>
                      {t(
                        'operations.action_assign_manager',
                        'Filial menejeriga joyida tekshirish vazifasini yuklash',
                      )}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted/30 cursor-pointer">
                    <input
                      type="radio"
                      name="resolution_action"
                      value="reassign"
                      checked={selectedResolutionAction === 'reassign'}
                      onChange={() => setSelectedResolutionAction('reassign')}
                      className="text-primary"
                    />
                    <span>
                      {t(
                        'operations.action_reassign',
                        'Ortiqcha talabalarni boshqa instruktorga qayta taqsimlash',
                      )}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted/30 cursor-pointer">
                    <input
                      type="radio"
                      name="resolution_action"
                      value="override"
                      checked={selectedResolutionAction === 'override'}
                      onChange={() => setSelectedResolutionAction('override')}
                      className="text-primary"
                    />
                    <span>
                      {t(
                        'operations.action_approve_override',
                        'Mavsumiy norma sifatida tasdiqlash (konditsioner/qish)',
                      )}
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  {t(
                    'operations.modal_notes',
                    'Rahbar ko‘rsatmasi yoki izohi (ixtiyoriy)',
                  )}
                </label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={t(
                    'operations.modal_notes_placeholder',
                    'Qo‘shimcha ko‘rsatma kiriting...',
                  )}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background p-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveAlertModal(null)}
              className="h-8 text-xs rounded-md"
            >
              {t('operations.modal_cancel', 'Bekor qilish')}
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmResolution}
              className="h-8 text-xs rounded-md bg-primary text-primary-foreground"
            >
              {t('operations.modal_submit', 'Chorani tasdiqlash')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FleetWorkloadOperationsCenter;

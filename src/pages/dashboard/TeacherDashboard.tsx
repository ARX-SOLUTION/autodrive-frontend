import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CalendarDot,
  CaretRight,
  GraduationCap,
  UsersThree,
  Warning,
} from '@phosphor-icons/react';
import { useAuthStore } from '@/store/authStore';
import { useTeacherAnalytics } from '@/services/dashboardService';
import { useLessons } from '@/services/attendanceService';
import { useStudents } from '@/services/studentService';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  AXIS_PROPS,
  CHART_STYLE,
  formatNumber,
  greetingKey,
  KpiCard,
  SectionCard,
} from '@/pages/dashboard/dashboardCards';

// autodrive-vh0.6: extracted out of DashboardPage.tsx (was an inline
// component there). Hero live-caption helpers below are TeacherDashboard-only
// (nothing else in DashboardPage.tsx used them), so they moved wholesale
// rather than through dashboardCards.tsx's shared-helper route.
const UZ_TIMEZONE = 'Asia/Tashkent';
const uzNumericDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: UZ_TIMEZONE,
});
const UZ_MONTH_ABBR = [
  'YAN',
  'FEV',
  'MAR',
  'APR',
  'MAY',
  'IYUN',
  'IYUL',
  'AVG',
  'SEN',
  'OKT',
  'NOY',
  'DEK',
];
const liveDayMonth = () => {
  const [, month, day] = uzNumericDateFormatter.format(new Date()).split('-');
  return `${day} ${UZ_MONTH_ABBR[Number(month) - 1]}`;
};

const RESULT_COLORS = [
  'hsl(var(--info))',
  'hsl(var(--success))',
  'hsl(var(--destructive))',
];

// ponytail: fixed page-size ceilings, not full pagination -- a single
// teacher's own (server-scoped) roster/lesson list is small. GetLessonsQueryDto
// caps limit at 100 server-side, so 100 is also the real max here. Upgrade
// path if a teacher ever exceeds these: useStudentsPage + { hasDebt: true }
// + meta.total for an exact count instead of a client-side filter/length.
const STUDENTS_FETCH_LIMIT = 200;
const LESSONS_FETCH_LIMIT = 100;
const UPCOMING_LESSONS_SHOWN = 5;

const TeacherDashboard = () => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: analytics, isLoading: analyticsLoading } =
    useTeacherAnalytics();
  const { data: lessonsPage, isLoading: lessonsLoading } = useLessons(
    1,
    LESSONS_FETCH_LIMIT,
  );
  const { data: students, isLoading: studentsLoading } = useStudents(
    undefined,
    user?.branch_id,
    1,
    STUDENTS_FETCH_LIMIT,
  );

  const todayUZ = uzNumericDateFormatter.format(new Date());
  const lessons = useMemo(() => lessonsPage?.data ?? [], [lessonsPage]);

  // "date >= today" (calendar day, Asia/Tashkent) deliberately includes
  // today's already-past-clock-time lessons -- a teacher may still need to
  // mark attendance for an earlier-today lesson, so it shouldn't vanish from
  // the list at the stroke of its own start time.
  const upcomingLessons = useMemo(
    () =>
      lessons
        .filter(
          (l) => uzNumericDateFormatter.format(new Date(l.date)) >= todayUZ,
        )
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        ),
    [lessons, todayUZ],
  );
  const todayLessonsCount = useMemo(
    () =>
      lessons.filter(
        (l) => uzNumericDateFormatter.format(new Date(l.date)) === todayUZ,
      ).length,
    [lessons, todayUZ],
  );
  // Binary paid/owing signal only (autodrive-vh0.5 hard rule): count rows
  // where has_debt === true, never a debt amount. See src/types/student.ts
  // and DebtStatusBadge for the same convention.
  const owingStudentsCount = useMemo(
    () => (students ?? []).filter((s) => s.has_debt === true).length,
    [students],
  );

  if (analyticsLoading || lessonsLoading || studentsLoading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  const noGroups = analytics.active_groups === 0;

  const resultData = [
    {
      name: t('dashboard.result_studying'),
      value: analytics.result_stats.oqimoqda,
    },
    {
      name: t('dashboard.result_passed'),
      value: analytics.result_stats.topshirdi,
    },
    {
      name: t('dashboard.result_failed'),
      value: analytics.result_stats.yiqildi,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          <span
            className="h-[7px] w-[7px] shrink-0 rounded-full bg-success shadow-[0_0_0_3px_hsl(var(--success)/0.2)] motion-safe:animate-[pulse-dot_2.4s_ease-in-out_infinite]"
            aria-hidden="true"
          />
          {t('dashboard.live_label')} ·{' '}
          {t('dashboard.v2.live_caption_tz', 'Asia/Tashkent')} ·{' '}
          {liveDayMonth()}
        </div>
        <h1 className="mt-2 font-heading text-[40px] font-extrabold leading-[1.1] tracking-[-0.025em] text-balance">
          {t(greetingKey())}
          {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] text-muted-foreground text-pretty">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {noGroups ? (
        <EmptyState
          title={t('dashboard.teacher.no_groups_title')}
          description={t('dashboard.teacher.no_groups_desc')}
        />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1.7fr_1fr_1fr_1fr]">
            <KpiCard
              label={t('dashboard.teacher.kpi_my_groups')}
              value={formatNumber(analytics.active_groups)}
              icon={<UsersThree className="h-4 w-4" />}
              tone="info"
              lead
            />
            <KpiCard
              label={t('dashboard.teacher.kpi_my_students')}
              value={formatNumber(analytics.total_students)}
              icon={<GraduationCap className="h-4 w-4" />}
              tone="primary"
            />
            <KpiCard
              label={t('dashboard.teacher.kpi_owing_students')}
              value={formatNumber(owingStudentsCount)}
              icon={<Warning className="h-4 w-4" />}
              tone="warning"
            />
            <KpiCard
              label={t('dashboard.teacher.kpi_today_lessons')}
              value={formatNumber(todayLessonsCount)}
              icon={<CalendarDot className="h-4 w-4" />}
              tone="success"
            />
          </section>

          <SectionCard
            title={t('dashboard.teacher.upcoming_title')}
            subtitle={t('dashboard.teacher.upcoming_subtitle')}
            className="cv-auto"
          >
            {upcomingLessons.length === 0 ? (
              <EmptyState
                title={t('dashboard.teacher.upcoming_empty_title')}
                description={t('dashboard.teacher.upcoming_empty_desc')}
              />
            ) : (
              <ul className="divide-y divide-border">
                {upcomingLessons
                  .slice(0, UPCOMING_LESSONS_SHOWN)
                  .map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        to={`/attendance?lesson=${lesson.id}`}
                        className="group flex items-center gap-3 rounded-lg py-2.5 motion-safe:transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="w-24 shrink-0 font-mono text-xs font-semibold tabular-nums text-muted-foreground">
                          {format(new Date(lesson.date), 'dd.MM, HH:mm')}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {lesson.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {lesson.group_name || t('attendance.unknown_group')}
                          </span>
                        </span>
                        <CaretRight
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title={t('dashboard.result_title')} className="cv-auto">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={resultData} layout="vertical" barSize={24}>
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="hsl(var(--border))"
                  horizontal={false}
                />
                <XAxis type="number" {...AXIS_PROPS} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  {...AXIS_PROPS}
                  width={90}
                />
                <Tooltip
                  {...CHART_STYLE}
                  formatter={(v: number) => [formatNumber(v), '']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {resultData.map((_, i) => (
                    <Cell key={i} fill={RESULT_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </>
      )}
    </div>
  );
};

export default TeacherDashboard;

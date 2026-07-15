import { useState } from 'react';
import {
  Link,
  useParams,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { StudentExamsTab } from '@/components/ui/StudentExamsTab';
import StudentModal, {
  type CreateStudentPayload,
} from '@/components/ui/StudentModal';
import PaymentModal, {
  type CreatePaymentPayload,
} from '@/components/ui/PaymentModal';
import { useStudent, useUpdateStudent } from '@/services/studentService';
import {
  useStudentPayments,
  useCreatePayment,
} from '@/services/paymentService';
import { useOperators } from '@/services/operatorService';
import { useAttendanceHistory } from '@/services/attendanceService';
import { useCan } from '@/hooks/useCan';
import { statusColors } from '@/lib/attendanceStatus';
import { extractErrorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import type { PaymentMethod } from '@/types/student';

const StudentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const { data: student, isLoading, isError } = useStudent(id);
  const canRecordPayment = useCan('recordPayment');
  const { data: operators } = useOperators();

  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const updateStudent = useUpdateStudent();
  const createPayment = useCreatePayment();

  const methodLabels: Record<PaymentMethod, string> = {
    naqd: t('payments.method.naqd'),
    karta: t('payments.method.karta'),
    perechisleniya: t('payments.method.perechisleniya'),
  };

  const handleUpdate = (data: CreateStudentPayload) => {
    if (!id) return;
    updateStudent.mutate(
      { id, ...data },
      {
        onSuccess: () => {
          toast.success(t('students.updated'));
          setEditOpen(false);
        },
        onError: (err) =>
          toast.error(extractErrorMessage(err, t('common.error'))),
      },
    );
  };

  const handlePayment = (data: CreatePaymentPayload) => {
    createPayment.mutate(data, {
      onSuccess: () => {
        toast.success(t('payments.added'));
        setPayOpen(false);
      },
      onError: (err) =>
        toast.error(extractErrorMessage(err, t('common.error'))),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="space-y-6">
        <BackButton
          onClick={() => navigate('/students')}
          label={t('students.title')}
        />
        <EmptyState title={t('common.not_found')} />
      </div>
    );
  }

  const fullName = `${student.last_name} ${student.first_name}`.trim();
  const initialTab =
    searchParams.get('tab') === 'payments' && canRecordPayment
      ? 'payments'
      : 'info';

  return (
    <div className="space-y-6">
      <BackButton
        onClick={() => navigate('/students')}
        label={t('students.title')}
      />

      {/* Header */}
      <div className="glass-card flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="space-y-2">
          <h1
            className="font-heading text-2xl font-bold text-balance"
            style={{ viewTransitionName: `student-${student.id}` }}
          >
            {fullName}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{student.phone}</span>
            <span>·</span>
            <span>{student.branch_name ?? t('common.na')}</span>
            {student.group_name && (
              <>
                <span>·</span>
                <span>{student.group_name}</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {student.debt > 0 ? (
              <Badge variant="destructive">
                {t('students.detail.debt')}: {formatMoney(student.debt)}
              </Badge>
            ) : student.debt < 0 ? (
              <Badge variant="secondary" className="text-success">
                {t('students.credit_label')}:{' '}
                {formatMoney(Math.abs(student.debt))}
              </Badge>
            ) : (
              <Badge variant="secondary">{t('students.no_debt')}</Badge>
            )}
            <Badge variant="outline">
              {t(`students.course.${student.course_type}`)}
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="h-4 w-4" /> {t('common.edit')}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="info">{t('common.tab_info')}</TabsTrigger>
          {canRecordPayment && (
            <TabsTrigger value="payments">
              {t('students.detail.tab_payments')}
            </TabsTrigger>
          )}
          <TabsTrigger value="exams">
            {t('students.detail.tab_exams')}
          </TabsTrigger>
          <TabsTrigger value="attendance">
            {t('students.detail.tab_attendance')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <dl className="glass-card grid grid-cols-1 gap-x-8 gap-y-3 p-5 text-sm sm:grid-cols-2">
            <Field label={t('common.phone')} value={student.phone} />
            <Field
              label={t('students.detail.branch')}
              value={student.branch_name ?? t('common.na')}
            />
            <Field
              label={t('students.detail.group')}
              value={student.group_name ?? t('common.na')}
            />
            <Field
              label={t('students.detail.course')}
              value={t(`students.course.${student.course_type}`)}
            />
            <Field
              label={t('students.detail.total_price')}
              value={formatMoney(student.total_price)}
            />
            <Field
              label={t('students.detail.debt')}
              value={
                student.debt < 0 ? (
                  <span className="text-success">
                    {t('students.credit_label')}:{' '}
                    {formatMoney(Math.abs(student.debt))}
                  </span>
                ) : (
                  formatMoney(student.debt)
                )
              }
            />
            <Field
              label={t('students.payment_method')}
              value={
                student.payment_method
                  ? methodLabels[student.payment_method]
                  : t('common.na')
              }
            />
            <Field
              label={t('students.has_document')}
              value={
                <span
                  className={
                    student.has_document ? 'text-success' : 'text-destructive'
                  }
                >
                  {student.has_document ? '+' : '-'}
                </span>
              }
            />
            <Field
              label={t('students.amount_paid')}
              value={formatMoney(student.amount_paid)}
            />
            <Field
              label={t('students.operator')}
              value={student.registered_by ?? t('common.na')}
            />
            <Field label={t('students.notes')} value={student.notes || '—'} />
            <Field
              label={t('students.detail.referrals_count')}
              value={String(student.referrals_count ?? 0)}
              to={`/students?referred_by_student_id=${student.id}`}
            />
          </dl>
        </TabsContent>

        {canRecordPayment && (
          <TabsContent value="payments">
            <PaymentsTab
              studentId={student.id}
              methodLabels={methodLabels}
              onAdd={() => setPayOpen(true)}
              addLabel={t('payments.add')}
              emptyLabel={t('payments.empty')}
              cols={{
                date: t('payments.table.date'),
                amount: t('payments.table.amount'),
                method: t('payments.table.method'),
                operator: t('payments.table.operator'),
              }}
            />
          </TabsContent>
        )}

        <TabsContent value="exams">
          <div className="glass-card p-5">
            <StudentExamsTab student={student} />
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceHistoryTab studentId={student.id} />
        </TabsContent>
      </Tabs>

      <StudentModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        loading={updateStudent.isPending}
        student={student}
        courseType={student.course_type}
        operators={operators || []}
      />

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        onSubmit={handlePayment}
        loading={createPayment.isPending}
        lockedStudentId={student.id}
        lockedStudentName={fullName}
      />
    </div>
  );
};

const BackButton = ({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
  >
    <ArrowLeft className="h-4 w-4" /> {label}
  </button>
);

const Field = ({
  label,
  value,
  to,
}: {
  label: string;
  value: React.ReactNode;
  to?: string;
}) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd>
      {to ? (
        <Link
          to={to}
          className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {value}
        </Link>
      ) : (
        value
      )}
    </dd>
  </div>
);

const PaymentsTab = ({
  studentId,
  methodLabels,
  onAdd,
  addLabel,
  emptyLabel,
  cols,
}: {
  studentId: string;
  methodLabels: Record<PaymentMethod, string>;
  onAdd: () => void;
  addLabel: string;
  emptyLabel: string;
  cols: { date: string; amount: string; method: string; operator: string };
}) => {
  const { data, isLoading } = useStudentPayments(studentId);
  const rows = data?.data ?? [];

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-end p-3">
        <Button size="sm" className="gap-2" onClick={onAdd}>
          <Plus className="h-4 w-4" /> {addLabel}
        </Button>
      </div>
      {isLoading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <div className="p-6">
          <EmptyState title={emptyLabel} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 font-medium">{cols.date}</th>
                <th className="px-4 py-2 text-right font-medium">
                  {cols.amount}
                </th>
                <th className="px-4 py-2 font-medium">{cols.method}</th>
                <th className="px-4 py-2 font-medium">{cols.operator}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">{p.date?.slice(0, 10)}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {formatMoney(p.amount_paid)}
                  </td>
                  <td className="px-4 py-2">
                    {methodLabels[p.payment_method]}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {p.recorded_by ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const AttendanceHistoryTab = ({ studentId }: { studentId: string }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useAttendanceHistory(studentId);
  const rows = data ?? [];

  return (
    <div className="glass-card overflow-hidden">
      {isLoading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <div className="p-6">
          <EmptyState title={t('common.no_data')} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 font-medium">
                  {t('students.detail.date')}
                </th>
                <th className="px-4 py-2 font-medium">
                  {t('attendance.lesson_group')}
                </th>
                <th className="px-4 py-2 font-medium">
                  {t('attendance.table_status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-2">{record.date?.slice(0, 10)}</td>
                  <td className="px-4 py-2">{record.group_name}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[record.status]}`}
                    >
                      {t(`attendance.status_${record.status}`)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentDetailPage;

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  Phone,
  EnvelopeSimple,
  Building,
  GraduationCap,
  Tag,
  User,
  CheckCircle,
  WarningCircle,
  ArrowSquareOut,
  CaretDown,
  CaretUp,
  CircleNotch,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatPhone } from '@/lib/phoneFormater';
import { cn } from '@/lib/utils';
import { useOperators } from '@/features/staff/api/operatorService';
import { useAssignLeadMutation } from '../queries/leadsQueries';
import type { Lead } from '../types/leads.types';

export interface LeadInfoCardProps {
  lead: Lead;
  className?: string;
}

export const LeadInfoCard = ({ lead, className }: LeadInfoCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: operators = [] } = useOperators();
  const assignMutation = useAssignLeadMutation();

  const [showUtm, setShowUtm] = useState(false);

  const handleAssign = (userId: string) => {
    const nextAssigneeId = userId === 'unassigned' ? null : userId;
    assignMutation.mutate(
      {
        id: lead.id,
        payload: { assigneeUserId: nextAssigneeId },
      },
      {
        onSuccess: () => {
          toast.success(
            t(
              'leads.assign_success',
              'Lid mas‘ul xodimga muvaffaqiyatli biriktirildi',
            ),
          );
        },
        onError: (err) => {
          toast.error(
            (err as Error).message ||
              t(
                'leads.assign_error',
                'Xodimni biriktirishda xatolik yuz berdi',
              ),
          );
        },
      },
    );
  };

  const hasUtm =
    lead.utmSource ||
    lead.utmMedium ||
    lead.utmCampaign ||
    lead.utmContent ||
    lead.utmTerm;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Converted Student Banner */}
      {lead.studentId && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40 p-4 text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-sm">
                  {t('leads.converted_to_student', 'O‘quvchiga aylantirilgan')}
                </p>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                  {t(
                    'leads.student_created_desc',
                    'Ushbu lid o‘quvchi sifatida ro‘yxatdan o‘tgan',
                  )}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 border-emerald-400/60 text-xs bg-background hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
              onClick={() =>
                void navigate({
                  to: '/students/$id',
                  params: { id: lead.studentId! },
                })
              }
            >
              <span>{t('students.open_profile', 'Profilni ochish')}</span>
              <ArrowSquareOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Lost Reason Banner */}
      {lead.lostReason && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 p-4 text-xs text-rose-900 dark:text-rose-200">
          <div className="flex items-start gap-2">
            <WarningCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-sm">
                {t('leads.lost_reason', 'Yo‘qotish sababi')}:{' '}
                {t(`leads.lost_reasons.${lead.lostReason}`, lead.lostReason)}
              </p>
              {lead.lostReasonOther && (
                <p className="text-rose-800/90 dark:text-rose-300/90">
                  {lead.lostReasonOther}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Details Card */}
      <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
        <h3 className="font-semibold text-sm text-foreground">
          {t('leads.lead_details', 'Lid parametrlari')}
        </h3>

        {/* Contact Info */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{t('common.phone', 'Telefon')}</span>
            </span>
            <a
              href={`tel:${lead.phone}`}
              className="font-mono font-medium text-foreground hover:text-primary transition-colors"
            >
              {formatPhone(lead.phone)}
            </a>
          </div>

          {lead.email && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <EnvelopeSimple className="h-4 w-4 shrink-0" />
                <span>{t('common.email', 'Email')}</span>
              </span>
              <a
                href={`mailto:${lead.email}`}
                className="text-foreground hover:text-primary transition-colors truncate max-w-[180px]"
              >
                {lead.email}
              </a>
            </div>
          )}

          {lead.branchName && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Building className="h-4 w-4 shrink-0" />
                <span>{t('common.branch', 'Filial')}</span>
              </span>
              <span className="font-medium text-foreground">
                {lead.branchName}
              </span>
            </div>
          )}

          {lead.category && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Tag className="h-4 w-4 shrink-0" />
                <span>{t('vehicles.category', 'Toifa')}</span>
              </span>
              <span className="rounded-md bg-secondary px-2 py-0.5 font-bold text-secondary-foreground">
                {lead.category}
              </span>
            </div>
          )}

          {lead.courseType && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <GraduationCap className="h-4 w-4 shrink-0" />
                <span>{t('courses.course_type', 'Kurs turi')}</span>
              </span>
              <span className="font-medium capitalize text-foreground">
                {lead.courseType === 'avto_maktab'
                  ? t('courses.avto_maktab', 'Avto maktab')
                  : t('courses.tezkor', 'Tezkor')}
              </span>
            </div>
          )}

          {lead.desiredGroupName && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <GraduationCap className="h-4 w-4 shrink-0" />
                <span>{t('leads.desired_group', 'Qiziqqan guruhi')}</span>
              </span>
              <span className="font-medium text-foreground">
                {lead.desiredGroupName}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Tag className="h-4 w-4 shrink-0" />
              <span>{t('leads.source', 'Manba')}</span>
            </span>
            <span className="font-medium capitalize text-foreground">
              {t(`leads.sources.${lead.source}`, lead.source)}
              {lead.sourceOther ? ` (${lead.sourceOther})` : ''}
            </span>
          </div>

          {lead.referrerStudentName && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {t('leads.referrer_student', 'Tavsiya qilgan o‘quvchi')}
              </span>
              <span className="font-medium text-foreground">
                {lead.referrerStudentName}
              </span>
            </div>
          )}

          {lead.referrerStaffName && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {t('leads.referrer_staff', 'Tavsiya qilgan xodim')}
              </span>
              <span className="font-medium text-foreground">
                {lead.referrerStaffName}
              </span>
            </div>
          )}
        </div>

        {/* Assignee Selector */}
        <div className="pt-3 border-t border-border/60 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>{t('leads.assignee', 'Biriktirilgan mas‘ul')}:</span>
            </span>
            {assignMutation.isPending && (
              <CircleNotch className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
          </div>

          <Select
            value={lead.assigneeUserId || 'unassigned'}
            onValueChange={handleAssign}
            disabled={assignMutation.isPending}
          >
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">
                {t('leads.unassigned', 'Biriktirilmagan')}
              </SelectItem>
              {operators.map((op) => (
                <SelectItem key={op.id} value={op.id}>
                  {op.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Note Box */}
        {lead.note && (
          <div className="pt-3 border-t border-border/60 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              {t('common.note', 'Qayd')}:
            </span>
            <p className="text-xs text-foreground bg-muted/40 p-2.5 rounded-lg whitespace-pre-wrap leading-relaxed">
              {lead.note}
            </p>
          </div>
        )}

        {/* UTM Parameters Collapsible */}
        {hasUtm && (
          <div className="pt-3 border-t border-border/60 space-y-2">
            <button
              type="button"
              onClick={() => setShowUtm((prev) => !prev)}
              className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{t('leads.marketing_utm', 'Marketing UTM teglari')}</span>
              {showUtm ? (
                <CaretUp className="h-3.5 w-3.5" />
              ) : (
                <CaretDown className="h-3.5 w-3.5" />
              )}
            </button>

            {showUtm && (
              <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] space-y-1 font-mono text-muted-foreground">
                {lead.utmSource && <div>source: {lead.utmSource}</div>}
                {lead.utmMedium && <div>medium: {lead.utmMedium}</div>}
                {lead.utmCampaign && <div>campaign: {lead.utmCampaign}</div>}
                {lead.utmContent && <div>content: {lead.utmContent}</div>}
                {lead.utmTerm && <div>term: {lead.utmTerm}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

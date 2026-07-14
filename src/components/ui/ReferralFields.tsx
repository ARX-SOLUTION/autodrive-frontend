import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { useStudents } from '@/services/studentService';
import { useTeachers } from '@/services/teacherService';
import { useOperators } from '@/services/operatorService';
import type { LeadSource } from '@/types/student';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const LEAD_SOURCES: LeadSource[] = [
  'referral',
  'instagram',
  'directory_map',
  'telegram',
  'walk_in',
  'olx',
  'other',
];

type ReferrerType = 'none' | 'student' | 'staff';

interface ReferralFieldsProps {
  branchId?: string;
  leadSource?: LeadSource;
  onLeadSourceChange: (v: LeadSource | undefined) => void;
  leadSourceOther?: string;
  onLeadSourceOtherChange: (v: string) => void;
  referredByStudentId?: string;
  referredByUserId?: string;
  onReferrerChange: (next: { studentId?: string; userId?: string }) => void;
}

const ReferralFields = ({
  branchId,
  leadSource,
  onLeadSourceChange,
  leadSourceOther,
  onLeadSourceOtherChange,
  referredByStudentId,
  referredByUserId,
  onReferrerChange,
}: ReferralFieldsProps) => {
  const { t } = useTranslation();

  const [referrerType, setReferrerType] = useState<ReferrerType>(
    referredByStudentId ? 'student' : referredByUserId ? 'staff' : 'none',
  );
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const debouncedStudentSearch = useDebounce(studentSearch, 300);

  const { data: students } = useStudents(
    undefined,
    branchId,
    1,
    50,
    undefined,
    { search: debouncedStudentSearch, enabled: referrerType === 'student' },
  );
  const { data: teachers } = useTeachers();
  const { data: operators } = useOperators();
  const staff = [...(teachers || []), ...(operators || [])];

  const selectedStudent = (students || []).find(
    (s) => s.id === referredByStudentId,
  );

  const handleReferrerTypeChange = (v: ReferrerType) => {
    setReferrerType(v);
    // Only one referrer id is ever kept — clear both on any type change.
    onReferrerChange({ studentId: undefined, userId: undefined });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('students.referral.lead_source_label')}
          </label>
          <Select
            value={leadSource || undefined}
            onValueChange={(v) => onLeadSourceChange(v as LeadSource)}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={t('students.referral.lead_source_placeholder')}
              />
            </SelectTrigger>
            <SelectContent>
              {LEAD_SOURCES.map((src) => (
                <SelectItem key={src} value={src}>
                  {t(`students.lead_source.${src}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {leadSource === 'other' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('students.lead_source.other')}
            </label>
            <Input
              value={leadSourceOther || ''}
              onChange={(e) => onLeadSourceOtherChange(e.target.value)}
              placeholder={t('students.referral.lead_source_other_placeholder')}
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('students.referral.referrer_label')}
          </label>
          <Select
            value={referrerType}
            onValueChange={(v) => handleReferrerTypeChange(v as ReferrerType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                {t('students.referral.referrer_none')}
              </SelectItem>
              <SelectItem value="student">
                {t('students.referral.referrer_student')}
              </SelectItem>
              <SelectItem value="staff">
                {t('students.referral.referrer_staff')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {referrerType === 'student' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('students.referral.referrer_student')}
            </label>
            <Popover
              open={studentPickerOpen}
              onOpenChange={setStudentPickerOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={studentPickerOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedStudent
                    ? `${selectedStudent.last_name} ${selectedStudent.first_name}`
                    : t('students.referral.referrer_student_placeholder')}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t('students.referral.referrer_search')}
                    value={studentSearch}
                    onValueChange={setStudentSearch}
                  />
                  <CommandList>
                    <CommandEmpty>{t('common.no_data')}</CommandEmpty>
                    <CommandGroup>
                      {(students || []).map((s) => (
                        <CommandItem
                          key={s.id}
                          value={s.id}
                          onSelect={() => {
                            onReferrerChange({ studentId: s.id });
                            setStudentPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              referredByStudentId === s.id
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          {s.last_name} {s.first_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {referrerType === 'staff' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('students.referral.referrer_staff')}
            </label>
            <Select
              value={referredByUserId || undefined}
              onValueChange={(v) => onReferrerChange({ userId: v })}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t(
                    'students.referral.referrer_staff_placeholder',
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {staff.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralFields;

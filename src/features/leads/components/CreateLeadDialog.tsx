import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Warning,
  CircleNotch,
  Check,
  CaretUpDown,
} from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { useBranches } from '@/features/branches/api/branchService';
import { useAuthStore } from '@/store/authStore';
import { useTeachers } from '@/features/staff/api/teacherService';
import { useOperators } from '@/features/staff/api/operatorService';
import { useStudents } from '@/features/students/api/studentService';
import {
  useCreateLeadMutation,
  useLeadStagesQuery,
  useLeadSourcesQuery,
} from '../queries/leadsQueries';
import { leadsApi } from '../api/leadsApi';
import type {
  LeadSource,
  CourseType,
  Category,
  DuplicateCheckResult,
} from '../types/leads.types';

type ReferrerType = 'none' | 'student' | 'staff';

export interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStageId?: string;
  onCreated?: (leadId: string) => void;
}

const SOURCES: LeadSource[] = [
  'telegram',
  'instagram',
  'referral',
  'directory_map',
  'olx',
  'walk_in',
  'other',
];

const CATEGORIES: Category[] = ['A', 'B', 'BC', 'C', 'D', 'E'];
const COURSE_TYPES: CourseType[] = ['tezkor', 'avto_maktab'];

export const CreateLeadDialog = ({
  open,
  onOpenChange,
  defaultStageId,
  onCreated,
}: CreateLeadDialogProps) => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: branches = [] } = useBranches();
  const { data: stages = [] } = useLeadStagesQuery();
  const createMutation = useCreateLeadMutation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const branchId = selectedBranchId ?? user?.branch_id ?? branches[0]?.id ?? '';

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const stageId = selectedStageId ?? defaultStageId ?? stages[0]?.id ?? '';

  const [source, setSource] = useState<LeadSource>('telegram');
  const [sourceOther, setSourceOther] = useState('');
  const [courseType, setCourseType] = useState<CourseType | ''>('');
  const [category, setCategory] = useState<Category | ''>('');
  const [note, setNote] = useState('');

  // Referrer state
  const [referrerType, setReferrerType] = useState<ReferrerType>('none');
  const [referrerStudentId, setReferrerStudentId] = useState<
    string | undefined
  >(undefined);
  const [referrerStaffId, setReferrerStaffId] = useState<string | undefined>(
    undefined,
  );
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const debouncedStudentSearch = useDebounce(studentSearch, 300);

  const { data: leadSources = [] } = useLeadSourcesQuery({ enabled: open });
  const customSources = leadSources.filter((s) => !s.isSystem);
  const { data: teachers } = useTeachers();
  const { data: operators } = useOperators();
  const staff = [...(teachers ?? []), ...(operators ?? [])];
  const { data: students = [] } = useStudents(
    undefined,
    branchId || undefined,
    1,
    50,
    undefined,
    {
      search: debouncedStudentSearch,
      enabled: referrerType === 'student' && open,
    },
  );
  const selectedStudent = students.find((s) => s.id === referrerStudentId);

  // Duplicate warning state
  const [duplicateResult, setDuplicateResult] =
    useState<DuplicateCheckResult | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [acknowledgedDuplicate, setAcknowledgedDuplicate] = useState(false);

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (val.replace(/\D/g, '').length < 9) {
      setDuplicateResult(null);
    }
  };

  // Debounced duplicate check on phone change
  useEffect(() => {
    const rawDigits = phone.replace(/\D/g, '');
    if (rawDigits.length < 9 || !branchId) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingDuplicate(true);
      try {
        const res = await leadsApi.checkDuplicate({
          phone,
          branchId,
        });
        setDuplicateResult(res.hasDuplicate ? res : null);
      } catch {
        // ignore duplicate check failure
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [phone, branchId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !phone.trim() || !branchId) {
      toast.error(
        t('leads.fill_required', 'Iltimos, majburiy maydonlarni to‘ldiring'),
      );
      return;
    }

    createMutation.mutate(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phone: phone.trim(),
        branchId,
        stageId: stageId || undefined,
        source,
        sourceOther: source === 'other' ? sourceOther.trim() : undefined,
        courseType: courseType || undefined,
        category: category || undefined,
        note: note.trim() || undefined,
        referrerStudentId,
        referrerStaffId,
      },
      {
        onSuccess: (created) => {
          toast.success(
            t('leads.created_success', 'Yangi lid muvaffaqiyatli qo‘shildi'),
          );
          onOpenChange(false);
          resetForm();
          onCreated?.(created.id);
        },
        onError: (err) => {
          toast.error(
            (err as Error).message ||
              t('leads.create_error', 'Lid qo‘shishda xatolik yuz berdi'),
          );
        },
      },
    );
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setPhone('+998');
    setSelectedBranchId(null);
    setSelectedStageId(null);
    setSource('telegram');
    setSourceOther('');
    setCourseType('');
    setCategory('');
    setNote('');
    setReferrerType('none');
    setReferrerStudentId(undefined);
    setReferrerStaffId(undefined);
    setStudentSearch('');
    setDuplicateResult(null);
    setAcknowledgedDuplicate(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) resetForm();
      }}
    >
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {t('leads.create_lead', 'Yangi lid qo‘shish')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'leads.create_lead_desc',
                'Yangi murojaat yoki qiziqish bildirgan mijoz ma‘lumotlarini kiriting.',
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Duplicate Alert Banner */}
            {duplicateResult?.hasDuplicate && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-start gap-2.5">
                  <Warning className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <p className="font-semibold text-sm">
                      {t('leads.duplicate_detected', 'Dublikat topildi!')}
                    </p>
                    {duplicateResult.duplicateLead && (
                      <p>
                        {t('leads.duplicate_lead_warning', {
                          name: `${duplicateResult.duplicateLead.firstName} ${duplicateResult.duplicateLead.lastName || ''}`.trim(),
                          stage: duplicateResult.duplicateLead.stageName,
                          defaultValue: `Ushbu telefon raqamli lid mavjud: ${duplicateResult.duplicateLead.firstName} (${duplicateResult.duplicateLead.stageName})`,
                        })}
                      </p>
                    )}
                    {duplicateResult.duplicateStudent && (
                      <p>
                        {t('leads.duplicate_student_warning', {
                          name: `${duplicateResult.duplicateStudent.firstName} ${duplicateResult.duplicateStudent.lastName}`,
                          defaultValue: `Ushbu telefon raqamli o‘quvchi allaqachon mavjud: ${duplicateResult.duplicateStudent.firstName} ${duplicateResult.duplicateStudent.lastName}`,
                        })}
                      </p>
                    )}

                    <div className="pt-2 flex items-center gap-2">
                      <label
                        htmlFor="ack-duplicate-checkbox"
                        className="flex items-center gap-2 cursor-pointer font-medium select-none"
                      >
                        <input
                          id="ack-duplicate-checkbox"
                          type="checkbox"
                          checked={acknowledgedDuplicate}
                          onChange={(e) =>
                            setAcknowledgedDuplicate(e.target.checked)
                          }
                          className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                        />
                        <span>
                          {t('leads.proceed_anyway', 'Baribir davom etish')}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lead-first-name">
                  {t('common.first_name', 'Ism')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lead-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ali"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-last-name">
                  {t('common.last_name', 'Familiya')}
                </Label>
                <Input
                  id="lead-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Valiyev"
                />
              </div>
            </div>

            {/* Phone & Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lead-phone">
                    {t('common.phone', 'Telefon')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  {isCheckingDuplicate && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <CircleNotch className="h-3 w-3 animate-spin" />
                      <span>Tekshirilmoqda...</span>
                    </span>
                  )}
                </div>
                <Input
                  id="lead-phone"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="+998901234567"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-branch">
                  {t('common.branch', 'Filial')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Select value={branchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger id="lead-branch" className="w-full">
                    <SelectValue
                      placeholder={t(
                        'common.select_branch',
                        'Filialni tanlang',
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stage & Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lead-stage">
                  {t('leads.stage', 'Bosqich')}
                </Label>
                <Select value={stageId} onValueChange={setSelectedStageId}>
                  <SelectTrigger id="lead-stage" className="w-full">
                    <SelectValue
                      placeholder={t('leads.select_stage', 'Bosqichni tanlang')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          <span>{s.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-source">
                  {t('leads.source', 'Manba')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={source}
                  onValueChange={(val) => setSource(val as LeadSource)}
                >
                  <SelectTrigger id="lead-source" className="w-full">
                    <SelectValue
                      placeholder={t('leads.select_source', 'Manbani tanlang')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`leads.sources.${s}`, s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Other Source detail if source === 'other' */}
            {source === 'other' && (
              <div className="space-y-1.5">
                <Label htmlFor="lead-source-other">
                  {t('leads.source_other', 'Boshqa manba tafsiloti')}
                </Label>
                <Input
                  id="lead-source-other"
                  value={sourceOther}
                  onChange={(e) => setSourceOther(e.target.value)}
                  placeholder="Ko‘cha banneri, do‘stim..."
                />
              </div>
            )}

            {/* Custom sources from company settings */}
            {customSources.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="lead-source-custom">
                  {t('leads.custom_source_label', 'Kompaniya manbalari')}
                </Label>
                <Select
                  value={
                    source === 'other' && sourceOther
                      ? (customSources.find((cs) => cs.name === sourceOther)
                          ?.id ?? '')
                      : ''
                  }
                  onValueChange={(id) => {
                    const found = customSources.find((cs) => cs.id === id);
                    if (found) {
                      setSource('other');
                      setSourceOther(found.name);
                    }
                  }}
                >
                  <SelectTrigger id="lead-source-custom" className="w-full">
                    <SelectValue
                      placeholder={t(
                        'leads.select_custom_source',
                        'Kompaniya manbasini tanlang',
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {customSources.map((cs) => (
                      <SelectItem key={cs.id} value={cs.id}>
                        {cs.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Referrer - who recommended this lead */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lead-referrer-type">
                  {t('leads.referrer_type', 'Tavsiya qilgan')}
                </Label>
                <Select
                  value={referrerType}
                  onValueChange={(v) => {
                    setReferrerType(v as ReferrerType);
                    setReferrerStudentId(undefined);
                    setReferrerStaffId(undefined);
                    setStudentSearch('');
                  }}
                >
                  <SelectTrigger id="lead-referrer-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t('leads.referrer_none', 'Tavsiya yo\u2018q')}
                    </SelectItem>
                    <SelectItem value="student">
                      {t('leads.referrer_student', 'O\u2018quvchi')}
                    </SelectItem>
                    <SelectItem value="staff">
                      {t('leads.referrer_staff', 'Xodim')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {referrerType === 'student' && (
                <div className="space-y-1.5">
                  <Label>{t('leads.referrer_student', 'O\u2018quvchi')}</Label>
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
                        className="w-full justify-between font-normal min-h-[44px]"
                      >
                        {selectedStudent
                          ? `${selectedStudent.last_name ?? ''} ${selectedStudent.first_name}`.trim()
                          : t(
                              'leads.select_student',
                              'O\u2018quvchini tanlang',
                            )}
                        <CaretUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder={t('common.search', 'Qidirish...')}
                          value={studentSearch}
                          onValueChange={setStudentSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {t('common.no_data', 'Ma\u2018lumot topilmadi')}
                          </CommandEmpty>
                          <CommandGroup>
                            {students.map((s) => (
                              <CommandItem
                                key={s.id}
                                value={s.id}
                                onSelect={() => {
                                  setReferrerStudentId(s.id);
                                  setStudentPickerOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    referrerStudentId === s.id
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
                <div className="space-y-1.5">
                  <Label htmlFor="lead-referrer-staff">
                    {t('leads.referrer_staff', 'Xodim')}
                  </Label>
                  <Select
                    value={referrerStaffId ?? ''}
                    onValueChange={(v) => setReferrerStaffId(v || undefined)}
                  >
                    <SelectTrigger id="lead-referrer-staff" className="w-full">
                      <SelectValue
                        placeholder={t('leads.select_staff', 'Xodimni tanlang')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name ?? u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Course Type & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lead-course-type">
                  {t('common.course_type', 'Kurs turi')}
                </Label>
                <Select
                  value={courseType}
                  onValueChange={(val) => setCourseType(val as CourseType)}
                >
                  <SelectTrigger id="lead-course-type" className="w-full">
                    <SelectValue
                      placeholder={t(
                        'common.select_course_type',
                        'Tanlang (ixtiyoriy)',
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_TYPES.map((ct) => (
                      <SelectItem key={ct} value={ct}>
                        {t(`courses.type_${ct}`, ct)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-category">
                  {t('vehicles.category', 'Toifa')}
                </Label>
                <Select
                  value={category}
                  onValueChange={(val) => setCategory(val as Category)}
                >
                  <SelectTrigger id="lead-category" className="w-full">
                    <SelectValue
                      placeholder={t(
                        'vehicles.select_category',
                        'Tanlang (ixtiyoriy)',
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="lead-note">
                {t('common.notes', 'Izoh / Qayd')}
              </Label>
              <Textarea
                id="lead-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t(
                  'leads.note_placeholder',
                  'Mijoz talablari, bo‘sh vaqtlari, qachon qo‘ng‘iroq qilish kerak...',
                )}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              {t('common.cancel', 'Bekor qilish')}
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                !firstName.trim() ||
                !phone.trim() ||
                !branchId ||
                (duplicateResult?.hasDuplicate && !acknowledgedDuplicate)
              }
            >
              {createMutation.isPending ? (
                <>
                  <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                  <span>{t('common.saving', 'Saqlanmoqda...')}</span>
                </>
              ) : (
                <span>{t('common.save', 'Saqlash')}</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

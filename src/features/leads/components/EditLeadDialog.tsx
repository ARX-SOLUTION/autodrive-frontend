import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CircleNotch, Check, CaretUpDown } from '@phosphor-icons/react';
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
import { useTeachers } from '@/features/staff/api/teacherService';
import { useOperators } from '@/features/staff/api/operatorService';
import { useStudents } from '@/features/students/api/studentService';
import { useUpdateLeadMutation } from '../queries/leadsQueries';
import type {
  Lead,
  LeadSource,
  CourseType,
  Category,
} from '../types/leads.types';

type ReferrerType = 'none' | 'student' | 'staff';

export interface EditLeadDialogProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export const EditLeadDialog = ({
  lead,
  open,
  onOpenChange,
}: EditLeadDialogProps) => {
  const { t } = useTranslation();
  const { data: branches = [] } = useBranches();
  const updateMutation = useUpdateLeadMutation(lead.id);

  const [firstName, setFirstName] = useState(lead.firstName);
  const [lastName, setLastName] = useState(lead.lastName || '');
  const [phone, setPhone] = useState(lead.phone);
  const [email, setEmail] = useState(lead.email || '');
  const [branchId, setBranchId] = useState(lead.branchId);
  const [source, setSource] = useState<LeadSource>(lead.source);
  const [sourceOther, setSourceOther] = useState(lead.sourceOther || '');
  const [courseType, setCourseType] = useState<CourseType | ''>(
    lead.courseType || '',
  );
  const [category, setCategory] = useState<Category | ''>(lead.category || '');
  const [marketingConsent, setMarketingConsent] = useState(
    lead.marketingConsent,
  );
  const [note, setNote] = useState(lead.note || '');

  // Referrer state initialized from lead
  const [referrerType, setReferrerType] = useState<ReferrerType>(
    lead.referrerStudentId
      ? 'student'
      : lead.referrerStaffId
        ? 'staff'
        : 'none',
  );
  const [referrerStudentId, setReferrerStudentId] = useState<
    string | undefined
  >(lead.referrerStudentId ?? undefined);
  const [referrerStaffId, setReferrerStaffId] = useState<string | undefined>(
    lead.referrerStaffId ?? undefined,
  );
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const debouncedStudentSearch = useDebounce(studentSearch, 300);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !phone.trim() || !branchId) {
      toast.error(
        t('leads.fill_required', 'Iltimos, majburiy maydonlarni to‘ldiring'),
      );
      return;
    }

    updateMutation.mutate(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        branchId,
        source,
        sourceOther: source === 'other' ? sourceOther.trim() : undefined,
        courseType: courseType || undefined,
        category: category || undefined,
        marketingConsent,
        note: note.trim() || undefined,
        referrerStudentId:
          referrerType === 'student' ? referrerStudentId : undefined,
        referrerStaffId: referrerType === 'staff' ? referrerStaffId : undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            t(
              'leads.updated_success',
              'Lid ma‘lumotlari muvaffaqiyatli yangilandi',
            ),
          );
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(
            (err as Error).message ||
              t('leads.update_error', 'Lidni yangilashda xatolik yuz berdi'),
          );
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {t('leads.edit_lead', 'Lidni tahrirlash')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'leads.edit_lead_desc',
                'Lid aloqa ma‘lumotlari va parametrlarini yangilash',
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-first-name">
                  {t('common.first_name', 'Ism')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-last-name">
                  {t('common.last_name', 'Familiya')}
                </Label>
                <Input
                  id="edit-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">
                  {t('common.phone', 'Telefon')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-email">{t('common.email', 'Email')}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Branch */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-branch">
                {t('common.branch', 'Filial')}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger id="edit-branch" className="w-full">
                  <SelectValue
                    placeholder={t('common.select_branch', 'Filialni tanlang')}
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

            {/* Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-source">
                  {t('leads.source', 'Manba')}
                </Label>
                <Select
                  value={source}
                  onValueChange={(val) => setSource(val as LeadSource)}
                >
                  <SelectTrigger id="edit-source" className="w-full">
                    <SelectValue />
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

              {source === 'other' && (
                <div className="space-y-1.5">
                  <Label htmlFor="edit-source-other">
                    {t('leads.source_other', 'Boshqa manba')}
                  </Label>
                  <Input
                    id="edit-source-other"
                    value={sourceOther}
                    onChange={(e) => setSourceOther(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Referrer - who recommended this lead */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-referrer-type">
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
                  <SelectTrigger id="edit-referrer-type" className="w-full">
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
                  <Label htmlFor="edit-referrer-staff">
                    {t('leads.referrer_staff', 'Xodim')}
                  </Label>
                  <Select
                    value={referrerStaffId ?? ''}
                    onValueChange={(v) => setReferrerStaffId(v || undefined)}
                  >
                    <SelectTrigger id="edit-referrer-staff" className="w-full">
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

            {/* Category & Course Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-category">
                  {t('vehicles.category', 'Toifa')}
                </Label>
                <Select
                  value={category || 'none'}
                  onValueChange={(val) =>
                    setCategory(val === 'none' ? '' : (val as Category))
                  }
                >
                  <SelectTrigger id="edit-category" className="w-full">
                    <SelectValue
                      placeholder={t(
                        'leads.select_category',
                        'Toifani tanlang',
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t('common.none', 'Belgilanmagan')}
                    </SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-course-type">
                  {t('courses.course_type', 'Kurs turi')}
                </Label>
                <Select
                  value={courseType || 'none'}
                  onValueChange={(val) =>
                    setCourseType(val === 'none' ? '' : (val as CourseType))
                  }
                >
                  <SelectTrigger id="edit-course-type" className="w-full">
                    <SelectValue
                      placeholder={t(
                        'courses.select_type',
                        'Kurs turini tanlang',
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t('common.none', 'Belgilanmagan')}
                    </SelectItem>
                    {COURSE_TYPES.map((ct) => (
                      <SelectItem key={ct} value={ct}>
                        {ct === 'avto_maktab'
                          ? t('courses.avto_maktab', 'Avto maktab')
                          : t('courses.tezkor', 'Tezkor')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-note">{t('common.note', 'Izoh')}</Label>
              <Textarea
                id="edit-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>

            {/* Marketing Consent */}
            <label className="flex items-center gap-2 cursor-pointer pt-1 text-sm select-none">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary"
              />
              <span>
                {t(
                  'leads.marketing_consent',
                  'Marketing xabarnomalariga rozilik berilgan',
                )}
              </span>
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              {t('common.cancel', 'Bekor qilish')}
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="gap-1.5"
            >
              {updateMutation.isPending && (
                <CircleNotch className="h-4 w-4 animate-spin" />
              )}
              <span>{t('common.save', 'Saqlash')}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

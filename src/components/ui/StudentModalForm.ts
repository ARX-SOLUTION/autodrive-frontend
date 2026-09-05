import { z } from 'zod';
import { isValidUzPhone, uzPhoneE164 } from '@/lib/phoneFormater';
import type { CreateStudentRequest } from '@/shared/api/contract';
import type { CourseType, Student } from '@/types/student';

export type CreateStudentPayload = CreateStudentRequest;

export const makeStudentFormSchema = (t: (key: string) => string) =>
  z.object({
    first_name: z.string().min(1, t('students.validation_required')),
    last_name: z.string().min(1, t('students.validation_required')),
    phone: z.string().refine(isValidUzPhone, t('students.phone_invalid')),
    course_type: z.enum(['tezkor', 'avto_maktab']),
    branch_id: z.string().min(1, t('students.validation_branch')),
    payment_method: z.enum(['naqd', 'karta', 'perechisleniya']).optional(),
    result: z.enum(['oqimoqda', 'topshirdi', 'yiqildi']).optional(),
    has_document: z.boolean().optional(),
    o83: z.boolean().optional(),
    total_price: z.coerce
      .number()
      .nonnegative(t('students.validation_required')),
    amount_paid: z.coerce.number().nonnegative().optional(),
    initial_payment: z.coerce.number().nonnegative().optional(),
    group_id: z.string().optional(),
    course_id: z.string().optional(),
    completion_date: z.string().optional(),
    contract_number: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(['active', 'completed', 'dropped', 'suspended']).optional(),
    registered_by: z.string().optional(),
  });

export type StudentFormValues = z.infer<
  ReturnType<typeof makeStudentFormSchema>
>;

interface CreateStudentFormDefaults {
  courseType: CourseType;
  canAssignBranch: boolean;
  defaultBranchId?: string;
  userBranchId?: string | null;
}

export const getCreateStudentFormValues = ({
  courseType,
  canAssignBranch,
  defaultBranchId,
  userBranchId,
}: CreateStudentFormDefaults): StudentFormValues => ({
  first_name: '',
  last_name: '',
  phone: '+998',
  course_type: courseType,
  branch_id: canAssignBranch ? defaultBranchId || '' : userBranchId || '',
  payment_method: 'naqd',
  result: 'oqimoqda',
  has_document: false,
  o83: false,
  // The selected Course fills this in during create mode.
  total_price: 0,
  amount_paid: 0,
  initial_payment: 0,
  group_id: '',
  course_id: '',
  completion_date: '',
  contract_number: '',
  notes: '',
  status: 'active',
  registered_by: '',
});

export const getEditStudentFormValues = (student: Student) => ({
  first_name: student.first_name,
  last_name: student.last_name,
  phone: student.phone,
  course_type: student.course_type,
  branch_id: student.branch_id,
  payment_method: student.payment_method ?? ('naqd' as const),
  result: student.result,
  has_document: student.has_document,
  o83: student.o83,
  total_price: student.total_price,
  // Editing records an additional payment; it must never replay prior totals.
  amount_paid: 0,
  initial_payment: student.initial_payment || 0,
  group_id: student.group_id || '',
  course_id: '',
  completion_date:
    student.completion_date === undefined ? '' : student.completion_date,
  contract_number: student.contract_number || '',
  notes: student.notes === undefined ? '' : student.notes,
  status: student.status || ('active' as const),
  registered_by: student.registered_by_id || '',
});

export const toCreateStudentPayload = (
  values: StudentFormValues,
  courseType: CourseType,
  isEditing: boolean,
): CreateStudentPayload => {
  const payload: CreateStudentPayload = {
    first_name: values.first_name,
    last_name: values.last_name,
    phone: uzPhoneE164(values.phone),
    course_type: courseType,
    total_price: Number(values.total_price),
    payment_method: values.payment_method || undefined,
    branch_id: values.branch_id || undefined,
    result: values.result,
    has_document: values.has_document,
    notes: values.notes || undefined,
    status: values.status || 'active',
    registered_by: values.registered_by || undefined,
  };

  if (courseType === 'tezkor') {
    payload.amount_paid = Number(values.amount_paid) || 0;
    payload.group_id = values.group_id || undefined;
    return payload;
  }

  payload.initial_payment = Number(values.initial_payment) || 0;
  payload.group_id = values.group_id || undefined;
  payload.completion_date = values.completion_date || undefined;
  payload.contract_number = values.contract_number || undefined;
  payload.o83 = values.o83;

  const additionalPayment = Number(values.amount_paid) || 0;
  if (isEditing && additionalPayment > 0) {
    payload.amount_paid = additionalPayment;
  }

  return payload;
};

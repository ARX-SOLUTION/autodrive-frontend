import { describe, expect, it } from 'vitest';
import type { Student } from '@/types/student';
import {
  getCreateStudentFormValues,
  getEditStudentFormValues,
  toCreateStudentPayload,
} from './StudentModalForm';

const STUDENT: Student = {
  id: 'student-1',
  first_name: 'Aziz',
  last_name: 'Karimov',
  phone: '+998901234567',
  course_type: 'avto_maktab',
  branch_id: 'branch-1',
  payment_method: null,
  has_document: true,
  result: 'oqimoqda',
  created_at: '2026-08-01',
  total_price: 4_000_000,
  initial_payment: 1_000_000,
};

describe('StudentModal create/edit form mapping', () => {
  it('uses the assigned default branch only when the user may assign branches', () => {
    expect(
      getCreateStudentFormValues({
        courseType: 'tezkor',
        canAssignBranch: true,
        defaultBranchId: 'branch-2',
        userBranchId: 'branch-1',
      }).branch_id,
    ).toBe('branch-2');

    expect(
      getCreateStudentFormValues({
        courseType: 'tezkor',
        canAssignBranch: false,
        defaultBranchId: 'branch-2',
        userBranchId: 'branch-1',
      }).branch_id,
    ).toBe('branch-1');
  });

  it('starts edit mode with no additional payment and preserves historical values', () => {
    expect(getEditStudentFormValues(STUDENT)).toMatchObject({
      payment_method: 'naqd',
      total_price: 4_000_000,
      initial_payment: 1_000_000,
      amount_paid: 0,
    });
  });

  it('normalizes the phone and sends an avto-maktab additional payment only while editing', () => {
    const values = {
      ...getCreateStudentFormValues({
        courseType: 'avto_maktab',
        canAssignBranch: false,
        userBranchId: 'branch-1',
      }),
      first_name: 'Aziz',
      last_name: 'Karimov',
      phone: '90 123 45 67',
      total_price: 4_000_000,
      initial_payment: 1_000_000,
      amount_paid: 500_000,
    };

    expect(
      toCreateStudentPayload(values, 'avto_maktab', false),
    ).not.toHaveProperty('amount_paid');
    expect(toCreateStudentPayload(values, 'avto_maktab', true)).toMatchObject({
      phone: '+998901234567',
      initial_payment: 1_000_000,
      amount_paid: 500_000,
    });
  });
});

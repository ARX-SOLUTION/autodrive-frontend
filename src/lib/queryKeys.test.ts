import { describe, expect, it } from 'vitest';
import {
  attendanceKeys,
  auditLogKeys,
  authKeys,
  branchKeys,
  courseKeys,
  dashboardKeys,
  examKeys,
  groupKeys,
  lessonKeys,
  operatorKeys,
  paymentKeys,
  scheduleKeys,
  searchKeys,
  studentKeys,
  teacherKeys,
  telegramKeys,
  userKeys,
} from './queryKeys';

describe('studentKeys (base list/page/detail shape)', () => {
  it('same filters -> deep-equal list keys (cache-hit correctness)', () => {
    expect(studentKeys.list({ branchId: 'b1', page: 1 })).toEqual(
      studentKeys.list({ branchId: 'b1', page: 1 }),
    );
    expect(studentKeys.page({ branchId: 'b1' })).toEqual(
      studentKeys.page({ branchId: 'b1' }),
    );
    expect(studentKeys.detail('s1')).toEqual(studentKeys.detail('s1'));
  });

  it('different filters -> different keys', () => {
    expect(studentKeys.list({ branchId: 'b1' })).not.toEqual(
      studentKeys.list({ branchId: 'b2' }),
    );
    expect(studentKeys.page({ page: 1 })).not.toEqual(
      studentKeys.page({ page: 2 }),
    );
    expect(studentKeys.detail('s1')).not.toEqual(studentKeys.detail('s2'));
  });

  it('list/detail/page segments are structurally distinct for the same domain', () => {
    const list = studentKeys.list({ branchId: 'b1' });
    const page = studentKeys.page({ branchId: 'b1' });
    const detail = studentKeys.detail('b1');

    expect(list).not.toEqual(page);
    expect(list).not.toEqual(detail);
    expect(page).not.toEqual(detail);
    expect(list[1]).toBe('list');
    expect(page[1]).toBe('page');
    expect(detail[1]).toBe('detail');
  });

  it('domain root differs from every other domain (no cross-domain collisions)', () => {
    expect(studentKeys.all[0]).toBe('students');
    expect(userKeys.all[0]).toBe('users');
    expect(teacherKeys.all[0]).toBe('teachers');
    expect(operatorKeys.all[0]).toBe('operators');
    expect(branchKeys.all[0]).toBe('branches');
    expect(courseKeys.all[0]).toBe('courses');
    expect(lessonKeys.all[0]).toBe('lessons');
    expect(auditLogKeys.all[0]).toBe('audit-logs');
  });
});

describe('domains with default (no-arg) filters', () => {
  it('list()/page() with no args behave like list({})/page({})', () => {
    expect(operatorKeys.list()).toEqual(operatorKeys.list({}));
    expect(operatorKeys.page()).toEqual(operatorKeys.page({}));
  });
});

describe('groupKeys (base + overview extension)', () => {
  it('overview is a distinct key shape from list/detail', () => {
    const overview = groupKeys.overview({ branchId: 'b1' });
    const list = groupKeys.list({ branchId: 'b1' });
    expect(overview).not.toEqual(list);
    expect(overview[1]).toBe('overview');
  });

  it('same filters -> deep-equal overview keys', () => {
    expect(groupKeys.overview({ branchId: 'b1' })).toEqual(
      groupKeys.overview({ branchId: 'b1' }),
    );
  });

  it('different branchId -> different overview keys', () => {
    expect(groupKeys.overview({ branchId: 'b1' })).not.toEqual(
      groupKeys.overview({ branchId: 'b2' }),
    );
  });
});

describe('paymentKeys (base + summary/snapshot/byStudent extensions)', () => {
  it('summary/snapshot/byStudent are structurally distinct from each other and from list/page/detail', () => {
    const keys = [
      paymentKeys.list({ branchId: 'b1' }),
      paymentKeys.page({ branchId: 'b1' }),
      paymentKeys.detail('p1'),
      paymentKeys.summary({ branchId: 'b1' }),
      paymentKeys.snapshot('b1'),
      paymentKeys.byStudent('s1'),
    ];
    const serialized = keys.map((k) => JSON.stringify(k));
    expect(new Set(serialized).size).toBe(keys.length);
  });

  it('byStudent: same studentId+filters -> deep-equal; different -> not equal', () => {
    expect(paymentKeys.byStudent('s1', { page: 1 })).toEqual(
      paymentKeys.byStudent('s1', { page: 1 }),
    );
    expect(paymentKeys.byStudent('s1', { page: 1 })).not.toEqual(
      paymentKeys.byStudent('s1', { page: 2 }),
    );
    expect(paymentKeys.byStudent('s1')).not.toEqual(
      paymentKeys.byStudent('s2'),
    );
  });
});

describe('non-base-shape domains (attendance, schedule, dashboard, exams, search, auth, telegram)', () => {
  it('attendanceKeys.history varies with studentId and filters', () => {
    expect(attendanceKeys.history('s1', { limit: 20 })).toEqual(
      attendanceKeys.history('s1', { limit: 20 }),
    );
    expect(attendanceKeys.history('s1', { limit: 20 })).not.toEqual(
      attendanceKeys.history('s1', { limit: 50 }),
    );
  });

  it('scheduleKeys.templates and .calendar are distinct', () => {
    expect(scheduleKeys.templates({ branchId: 'b1' })).not.toEqual(
      scheduleKeys.calendar({ branchId: 'b1' }),
    );
  });

  it('dashboardKeys.analytics/.teacherAnalytics/.company are distinct', () => {
    const a = dashboardKeys.analytics({ branchId: 'b1' });
    const t = dashboardKeys.teacherAnalytics();
    const c = dashboardKeys.company({ branchId: 'b1' });
    expect(a).not.toEqual(t);
    expect(a).not.toEqual(c);
    expect(t).not.toEqual(c);
  });

  it('examKeys.byStudent varies with studentId', () => {
    expect(examKeys.byStudent('s1')).toEqual(examKeys.byStudent('s1'));
    expect(examKeys.byStudent('s1')).not.toEqual(examKeys.byStudent('s2'));
  });

  it('searchKeys.query varies with the search term', () => {
    expect(searchKeys.query('abc')).toEqual(searchKeys.query('abc'));
    expect(searchKeys.query('abc')).not.toEqual(searchKeys.query('xyz'));
  });

  it('authKeys.me and telegramKeys.linkStatus are stable, argument-free keys', () => {
    expect(authKeys.me()).toEqual(authKeys.me());
    expect(telegramKeys.linkStatus()).toEqual(telegramKeys.linkStatus());
  });
});

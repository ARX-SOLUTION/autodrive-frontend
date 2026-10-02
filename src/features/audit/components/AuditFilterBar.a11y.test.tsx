import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuditFilterBar } from '@/features/audit/components/AuditFilterBar';

afterEach(cleanup);

describe('AuditFilterBar accessible names', () => {
  it('names the audit entity and action filters while both show "all"', () => {
    render(
      <AuditFilterBar
        search=""
        entityFilter="all"
        actionFilter="all"
        dateFrom={undefined}
        dateTo={undefined}
        onSearchChange={vi.fn()}
        onEntityChange={vi.fn()}
        onActionChange={vi.fn()}
        onDateRangeChange={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('combobox', { name: 'audit.table_entity' }),
    ).toHaveTextContent('common.all');
    expect(
      screen.getByRole('combobox', { name: 'audit.table_action' }),
    ).toHaveTextContent('common.all');
  });
});

import { describe, expect, it } from 'vitest';
import { parseDataGridSearch, updateDataGridSearch } from './dataGridSearch';

const config = {
  sortKeys: ['name', 'created_at'] as const,
  defaultSort: { key: 'created_at', direction: 'desc' as const },
};

describe('dataGridSearch', () => {
  it('preserves a valid deep-linked page and allowlisted sort', () => {
    const state = parseDataGridSearch(
      new URLSearchParams('page=4&sort_by=name&sort_dir=asc'),
      config,
    );

    expect(state).toEqual({
      page: 4,
      sort: { key: 'name', direction: 'asc' },
    });
  });

  it.each(['0', '-2', '1.5', 'abc', '9007199254740992'])(
    'rejects invalid page %s and non-allowlisted sort values',
    (page) => {
      const state = parseDataGridSearch(
        new URLSearchParams(
          `page=${page}&sort_by=private_field&sort_dir=sideways`,
        ),
        config,
      );

      expect(state).toEqual({
        page: 1,
        sort: { key: 'created_at', direction: 'desc' },
      });
    },
  );

  it('applies filter changes and clears page in one immutable update', () => {
    const current = new URLSearchParams(
      'page=6&q=old&status=paid&branch_id=b1&sort_by=name&sort_dir=asc',
    );

    const next = updateDataGridSearch(
      current,
      {
        type: 'filters',
        values: { q: 'new', status: undefined },
      },
      config,
    );

    expect(next.get('page')).toBeNull();
    expect(next.get('q')).toBe('new');
    expect(next.get('status')).toBeNull();
    expect(next.get('branch_id')).toBe('b1');
    expect(next.get('sort_by')).toBe('name');
    expect(next.get('sort_dir')).toBe('asc');
    expect(current.get('page')).toBe('6');
    expect(current.get('q')).toBe('old');
  });

  it('changes only the page and preserves deep-link filters and sort', () => {
    const next = updateDataGridSearch(
      new URLSearchParams('page=4&q=ali&sort_by=name&sort_dir=asc'),
      { type: 'page', page: 7 },
      config,
    );

    expect(next.toString()).toBe('page=7&q=ali&sort_by=name&sort_dir=asc');
  });

  it('updates sort atomically and clears the stale page', () => {
    const next = updateDataGridSearch(
      new URLSearchParams('page=5&q=ali&sort_by=name&sort_dir=asc'),
      {
        type: 'sort',
        sort: { key: 'created_at', direction: 'desc' },
      },
      config,
    );

    expect(next.get('page')).toBeNull();
    expect(next.get('sort_by')).toBeNull();
    expect(next.get('sort_dir')).toBeNull();
    expect(next.get('q')).toBe('ali');
  });

  it('does not clear page when a filter update has no effective change', () => {
    const next = updateDataGridSearch(
      new URLSearchParams('page=5&q=ali'),
      { type: 'filters', values: { q: 'ali', status: undefined } },
      config,
    );

    expect(next.get('page')).toBe('5');
  });
});

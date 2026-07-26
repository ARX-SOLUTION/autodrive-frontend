/**
 * Callers: vitest. API: isNavActive. Schema: none.
 * User: nested CRM detail routes must keep parent menu selected.
 */
import { describe, expect, it } from 'vitest';
import { isNavActive } from '@/lib/navActive';

describe('isNavActive', () => {
  it('matches the exact list route', () => {
    expect(isNavActive('/groups', '/groups')).toBe(true);
    expect(isNavActive('/dashboard', '/groups')).toBe(false);
  });

  it('matches nested detail routes under the list path', () => {
    expect(isNavActive('/groups/abc-123', '/groups')).toBe(true);
    expect(isNavActive('/students/x/edit', '/students')).toBe(true);
  });

  it('does not cross path-segment boundaries', () => {
    expect(isNavActive('/groups-archive', '/groups')).toBe(false);
    expect(isNavActive('/group', '/groups')).toBe(false);
  });
});

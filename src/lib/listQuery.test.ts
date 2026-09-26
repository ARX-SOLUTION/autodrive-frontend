import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  LIST_PAGE_SIZE_STORAGE_KEY,
  matchesListQuery,
  pageCountFor,
  parseListTab,
  parsePage,
  parsePageSize,
  parseRouteLimit,
  parseRoutePage,
  readStoredPageSize,
  resolvePageSize,
  slicePage,
  writeStoredPageSize,
} from './listQuery';

afterEach(() => {
  localStorage.removeItem(LIST_PAGE_SIZE_STORAGE_KEY);
});

describe('list query helpers', () => {
  it('parses page numbers and falls back to 1', () => {
    expect(parsePage('3')).toBe(3);
    expect(parsePage('0')).toBe(1);
    expect(parsePage('nope')).toBe(1);
    expect(parsePage(null)).toBe(1);
  });

  it('accepts only 10, 25, 50, and 100 as page sizes', () => {
    expect(parsePageSize('10')).toBe(10);
    expect(parsePageSize('25')).toBe(25);
    expect(parsePageSize('50')).toBe(50);
    expect(parsePageSize('100')).toBe(100);
    expect(parsePageSize('20')).toBeNull();
    expect(parsePageSize('')).toBeNull();
  });

  it('prefers the URL limit, then storage, then the default of 10', () => {
    writeStoredPageSize(50);
    expect(readStoredPageSize()).toBe(50);
    expect(resolvePageSize('25', 50)).toBe(25);
    expect(resolvePageSize(null, 50)).toBe(50);
    expect(resolvePageSize('20', null)).toBe(DEFAULT_PAGE_SIZE);
    expect(resolvePageSize(null, null)).toBe(10);
  });

  it('parses route search values that arrive as numbers or strings', () => {
    expect(parseRoutePage(2)).toBe(2);
    expect(parseRoutePage('4')).toBe(4);
    expect(parseRoutePage('0')).toBeUndefined();
    expect(parseRouteLimit(100)).toBe(100);
    expect(parseRouteLimit('25')).toBe(25);
    expect(parseRouteLimit(20)).toBeUndefined();
  });

  it('keeps an allowed tab and falls back otherwise', () => {
    expect(
      parseListTab('students', ['info', 'students'] as const, 'info'),
    ).toBe('students');
    expect(parseListTab('other', ['info', 'students'] as const, 'info')).toBe(
      'info',
    );
    expect(
      parseListTab(null, ['calendar', 'templates'] as const, 'calendar'),
    ).toBe('calendar');
  });

  it('filters client lists and slices the active page', () => {
    expect(matchesListQuery('  ali ', 'Malika', 'Ali Valiyev')).toBe(true);
    expect(matchesListQuery('zar', 'Ali')).toBe(false);
    expect(matchesListQuery('', 'anything')).toBe(true);
    expect(slicePage(['a', 'b', 'c', 'd'], 2, 2)).toEqual(['c', 'd']);
    expect(pageCountFor(0, 10)).toBe(1);
    expect(pageCountFor(11, 10)).toBe(2);
  });
});

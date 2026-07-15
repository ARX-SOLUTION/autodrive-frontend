import { describe, expect, it } from 'vitest';
import {
  ApiContractError,
  parseItemEnvelope,
  parseListEnvelope,
} from './apiEnvelope';

interface Widget {
  id: string;
  name: string;
}

const widget: Widget = { id: '1', name: 'gizmo' };
const widgets: Widget[] = [widget, { id: '2', name: 'gadget' }];

describe('parseItemEnvelope', () => {
  it('unwraps { data: item }', () => {
    expect(parseItemEnvelope<Widget>({ data: widget }, 'widget')).toEqual(
      widget,
    );
  });

  it('returns a bare item unchanged when there is no "data" key', () => {
    expect(parseItemEnvelope<Widget>(widget, 'widget')).toEqual(widget);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'not an object'],
    ['a number', 42],
    ['an array', widgets],
  ])('throws ApiContractError on %s', (_label, raw) => {
    expect(() => parseItemEnvelope(raw, 'widget')).toThrow(ApiContractError);
  });

  it('throws ApiContractError when "data" itself is malformed', () => {
    expect(() => parseItemEnvelope({ data: [1, 2, 3] }, 'widget')).toThrow(
      ApiContractError,
    );
    expect(() => parseItemEnvelope({ data: 'oops' }, 'widget')).toThrow(
      ApiContractError,
    );
  });

  it('throws on a deeply malformed nested shape ("data" is null / an array of objects)', () => {
    expect(() => parseItemEnvelope({ data: null }, 'widget')).toThrow(
      ApiContractError,
    );
    expect(() =>
      parseItemEnvelope({ data: [{ nested: { deep: true } }] }, 'widget'),
    ).toThrow(ApiContractError);
  });

  it('error carries the raw received value and mentions the resource name', () => {
    const raw = { data: 'oops' };
    try {
      parseItemEnvelope(raw, 'student');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiContractError);
      const apiErr = err as ApiContractError;
      expect(apiErr.name).toBe('ApiContractError');
      expect(apiErr.received).toBe(raw);
      expect(apiErr.message).toContain('student');
    }
  });
});

describe('parseListEnvelope', () => {
  it('normalizes a bare array', () => {
    const result = parseListEnvelope<Widget>(widgets, 'widgets');
    expect(result.data).toEqual(widgets);
    expect(result.meta.total).toBe(2);
  });

  it('normalizes { data: T[] }', () => {
    const result = parseListEnvelope<Widget>({ data: widgets }, 'widgets');
    expect(result.data).toEqual(widgets);
    expect(result.meta.total).toBe(2);
  });

  it('normalizes { data: T[] } with an explicit meta', () => {
    const result = parseListEnvelope<Widget>(
      { data: widgets, meta: { total: 40, page: 2, limit: 2, totalPages: 20 } },
      'widgets',
    );
    expect(result.data).toEqual(widgets);
    expect(result.meta.total).toBe(40);
    expect(result.meta.page).toBe(2);
  });

  it('normalizes the doubly-wrapped { data: { data: T[], meta? } } shape', () => {
    const result = parseListEnvelope<Widget>(
      {
        data: {
          data: widgets,
          meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
        },
      },
      'widgets',
    );
    expect(result.data).toEqual(widgets);
    expect(result.meta.total).toBe(2);
  });

  it('synthesizes meta when the server omits it', () => {
    const result = parseListEnvelope<Widget>({ data: widgets }, 'widgets');
    expect(result.meta).toEqual({
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'not a list'],
    ['a number', 42],
    ['an object where an array was expected', { foo: 'bar' }],
  ])('throws ApiContractError on %s', (_label, raw) => {
    expect(() => parseListEnvelope(raw, 'widgets')).toThrow(ApiContractError);
  });

  it('throws on a deeply malformed nested shape (data.data not an array)', () => {
    expect(() =>
      parseListEnvelope({ data: { data: { nope: true } } }, 'widgets'),
    ).toThrow(ApiContractError);
  });

  it('error carries the raw received value and mentions the resource name', () => {
    const raw = { totally: 'unexpected' };
    try {
      parseListEnvelope(raw, 'widgets');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiContractError);
      const apiErr = err as ApiContractError;
      expect(apiErr.name).toBe('ApiContractError');
      expect(apiErr.received).toBe(raw);
      expect(apiErr.message).toContain('widgets');
    }
  });
});

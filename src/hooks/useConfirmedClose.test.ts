import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useConfirmedClose } from './useConfirmedClose';

describe('useConfirmedClose', () => {
  it('closes immediately when there is nothing to confirm', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useConfirmedClose(false, onClose));

    act(() => result.current.attemptClose());

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.confirmOpen).toBe(false);
  });

  it('opens a confirm step instead of closing when dirty/pending', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useConfirmedClose(true, onClose));

    act(() => result.current.attemptClose());

    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.confirmOpen).toBe(true);
  });

  it('confirmDiscard closes and dismisses the confirm step', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useConfirmedClose(true, onClose));

    act(() => result.current.attemptClose());
    act(() => result.current.confirmDiscard());

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.confirmOpen).toBe(false);
  });

  it('cancelDiscard keeps the dialog open without closing', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useConfirmedClose(true, onClose));

    act(() => result.current.attemptClose());
    act(() => result.current.cancelDiscard());

    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.confirmOpen).toBe(false);
  });
});

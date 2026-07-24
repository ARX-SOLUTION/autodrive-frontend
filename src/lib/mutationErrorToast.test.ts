import { describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { mutationErrorToast } from '@/lib/mutationErrorToast';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const t = (key: string) => key;

describe('mutationErrorToast', () => {
  it('shows the extracted message with no action when retry is omitted', () => {
    mutationErrorToast(new Error('boom'), t);
    expect(toast.error).toHaveBeenCalledWith('common.error', undefined);
  });

  it('attaches a Retry action wired to the given retry fn', () => {
    const retry = vi.fn();
    mutationErrorToast(new Error('boom'), t, retry);
    expect(toast.error).toHaveBeenCalledWith('common.error', {
      action: { label: 'common.retry', onClick: retry },
    });
  });
});

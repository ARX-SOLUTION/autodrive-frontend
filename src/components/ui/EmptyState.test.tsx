import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EmptyState } from './EmptyState';

// exec-dash 2-shell: `action` now accepts either the legacy
// { label, onClick } config (renders a <Button>) or any ReactNode, so
// existing call sites keep compiling/working unchanged while new ones can
// pass arbitrary markup.

afterEach(cleanup);

describe('EmptyState action prop', () => {
  it('renders a Button for the legacy { label, onClick } shape', () => {
    const onClick = vi.fn();
    render(
      <EmptyState title="Nothing here" action={{ label: 'Retry', onClick }} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders an arbitrary ReactNode action as-is', () => {
    render(
      <EmptyState
        title="Nothing here"
        action={<a href="/students">Go to students</a>}
      />,
    );
    expect(screen.getByRole('link', { name: 'Go to students' })).toBeTruthy();
  });
});

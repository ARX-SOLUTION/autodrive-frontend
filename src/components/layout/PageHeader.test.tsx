import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

afterEach(cleanup);

describe('PageHeader', () => {
  it('renders eyebrow, title, description, and actions', () => {
    render(
      <PageHeader
        eyebrow="Students"
        title="Student roster"
        description="42 total"
        actions={<button type="button">Add</button>}
      />,
    );

    expect(screen.getByText('Students')).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Student roster' }),
    ).toBeTruthy();
    expect(screen.getByText('42 total')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy();
  });

  it('renders the title as an h1 heading', () => {
    render(<PageHeader eyebrow="Groups" title="Groups" />);

    const heading = screen.getByRole('heading', { level: 1, name: 'Groups' });
    expect(heading.tagName).toBe('H1');
  });

  it('hides the eyebrow when it repeats the title', () => {
    render(<PageHeader eyebrow="Groups" title="Groups" />);

    expect(screen.getAllByText('Groups')).toHaveLength(1);
  });

  it('renders a distinct eyebrow as muted context', () => {
    render(<PageHeader eyebrow="Payments" title="Payment history" />);

    const eyebrow = screen.getByText('Payments');
    expect(eyebrow.className).toContain('text-muted-foreground');
    expect(eyebrow.className).not.toContain('uppercase');
  });
});

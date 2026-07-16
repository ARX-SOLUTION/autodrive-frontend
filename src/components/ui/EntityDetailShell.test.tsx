import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { EntityDetailShell } from './EntityDetailShell';

afterEach(cleanup);

describe('EntityDetailShell', () => {
  it('renders the loading skeleton and hides header/children', () => {
    render(
      <EntityDetailShell
        onBack={vi.fn()}
        backLabel="Back"
        isLoading
        isError={false}
        header={<h1>Should not render</h1>}
      >
        <div>tabs</div>
      </EntityDetailShell>,
    );
    expect(screen.queryByText('Should not render')).toBeNull();
    expect(screen.queryByText('tabs')).toBeNull();
  });

  it('renders the error/not-found state with the given title and icon', () => {
    render(
      <EntityDetailShell
        onBack={vi.fn()}
        backLabel="Back"
        isLoading={false}
        isError
        errorTitle="Not found"
      />,
    );
    expect(screen.getByText('Not found')).toBeTruthy();
  });

  it('renders the header and view-transition-named element when ready', () => {
    render(
      <EntityDetailShell
        onBack={vi.fn()}
        backLabel="Back"
        isLoading={false}
        isError={false}
        header={<h1 style={{ viewTransitionName: 'student-1' }}>Aziz</h1>}
      >
        <div>tabs</div>
      </EntityDetailShell>,
    );
    const heading = screen.getByText('Aziz');
    expect(heading.style.viewTransitionName).toBe('student-1');
    expect(screen.getByText('tabs')).toBeTruthy();
  });

  it('omits the children region entirely when none is provided (BranchDetailPage has no tabs)', () => {
    const { container } = render(
      <EntityDetailShell
        onBack={vi.fn()}
        backLabel="Back"
        isLoading={false}
        isError={false}
        header={<h1>Yunusobod</h1>}
      />,
    );
    // Header renders; nothing else follows it inside the wrapper.
    expect(screen.getByText('Yunusobod')).toBeTruthy();
    expect(container.querySelector('.space-y-6')?.children.length).toBe(2);
  });

  it('calls onBack when the back button is clicked', () => {
    const onBack = vi.fn();
    render(
      <EntityDetailShell
        onBack={onBack}
        backLabel="Students"
        isLoading={false}
        isError={false}
      />,
    );
    fireEvent.click(screen.getByText('Students'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

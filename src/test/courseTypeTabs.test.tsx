import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CourseTypeTabs } from '@/components/ui/course-type-tabs';

it('uses pressed buttons without dangling tab-panel references', () => {
  const onChange = vi.fn();
  render(<CourseTypeTabs value="all" onChange={onChange} />);

  const selected = screen.getByRole('button', { name: 'common.all' });
  expect(selected).toHaveAttribute('aria-pressed', 'true');
  expect(selected).not.toHaveAttribute('aria-controls');

  fireEvent.click(screen.getByRole('button', { name: 'students.course_fast' }));
  expect(onChange).toHaveBeenCalledWith('tezkor');
});

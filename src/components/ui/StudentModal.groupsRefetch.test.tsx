import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StudentModal from './StudentModal';

const refetchGroups = vi.fn();

vi.mock('@/services/groupService', () => ({
  useGroups: () => ({ data: [], refetch: refetchGroups }),
}));

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [] }),
}));

// autodrive-553: StudentModal now also runs a debounced create-time
// duplicate-check query (search-as-you-type on last name / phone).
vi.mock('@/services/studentService', () => ({
  useStudentsPage: () => ({ data: undefined, isFetching: false }),
}));

// Regression for autodrive-6cq.11.8: a group created elsewhere (GroupsPage)
// didn't appear in this modal's group selector until a full page reload --
// useGroups() only fetched once and refetchOnWindowFocus/staleTime are off
// (src/lib/queryClient.ts), so nothing re-fetched it. The modal must force a
// refetch whenever it opens.
describe('StudentModal groups refetch on open', () => {
  it('refetches the groups list when the modal is open', () => {
    render(
      <StudentModal
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        courseType="tezkor"
      />,
    );

    expect(refetchGroups).toHaveBeenCalled();
  });
});

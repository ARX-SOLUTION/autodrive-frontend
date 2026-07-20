import { Branch } from '@/types/branch';

// Blast-radius copy for the delete confirm (autodrive-cg9) -- branch delete
// really does cascade-soft-delete its students (see branches.service.ts
// remove()), so active_students -- already shown on the same card -- is a
// true dependent count, not just a stat. Pure function in its own file (not
// BranchesPage.tsx, so react-refresh/only-export-components stays happy) so
// the branch (empty vs N-enrolled) is unit-testable without the test
// suite's react-i18next mock (src/test/setup.ts stubs t() as `(key) =>
// key`, dropping interpolation options).
export const branchDeleteDescArgs = (
  branch: Pick<Branch, 'name' | 'active_students'> | undefined,
):
  | {
      key: 'branches.confirm_delete_desc_with_students';
      options: { name: string; count: number };
    }
  | { key: 'branches.confirm_delete_desc_empty'; options: { name: string } }
  | undefined => {
  if (!branch) return undefined;
  return branch.active_students > 0
    ? {
        key: 'branches.confirm_delete_desc_with_students',
        options: { name: branch.name, count: branch.active_students },
      }
    : {
        key: 'branches.confirm_delete_desc_empty',
        options: { name: branch.name },
      };
};

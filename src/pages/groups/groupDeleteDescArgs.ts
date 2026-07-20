import { Group } from '@/types/group';

// Blast-radius copy for the delete confirm (autodrive-cg9) -- exported as a
// pure function (own file, not GroupsPage.tsx, so react-refresh/only-
// export-components stays happy) so the branch (empty vs N-enrolled) is
// unit-testable without fighting the test suite's react-i18next mock
// (src/test/setup.ts stubs t() as `(key) => key`, dropping interpolation
// options, so a rendered count is not observable through screen.getByText).
export const groupDeleteDescArgs = (
  group: Pick<Group, 'name' | 'active_students'> | undefined,
):
  | {
      key: 'groups.confirm_delete_desc_with_students';
      options: { name: string; count: number };
    }
  | { key: 'groups.confirm_delete_desc_empty'; options: { name: string } }
  | undefined => {
  if (!group) return undefined;
  return group.active_students > 0
    ? {
        key: 'groups.confirm_delete_desc_with_students',
        options: { name: group.name, count: group.active_students },
      }
    : {
        key: 'groups.confirm_delete_desc_empty',
        options: { name: group.name },
      };
};

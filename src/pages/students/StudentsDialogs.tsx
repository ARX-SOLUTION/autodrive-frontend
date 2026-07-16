import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import StudentModal, {
  type CreateStudentPayload,
} from '@/components/ui/StudentModal';
import AddStudentDialog, {
  type AddStudentPayload,
} from '@/components/ui/AddStudentDialog';
import ImportStudentsModal from '@/components/ui/ImportStudentsModal';
import { cn } from '@/lib/utils';
import type { CourseType, Student } from '@/types/student';
import type { User } from '@/types/user';

interface StudentsDialogsProps {
  students: Student[];
  courseType: CourseType;
  branchId: string | undefined;
  operators: User[];

  modalOpen: boolean;
  detailed: boolean;
  setDetailed: (v: boolean) => void;
  editStudent: Student | null;
  createFormDirty: boolean;
  setCreateFormDirty: (v: boolean) => void;
  onModalClose: () => void;
  onModalSubmit: (data: CreateStudentPayload) => void;
  onSaveAndAdd: (data: CreateStudentPayload) => void;
  modalLoading: boolean;

  importModalOpen: boolean;
  onImportModalClose: () => void;

  onAddFlowClose: () => void;
  onAddStudentSubmit: (data: AddStudentPayload) => void;
  addFlowLoading: boolean;

  deleteId: string | null;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  deleteLoading: boolean;
}

/** All create/edit/import/delete dialog wiring for the students page. */
export const StudentsDialogs = ({
  students,
  courseType,
  branchId,
  operators,
  modalOpen,
  detailed,
  setDetailed,
  editStudent,
  createFormDirty,
  setCreateFormDirty,
  onModalClose,
  onModalSubmit,
  onSaveAndAdd,
  modalLoading,
  importModalOpen,
  onImportModalClose,
  onAddFlowClose,
  onAddStudentSubmit,
  addFlowLoading,
  deleteId,
  onDeleteCancel,
  onDeleteConfirm,
  deleteLoading,
}: StudentsDialogsProps) => {
  const { t } = useTranslation();

  // Quick/detailed toggle shown inside the add dialog (create mode only).
  const detailedToggle = (
    <label
      className={cn(
        'flex select-none items-center gap-2 text-sm font-medium',
        createFormDirty ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      )}
      title={createFormDirty ? t('students.detailed_toggle_locked') : undefined}
    >
      <Checkbox
        checked={detailed}
        disabled={createFormDirty}
        onCheckedChange={(v) => setDetailed(!!v)}
        id="detailed-toggle"
      />
      {t('students.detailed_toggle')}
    </label>
  );

  const deleteStudent = students.find((st) => st.id === deleteId);

  return (
    <>
      <StudentModal
        open={modalOpen && !detailed}
        onClose={onModalClose}
        onSubmit={onModalSubmit}
        onSaveAndAdd={!editStudent ? onSaveAndAdd : undefined}
        loading={modalLoading}
        student={editStudent}
        courseType={courseType}
        operators={operators}
        defaultBranchId={branchId}
        detailedToggle={editStudent ? undefined : detailedToggle}
        onDirtyChange={editStudent ? undefined : setCreateFormDirty}
      />

      <ImportStudentsModal
        open={importModalOpen}
        onClose={onImportModalClose}
        branchId={branchId}
      />

      <AddStudentDialog
        open={modalOpen && detailed}
        onClose={onAddFlowClose}
        onSubmit={onAddStudentSubmit}
        loading={addFlowLoading}
        defaultBranchId={branchId}
        detailedToggle={detailedToggle}
        onDirtyChange={setCreateFormDirty}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={onDeleteCancel}
        onConfirm={onDeleteConfirm}
        loading={deleteLoading}
        description={
          deleteId
            ? t('students.confirm_delete_desc', {
                name: deleteStudent
                  ? `${deleteStudent.first_name} ${deleteStudent.last_name}`
                  : undefined,
              })
            : undefined
        }
      />
    </>
  );
};

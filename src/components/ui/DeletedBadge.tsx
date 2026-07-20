import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

/**
 * Marks a soft-deleted row rendered by the owner-only "show deleted" toggle
 * (autodrive-cg9). Mirrors DebtStatusBadge's shape -- one small named badge
 * reused across StudentsTable/StudentsMobileList/GroupsTable/
 * GroupsMobileList/UsersPage/BranchesPage rather than inlining the same
 * <Badge> 8+ times.
 */
export const DeletedBadge = () => {
  const { t } = useTranslation();
  return <Badge variant="destructive">{t('common.deleted')}</Badge>;
};

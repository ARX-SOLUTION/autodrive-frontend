import { createFileRoute } from '@tanstack/react-router';
import GroupsPage from '@/pages/GroupsPage';

export const Route = createFileRoute('/_authenticated/groups/')({
  component: GroupsPage,
});

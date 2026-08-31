import { createFileRoute, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/store/authStore';
import { getDefaultAuthenticatedRoute } from '@/lib/defaultAuthenticatedRoute';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    throw redirect({
      to: isAuthenticated ? getDefaultAuthenticatedRoute(user?.role) : '/login',
      replace: true,
    });
  },
});

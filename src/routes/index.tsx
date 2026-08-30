import { createFileRoute, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/store/authStore';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    throw redirect({
      to:
        isAuthenticated && user?.role === 'accountant'
          ? '/profile'
          : isAuthenticated
            ? '/dashboard'
            : '/login',
      replace: true,
    });
  },
});

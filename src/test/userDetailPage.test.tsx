import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import UserDetailPage from '@/pages/UserDetailPage';

const USER = {
  id: 'u1',
  name: 'Nigora Karimova',
  email: 'nigora@example.com',
  role: 'operator',
  branch_name: 'Yunusobod',
  is_active: true,
  referred_students_count: 3,
};

vi.mock('@/services/userService', () => ({
  useUser: () => ({ data: USER, isLoading: false, isError: false }),
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/users/u1']}>
      <Routes>
        <Route path="/users/:id" element={<UserDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

afterEach(cleanup);

describe('UserDetailPage referred_students_count Field', () => {
  it('links the referred students count to the filtered students list', () => {
    renderPage();
    const link = screen.getByText('3').closest('a');
    expect(link?.getAttribute('href')).toBe('/students?referred_by_user_id=u1');
  });
});

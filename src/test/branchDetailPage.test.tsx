import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import BranchDetailPage from '@/pages/BranchDetailPage';

// autodrive-6ef.19: branch detail page renders header + analytics fields.

const BRANCH = {
  id: 'b1',
  name: 'Yunusobod filiali',
  location: 'Toshkent',
  phone: '+998901234567',
  manager_name: 'Aziz Karimov',
  active_students: 42,
  created_at: '2026-07-01T00:00:00.000Z',
  revenue: 15000000,
  debt: 2000000,
  today_payment: 500000,
};

vi.mock('@/services/branchService', () => ({
  useBranch: () => ({ data: BRANCH, isLoading: false, isError: false }),
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/branches/b1']}>
      <Routes>
        <Route path="/branches/:id" element={<BranchDetailPage />} />
        <Route path="/branches" element={<div>branches-list-page</div>} />
      </Routes>
    </MemoryRouter>,
  );

afterEach(cleanup);

describe('BranchDetailPage', () => {
  it('shows header fields and analytics', () => {
    renderPage();
    expect(screen.getByText('Yunusobod filiali')).toBeTruthy();
    expect(screen.getByText('Toshkent')).toBeTruthy();
    expect(screen.getByText(/Aziz Karimov/)).toBeTruthy();
    expect(screen.getByText('branches.detail.revenue')).toBeTruthy();
    expect(screen.getByText('branches.detail.debt')).toBeTruthy();
    expect(screen.getByText('branches.detail.today_payment')).toBeTruthy();
  });

  it('back button navigates to the branches list', () => {
    renderPage();
    fireEvent.click(screen.getByText('branches.title'));
    expect(screen.getByText('branches-list-page')).toBeTruthy();
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import BlogPage from '@/pages/BlogPage';
import type { BlogPostSummary } from '@/types/blogPost';

// Note: i18n is mocked in setup.ts: t(key) => key.

const posts: BlogPostSummary[] = [
  {
    slug: 'birinchi',
    tags: ['owner'],
    title_uz: 'Birinchi maqola',
    title_ru: '',
    title_en: '',
    excerpt_uz: 'Filiallar haqida maslahat',
    excerpt_ru: '',
    excerpt_en: '',
    cover_image_url: null,
    view_count: 10,
    published_at: '2026-01-01',
  },
  {
    slug: 'ikkinchi',
    tags: ['manager'],
    title_uz: 'Ikkinchi maqola',
    title_ru: '',
    title_en: '',
    excerpt_uz: 'Davomat boshqaruvi',
    excerpt_ru: '',
    excerpt_en: '',
    cover_image_url: null,
    view_count: 5,
    published_at: '2026-01-02',
  },
];

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BlogPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('BlogPage tag filter + search', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(axiosInstance, 'get').mockResolvedValue({
      data: {
        data: { items: posts, total: posts.length, page: 1, limit: 100 },
      },
    });
  });

  it('narrows the grid client-side without an extra network fetch', async () => {
    renderPage();

    expect(await screen.findByText('Birinchi maqola')).toBeInTheDocument();
    expect(screen.getByText('Ikkinchi maqola')).toBeInTheDocument();
    expect(axiosInstance.get).toHaveBeenCalledTimes(1);

    // Substring search narrows to one card, no refetch.
    fireEvent.change(screen.getByPlaceholderText('blog.search_placeholder'), {
      target: { value: 'Davomat' },
    });
    await waitFor(() =>
      expect(screen.queryByText('Birinchi maqola')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Ikkinchi maqola')).toBeInTheDocument();
    expect(axiosInstance.get).toHaveBeenCalledTimes(1);

    // Clear search, filter by tag instead — same story.
    fireEvent.change(screen.getByPlaceholderText('blog.search_placeholder'), {
      target: { value: '' },
    });
    // "owner" also appears as a per-card tag chip — the filter chip is first.
    fireEvent.click(screen.getAllByText('owner')[0]);
    await waitFor(() =>
      expect(screen.queryByText('Ikkinchi maqola')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Birinchi maqola')).toBeInTheDocument();
    expect(axiosInstance.get).toHaveBeenCalledTimes(1);
  });
});

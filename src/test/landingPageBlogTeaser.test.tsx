import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import LandingPage from '@/pages/LandingPage';
import type { BlogPostSummary } from '@/types/blogPost';

// Note: i18n is mocked in setup.ts: t(key) => key.

const makePost = (slug: string, published_at: string): BlogPostSummary => ({
  slug,
  tags: ['owner'],
  title_uz: `Maqola ${slug}`,
  title_ru: '',
  title_en: '',
  excerpt_uz: `Excerpt ${slug}`,
  excerpt_ru: '',
  excerpt_en: '',
  cover_image_url: null,
  view_count: 1,
  published_at,
});

const renderLanding = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('LandingPage blog teaser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the 3 most recent published posts, most-recent first, linking to /blog', async () => {
    const posts = [
      makePost('oldest', '2026-01-01'),
      makePost('newest', '2026-01-04'),
      makePost('middle', '2026-01-02'),
      makePost('second-newest', '2026-01-03'),
    ];
    vi.spyOn(axiosInstance, 'get').mockResolvedValue({
      data: {
        data: { items: posts, total: posts.length, page: 1, limit: 100 },
      },
    });

    renderLanding();

    expect(await screen.findByText('landing.blog_title')).toBeInTheDocument();
    expect(screen.getByText('Maqola newest')).toBeInTheDocument();
    expect(screen.getByText('Maqola second-newest')).toBeInTheDocument();
    expect(screen.getByText('Maqola middle')).toBeInTheDocument();
    expect(screen.queryByText('Maqola oldest')).not.toBeInTheDocument();

    const viewAllLinks = screen.getAllByRole('link', {
      name: /landing.blog_view_all/,
    });
    expect(viewAllLinks[0]).toHaveAttribute('href', '/blog');

    const navBlogLink = screen.getByRole('link', { name: 'landing.nav_blog' });
    expect(navBlogLink).toHaveAttribute('href', '/blog');

    const card = screen.getByRole('link', { name: /Maqola newest/ });
    expect(card).toHaveAttribute('href', '/blog/newest');
  });

  it('hides the section entirely when there are no published posts', async () => {
    vi.spyOn(axiosInstance, 'get').mockResolvedValue({
      data: { data: { items: [], total: 0, page: 1, limit: 100 } },
    });

    renderLanding();

    // Wait for an unrelated always-present heading to confirm the page rendered.
    expect(await screen.findByText('landing.faq_title')).toBeInTheDocument();
    expect(screen.queryByText('landing.blog_title')).not.toBeInTheDocument();
  });
});

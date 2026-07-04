import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { BlogPost, BlogPostSummary } from '@/types/blogPost';

// ponytail: client-side filter needs the whole published list — one big page
// instead of real pagination. Revisit once post count passes ~150-200.
const LIST_LIMIT = 100;

export const useBlogPosts = () =>
  useQuery<BlogPostSummary[]>({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/blog-posts', {
        params: { page: 1, limit: LIST_LIMIT },
      });
      return res?.data?.items ?? [];
    },
    staleTime: 5 * 60_000,
  });

export const useBlogPost = (slug: string | undefined) =>
  useQuery<BlogPost>({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data: res } = await axiosInstance.get(`/blog-posts/${slug}`);
      return res?.data;
    },
    enabled: !!slug,
  });

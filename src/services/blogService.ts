import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { BlogPost, BlogPostSummary } from '@/types/blogPost';
import { parseItemEnvelope } from '@/lib/apiEnvelope';
import { blogKeys } from '@/lib/queryKeys';

// ponytail: client-side filter needs the whole published list — one big page
// instead of real pagination. Revisit once post count passes ~150-200.
const LIST_LIMIT = 100;

export const useBlogPosts = () =>
  useQuery<BlogPostSummary[]>({
    queryKey: blogKeys.list(),
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get('/blog-posts', {
        params: { page: 1, limit: LIST_LIMIT },
        signal,
      });
      // ponytail: blog list uses a distinct { data: { items, meta } } envelope
      // (paginated `items`, not the data/data.data shapes apiEnvelope.ts
      // covers) -- left as ad hoc rather than forcing it through the wrong
      // adapter.
      return res?.data?.items ?? [];
    },
    staleTime: 5 * 60_000,
  });

export const useBlogPost = (slug: string | undefined) =>
  useQuery<BlogPost>({
    queryKey: blogKeys.detail(slug),
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get(`/blog-posts/${slug}`, {
        signal,
      });
      return parseItemEnvelope<BlogPost>(res, 'blog-post');
    },
    enabled: !!slug,
  });

import type { BlogPostSummary } from '@/types/blogPost';

const WORDS_PER_MINUTE = 200;

/** Pick the `${field}_${lang}` column off a post, falling back to uz. */
export const localizedField = (
  post: BlogPostSummary,
  field: 'title' | 'excerpt' | 'body',
  lang: string,
): string => {
  const key = `${field}_${lang}` as keyof BlogPostSummary;
  return (
    (post[key] as string | undefined) ?? (post[`${field}_uz`] as string) ?? ''
  );
};

/** word count / ~200wpm, min 1 minute. */
export const estimateReadingTime = (text: string): number =>
  Math.max(
    1,
    Math.round(
      text.trim().split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE,
    ),
  );

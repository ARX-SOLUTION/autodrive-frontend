import { useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, {
  defaultSchema,
  type Options as SanitizeSchema,
} from 'rehype-sanitize';
import 'highlight.js/styles/github-dark.css';
import {
  Calendar,
  Clock,
  Eye,
  Share,
  Link as LinkIcon,
  PaperPlaneTilt,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageLoader } from '@/components/layout/PageLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { BlogHeader } from '@/components/blog/BlogHeader';
import { useBlogPost, useBlogPosts } from '@/services/blogService';
import { localizedField, estimateReadingTime } from '@/lib/blog';

// ponytail: default sanitize schema strips the classes rehype-highlight
// adds (`language-x` on <code>, `hljs-*` on <span>) — allow just those.
const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ['className', /^(language-|hljs)/],
    ],
    span: [...(defaultSchema.attributes?.span ?? []), ['className', /^hljs/]],
  },
};

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const { data: post, isLoading } = useBlogPost(slug);
  const { data: allPosts } = useBlogPosts();

  useEffect(() => {
    if (post) document.title = localizedField(post, 'title', i18n.language);
  }, [post, i18n.language]);

  const related = useMemo(() => {
    if (!post || !allPosts) return [];
    return allPosts
      .filter(
        (p) =>
          p.slug !== post.slug && p.tags.some((tag) => post.tags.includes(tag)),
      )
      .slice(0, 3);
  }, [post, allPosts]);

  const shareTitle = post ? localizedField(post, 'title', i18n.language) : '';
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: shareTitle, url: window.location.href });
    } catch {
      // user cancelled the share sheet — no-op
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success(t('blog.share_copied'));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <BlogHeader />
        <PageLoader />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <BlogHeader />
        <EmptyState
          title={t('blog.not_found_title')}
          description={t('blog.not_found_desc')}
        />
      </div>
    );
  }

  const title = localizedField(post, 'title', i18n.language);
  const body = localizedField(post, 'body', i18n.language);
  const readingTime = estimateReadingTime(body);
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(shareTitle)}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BlogHeader />
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={title}
            className="mb-6 aspect-video w-full rounded-2xl object-cover"
          />
        )}

        {post.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <h1 className="font-heading mb-4 text-3xl font-bold text-balance sm:text-4xl">
          {title}
        </h1>

        <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-4" />
            {format(new Date(post.published_at), 'dd.MM.yyyy')}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" />
            {t('blog.reading_time', { count: readingTime })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="size-4" />
            {t('blog.views', { count: post.view_count })}
          </span>
        </div>

        <div className="prose prose-slate max-w-none dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight, [rehypeSanitize, sanitizeSchema]]}
          >
            {body}
          </ReactMarkdown>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          {canNativeShare ? (
            <Button variant="outline" onClick={handleNativeShare}>
              <Share className="mr-2 size-4" />
              {t('blog.share')}
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Share className="mr-2 size-4" />
                  {t('blog.share')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={handleCopyLink}>
                  <LinkIcon className="mr-2 size-4" />
                  {t('blog.share_copy_link')}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={telegramShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <PaperPlaneTilt className="mr-2 size-4" />
                    {t('blog.share_telegram')}
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="font-heading mb-4 text-xl font-bold">
              {t('blog.related_title')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  to={`/blog/${p.slug}`}
                  className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
                >
                  <h3 className="line-clamp-2 text-sm font-semibold text-card-foreground">
                    {localizedField(p, 'title', i18n.language)}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
};

export default BlogPostPage;

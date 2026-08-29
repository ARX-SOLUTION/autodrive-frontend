import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass, Eye, Clock, X } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/layout/PageLoader';
import { BlogHeader } from '@/components/blog/BlogHeader';
import { useBlogPosts } from '@/services/blogService';
import { localizedField, estimateReadingTime } from '@/lib/blog';

const BlogPage = () => {
  const { t, i18n } = useTranslation();
  const { data: posts, isLoading } = useBlogPosts();
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allTags = useMemo(
    () => Array.from(new Set((posts ?? []).flatMap((p) => p.tags))).sort(),
    [posts],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (posts ?? []).filter((p) => {
      const matchesTag =
        selectedTags.length === 0 ||
        p.tags.some((tag) => selectedTags.includes(tag));
      if (!matchesTag) return false;
      if (!q) return true;
      const haystack =
        `${localizedField(p, 'title', i18n.language)} ${localizedField(p, 'excerpt', i18n.language)}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [posts, search, selectedTags, i18n.language]);

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag],
    );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BlogHeader />

      <section className="mx-auto max-w-5xl px-4 pb-8 pt-10 sm:px-6 lg:px-8">
        <h1 className="font-heading mb-2 text-3xl font-bold sm:text-4xl">
          {t('blog.hero_title')}
        </h1>
        <p className="mb-8 text-sm text-muted-foreground sm:text-base">
          {t('blog.hero_subtitle')}
        </p>

        <div className="relative mb-4">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('blog.search_placeholder')}
            className="pl-9"
          />
        </div>

        {allTags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            <button type="button" onClick={() => setSelectedTags([])}>
              <Badge
                variant={selectedTags.length === 0 ? 'default' : 'outline'}
              >
                {t('blog.filter_all')}
              </Badge>
            </button>
            {allTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}>
                  <Badge
                    variant={active ? 'default' : 'outline'}
                    className="inline-flex items-center gap-1"
                  >
                    {tag}
                    {active && <X className="size-3" />}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}

        {isLoading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={t('blog.empty_title')}
            description={t('blog.empty_desc')}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post) => {
              const title = localizedField(post, 'title', i18n.language);
              const excerpt = localizedField(post, 'excerpt', i18n.language);
              const readingTime = estimateReadingTime(excerpt);
              return (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition-colors hover:border-primary/30 dark:border-white/[8%] dark:bg-white/[0.03]"
                >
                  {post.cover_image_url && (
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      <img
                        src={post.cover_image_url}
                        alt={title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    {post.tags.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {post.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <h3 className="mb-1.5 line-clamp-2 text-base font-semibold text-balance text-slate-900 dark:text-white">
                      {title}
                    </h3>
                    <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-white/45">
                      {excerpt}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {t('blog.reading_time', { count: readingTime })}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="size-3.5" />
                        {t('blog.views', { count: post.view_count })}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default BlogPage;

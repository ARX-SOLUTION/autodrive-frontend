// Postbuild prerender: inject static HTML into dist so crawlers (Google, Yandex,
// AI bots) see real content without executing JS. React replaces it on mount
// (createRoot.render), so runtime behavior is unchanged.
//   • landing  → dist/index.html
//   • blog     → dist/blog/index.html + dist/blog/<slug>/index.html
//   • sitemap  → dist/sitemap.xml (regenerated with all blog URLs)
import { build } from 'vite';
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { micromark } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';

const SITE = 'https://automaktab.uz';
const API = 'https://api.automaktab.uz';

await build({
  logLevel: 'warn',
  build: {
    ssr: 'src/entry-prerender.tsx',
    outDir: 'dist-ssr',
    emptyOutDir: true,
  },
});

const { render } = await import(pathToFileURL('dist-ssr/entry-prerender.js'));
const appHtml = await render();
if (!appHtml.includes('<h1'))
  throw new Error('prerender: no <h1> in rendered output');

const indexPath = 'dist/index.html';
// Capture the clean shell (empty root div, hashed asset links, base <head>)
// BEFORE the landing body is injected — blog pages are built from this.
const baseHtml = readFileSync(indexPath, 'utf8');
const rootMarker = /<div id="root"><\/div>/;
if (!rootMarker.test(baseHtml))
  throw new Error(
    'prerender: <div id="root"></div> not found in dist/index.html',
  );

const landingHtml = baseHtml.replace(
  rootMarker,
  () => `<div id="root">${appHtml}</div>`,
);
writeFileSync(indexPath, landingHtml);

// index.html was mutated after workbox generated its precache manifest —
// resync the revision (md5 of content) or returning PWA users get the stale shell.
const swPath = 'dist/sw.js';
let sw = readFileSync(swPath, 'utf8');
const entry = /\{url:"index\.html",revision:"[a-f0-9]+"\}/;
if (!entry.test(sw))
  throw new Error(
    'prerender: index.html precache entry not found in dist/sw.js',
  );
const rev = createHash('md5').update(landingHtml).digest('hex');
writeFileSync(
  swPath,
  sw.replace(entry, `{url:"index.html",revision:"${rev}"}`),
);

rmSync('dist-ssr', { recursive: true, force: true });
console.log(
  `prerender: landing HTML injected (${(appHtml.length / 1024).toFixed(1)} KiB), sw revision ${rev}`,
);

// ── Blog prerender ──────────────────────────────────────────────────────────
// Blog pages are API-driven + client-rendered, so their real articles are
// invisible to crawlers. Prerender the published posts (uz — the default locale,
// matching lang="uz" in the shell) into static HTML with per-post <head> +
// Article JSON-LD. Resilient: any fetch failure skips blog only, the landing
// build already succeeded.
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const ldScript = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

// Build a page from the clean shell: swap the SEO <head> tags, add JSON-LD,
// inject the crawler-facing body. Missing patterns warn (never throw) so a
// shell markup change degrades gracefully instead of failing the deploy.
function renderPage({
  title,
  description,
  path,
  ogType,
  image,
  jsonLd,
  bodyHtml,
}) {
  let h = baseHtml;
  const url = `${SITE}${path}`;
  const swap = (re, value, label) => {
    if (!re.test(h)) {
      console.warn(`prerender: <head> pattern not found (${label})`);
      return;
    }
    h = h.replace(re, value);
  };
  swap(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`, 'title');
  swap(
    /<meta\s+name="description"[\s\S]*?>/,
    `<meta name="description" content="${esc(description)}" />`,
    'description',
  );
  swap(
    /<link\s+rel="canonical"[\s\S]*?>/,
    `<link rel="canonical" href="${url}" />`,
    'canonical',
  );
  swap(
    /<meta\s+property="og:url"[\s\S]*?>/,
    `<meta property="og:url" content="${url}" />`,
    'og:url',
  );
  swap(
    /<meta\s+property="og:title"[\s\S]*?>/,
    `<meta property="og:title" content="${esc(title)}" />`,
    'og:title',
  );
  swap(
    /<meta\s+property="og:description"[\s\S]*?>/,
    `<meta property="og:description" content="${esc(description)}" />`,
    'og:description',
  );
  swap(
    /<meta\s+property="og:type"[\s\S]*?>/,
    `<meta property="og:type" content="${ogType}" />`,
    'og:type',
  );
  swap(
    /<meta\s+name="twitter:title"[\s\S]*?>/,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    'twitter:title',
  );
  swap(
    /<meta\s+name="twitter:description"[\s\S]*?>/,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    'twitter:description',
  );
  if (image) {
    swap(
      /<meta\s+property="og:image"[\s\S]*?>/,
      `<meta property="og:image" content="${esc(image)}" />`,
      'og:image',
    );
    swap(
      /<meta\s+name="twitter:image"[\s\S]*?>/,
      `<meta name="twitter:image" content="${esc(image)}" />`,
      'twitter:image',
    );
  }
  if (jsonLd) h = h.replace('</head>', `${ldScript(jsonLd)}</head>`);
  return h.replace(rootMarker, () => `<div id="root">${bodyHtml}</div>`);
}

async function fetchJson(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

try {
  const listRes = await fetchJson(`${API}/blog-posts?page=1&limit=100`);
  const summaries = (listRes?.data?.items ?? []).filter(
    (p) => !p.status || p.status === 'published',
  );

  const posts = [];
  for (const summary of summaries) {
    try {
      const detailRes = await fetchJson(`${API}/blog-posts/${summary.slug}`);
      const post = detailRes?.data?.item ?? detailRes?.data ?? null;
      if (!post?.slug) continue;

      const title = post.title_uz;
      const excerpt = post.excerpt_uz;
      const contentHtml = micromark(post.body_uz ?? '', {
        extensions: [gfm()],
        htmlExtensions: [gfmHtml()],
      });
      const tagsHtml = post.tags?.length
        ? `<ul class="post-tags">${post.tags.map((tg) => `<li>${esc(tg)}</li>`).join('')}</ul>`
        : '';
      const bodyHtml = `<article><h1>${esc(title)}</h1><p>${esc(excerpt)}</p>${tagsHtml}${contentHtml}</article>`;

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description: excerpt,
        datePublished: post.published_at,
        dateModified: post.published_at,
        inLanguage: 'uz',
        ...(post.cover_image_url ? { image: post.cover_image_url } : {}),
        author: { '@type': 'Organization', name: 'Auto Maktab CRM' },
        publisher: { '@id': `${SITE}/#org` },
        mainEntityOfPage: `${SITE}/blog/${post.slug}`,
      };

      const pageHtml = renderPage({
        title: `${title} | Auto Maktab`,
        description: excerpt,
        path: `/blog/${post.slug}`,
        ogType: 'article',
        image: post.cover_image_url,
        jsonLd,
        bodyHtml,
      });
      mkdirSync(`dist/blog/${post.slug}`, { recursive: true });
      writeFileSync(`dist/blog/${post.slug}/index.html`, pageHtml);
      posts.push(post);
    } catch (err) {
      console.warn(`prerender: skipped post ${summary.slug}: ${err.message}`);
    }
  }

  if (posts.length) {
    const listBody = `<div><h1>Auto Maktab CRM — Blog</h1><ul class="blog-list">${posts
      .map(
        (p) =>
          `<li><a href="/blog/${p.slug}"><h2>${esc(p.title_uz)}</h2><p>${esc(p.excerpt_uz)}</p></a></li>`,
      )
      .join('')}</ul></div>`;
    const listHtml = renderPage({
      title: 'Blog | Auto Maktab CRM',
      description:
        "Avtomaktablar uchun CRM bo'yicha qo'llanma va yangiliklar — to'lov, davomat, jadval va boshqaruv.",
      path: '/blog',
      ogType: 'website',
      image: null,
      jsonLd: null,
      bodyHtml: listBody,
    });
    mkdirSync('dist/blog', { recursive: true });
    writeFileSync('dist/blog/index.html', listHtml);
  }

  // Regenerate the served sitemap with every indexable URL (public/sitemap.xml
  // stays as the homepage-only fallback if this block is skipped).
  const urls = [
    { loc: `${SITE}/`, changefreq: 'weekly', priority: '1.0' },
    ...(posts.length
      ? [{ loc: `${SITE}/blog`, changefreq: 'weekly', priority: '0.7' }]
      : []),
    ...posts.map((p) => ({
      loc: `${SITE}/blog/${p.slug}`,
      lastmod: p.published_at ? String(p.published_at).slice(0, 10) : undefined,
      changefreq: 'monthly',
      priority: '0.6',
    })),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url>\n    <loc>${u.loc}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
  )
  .join('\n')}
</urlset>
`;
  writeFileSync('dist/sitemap.xml', sitemap);
  console.log(
    `prerender: ${posts.length} blog post(s) + list + sitemap (${urls.length} URLs)`,
  );
} catch (err) {
  console.warn(
    `prerender: blog prerender skipped (${err.message}) — landing still generated`,
  );
}

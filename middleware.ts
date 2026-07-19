// Vercel Routing Middleware — /blog/:slug only, real browsers pass through
// untouched (see BACKEND_CONTRACT / autodrive-dlb.7.3). Handles ONLY social
// link-preview bots: they get a fresh per-post OG/JSON-LD doc so Telegram/social
// previews show the real title/image — and reflect a brand-new post before the
// next redeploy. Search + AI crawlers (Googlebot, YandexBot, GPTBot, Perplexity,
// ClaudeBot, Bingbot) are deliberately NOT matched — they fall through to the
// build-time prerendered /blog/<slug>/index.html (scripts/prerender.mjs), which
// carries the full article body + richer meta. Do NOT add a search/AI UA back
// here, or you downgrade that crawler to this thin preview.
const BOT_UA = /TelegramBot|facebookexternalhit|Twitterbot|Slackbot/i;

const API_BASE =
  process.env.VITE_API_BASE_URL ??
  'https://autodrive-backend-production.up.railway.app';
const SITE_URL = 'https://automaktab.uz';

export const config = {
  matcher: '/blog/:slug',
};

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] as string,
  );

export default async function middleware(request: Request) {
  const ua = request.headers.get('user-agent') ?? '';
  if (!BOT_UA.test(ua)) return; // real users get the normal SPA, unchanged

  const slug = new URL(request.url).pathname.split('/').pop() ?? '';

  try {
    const res = await fetch(`${API_BASE}/blog-posts/${slug}`);
    if (!res.ok) return; // unknown slug — fall back to normal SPA (client 404s)
    const { data: post } = await res.json();

    const title = escapeHtml(post.title_uz);
    const description = escapeHtml(post.excerpt_uz);
    const image = post.cover_image_url ?? `${SITE_URL}/og-banner.png`;
    const canonical = `${SITE_URL}/blog/${post.slug}`;
    const jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title_uz,
      description: post.excerpt_uz,
      image,
      datePublished: post.published_at,
      url: canonical,
    });

    const html = `<!doctype html>
<html lang="uz">
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:locale" content="uz_UZ" />
<script type="application/ld+json">${jsonLd}</script>
</head>
<body><h1>${title}</h1><p>${description}</p></body>
</html>`;

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        // Defensive: even though the HTML body sets <meta name="robots" content="index, follow">,
        // emit an explicit allow directive at the HTTP layer so crawler audits (Lighthouse SEO,
        // Search Console) don't grade us on Cloudflare's challenge HTML if it ever sits in front.
        'x-robots-tag': 'all',
      },
    });
  } catch {
    return; // backend hiccup — fall back to normal SPA rather than error
  }
}

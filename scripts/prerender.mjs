// Postbuild prerender: inject the landing page's static HTML into dist/index.html
// so crawlers (Google, Yandex, AI bots) see real content without executing JS.
// React replaces it on mount (createRoot.render), so runtime behavior is unchanged.
import { build } from 'vite';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

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
let html = readFileSync(indexPath, 'utf8');
const marker = /<div id="root"><\/div>/;
if (!marker.test(html))
  throw new Error(
    'prerender: <div id="root"></div> not found in dist/index.html',
  );
html = html.replace(marker, () => `<div id="root">${appHtml}</div>`);
writeFileSync(indexPath, html);

// index.html was mutated after workbox generated its precache manifest —
// resync the revision (md5 of content) or returning PWA users get the stale shell.
const swPath = 'dist/sw.js';
let sw = readFileSync(swPath, 'utf8');
const entry = /\{url:"index\.html",revision:"[a-f0-9]+"\}/;
if (!entry.test(sw))
  throw new Error(
    'prerender: index.html precache entry not found in dist/sw.js',
  );
const rev = createHash('md5').update(html).digest('hex');
writeFileSync(
  swPath,
  sw.replace(entry, `{url:"index.html",revision:"${rev}"}`),
);

rmSync('dist-ssr', { recursive: true, force: true });
console.log(
  `prerender: landing HTML injected (${(appHtml.length / 1024).toFixed(1)} KiB), sw revision ${rev}`,
);

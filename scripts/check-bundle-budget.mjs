import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { basename } from 'node:path';

const distDir = new URL('../dist/', import.meta.url);
const assetsDir = new URL('./assets/', distDir);
const kib = 1024;

const gzipBytes = (relativePath) =>
  gzipSync(readFileSync(new URL(relativePath, distDir))).byteLength;

const formatKib = (bytes) => `${(bytes / kib).toFixed(2)} KiB`;
const assertBudget = (label, actual, limit) => {
  if (actual > limit) {
    throw new Error(
      `${label} is ${formatKib(actual)}; budget is ${formatKib(limit)}.`,
    );
  }
};

const html = readFileSync(new URL('./index.html', distDir), 'utf8');
const initialAssetPaths = new Set(
  [...html.matchAll(/(?:src|href)="\/([^"?]+\.js)"/g)].map(([, path]) => path),
);
const initialBaseBytes = [...initialAssetPaths].reduce(
  (total, path) => total + gzipBytes(path),
  0,
);

const assetNames = readdirSync(assetsDir);
const localeChunks = assetNames.filter((name) =>
  /^(?:ru|en)-.+\.js$/.test(name),
);
if (localeChunks.length !== 2) {
  throw new Error(
    `Expected 2 lazy locale chunks, found ${localeChunks.length}.`,
  );
}
const largestLocaleBytes = Math.max(
  ...localeChunks.map((name) => gzipBytes(`assets/${name}`)),
);
const initialBytes = initialBaseBytes + largestLocaleBytes;
assertBudget('Initial JS plus selected locale', initialBytes, 200 * kib);

const routeChunks = assetNames.filter((name) =>
  /^(?:login-|_authenticated(?:[.-])|CompanyRevenueDashboard-|TeacherDashboard-).+\.js$/.test(
    name,
  ),
);
if (routeChunks.length === 0) {
  throw new Error('No route chunks found; route budget could not be checked.');
}
const largestRoute = routeChunks
  .map((name) => ({ name, bytes: gzipBytes(`assets/${name}`) }))
  .sort((left, right) => right.bytes - left.bytes)[0];
assertBudget(`Route chunk ${largestRoute.name}`, largestRoute.bytes, 60 * kib);

const optionalBudgets = [
  { prefix: 'charts-vendor-', limit: 100 * kib },
  { prefix: 'export-xlsx-', limit: 160 * kib },
];
for (const { prefix, limit } of optionalBudgets) {
  const name = assetNames.find((assetName) => assetName.startsWith(prefix));
  if (!name) throw new Error(`Expected optional chunk ${prefix}*.js.`);
  assertBudget(`Optional chunk ${name}`, gzipBytes(`assets/${name}`), limit);
}

const serviceWorker = readFileSync(new URL('./sw.js', distDir), 'utf8');
const precacheUrls = [...serviceWorker.matchAll(/"url":"([^"]+)"/g)].map(
  ([, url]) => url,
);
const requiredOfflineAssets = [
  'offline.html',
  'favicon.png',
  'manifest.webmanifest',
];
if (
  precacheUrls.length !== requiredOfflineAssets.length ||
  requiredOfflineAssets.some((asset) => !precacheUrls.includes(asset)) ||
  precacheUrls.some(
    (asset) => asset.startsWith('assets/') || asset.includes('/api/'),
  )
) {
  throw new Error(`Unsafe PWA precache: ${precacheUrls.join(', ')}`);
}

console.log(
  [
    `Initial JS: ${formatKib(initialBytes)} / 200.00 KiB`,
    `Largest route: ${basename(largestRoute.name)} ${formatKib(largestRoute.bytes)} / 60.00 KiB`,
    `PWA precache: ${precacheUrls.join(', ')}`,
  ].join('\n'),
);

/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('search engine policy for the app shell', () => {
  it('sends the same noindex directive from meta, nginx and Vercel', () => {
    expect(read('index.html')).toContain(
      '<meta name="robots" content="noindex, nofollow" />',
    );
    expect(read('nginx.conf')).toContain(
      'add_header X-Robots-Tag "noindex, nofollow";',
    );
    const vercel = JSON.parse(read('vercel.json')) as {
      headers: { headers: { key: string; value: string }[] }[];
    };
    const robotsHeaders = vercel.headers
      .flatMap((rule) => rule.headers)
      .filter((header) => header.key === 'X-Robots-Tag');
    expect(robotsHeaders).toEqual([
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ]);
  });

  it('lets crawlers reach only the shell and login page to read noindex', () => {
    const rules = read('public/robots.txt')
      .split('\n')
      .filter((line) => line && !line.startsWith('#'));
    expect(rules).toEqual([
      'User-agent: *',
      'Allow: /$',
      'Allow: /login$',
      'Disallow: /',
    ]);
  });
});

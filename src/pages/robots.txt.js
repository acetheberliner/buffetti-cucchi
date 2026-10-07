import { siteUrl } from '../data/site-config.js';

export function GET({ site }) {
  const baseUrl = site ?? new URL(siteUrl);

  return new Response(
    `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', baseUrl).href}\n`,
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    },
  );
}

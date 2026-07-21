import { productCategories } from '../data/catalog';

const staticPaths = [
  '/',
  '/arredamento.html',
  '/articoli-per-la-scuola.html',
  '/articoli-per-l-ufficio.html',
  '/cancelleria.html',
  '/contatti.html',
  '/pelletteria-e-regalistica.html',
  '/privacy-policy.html',
  '/servizi.html',
];

const escapeXml = (value) =>
  value.replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character]);

export function GET({ site }) {
  const baseUrl = site ?? new URL('https://www.cucchisascesena.it');
  const paths = [...staticPaths, ...productCategories.map((category) => category.href)];
  const urls = [...new Set(paths)]
    .map((path) => `  <url><loc>${escapeXml(new URL(path, baseUrl).href)}</loc></url>`)
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
}

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';
import { siteUrl } from '../src/data/site-config.js';

const projectRoot = process.cwd();
const distRoot = path.resolve(projectRoot, process.argv[2] ?? 'dist');
const origin = siteUrl;

const indexablePaths = [
  '/',
  '/arredamento.html',
  '/articoli-per-l-ufficio.html',
  '/articoli-per-la-scuola.html',
  '/cancelleria.html',
  '/contatti.html',
  '/pelletteria-e-regalistica.html',
  '/privacy-policy.html',
  '/servizi.html',
  '/prodotti/arredo-complementi.html',
  '/prodotti/carta-modulistica.html',
  '/prodotti/cartucce-toner.html',
  '/prodotti/archiviazione.html',
  '/prodotti/cancelleria.html',
  '/prodotti/disegno-didattica.html',
  '/prodotti/visual-comunicazione.html',
  '/prodotti/comunita-servizi.html',
  '/prodotti/spedizione-imballaggi.html',
  '/prodotti/informatica-elettronica.html',
  '/prodotti/macchine-ufficio.html',
  '/prodotti/ecosostenibili.html',
];

const requiredFiles = [
  '404.html',
  'privacy-policy.html',
  'sitemap.xml',
  'robots.txt',
  '_headers',
  'site.webmanifest',
];

const errors = [];
const warnings = [];
const pageRows = [];

const toFilePath = (urlPath) => {
  const cleanPath = decodeURIComponent(urlPath.split(/[?#]/, 1)[0]);
  if (cleanPath === '/') return path.join(distRoot, 'index.html');
  return path.join(distRoot, cleanPath.replace(/^\//, '').replaceAll('/', path.sep));
};

const walk = (node, visitor) => {
  visitor(node);
  for (const child of node.childNodes ?? []) walk(child, visitor);
  if (node.content) walk(node.content, visitor);
};

const attr = (node, name) =>
  node.attrs?.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value;

const textContent = (node) => {
  let value = '';
  walk(node, (child) => {
    if (child.nodeName === '#text') value += ` ${child.value}`;
  });
  return value.replace(/\s+/g, ' ').trim();
};

const parsePage = (publicPath) => {
  const filePath = toFilePath(publicPath);
  if (!fs.existsSync(filePath)) {
    errors.push(`${publicPath}: file HTML mancante (${path.relative(projectRoot, filePath)})`);
    return;
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const document = parse(html);
  const nodes = [];
  walk(document, (node) => nodes.push(node));

  const titleNodes = nodes.filter((node) => node.tagName === 'title');
  const title = titleNodes.length === 1 ? textContent(titleNodes[0]) : '';
  const descriptions = nodes.filter(
    (node) => node.tagName === 'meta' && attr(node, 'name')?.toLowerCase() === 'description',
  );
  const description = descriptions.length === 1 ? attr(descriptions[0], 'content')?.trim() ?? '' : '';
  const h1Nodes = nodes.filter((node) => node.tagName === 'h1');
  const canonicalNodes = nodes.filter(
    (node) => node.tagName === 'link' && attr(node, 'rel')?.toLowerCase().split(/\s+/).includes('canonical'),
  );
  const canonical = canonicalNodes.length === 1 ? attr(canonicalNodes[0], 'href') ?? '' : '';
  const robotsNodes = nodes.filter(
    (node) => node.tagName === 'meta' && attr(node, 'name')?.toLowerCase() === 'robots',
  );
  const robots = robotsNodes.length === 1 ? attr(robotsNodes[0], 'content')?.trim() ?? '' : '';
  const mainNodes = nodes.filter((node) => node.tagName === 'main');
  const mainText = mainNodes.length === 1 ? textContent(mainNodes[0]) : '';
  const expectedCanonical = new URL(publicPath, origin).href;

  if (titleNodes.length !== 1 || !title) errors.push(`${publicPath}: title assente o non univoco`);
  if (descriptions.length !== 1 || !description) errors.push(`${publicPath}: meta description assente o non univoca`);
  if (h1Nodes.length !== 1) errors.push(`${publicPath}: trovati ${h1Nodes.length} H1, atteso 1`);
  if (canonicalNodes.length !== 1) errors.push(`${publicPath}: canonical assente o non univoco`);
  if (canonical !== expectedCanonical) {
    errors.push(`${publicPath}: canonical ${canonical || '(assente)'}; atteso ${expectedCanonical}`);
  }
  if (robotsNodes.length !== 1 || !/\bindex\b/i.test(robots) || !/\bfollow\b/i.test(robots)) {
    errors.push(`${publicPath}: meta robots indicizzabile non valido (${robots || 'assente'})`);
  }
  if (mainNodes.length !== 1 || mainText.length < 100) {
    errors.push(`${publicPath}: contenuto principale statico assente o insufficiente`);
  }

  const ids = new Set(nodes.map((node) => attr(node, 'id')).filter(Boolean));
  for (const node of nodes.filter((item) => item.tagName === 'a')) {
    const href = attr(node, 'href');
    if (!href || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(href)) continue;

    const targetUrl = new URL(href, new URL(publicPath, origin));
    if (targetUrl.origin !== origin) continue;

    const targetFile = toFilePath(targetUrl.pathname);
    if (!fs.existsSync(targetFile)) {
      errors.push(`${publicPath}: link interno inesistente ${href}`);
      continue;
    }

    if (targetUrl.hash) {
      const targetId = decodeURIComponent(targetUrl.hash.slice(1));
      if (targetUrl.pathname === publicPath || (publicPath === '/' && targetUrl.pathname === '/index.html')) {
        if (!ids.has(targetId)) errors.push(`${publicPath}: frammento interno inesistente ${href}`);
      } else if (targetFile.endsWith('.html')) {
        const targetDocument = parse(fs.readFileSync(targetFile, 'utf8'));
        let found = false;
        walk(targetDocument, (targetNode) => {
          if (attr(targetNode, 'id') === targetId) found = true;
        });
        if (!found) errors.push(`${publicPath}: frammento di destinazione inesistente ${href}`);
      }
    }
  }

  for (const node of nodes.filter((item) => ['img', 'script', 'link', 'source'].includes(item.tagName))) {
    const references = [attr(node, 'src'), attr(node, 'href')].filter(Boolean);
    for (const reference of references) {
      if (/^(?:https?:|data:|mailto:|tel:|#)/i.test(reference)) continue;
      const assetUrl = new URL(reference, new URL(publicPath, origin));
      if (assetUrl.origin === origin && !fs.existsSync(toFilePath(assetUrl.pathname))) {
        errors.push(`${publicPath}: asset locale inesistente ${reference}`);
      }
      if (
        node.tagName === 'img' &&
        assetUrl.origin === origin &&
        (!/^\d+(?:\.\d+)?$/.test(attr(node, 'width') ?? '') ||
          !/^\d+(?:\.\d+)?$/.test(attr(node, 'height') ?? ''))
      ) {
        errors.push(`${publicPath}: immagine locale senza dimensioni esplicite ${reference}`);
      }
    }
  }

  pageRows.push({
    path: publicPath,
    title,
    descriptionLength: description.length,
    h1: h1Nodes.length === 1 ? textContent(h1Nodes[0]) : `ERRORE (${h1Nodes.length})`,
    canonical,
    robots,
    mainCharacters: mainText.length,
  });
};

if (!fs.existsSync(distRoot)) {
  console.error('ERRORE: dist non esiste. Eseguire prima npm run build.');
  process.exit(1);
}

for (const publicPath of indexablePaths) parsePage(publicPath);

for (const requiredFile of requiredFiles) {
  if (!fs.existsSync(path.join(distRoot, requiredFile))) errors.push(`File richiesto mancante: /${requiredFile}`);
}

const notFoundPath = path.join(distRoot, '404.html');
if (fs.existsSync(notFoundPath)) {
  const document = parse(fs.readFileSync(notFoundPath, 'utf8'));
  const nodes = [];
  walk(document, (node) => nodes.push(node));
  const h1Count = nodes.filter((node) => node.tagName === 'h1').length;
  const robots = nodes
    .filter((node) => node.tagName === 'meta' && attr(node, 'name')?.toLowerCase() === 'robots')
    .map((node) => attr(node, 'content') ?? '');
  if (h1Count !== 1) errors.push(`/404.html: trovati ${h1Count} H1, atteso 1`);
  if (robots.length !== 1 || !/\bnoindex\b/i.test(robots[0]) || !/\bfollow\b/i.test(robots[0])) {
    errors.push(`/404.html: meta robots atteso "noindex, follow"`);
  }
}

const sitemapPath = path.join(distRoot, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  const expectedUrls = indexablePaths.map((publicPath) => new URL(publicPath, origin).href);
  const missing = expectedUrls.filter((url) => !sitemapUrls.includes(url));
  const unexpected = sitemapUrls.filter((url) => !expectedUrls.includes(url));
  if (sitemapUrls.length !== expectedUrls.length || missing.length || unexpected.length) {
    errors.push(
      `Sitemap non corrispondente: ${sitemapUrls.length} URL; mancanti=${missing.join(', ') || 'nessuno'}; inattesi=${unexpected.join(', ') || 'nessuno'}`,
    );
  }
}

const titles = new Map();
const canonicals = new Map();
for (const page of pageRows) {
  titles.set(page.title, [...(titles.get(page.title) ?? []), page.path]);
  canonicals.set(page.canonical, [...(canonicals.get(page.canonical) ?? []), page.path]);
}
for (const [title, paths] of titles) {
  if (title && paths.length > 1) warnings.push(`Title duplicato: "${title}" su ${paths.join(', ')}`);
}
for (const [canonical, paths] of canonicals) {
  if (canonical && paths.length > 1) errors.push(`Canonical duplicato: ${canonical} su ${paths.join(', ')}`);
}

console.table(pageRows);
console.log(`\nPagine indicizzabili verificate: ${pageRows.length}/${indexablePaths.length}`);
console.log(`Errori: ${errors.length}`);
console.log(`Warning: ${warnings.length}`);
for (const error of errors) console.error(`ERRORE: ${error}`);
for (const warning of warnings) console.warn(`WARNING: ${warning}`);

process.exitCode = errors.length ? 1 : 0;

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse } from 'parse5';

const DEFAULT_OUTPUT_CSV = 'migration-data/output/old-site-crawl.csv';
const DEFAULT_OUTPUT_JSON = 'migration-data/output/old-site-crawl.json';

const usage = `
Uso:
  node scripts/crawl-seo.mjs <input.txt|input.csv|sitemap.xml> [opzioni]

Opzioni:
  --origin <url>          Origin da usare per path relativi
  --rewrite-origin <url>  Sostituisce l'origin, mantenendo path e query dell'input
  --output <file.csv>    Report CSV (default: ${DEFAULT_OUTPUT_CSV})
  --json <file.json>     Report dettagliato JSON (default: ${DEFAULT_OUTPUT_JSON})
  --delay <ms>           Pausa tra richieste (default: 250)
  --timeout <ms>         Timeout per richiesta (default: 15000)
  --max-redirects <n>    Numero massimo di redirect (default: 10)
  --help                 Mostra questo messaggio

L'input può essere:
  - TXT: un URL o path per riga;
  - CSV: URL nella prima colonna, intestazione url/old_url/vecchio_url opzionale;
  - sitemap XML: vengono lette tutte le proprietà <loc>.
`;

const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log(usage.trim());
  process.exit(args.includes('--help') ? 0 : 1);
}

const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const optionNames = new Set([
  '--origin', '--rewrite-origin', '--output', '--json', '--delay', '--timeout', '--max-redirects',
]);
let positional = '';
for (let index = 0; index < args.length; index += 1) {
  if (optionNames.has(args[index])) {
    index += 1;
  } else if (!args[index].startsWith('--') && !positional) {
    positional = args[index];
  }
}
if (!positional) {
  console.error('Errore: file di input mancante.');
  console.log(usage.trim());
  process.exit(1);
}

const inputPath = path.resolve(positional);
const outputCsvPath = path.resolve(option('--output', DEFAULT_OUTPUT_CSV));
const outputJsonPath = path.resolve(option('--json', DEFAULT_OUTPUT_JSON));
const originOption = option('--origin', '');
const rewriteOriginOption = option('--rewrite-origin', '');
const delayMs = Number(option('--delay', '250'));
const timeoutMs = Number(option('--timeout', '15000'));
const maxRedirects = Number(option('--max-redirects', '10'));

if (!fs.existsSync(inputPath)) {
  console.error(`Errore: input non trovato: ${inputPath}`);
  process.exit(1);
}
if (![delayMs, timeoutMs, maxRedirects].every(Number.isFinite)) {
  console.error('Errore: delay, timeout e max-redirects devono essere numerici.');
  process.exit(1);
}

const decodeXml = (value) =>
  value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");

const firstCsvCell = (line, delimiter) => {
  if (!line.startsWith('"')) return line.split(delimiter, 1)[0].trim();
  let value = '';
  for (let index = 1; index < line.length; index += 1) {
    if (line[index] === '"' && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (line[index] === '"') {
      break;
    } else {
      value += line[index];
    }
  }
  return value.trim();
};

const readInputUrls = () => {
  const source = fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, '').trim();
  if (!source) return [];

  let values;
  if (/<(?:urlset|sitemapindex)\b/i.test(source)) {
    values = [...source.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) => decodeXml(match[1].trim()));
  } else {
    const lines = source.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
    const delimiter = lines[0]?.includes(';') && !lines[0]?.includes(',') ? ';' : ',';
    values = lines.map((line) => firstCsvCell(line, delimiter));
    if (/^(?:url|old_url|vecchio_url|vecchio url)$/i.test(values[0] ?? '')) values.shift();
  }

  const normalized = values.map((value) => {
    try {
      const parsed = new URL(value, originOption || undefined);
      if (!rewriteOriginOption) return parsed.href;
      return new URL(`${parsed.pathname}${parsed.search}`, rewriteOriginOption).href;
    } catch {
      throw new Error(`URL non valido nell'input: ${value}${originOption ? '' : ' (per i path relativi usare --origin)'}`);
    }
  });
  return [...new Set(normalized)];
};

const walk = (node, visitor) => {
  visitor(node);
  for (const child of node.childNodes ?? []) walk(child, visitor);
  if (node.content) walk(node.content, visitor);
};

const attr = (node, name) =>
  node.attrs?.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value ?? '';

const hasAttr = (node, name) =>
  node.attrs?.some((item) => item.name.toLowerCase() === name.toLowerCase()) ?? false;

const textContent = (node) => {
  const excluded = new Set(['script', 'style', 'template', 'noscript']);
  const collect = (current) => {
    if (excluded.has(current.tagName)) return '';
    if (current.nodeName === '#text') return current.value;
    return (current.childNodes ?? []).map(collect).join(' ');
  };
  return collect(node).replace(/\s+/g, ' ').trim();
};

const sameSite = (left, right) =>
  left.hostname.replace(/^www\./i, '').toLowerCase() === right.hostname.replace(/^www\./i, '').toLowerCase();

const findMeta = (nodes, name) =>
  nodes.find((node) => node.tagName === 'meta' && attr(node, 'name').toLowerCase() === name)?.attrs
    ?.find((item) => item.name === 'content')?.value ?? '';

const collectJsonLdTypes = (value, result = new Set()) => {
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdTypes(item, result);
  } else if (value && typeof value === 'object') {
    const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
    for (const type of types.filter(Boolean)) result.add(String(type));
    for (const item of Object.values(value)) collectJsonLdTypes(item, result);
  }
  return result;
};

const parseHtml = (html, pageUrl) => {
  if (!html) return {
    title: '', metaDescription: '', h1: [], h2: [], h3: [], canonical: '', metaRobots: '',
    internalLinks: [], structuredDataTypes: [], images: [], text: '', textLength: 0, textSha256: '',
  };

  const document = parse(html);
  const nodes = [];
  walk(document, (node) => nodes.push(node));
  const page = new URL(pageUrl);
  const titleNode = nodes.find((node) => node.tagName === 'title');
  const canonicalNode = nodes.find(
    (node) => node.tagName === 'link' && attr(node, 'rel').toLowerCase().split(/\s+/).includes('canonical'),
  );
  const canonicalRaw = attr(canonicalNode ?? {}, 'href');
  const canonical = canonicalRaw ? new URL(canonicalRaw, page).href : '';
  const headings = (level) => nodes.filter((node) => node.tagName === level).map(textContent).filter(Boolean);

  const links = new Map();
  for (const node of nodes.filter((item) => item.tagName === 'a')) {
    const href = attr(node, 'href');
    if (!href || /^(?:mailto:|tel:|javascript:|data:|#)/i.test(href)) continue;
    try {
      const target = new URL(href, page);
      if (!sameSite(target, page)) continue;
      target.hash = '';
      const key = target.href;
      const record = links.get(key) ?? { url: key, anchors: [], rel: [] };
      const anchor = textContent(node);
      if (anchor && !record.anchors.includes(anchor)) record.anchors.push(anchor);
      for (const rel of attr(node, 'rel').split(/\s+/).filter(Boolean)) {
        if (!record.rel.includes(rel)) record.rel.push(rel);
      }
      links.set(key, record);
    } catch {
      // Un href non parsabile viene conservato fuori dal conteggio dei link interni validi.
    }
  }

  const images = nodes.filter((node) => node.tagName === 'img').map((node) => ({
    src: attr(node, 'src') ? new URL(attr(node, 'src'), page).href : '',
    hasAlt: hasAttr(node, 'alt'),
    alt: attr(node, 'alt'),
    width: attr(node, 'width'),
    height: attr(node, 'height'),
    loading: attr(node, 'loading'),
  }));

  const structuredDataTypes = new Set();
  for (const node of nodes.filter(
    (item) => item.tagName === 'script' && attr(item, 'type').toLowerCase() === 'application/ld+json',
  )) {
    try {
      const jsonText = (node.childNodes ?? [])
        .filter((child) => child.nodeName === '#text')
        .map((child) => child.value)
        .join('');
      collectJsonLdTypes(JSON.parse(jsonText), structuredDataTypes);
    } catch {
      structuredDataTypes.add('[JSON-LD non valido]');
    }
  }

  const mainNode = nodes.find((node) => node.tagName === 'main') ?? nodes.find((node) => node.tagName === 'body');
  const text = mainNode ? textContent(mainNode) : '';

  return {
    title: titleNode ? textContent(titleNode) : '',
    metaDescription: findMeta(nodes, 'description'),
    h1: headings('h1'),
    h2: headings('h2'),
    h3: headings('h3'),
    canonical,
    metaRobots: findMeta(nodes, 'robots'),
    internalLinks: [...links.values()],
    structuredDataTypes: [...structuredDataTypes].sort(),
    images,
    text,
    textLength: text.length,
    textSha256: text ? crypto.createHash('sha256').update(text).digest('hex') : '',
  };
};

const crawl = async (inputUrl) => {
  const redirects = [];
  let currentUrl = inputUrl;
  let response;

  try {
    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        response = await fetch(currentUrl, {
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Buffetti-Cucchi-SEO-Migration-Audit/1.0',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
      } finally {
        clearTimeout(timer);
      }

      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        const nextUrl = new URL(location, currentUrl).href;
        redirects.push({ url: currentUrl, status: response.status, location: nextUrl });
        currentUrl = nextUrl;
        if (hop === maxRedirects) throw new Error(`superato il limite di ${maxRedirects} redirect`);
        continue;
      }
      break;
    }

    const contentType = response.headers.get('content-type') ?? '';
    const html = /(?:text\/html|application\/xhtml\+xml)/i.test(contentType) ? await response.text() : '';
    const parsed = parseHtml(html, currentUrl);

    return {
      inputUrl,
      pathKey: `${new URL(inputUrl).pathname}${new URL(inputUrl).search}`,
      finalUrl: currentUrl,
      status: response.status,
      ok: response.ok,
      contentType,
      redirectCount: redirects.length,
      redirects,
      xRobotsTag: response.headers.get('x-robots-tag') ?? '',
      fetchError: '',
      ...parsed,
    };
  } catch (error) {
    return {
      inputUrl,
      pathKey: `${new URL(inputUrl).pathname}${new URL(inputUrl).search}`,
      finalUrl: currentUrl,
      status: 0,
      ok: false,
      contentType: '',
      redirectCount: redirects.length,
      redirects,
      xRobotsTag: '',
      fetchError: error instanceof Error ? error.message : String(error),
      ...parseHtml('', currentUrl),
    };
  }
};

const csv = (value) => {
  const string = value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
  return `"${string.replaceAll('"', '""')}"`;
};

const writeReports = (results) => {
  const headers = [
    'input_url', 'path_key', 'final_url', 'status', 'fetch_error', 'redirect_count', 'redirect_chain',
    'title', 'meta_description', 'h1', 'h2', 'h3', 'canonical', 'meta_robots', 'x_robots_tag',
    'internal_links_count', 'internal_links', 'structured_data_types', 'images_count',
    'images_missing_alt', 'text_length', 'text_sha256',
  ];
  const rows = results.map((result) => [
    result.inputUrl,
    result.pathKey,
    result.finalUrl,
    result.status,
    result.fetchError,
    result.redirectCount,
    result.redirects,
    result.title,
    result.metaDescription,
    result.h1,
    result.h2,
    result.h3,
    result.canonical,
    result.metaRobots,
    result.xRobotsTag,
    result.internalLinks.length,
    result.internalLinks,
    result.structuredDataTypes,
    result.images.length,
    result.images.filter((image) => !image.hasAlt).length,
    result.textLength,
    result.textSha256,
  ]);

  fs.mkdirSync(path.dirname(outputCsvPath), { recursive: true });
  fs.mkdirSync(path.dirname(outputJsonPath), { recursive: true });
  fs.writeFileSync(outputCsvPath, `${[headers, ...rows].map((row) => row.map(csv).join(',')).join('\n')}\n`);
  fs.writeFileSync(outputJsonPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
};

let urls;
try {
  urls = readInputUrls();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (!urls.length) {
  console.error('Errore: nessun URL trovato nel file di input.');
  process.exit(1);
}

console.log(`URL da analizzare: ${urls.length}`);
const results = [];
for (const [index, url] of urls.entries()) {
  console.log(`[${index + 1}/${urls.length}] ${url}`);
  const result = await crawl(url);
  results.push(result);
  console.log(`  -> ${result.status || 'errore'} ${result.finalUrl}${result.fetchError ? ` (${result.fetchError})` : ''}`);
  if (index < urls.length - 1 && delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
}

writeReports(results);
const failed = results.filter((result) => result.fetchError).length;
console.log(`\nCSV: ${outputCsvPath}`);
console.log(`JSON: ${outputJsonPath}`);
console.log(`Completati: ${results.length - failed}/${results.length}; errori di rete/parsing: ${failed}`);
process.exitCode = failed ? 2 : 0;

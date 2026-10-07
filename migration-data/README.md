# Pacchetto dati per la migrazione SEO

Questa cartella riceve gli input del vecchio sito e gli output di analisi. I file inseriti qui non modificano il sito e non generano automaticamente redirect.

## Struttura consigliata

```text
migration-data/
  input/
    old-urls.csv
    sitemap-current.xml
    sitemap-historical.xml
    gsc-page-query.csv
    analytics-landing-pages.csv
    backlinks.csv
    existing-redirects.csv
  output/
    old-site-crawl.csv
    old-site-crawl.json
    migration-map.csv
  templates/
    ...
```

Non rinominare o trasformare gli export originali prima di conservarne una copia. Se un fornitore usa colonne diverse dai template, allegare il file originale e documentare periodo, proprietà e filtri applicati.

## Dati richiesti

1. Elenco URL completo, includendo varianti, PDF e asset con traffico o backlink.
2. Sitemap corrente e sitemap storiche, preferibilmente XML originali.
3. Google Search Console: combinazione pagina/query con click, impressioni e posizione, idealmente ultimi 16 mesi e periodo comparabile precedente.
4. Analytics: landing page, sessioni organiche, conversioni e intervallo temporale.
5. Backlink: URL sorgente, URL target, anchor, follow/nofollow e metrica disponibile.
6. Redirect esistenti: sorgente, status, destinazione e configurazione di provenienza.

## Crawl tecnico ripetibile

Da un elenco CSV/TXT:

```powershell
node scripts/crawl-seo.mjs migration-data/input/old-urls.csv
```

Da una sitemap:

```powershell
node scripts/crawl-seo.mjs migration-data/input/sitemap-current.xml
```

Da path relativi:

```powershell
node scripts/crawl-seo.mjs migration-data/input/old-paths.txt --origin https://www.cucchisascesena.it
```

Per controllare gli stessi path sull'output nuovo o su staging, sostituendo solo l'origin:

```powershell
node scripts/crawl-seo.mjs migration-data/input/old-urls.csv --rewrite-origin https://staging.example.test --output migration-data/output/new-site-crawl.csv --json migration-data/output/new-site-crawl.json
```

I due CSV si confrontano sulla colonna `path_key`. L'opzione non modifica gli URL nel progetto: cambia soltanto la destinazione delle richieste dello crawler.

Output predefiniti:

- `migration-data/output/old-site-crawl.csv`: riepilogo tabellare.
- `migration-data/output/old-site-crawl.json`: dettaglio completo, inclusi redirect, heading, link/anchor, testo, JSON-LD e immagini/alt.

Lo script esegue solo richieste GET e scrive report locali. Non modifica il sito, non invia sitemap e non applica redirect.

## Regole di conservazione

- Conservare sempre i file originali ricevuti.
- Annotare timezone, date di inizio/fine e filtri di ogni export.
- Non sommare periodi sovrapposti.
- Non deduplicare URL prima di conservare la variante originale.
- Non pubblicare export GSC/Analytics o dati potenzialmente riservati nel repository pubblico.
- Prima di un commit, verificare se `migration-data/input` e `migration-data/output` devono restare esclusi dal versionamento.

## Gate di approvazione

La matrice `migration-map.csv` è una proposta. Nessun redirect, canonical, URL, title, contenuto o link interno deve essere modificato finché la mappatura non è stata approvata esplicitamente.

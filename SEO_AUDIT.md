# Audit tecnico e SEO pre-migrazione

Data audit: 3 settembre 2026
Progetto: Buffetti Cucchi
Dominio previsto e già esistente: `https://www.cucchisascesena.it`

## Sintesi esecutiva

Il progetto ha una base SEO generalmente solida: rendering statico Astro, contenuti presenti nell'HTML, un solo H1 per template, metadati unici, canonical, sitemap, robots, pagina 404, struttura semantica e dati strutturati LocalBusiness.

La build tecnica è stata ripristinata il 3 settembre 2026: dipendenze ricreate esclusivamente da `package-lock.json`, build Astro completata e nuova `dist` verificata automaticamente. Il rilascio SEO non è ancora autorizzabile perché non sono disponibili l'inventario del vecchio sito e le regole di redirect 301. Non sostituire il sito esistente finché i punti critici di migrazione e la checklist in `SEO_MIGRATION.md` non sono chiusi.

## Problemi critici

### C1 — Risolto: build di produzione riproducibile

- Stato iniziale: `node_modules` conteneva collegamenti pnpm verso Astro `6.4.8` e `@lucide/astro` `1.21.0`, oltre a numerosi pacchetti `extraneous`.
- Intervento: rimossa esclusivamente `node_modules` e reinstallato con `npm ci` dal lockfile v3.
- Stato finale: Astro `6.4.6`, `@lucide/astro` `1.18.0`, nessuna cartella `.pnpm` e nessuna dipendenza top-level estranea.
- `package-lock.json` è rimasto invariato; SHA-256 prima e dopo: `2F1F784F9AD4121269153E4468E22AA648C1156EBD8EC85BB4769A92BAA4572A`.
- `npm run build` completato senza errori o warning di progetto. Nel sandbox ristretto esbuild non può leggere i percorsi parent della cartella OneDrive; la build eseguita fuori dal sandbox sullo stesso workspace e sulle stesse dipendenze termina correttamente.
- File coinvolti: `package.json`, `package-lock.json`, `node_modules/`.

### C2 — Risolto: `dist` rigenerata e completa

- La nuova build contiene 22 file HTML: le 21 pagine indicizzabili e `404.html`.
- Sono presenti `privacy-policy.html`, `sitemap.xml`, `robots.txt`, `_headers`, `site.webmanifest` e gli asset locali referenziati.
- Inventario artefatto: 88 file complessivi, 22 HTML, 66 altri file, circa 4,52 MiB.
- Il controllo `node scripts/audit-dist.mjs` ha verificato 21/21 pagine indicizzabili con 0 errori e 0 warning: title, description, un solo H1, canonical atteso, robots indicizzabile, contenuto principale statico, link/frammenti interni e asset locali.
- Il preview locale ha restituito HTTP 200 per tutte le 21 route indicizzabili e per le risorse tecniche richieste; un path inesistente ha restituito HTTP 404.

### C3 — Manca ancora la mappa di migrazione del vecchio sito

- Non sono ancora disponibili crawl/esportazione degli URL indicizzati, sitemap storiche, backlink principali e dati Search Console.
- Impatto: pagine storiche possono diventare 404 o perdere segnali, ranking e backlink.
- Azione suggerita: non cambiare DNS/origin prima di compilare la tabella `vecchio URL -> nuovo URL -> azione` e implementare redirect 301 specifici. Nessun redirect generico verso la home.

### C4 — Non esiste ancora una strategia host-level per le varianti URL

- La home è raggiungibile potenzialmente come `/` e `/index.html`; molti link interni usano `/index.html`, mentre il canonical usa `/`.
- Non risultano regole per forzare HTTPS, host `www`, minuscole, rimozione di `index.html` o gestione coerente del trailing slash.
- Il canonical aiuta il consolidamento ma non sostituisce un 301.
- Impatto: duplicazione, crawl dispersivo, segnali divisi e possibili loop se le regole vengono aggiunte senza test.
- Azione suggerita: scegliere una sola forma canonica (la configurazione attuale suggerisce HTTPS + `www` + file `.html`, con `/` per la home) e implementarla nella piattaforma di hosting dopo aver conosciuto comportamento e URL storici.
- File coinvolti: `astro.config.mjs`, `src/data/site.js`, `src/data/nav.js`, `src/components/Header.astro`, configurazione hosting/CDN ancora da definire.

## Problemi importanti

### I1 — URL e possibile sovrapposizione semantica

- `/cancelleria.html` e `/prodotti/cancelleria.html` coprono lo stesso intento principale e possono competere tra loro.
- Sono possibili sovrapposizioni analoghe tra pagine reparto e categorie prodotto (ufficio/macchine/archiviazione, arredamento/arredo-complementi, scuola/disegno-didattica).
- I title delle due pagine cancelleria sono distinti nei sorgenti, ma H1 e contenuti restano semanticamente vicini.
- Azione suggerita: confrontare query e landing page storiche in Search Console prima di decidere se mantenere entrambe, differenziarle, consolidarle o applicare redirect/canonical. Nessuna modifica applicata.

### I2 — Risolto: ID HTML duplicati nei template reparto

- Nessun link interno utilizzava gli hash duplicati.
- Il primo ID è stato preservato; solo le occorrenze successive ricevono suffissi progressivi.
- `articoli-per-la-scuola.html`: `disegno-didattica`, `disegno-didattica-2`.
- `arredamento.html`: `arredo-complementi`, `arredo-complementi-2`, `arredo-complementi-3`, `arredo-complementi-4`.
- L'output finale non contiene ID duplicati e gli hash originari continuano a raggiungere la prima sezione.
- File coinvolti: `src/data/pages.js`, `src/components/PageTemplate.astro`.

### I3 — Dipendenze da immagini remote/hotlink

- Molte immagini vengono caricate direttamente da `buffetti.it` e da numerosi altri host (tra cui Amazon, Google image cache, siti di rivenditori, Wix, S3 e siti editoriali).
- Impatti: disponibilità non controllata, LCP variabile, assenza di ottimizzazione locale, referrer/IP trasmessi a terzi, possibili problemi CORS nel canvas e necessità di verificare i diritti d'uso.
- Alcune URL includono parametri/versioni future o fragili e possono cambiare senza controllo.
- Azione suggerita: verificare licenze/autorizzazioni, acquisire gli asset approvati, ottimizzarli e servirli dallo stesso dominio con dimensioni responsive. Non eseguito perché richiede verifica dei diritti e può cambiare l'aspetto/contenuto.
- File coinvolti: `src/data/card-images.js`, `src/data/category-page-images.js`, `src/data/pages.js`, `src/pages/index.astro`, `src/pages/servizi.astro`.

### I4 — Analizzato, non modificato: JavaScript di elaborazione immagini costoso

- `PageTemplate.astro` elabora lato client immagini remote pixel per pixel tramite canvas, `getImageData`, flood fill e conversione `toDataURL('image/png')`.
- La procedura alloca buffer proporzionali al numero di pixel e gira sul main thread dopo il caricamento; può peggiorare INP, consumo memoria e stabilità su mobile. Con CORS non consentito fallisce e lascia l'immagine invariata.
- Il blocco misura circa 4.039 byte nei sorgenti e circa 1.520 byte nell'HTML generato di ognuna delle cinque pagine `PageTemplate`.
- Attualmente trova immagini da elaborare solo in `pelletteria-e-regalistica.html`: quattro card e due elementi showcase, tutti remoti da `buffetti.it`.
- Azione suggerita: pre-elaborare e confrontare visivamente i sei asset una volta in fase di produzione. Non modificato perché richiede approvazione e verifica di equivalenza grafica.
- File coinvolto: `src/components/PageTemplate.astro`.

### I5 — Privacy/cookie non completamente allineati alle richieste reali

- Google Fonts viene richiesto direttamente a `fonts.googleapis.com`/`fonts.gstatic.com` su ogni pagina.
- Google Maps è incorporato in Home e Contatti e viene caricato senza interazione preventiva, sebbene con `loading="lazy"`.
- Le immagini remote contattano molti altri domini non citati nella policy.
- La policy dichiara correttamente l'assenza di analytics, pixel e feed social incorporati; nel codice non sono stati trovati analytics, tag manager o pixel.
- La frase secondo cui non serve un banner va verificata con il consulente privacy in base al comportamento effettivo di Google Maps e degli altri servizi prima del consenso. Questo audit non è consulenza legale.
- Azione suggerita: preferire font e immagini self-hosted; valutare una mappa bloccata fino a scelta dell'utente o un semplice link; aggiornare policy e CMP in base alla decisione.
- File coinvolti: `src/layouts/BaseLayout.astro`, `src/pages/index.astro`, `src/pages/contatti.astro`, `src/pages/privacy-policy.astro`, file dati immagini.

### I6 — Parzialmente risolto: dimensioni immagini e LCP/CLS

- Tutte le immagini locali renderizzate dichiarano ora `width` e `height`; il controllo è incluso in `scripts/audit-dist.mjs`.
- `public/images/staff.png` è stata ricompressa lossless da 1.830.396 a 967.051 byte, mantenendo dimensioni 1496×1216 e URL disponibile.
- Il rendering usa ora `public/images/staff.webp` (1496×1216, qualità 92) da 252.708 byte: riduzione dell'86,2% rispetto all'asset originariamente servito.
- La foto principale dello staff, collocata dopo la hero, usa ora `loading="lazy"` e `decoding="async"`.
- Le hero locali sono ragionevolmente compresse (circa 22–271 KiB), ma le immagini remote non sono sotto controllo e non è stato possibile misurarle offline.
- Le hero vengono pre-caricate e usano `fetchpriority="high"`; i loro attributi intrinseci locali sono stati corretti senza cambiare il layout CSS.
- Resta da valutare `srcset/sizes` e il comportamento delle immagini remote in un intervento separato.

### I7 — Font esterno e pesi variabili ampi

- Viene scaricato Hanken Grotesk variabile 400–900, normale e corsivo, da Google Fonts.
- Impatto: richiesta terza parte, latenza, dipendenza esterna e possibile ritardo del testo; `font-display` è gestito dal CSS di Google ma non controllato localmente.
- Azione suggerita: self-host WOFF2 dei soli subset/pesi necessari e pre-caricare soltanto il font critico.

### I8 — Risolto: configurazione dominio centralizzata

- `src/data/site-config.js` è l'unica sorgente applicativa del dominio.
- Astro, canonical, sitemap, robots, JSON-LD, Open Graph e audit importano direttamente o indirettamente lo stesso valore.
- `robots.txt` è ora generato staticamente da `src/pages/robots.txt.js`; URL e contenuto risultanti sono invariati.
- Il fingerprint combinato di title, description, H1, canonical e sitemap è rimasto identico prima/dopo.

### I9 — Parzialmente risolto: dati strutturati e orari

- È presente un grafo JSON-LD con `Store`/`LocalBusiness`, `PostalAddress`, `GeoCoordinates`, `sameAs`, orari, `WebSite` e `WebPage`.
- I dati usano informazioni presenti nel progetto; non sono stati inventati dati.
- Orari, label e varianti testuali esistenti sono ora centralizzati in `src/data/site.js`; Home, Contatti, Footer e JSON-LD derivano da questi dati senza cambiamenti nel testo pubblico.
- Gli `@id` del grafo e `Astro.site` derivano ora dalla stessa sorgente dominio.
- Resta necessario confermare ragione sociale, P. IVA, coordinate, orari stagionali e profili social alla data di lancio.

### I10 — Parzialmente risolto: qualità editoriale e metadati inutilizzati

- Corretti i refusi evidenti nei testi dei template: `più`, `attività`, `disponibilità`, `c'è`, `novità` e `Vieni a trovarci`.
- Corretti anche i due riepiloghi categoria mostrati pubblicamente. Le versioni precedenti sono conservate separatamente in `metaSummary` soltanto per mantenere byte-invariate le due meta description protette; verranno rivalutate con i dati del vecchio sito.
- `Chi siamo` nel ribbon porta alla pagina Contatti, senza una sezione chiaramente dedicata: anchor text e destinazione non coincidono perfettamente.
- `src/data/pages.js` contiene un intero oggetto `pages.servizi` non usato dal routing corrente. Il suo title e la sua description differiscono dai metadati hardcoded effettivamente pubblicati da `src/pages/servizi.astro`.
- L'oggetto inutilizzato non è stato rimosso e i metadati pubblici non sono stati modificati; la decisione richiede il confronto col vecchio sito.

## Miglioramenti consigliati

- Aggiungere breadcrumb visibili e `BreadcrumbList` alle pagine reparto/prodotto, solo dopo aver definito l'architettura finale.
- Aggiungere un controllo automatico post-build per URL, status, canonical, title, description, H1, noindex, link interni, immagini e sitemap.
- Integrare Lighthouse/CrUX e test a viewport mobile dopo una build pulita e su staging protetto dall'indicizzazione.
- Verificare contrasto con strumenti automatici e manuali sul rendering reale; i colori principali appaiono prudenti, ma l'audit visuale è bloccato dalla build.
- Migliorare l'accessibilità della ricerca suggerita con pattern combobox/listbox e stato annunciato; il form ha già label e bottone nominato.
- Sostituire il checkbox/label del menu mobile con un button che esponga `aria-expanded` e `aria-controls`, mantenendo funzionamento senza JavaScript se richiesto.
- Valutare una Content Security Policy dopo aver eliminato o censito tutte le origini terze.
- Aggiungere date `lastmod` alla sitemap solo se derivate da date reali e affidabili, non dalla data di build indiscriminata.

## Elementi già corretti

- Output progettato come HTML statico: i contenuti principali non dipendono da JavaScript.
- Viewport mobile presente.
- Un solo H1 per tutte le pagine sorgente; gerarchia generale H1 → H2 → H3 (e H4 solo sotto H3 nella sezione smartphone).
- HTML semantico con `header`, `nav`, `main`, `footer`, `section`, `article`, `aside`.
- Skip link, focus visibile e supporto `prefers-reduced-motion`.
- Immagini con attributo `alt`; gli alt vuoti risultano usati principalmente per immagini decorative o icone con testo/label accessibile.
- Link esterni con `target="_blank"` accompagnati da `rel="noopener noreferrer"`.
- Mappe con title, lazy loading e referrer policy.
- Canonical e Open Graph generati centralmente dal layout; canonical home normalizzato a `/`.
- Meta robots indicizzabile di default; solo la pagina 404 usa `noindex, follow`.
- Nessun `nofollow` globale o `X-Robots-Tag` bloccante trovato nei file del progetto.
- `robots.txt` consente il crawl e dichiara la sitemap.
- Sitemap dinamica deduplicata e limitata agli URL canonici indicizzabili; 404 esclusa.
- JSON-LD LocalBusiness presente con dati reali del progetto.
- Nessun analytics, advertising pixel, Tag Manager o plugin social incorporato trovato.
- Cache lunga per asset `_astro` e header di sicurezza di base presenti in `public/_headers` (efficacia da verificare sulla piattaforma scelta).
- URL applicativi in minuscolo e senza trailing slash, coerenti con `build.format: 'file'`.

## Inventario URL previsto dai sorgenti

URL indicizzabili inclusi in sitemap: 21.

| URL canonico previsto | Title corrente | H1 corrente | Nota |
|---|---|---|---|
| `/` | Buffetti Cucchi Cesena \| Cartoleria e servizi | Tutto ciò che cerchi per la tua attività | `/index.html` è ancora linkato internamente |
| `/arredamento.html` | Arredamento ufficio a Cesena \| Buffetti Cucchi | Postazioni più comode, ordinate e funzionali | Reparto |
| `/articoli-per-la-scuola.html` | Articoli per la scuola a Cesena \| Buffetti Cucchi | Tutto per la scuola, senza giri inutili | ID duplicato nel corpo |
| `/articoli-per-l-ufficio.html` | Articoli per l'ufficio a Cesena \| Buffetti Cucchi | Forniture per lavorare con più ordine | Reparto |
| `/cancelleria.html` | Cancelleria a Cesena \| Buffetti Cucchi | Cancelleria pronta per scuola, casa e lavoro | Possibile sovrapposizione con categoria |
| `/contatti.html` | Contatti Buffetti Cucchi Cesena \| Orari e indicazioni | Hai bisogno di aiuto? | Mappa Google incorporata |
| `/pelletteria-e-regalistica.html` | Pelletteria e regalistica a Cesena \| Buffetti Cucchi | Idee regalo utili, eleganti e mai banali | Reparto |
| `/privacy-policy.html` | Privacy e Cookie Policy \| Buffetti Cucchi Cesena | Privacy e Cookie Policy | Non presente nella `dist` obsoleta |
| `/servizi.html` | Servizi Buffetti a Cesena \| PEC, SPID e stampa | Pratiche digitali, documenti e spedizioni, ti aiutiamo noi | Contiene anchor per i servizi |
| `/prodotti/arredo-complementi.html` | Arredo e complementi a Cesena \| Catalogo Buffetti | Arredo e complementi | Categoria |
| `/prodotti/carta-modulistica.html` | Carta e Modulistica a Cesena \| Catalogo Buffetti | Carta e Modulistica | Categoria |
| `/prodotti/cartucce-toner.html` | Cartucce e toner a Cesena \| Catalogo Buffetti | Cartucce e toner | Categoria |
| `/prodotti/archiviazione.html` | Archiviazione a Cesena \| Catalogo Buffetti | Archiviazione | Categoria |
| `/prodotti/cancelleria.html` | Cancelleria a Cesena \| Catalogo Buffetti | Cancelleria | Possibile sovrapposizione con reparto |
| `/prodotti/disegno-didattica.html` | Disegno e didattica a Cesena \| Catalogo Buffetti | Disegno e didattica | Categoria |
| `/prodotti/visual-comunicazione.html` | Visual e comunicazione a Cesena \| Catalogo Buffetti | Visual e comunicazione | Categoria |
| `/prodotti/comunita-servizi.html` | Comunità e servizi a Cesena \| Catalogo Buffetti | Comunità e servizi | Categoria |
| `/prodotti/spedizione-imballaggi.html` | Spedizione e Imballaggi a Cesena \| Catalogo Buffetti | Spedizione e Imballaggi | Categoria |
| `/prodotti/informatica-elettronica.html` | Informatica e elettronica a Cesena \| Catalogo Buffetti | Informatica e elettronica | Categoria |
| `/prodotti/macchine-ufficio.html` | Macchine per ufficio a Cesena \| Catalogo Buffetti | Macchine per ufficio | Categoria |
| `/prodotti/ecosostenibili.html` | Prodotti Ecosostenibili a Cesena \| Catalogo Buffetti | Prodotti Ecosostenibili | Categoria |

URL tecnici/non indicizzabili:

- `/404.html` — `noindex, follow`, escluso dalla sitemap.
- `/sitemap.xml` — endpoint XML.
- `/robots.txt` — file statico.
- `/index.html` — possibile alias tecnico della home; canonical verso `/`, ma da normalizzare con 301 quando l'hosting è definito.

Non sono emersi slug con maiuscole. Tutte le route di contenuto usano file `.html` senza trailing slash. Il comportamento delle varianti senza estensione, con slash finale, con maiuscole e su host/protocollo alternativi deve essere verificato sull'hosting reale.

## SEO on-page

- Tutte le 21 pagine previste hanno title e meta description dai sorgenti.
- Non risultano title duplicati esatti nei sorgenti correnti. La coppia cancelleria resta molto simile ma usa suffissi differenti.
- Le description sono uniche e generalmente concise (circa 98–140 caratteri per pagine data-driven; le pagine hardcoded sono nello stesso ordine di grandezza).
- Ogni pagina ha un H1; non risultano pagine con più H1.
- I contenuti principali sono testuali e renderizzati server-side/staticamente.
- Internal linking abbondante da header, mega menu, home, pagine correlate e footer. Le anchor di categoria sono descrittive; CTA generiche come “Vieni in negozio” sono accettabili nel contesto ma non sostituiscono link descrittivi.
- La profondità è bassa: home/reparti/categorie sono raggiungibili dal menu o dai blocchi di navigazione.

## File principali coinvolti

- `astro.config.mjs`: dominio Astro, output statico e formato URL.
- `src/data/site.js`: identità, dominio, contatti, social, coordinate e mappe.
- `src/layouts/BaseLayout.astro`: canonical, meta robots, social metadata, font e JSON-LD.
- `src/pages/sitemap.xml.js`: inventario sitemap e fallback dominio.
- `src/pages/robots.txt.js`: crawl e URL sitemap generati dalla sorgente dominio centrale.
- `public/_headers`: cache e header di sicurezza dipendenti dall'hosting.
- `src/data/nav.js`, `src/components/Header.astro`, `src/components/Footer.astro`: linking interno e alias `/index.html`.
- `src/data/pages.js`, `src/data/catalog.js`: contenuti, metadata, slug e ID.
- `src/components/PageTemplate.astro`: struttura reparto, ID e processing immagini client-side.
- `src/data/card-images.js`, `src/data/category-page-images.js`: hotlink immagini.
- `src/pages/index.astro`, `src/pages/contatti.astro`: Google Maps.
- `src/pages/privacy-policy.astro`: coerenza privacy/cookie.

## Modifiche applicate durante l'audit

- Aggiunto questo report (`SEO_AUDIT.md`).
- Aggiunta la checklist operativa (`SEO_MIGRATION.md`).
- Ripristinata l'installazione npm esclusivamente da lockfile e rigenerata `dist`.
- Aggiunto `scripts/audit-dist.mjs` per la verifica ripetibile dell'output statico.
- Centralizzati dominio e orari senza modificare gli output SEO o i testi pubblici.
- Resi univoci gli ID duplicati preservando il primo hash esistente.
- Ottimizzata la foto staff e aggiunte dimensioni intrinseche alle immagini locali.
- Corretti esclusivamente refusi ortografici evidenti non protetti come metadati.
- Nessun URL, routing, title, H1, meta description, canonical, redirect, destinazione sitemap o struttura pubblica è stato modificato; le sole variazioni testuali sono le correzioni ortografiche elencate.

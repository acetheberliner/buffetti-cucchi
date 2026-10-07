# Checklist migrazione SEO

Questa checklist va completata prima, durante e dopo la sostituzione del sito esistente sullo stesso dominio `https://www.cucchisascesena.it`.

## Gate operativo

- [ ] Acquisire e validare tutti i dati esterni prima di proporre modifiche SEO strutturali.
- [ ] Produrre la mappatura completa come documento di analisi, senza modificare il codice del sito.
- [ ] Ottenere approvazione esplicita della mappatura prima di implementare redirect, rimozioni, consolidamenti, canonical o modifiche ai contenuti.
- [ ] Conservare una copia della mappatura approvata e della configurazione redirect effettivamente pubblicata.

Cartelle e strumenti predisposti:

- `migration-data/README.md`: istruzioni per ricezione e conservazione.
- `migration-data/templates/`: schemi CSV per gli input e la matrice finale.
- `migration-data/input/`: posizione consigliata per i dati originali ricevuti.
- `migration-data/output/`: report generati; non sono configurazioni di produzione.
- `scripts/crawl-seo.mjs`: crawler tecnico read-only per URL e sitemap.

## 1. Raccolta dati del vecchio sito

- [ ] Ottenere tutte le varianti ufficiali del dominio: HTTP/HTTPS, `www`/non-`www`, eventuali sottodomini.
- [ ] Esportare tutte le sitemap correnti e storiche.
- [ ] Eseguire un crawl completo del vecchio sito con status, redirect chain, canonical, robots, title, description, H1, heading, testo, link e immagini.
- [ ] Esportare da Google Search Console almeno 16 mesi di pagine/query/click/impressioni, copertura/indicizzazione, sitemap e Core Web Vitals.
- [ ] Esportare da analytics, se disponibile, landing page organiche e conversioni.
- [ ] Raccogliere URL con backlink da strumenti disponibili e dai referral.
- [ ] Raccogliere URL da log server/CDN, se disponibili.
- [ ] Cercare URL indicizzati con query `site:cucchisascesena.it` come controllo secondario, non come unica fonte.
- [ ] Raccogliere PDF, immagini e altri asset indicizzati o con backlink.
- [ ] Salvare copie HTML/screenshot delle landing organiche più importanti.
- [ ] Annotare status e redirect attuali prima di cambiarli.
- [ ] Conservare gli export originali con periodo, timezone, proprietà, filtri e fonte documentati.
- [ ] Inserire i dati usando i template solo come schema di lavoro; non scartare colonne aggiuntive presenti negli export originali.

## 2. Inventario unificato e classificazione

- [ ] Unire e deduplicare tutte le fonti mantenendo query string significative.
- [ ] Normalizzare solo per analisi host, protocollo, maiuscole, slash e `index.*`; non perdere la variante originale.
- [ ] Assegnare priorità per traffico, impressioni, backlink, conversioni e rilevanza aziendale.
- [ ] Compilare la tabella seguente per ogni URL vecchio e ogni URL nuovo.

| URL vecchio | Status attuale | Traffico/impressioni | Query principali | Backlink | URL nuovo equivalente | Azione | Priorità | Motivazione |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |

Regole:

- [ ] Usare `mantenuto identico` quando path e contenuto restano realmente equivalenti.
- [ ] Usare `redirect 301` verso la pagina nuova semanticamente più vicina.
- [ ] Usare `mantenuto ma ottimizzato` quando l'URL resta invariato ma servono integrazioni approvate a metadati, testo, linking o dati strutturati.
- [ ] Usare `consolidato` quando più URL storici sovrapposti confluiscono in una sola risorsa equivalente; documentare URL primario e redirect di ogni duplicato.
- [ ] Non redirigere in massa URL non equivalenti verso la homepage.
- [ ] Usare `eliminato con 404/410` quando non esiste un sostituto utile, motivando la scelta tra 404 e 410.
- [ ] Usare `nuovo URL` per URL senza predecessore storico.
- [ ] Evitare catene: ogni vecchio URL deve puntare direttamente alla destinazione finale 200.
- [ ] Evitare loop, redirect multipli e redirect verso URL a loro volta canonicalizzati altrove.
- [ ] Definire il trattamento delle query string caso per caso.
- [ ] Mappare anche vecchie varianti maiuscole, slash, estensioni e `index.*` se hanno link o traffico.

## 3. Confronto SEO pagina per pagina

Per ogni URL storico con valore SEO confrontare:

- [ ] Title.
- [ ] Meta description.
- [ ] H1 e gerarchia H2/H3.
- [ ] Contenuto testuale utile, entità, servizi, località e FAQ reali.
- [ ] Slug/path e intento di ricerca.
- [ ] Canonical.
- [ ] Meta robots e header `X-Robots-Tag`.
- [ ] Dati strutturati.
- [ ] Link interni in ingresso e in uscita.
- [ ] Anchor text.
- [ ] Immagini, URL immagine, alt, dimensioni e backlink diretti agli asset.
- [ ] Informazioni NAP (nome, indirizzo, telefono) e orari.
- [ ] Elementi che generano rich result o sitelink.

Prima di cambiare il nuovo progetto:

- [ ] Preparare un elenco degli elementi SEO utili presenti solo nel vecchio sito.
- [ ] Far approvare cambi di contenuto, URL, title/H1, canonical, struttura o internal linking.
- [ ] Conservare testi e sezioni che intercettano query/intent utili, riscrivendo solo con una motivazione documentata.

Per ogni URL storico con valore SEO, il report comparativo deve contenere almeno:

| Ambito | Vecchio sito | Nuovo sito | Delta/rischio | Raccomandazione |
|---|---|---|---|---|
| Path e status |  |  |  |  |
| Title |  |  |  |  |
| Meta description |  |  |  |  |
| H1/H2/H3 |  |  |  |  |
| Testo e intento di ricerca |  |  |  |  |
| Canonical e robots |  |  |  |  |
| Internal linking e anchor text |  |  |  |  |
| Structured data |  |  |  |  |
| Immagini e alt |  |  |  |  |
| Backlink |  |  |  |  |

## 3A. Procedura ripetibile di crawl e confronto

- [ ] Copiare l'elenco URL, l'export o la sitemap in `migration-data/input/` mantenendo una copia originale.
- [ ] Verificare che gli URL relativi abbiano un origin dichiarato e che le varianti originali non siano state eliminate.
- [ ] Eseguire il crawler sul vecchio sito:

```powershell
node scripts/crawl-seo.mjs migration-data/input/old-urls.csv
```

- [ ] In alternativa, eseguire direttamente una sitemap XML:

```powershell
node scripts/crawl-seo.mjs migration-data/input/sitemap-current.xml
```

- [ ] Per input contenenti soltanto path relativi usare:

```powershell
node scripts/crawl-seo.mjs migration-data/input/old-paths.txt --origin https://www.cucchisascesena.it
```

- [ ] Conservare entrambi gli output: CSV riepilogativo e JSON dettagliato.
- [ ] Ripetere lo stesso crawl sul nuovo sito o su staging mantenendo invariati path e query:

```powershell
node scripts/crawl-seo.mjs migration-data/input/old-urls.csv --rewrite-origin https://staging.example.test --output migration-data/output/new-site-crawl.csv --json migration-data/output/new-site-crawl.json
```

- [ ] Confrontare i due CSV tramite `path_key`, conservando separatamente URL richiesto, URL finale e catena redirect.
- [ ] Controllare manualmente errori di rete, timeout, pagine protette e risposte non HTML.
- [ ] Confrontare il crawl storico con `node scripts/audit-dist.mjs` e con i dati GSC/Analytics/backlink.
- [ ] Unire i dati per URL senza sommare periodi sovrapposti o confondere host/protocolli differenti.
- [ ] Produrre `migration-data/output/migration-map.csv` usando esclusivamente le azioni ammesse.
- [ ] Evidenziare separatamente URL con click/impressioni, conversioni, backlink, canonical scelto da Google o query strategiche.
- [ ] Sottoporre tabella e confronti pagina-per-pagina ad approvazione; non implementare automaticamente le raccomandazioni.

Il crawler raccoglie:

- status HTTP finale e catena redirect completa;
- URL finale e content type;
- title, meta description, H1, H2 e H3;
- canonical risolto;
- meta robots e header `X-Robots-Tag`;
- link interni con anchor text e attributo `rel`;
- tipi JSON-LD;
- immagini, alt, dimensioni e loading;
- lunghezza e hash SHA-256 del testo principale;
- copia del testo principale nel report JSON per il confronto editoriale.

Lo script effettua soltanto richieste GET e scrive file locali. Non applica redirect, non aggiorna Search Console e non modifica il sito.

## 4. Dominio e normalizzazione

- [ ] Confermare come origin canonico `https://www.cucchisascesena.it` oppure aggiornare una sola sorgente di configurazione prima della build.
- [ ] Verificare che `astro.config.mjs`, `src/data/site.js`, robots, sitemap, canonical, Open Graph e JSON-LD usino lo stesso origin.
- [ ] Decidere la policy definitiva per `/` vs `/index.html`.
- [ ] Decidere la policy per `.html`, URL senza estensione e trailing slash sulla base degli URL storici.
- [ ] Forzare HTTP → HTTPS con un solo 301.
- [ ] Forzare host non canonico → host canonico con un solo 301.
- [ ] Normalizzare maiuscole/minuscole senza rompere asset o path sensibili.
- [ ] Testare combinazioni host + protocollo + path per evitare due redirect quando ne basta uno.
- [ ] Non cambiare contemporaneamente dominio, struttura URL e contenuti senza necessità.

## 5. Preparazione tecnica del nuovo sito

- [ ] Ricreare le dipendenze da `package-lock.json` in un ambiente pulito.
- [ ] Ottenere una build `npm run build` senza errori.
- [ ] Verificare che l'artefatto contenga tutte le 21 pagine canoniche, `404.html`, `sitemap.xml`, `robots.txt`, manifest, icone, header e asset.
- [ ] Eseguire un crawl dell'artefatto/staging con JavaScript disabilitato e abilitato.
- [ ] Verificare status 200 per tutte le pagine canoniche.
- [ ] Verificare 404 reale per URL inesistenti; la pagina personalizzata non deve restituire 200 soft-404.
- [ ] Verificare un solo canonical assoluto per pagina e corrispondenza con l'URL finale.
- [ ] Verificare un solo title, una description e un solo H1 per pagina.
- [ ] Verificare assenza di `noindex`, `nofollow` e `X-Robots-Tag` accidentali sulle pagine pubbliche.
- [ ] Verificare che staging sia protetto dall'indicizzazione e che la protezione venga rimossa al go-live.
- [ ] Risolvere gli ID duplicati nelle pagine reparto senza rompere hash storici.
- [ ] Verificare tutti i link interni e gli anchor dei servizi.
- [ ] Verificare che nessuna pagina importante sia orfana.

## 6. Sitemap e robots

- [ ] La sitemap deve contenere esclusivamente URL canonici, indicizzabili e con status 200.
- [ ] Escludere 404, redirect, URL con query, varianti duplicate, pagine tecniche e staging.
- [ ] Aggiungere `lastmod` solo da una fonte reale e affidabile.
- [ ] Verificare content type XML e XML valido.
- [ ] Verificare che `robots.txt` risponda 200 e dichiari la sitemap canonica.
- [ ] Verificare che robots non blocchi CSS, JS, immagini o sezioni importanti.
- [ ] Controllare direttive robots anche a livello CDN/origin.

## 7. Dati strutturati e presenza locale

- [ ] Convalidare JSON-LD con gli strumenti Google e schema.org.
- [ ] Confermare ragione sociale, P. IVA, nome pubblico, indirizzo, CAP, provincia, telefono, email e coordinate.
- [ ] Confermare orari ordinari e stagionali alla data di lancio.
- [ ] Allineare NAP e orari con Google Business Profile e directory rilevanti.
- [ ] Verificare URL Facebook e Instagram reali.
- [ ] Mantenere `LocalBusiness`/`Store`, `PostalAddress`, `OpeningHoursSpecification`, `sameAs`, `WebSite` e `WebPage` solo con dati verificati.
- [ ] Non aggiungere rating, recensioni, prezzi o servizi non dimostrabili.

## 8. Performance, mobile e accessibilità

- [ ] Eliminare hotlink non approvati e servire immagini ottimizzate localmente.
- [ ] Ridimensionare/convertire `public/images/staff.png`; evitare eager loading sotto la piega.
- [ ] Aggiungere `width`/`height` o aspect-ratio stabile alle immagini.
- [ ] Usare lazy loading per immagini e iframe non LCP.
- [ ] Rimuovere l'elaborazione pixel-per-pixel lato client o spostarla in fase di preparazione asset.
- [ ] Self-host dei font, limitando subset e pesi.
- [ ] Eseguire Lighthouse mobile e desktop su più pagine rappresentative.
- [ ] Misurare LCP, CLS e INP su staging e poi dati reali CrUX/Search Console.
- [ ] Testare viewport 320, 360, 375, 768, 1024 e desktop senza overflow orizzontale nascosto.
- [ ] Testare dimensione testo, zoom 200%, target tattili e orientamento.
- [ ] Testare tastiera: skip link, menu, mega menu, ricerca, details, CTA e ritorno focus.
- [ ] Testare screen reader e nomi accessibili.
- [ ] Verificare contrasto WCAG sul rendering reale.
- [ ] Migliorare il menu mobile con `button`, `aria-expanded` e `aria-controls`.
- [ ] Migliorare i suggerimenti ricerca con semantica combobox/listbox e annunci di stato.

## 9. Privacy, cookie e terze parti

- [ ] Inventariare tutte le richieste di rete su ogni template prima di accettare cookie.
- [ ] Decidere se self-hostare Google Fonts.
- [ ] Decidere se bloccare Google Maps fino a scelta, sostituirla con immagine/link o gestirla tramite CMP.
- [ ] Inventariare e approvare tutti i domini delle immagini remote.
- [ ] Verificare diritti/licenze per ogni immagine non proprietaria.
- [ ] Confermare l'assenza o presenza di analytics, pixel, chat, video, feed social e altri script al go-live.
- [ ] Aggiornare privacy/cookie policy in base al comportamento reale e alla piattaforma di hosting.
- [ ] Far validare base giuridica, consenso e testi da un consulente privacy.
- [ ] Verificare cookie/local storage prima e dopo ogni scelta dell'utente.

## 10. Redirect e test pre-lancio

- [ ] Implementare la tabella redirect nella piattaforma effettiva, non solo in locale.
- [ ] Testare automaticamente ogni vecchio URL: status atteso, destinazione, numero hop, canonical finale.
- [ ] Verificare che asset e API non vengano intercettati da regole generiche.
- [ ] Verificare assenza di loop tra CDN, hosting e applicazione.
- [ ] Verificare redirect con encoding, caratteri accentati, maiuscole e slash.
- [ ] Conservare le regole 301 almeno 12 mesi, preferibilmente senza scadenza per URL con backlink/traffico.
- [ ] Preparare rollback DNS/deploy senza rimuovere i redirect validi.

## 11. Piano di go-live

- [ ] Ridurre TTL DNS con anticipo solo se necessario e documentare valori precedenti.
- [ ] Fare backup completo del vecchio sito e delle configurazioni server.
- [ ] Congelare modifiche non essenziali durante la finestra di rilascio.
- [ ] Pubblicare in una finestra con disponibilità del team per monitoraggio e rollback.
- [ ] Verificare subito homepage, pagine prioritarie, robots, sitemap, canonical, redirect e 404.
- [ ] Verificare HTTPS/certificato e tutte le varianti host.
- [ ] Rimuovere ogni blocco `noindex`/password destinato soltanto allo staging.
- [ ] Inviare la sitemap in Google Search Console sulla proprietà esistente dello stesso dominio.
- [ ] Usare Ispezione URL per homepage e landing principali; non richiedere indicizzazione indiscriminata di ogni URL.

## 12. Monitoraggio post-lancio

- [ ] Monitorare log/CDN per 404, 5xx, loop e bot Google nei primi giorni.
- [ ] Controllare Search Console giornalmente nella prima settimana, poi settimanalmente per 8–12 settimane.
- [ ] Controllare indicizzazione, canonical scelti da Google, pagine con redirect, soft 404 e sitemap.
- [ ] Confrontare click, impressioni, posizione e landing con baseline pre-lancio.
- [ ] Monitorare ranking/query locali e Google Business Profile.
- [ ] Correggere 404 con backlink o traffico usando redirect specifici.
- [ ] Aggiornare link interni che passano attraverso redirect.
- [ ] Monitorare Core Web Vitals reali quando i dati diventano disponibili.
- [ ] Conservare crawl, mapping, test e configurazioni come registro della migrazione.
- [ ] Non rimuovere redirect solo perché Google ha iniziato a indicizzare i nuovi URL.

## Criteri di approvazione finale

- [ ] Build pulita e riproducibile.
- [ ] Nessuna pagina prioritaria restituisce 4xx/5xx.
- [ ] Nessuna pagina canonica pubblica è `noindex` o bloccata.
- [ ] Ogni URL storico è classificato e testato.
- [ ] Nessuna catena o loop di redirect.
- [ ] Canonical, sitemap, robots e JSON-LD usano lo stesso dominio definitivo.
- [ ] Contenuti SEO utili del vecchio sito preservati o sostituiti consapevolmente.
- [ ] Privacy/cookie coerenti con le richieste di rete reali.
- [ ] Responsabile tecnico, responsabile aziendale e referente SEO approvano il go-live.

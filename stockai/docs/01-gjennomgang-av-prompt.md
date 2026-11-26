# Gjennomgang av oppgaveteksten – hva jeg ville endret før vi bygger

Dato: 2026-11-26
Status: forslag, venter på avklaringer (se nederst)

Oppgaveteksten er god. Den legger stor vekt på sporbarhet og på at data ikke skal diktes opp, og det er de to viktigste egenskapene et slikt verktøy kan ha. Under står det jeg ville endret, lagt til eller strøket. Det viktigste står først.

---

## Del A – Faktasjekk: hva Børsdata-API-et faktisk gir

Jeg har lest den offentlige dokumentasjonen (github.com/Borsdata-Sweden/API og wikien). Noen av disse funnene endrer planen.

| Tema | Hva dokumentasjonen sier | Konsekvens |
|---|---|---|
| Tilgang | REST-API krever **Pro+** (fra 1.2.2025). Pro gir bare Excel/Sheets. | Du må ha Pro+. Bekreft gjerne det. |
| Autentisering | `?authKey=...` som query-parameter. Ikke header. | Nøkkelen havner i URL-en. Da må logging maskere URL-er, ikke bare headere. |
| Rate limit | 100 kall / 10 sek, HTTP 429 + `Retry-After`. Anbefalt maks ~10 000 kall/døgn. | En screening av hele Oslo Børs må bruke array-kall (maks 50 instrumenter per kall) og `stockprices/last`, ikke ett kall per aksje. |
| Kurser | **Kun sluttkurs (EOD)**, opptil 20 år. Ingen intradag. Oppdateres én gang i døgnet, ca. kl. 20:00 UTC. | `get_stock_quote` blir «siste sluttkurs». Den må alltid merkes med kursdato, aldri «nå». Det passer godt med kravet om ikke å late som data er fersk. |
| Regnskap | År (opptil 20), R12 og kvartal (opptil 40). Feltene `Report Date`, `currency` og `currency_Ratio` finnes. | `Report Date` gjør **point-in-time-backtesting** mulig (se B1). Mange Oslo-selskaper rapporterer i USD (EQNR, FRO, AKRBP osv.). Valuta må håndteres eksplisitt. |
| KPI-er | Ferdigberegnede KPI-er med historikk, og et screener-endepunkt (én KPI for alle instrumenter). | Mange nøkkeltall trenger vi ikke regne ut selv. Vi bør likevel regne kjerne-tall selv og kryssjekke mot Børsdata. Avvik er et datakvalitetssignal. |
| Innsidehandel / short / tilbakekjøp | `/v1/holdings/insider`, `/shorts`, `/buyback`. «Only Nordic companies», Pro+. | Må verifiseres at norske selskaper faktisk har data. Norske innsidemeldinger er fritekst på NewsWeb, så Børsdatas dekning for Norge kan være tynnere enn for Sverige. |
| Nyheter / børsmeldinger | **Finnes ikke** i API-et. | Børsmeldinger må hentes fra Oslo Børs NewsWeb (primærkilde), og nyheter fra et søke-API. Det er en egen provider. |
| Estimater | Det finnes en wiki-side «Screener Kpi Estimate List», men innholdet er uklart. | `get_estimates` kan bli tynn. Den må returnere `data_unavailable` når data mangler, ikke gjette. |
| Global dekning | Pro+ gir også «Global» (USA, Canada, Tyskland, Frankrike m.fl., 14 000+ instrumenter). Ingen indekser/valuta for global. Innsidedata bare for Norden. | Utvidelse til Norden går rett fram med samme provider. UK/USA er mulig for kurs og regnskap, men innsidehandel, meldinger og makro trenger andre kilder (SEC EDGAR, RNS/FCA). |
| «Børsdag» | Jeg finner ikke noe API med det navnet. | Jeg antar at det er Børsdata du mener. |

**Viktig praktisk begrensning:** Fra dette skymiljøet når jeg ikke `apiservice.borsdata.se` (nettverket blokkerer verten). Klienten kan bygges mot dokumentasjonen og testes med mock-data. Ekte verifisering av endepunkter og felter krever enten at du kjører en liten «discovery»-kommando lokalt, eller at verten og API-nøkkelen legges til i miljøet. Det siste kan jeg be om på en sikker måte, uten at nøkkelen går gjennom chatten.

---

## Del B – Det som mangler (største forbedringer)

### B1. Backtesting og validering av scoren ⭐ viktigst
Uten backtesting vet vi ikke om score 78 betyr noe. Det er det største hullet i oppgaveteksten.

Forslag:
- **Point-in-time-data:** Lagre all data med `as_of` (når den ble kjent), ikke bare periodedato. Regnskapstall er først «kjent» på `Report Date`, ikke på periodeslutt. Ellers får vi **look-ahead bias**, og backtesten lyver.
- **Survivorship bias:** Ta med avnoterte selskaper hvis Børsdata har dem (må verifiseres). Uten dem blir alle strategier for gode.
- **Backtest-motor** for de deterministiske faktorene (kvalitet, verdi, momentum, vekst, innsidekjøp):
  - månedlig rebalansering, topp-N eller kvantiler, mot **OSEBX** som referanse
  - transaksjonskost og spread, **likviditetsfilter** (snittomsetning i NOK)
  - nøkkeltall: CAGR, Sharpe, Sortino, maks drawdown, hit rate, turnover og alfa/beta mot OSEBX
  - **walk-forward** og ut-av-utvalg-perioder, så vi ikke overtilpasser vektene i `scoring.yaml`
- **Faktor-IC (information coefficient):** For hver delscore måles korrelasjonen mellom score i dag og avkastning 3, 6 og 12 måneder fram. Vekter uten prediktiv verdi bør ned.
- **LLM-agentene kan i praksis ikke backtestes historisk.** Modellen «vet» hva som skjedde etterpå, og nyhetsarkivet er ufullstendig. Derfor kommer forslaget i B2:
- **Paper track record:** Hver analyse lagrer stance, score og kurs. Systemet måler automatisk utfallet etter 1, 3, 6 og 12 måneder mot OSEBX. Over tid viser det om LLM-laget faktisk tilfører noe utover kvant-scoren.

### B2. Skill hardt mellom deterministisk motor og LLM-lag ⭐
Oppgaveteksten lar alle «agenter» se ut som LLM-agenter. Jeg ville delt dem i to lag:

| Lag | Hva | Hvorfor |
|---|---|---|
| **Kvant-kjerne (ren Python, ingen LLM)** | Alle beregninger, delscorer, røde flagg-regler, datakvalitetsscore, screening og backtest | Reproduserbart, testbart, gratis, raskt og backtestbart |
| **LLM-lag** | Tolkning av nyheter og børsmeldinger, klassifisering av innsidemeldinger (fritekst), makrorelevans, peer-valg, bull/bear-narrativ, cross-check og komité | Her tilfører språkmodellen faktisk noe |

Konsekvenser:
- Technical-, Fundamental- og Valuation-«agentene» får en deterministisk kjerne som beregner scorene. LLM skriver bare tolkningen og kan **ikke endre tallene**.
- Investment Committee kan justere totalscoren, men bare innenfor et begrenset bånd (f.eks. ±10 poeng) og med begrunnelse. Justeringen vises eksplisitt i rapporten. Da er scoren transparent og ingen «black box», som oppgaven krever.
- Samme input gir samme kvant-score, og det gir ekte reproduserbarhet.

### B3. Trakt-arkitektur for screening (kostnad og tid)
13 LLM-agenter × ~250 Oslo-aksjer gir over 3000 LLM-kall per screening. Det er tregt og dyrt. Forslag:
1. **Nivå 0:** Kvant-screening av hele børsen (sekunder, gratis, få API-kall via array-endepunkter)
2. **Nivå 1:** Lett LLM-pass på topp ~20 (nyheter og røde flagg, billig modell)
3. **Nivå 2:** Full multi-agent-analyse («--deep») på de 3–5 du faktisk vurderer

Hver analyse får et **token- og kostnadsbudsjett** som logges. Analyser caches, slik at samme aksje med samme data-snapshot ikke analyseres på nytt.

### B4. Sektorspesifikke modeller – helt avgjørende for Oslo Børs ⭐
Oslo Børs domineres av sektorer der generiske nøkkeltall gir misvisende svar:

| Sektor | Problem med generisk modell | Riktig tilnærming |
|---|---|---|
| **Bank/finans** (DNB, sparebanker) | EV/EBITDA, FCF og netto gjeld er meningsløse | P/B mot ROE, CET1/kapitaldekning, utlånstap, NIM, kost/inntekt |
| **Forsikring** (Gjensidige, Storebrand) | Samme som over | Combined ratio, solvensgrad, P/B |
| **Olje/gass og oljeservice** | Lav P/E på toppen av syklusen ser billig ut | Normalisert inntjening, breakeven, reserver, oljepris-sensitivitet |
| **Shipping/tank/tørrbulk** | Ekstremt syklisk. DCF med vekst gir lite mening. | NAV (skipsverdier), rater mot breakeven, utbyttekapasitet, flåtealder |
| **Sjømat** (MOWI, SALM, LSG) | Laksepris og biomasse driver alt. Grunnrenteskatt. | EBIT/kg, laksepris-sensitivitet, MAB/kapasitet, regulatorisk risiko |
| **Eiendom** | EBITDA gir lite mening | NAV/EPRA NAV, belåningsgrad (LTV), rentedekning, refinansiering |
| **Holding/investeringsselskap** (Aker o.l.) | Konsolidert regnskap er misvisende | Sum-of-the-parts og rabatt mot NAV |
| **Biotek/tidligfase-tech** | Negativ inntjening, P/E finnes ikke | Kontantrullebane (cash runway), emisjonsrisiko, pipeline |

Forslag: et `sector_profile` per selskap som velger relevante nøkkeltall, verdsettelsesmetoder, scoring-vekter og makrofaktorer. Konfigureres i `config/sectors.yaml`. Valuation-agenten får da f.eks. ikke kjøre EV/EBITDA på en bank. Syklisk-flagg brukes til å normalisere inntjening.

### B5. Investeringshorisont som parameter
Oppgaven sier ikke om analysen gjelder trading (uker til måneder) eller langsiktig investering (3–5 år). Det avgjør vektene. Teknisk analyse veier tungt på kort sikt og lite på lang sikt. Forslag: `--horizon short|medium|long`, med egne vektsett i `scoring.yaml`.

### B6. Likviditet
Mange Oslo-aksjer, særlig på Euronext Growth og Expand, er svært illikvide. Det mangler helt i oppgaven. Legg til:
- gjennomsnittlig daglig omsetning (NOK), andel dager uten handel og fri flyt
- likviditetsflagg i Risk og som filter i screener og backtest
- en advarsel hvis posisjonsstørrelsen er stor relativt til omsetningen

### B7. Posisjonsstørrelse og risikostyring
Oppgaven slutter ved «BUY/SELL». Det du faktisk må bestemme er *hvor mye*, og *når du tar feil*. Legg til:
- et forslag til posisjonsstørrelse basert på volatilitet (ATR/vol) og konsentrasjon i porteføljen
- et ugyldiggjøringsnivå (invalidation): hva skal til for at caset er feil, både fundamentalt og teknisk
- **forventet avkastning** som sannsynlighetsvektede scenarioer (bear, base og bull med sannsynligheter), ikke bare én fair value. Det svarer direkte på punkt 39 om forholdet mellom avkastning og risiko.

### B8. Overvåking, varsler og beslutningsjournal
«Følge utvikling over tid» krever at noe kjører uten at du spør:
- **Watchlist + scheduler:** daglig etter kl. 20:00 UTC, når Børsdata er oppdatert
- **Varsler:** nytt innsidekjøp, ny børsmelding, kvartalsrapport publisert, kurs gjennom nøkkelnivå, vesentlig scoreendring, ny short-posisjon
- **Rapportkalender:** kommende kvartalsrapporter og utbyttedatoer for porteføljen og watchlisten
- **Beslutningsjournal:** når du kjøper eller selger, logger du begrunnelsen. Systemet kobler den til analysen og følger opp senere: «Du kjøpte X på grunn av Y. Holder Y fortsatt?» Det er sannsynligvis den funksjonen som gjør deg til en bedre investor.

### B9. Hallusinasjonsvern og kildekrav som håndheves maskinelt
Kildekravet (punkt 21 og 40) er det viktigste i oppgaven, men det må *håndheves*, ikke bare ønskes:
- Alle data får en `evidence_id` (datapunkt + kilde + `retrieved_at` + `as_of` + type: reported/estimated/calculated/inferred).
- LLM-agentene får bare evidens-objekter som input og **må referere til `evidence_id`** for hvert tall og hver påstand.
- En **validator** (kode, ikke LLM) sjekker at alle tall i agent-teksten finnes i evidensen. Påstander uten referanse merkes «unsupported» og trekker ned datakvalitet og konfidens.
- Cross-check-agenten får en deterministisk forhåndssjekk: tallkonsistens, utdaterte data og manglende felter. Den bruker da LLM-tiden på resonnement, ikke aritmetikk.

### B10. Kalibrering av «confidence»
`"confidence": 0.94` er pynt hvis tallet ikke betyr noe. Forslag: konfidens beregnes fra en eksplisitt rubrikk (datakvalitet, antall uavhengige kilder, agentenighet og sektorens forutsigbarhet). Paper track record (B1) brukes over tid til å sjekke om «høy konfidens» faktisk treffer oftere.

### B11. Norske forhold
- **Aksjesparekonto (ASK)** vs. vanlig depot, utbytteskatt og kildeskatt på utenlandske utbytter. Det er relevant for porteføljeanalyse og for utbytteaksjer.
- **Valuta:** mange selskaper rapporterer i USD eller EUR, men kurs og utbytte er i NOK. Det må vises tydelig.
- **Short-posisjoner:** Finanstilsynet publiserer netto shortposisjoner ≥ 0,5 %. Det er et nyttig signal som mangler i oppgaven.
- **Tilbakekjøp** (Børsdata `/holdings/buyback`) som et kapitaldisiplin-signal.
- **Innsideregler (MAR):** «primærinnsider» og «nærstående». Innsidemeldinger på NewsWeb er fritekst og må parses. Kategoriene i oppgaven (option exercise, tax-related osv.) kommer fra det amerikanske Form 4. I Norge må de utledes med LLM og merkes `inferred` med konfidens.

### B12. Makrodata fra gratis primærkilder
Børsdata har ikke makro. Gode, gratis og maskinlesbare primærkilder:
- **Norges Bank API** (SDMX): styringsrente, NOWA, valutakurser (EUR/NOK, USD/NOK)
- **SSB API**: KPI, arbeidsledighet, boligpriser, **eksportpris laks** (ukentlig)
- **ECB / FRED / EIA**: europeiske og amerikanske renter, Brent, Henry Hub, gasslager
- Disse kommer som egne providers, med samme proveniens-modell som resten.

---

## Del C – Ting jeg ville endret eller forenklet

### C1. Slå sammen overlappende agenter
Risk, Short/Bear og Devil's Advocate overlapper i stor grad. Alle tre leter etter grunner til at caset er feil. Forslag:
- **Risk** blir en deterministisk røde-flagg-motor (regler: gjeld, rentedekning, utvanning, kontantstrøm mot resultat, Beneish/Altman/Piotroski osv.) med en kort LLM-tolkning.
- **Bull og Bear** blir en strukturert **debatt**: hver side skriver sitt beste case basert på samme evidens, og deretter får begge ett tilsvar. Det gir bedre resultat enn to isolerte monologer.
- **Devil's Advocate** beholdes, men kjøres *etter* et foreløpig komité-utkast. Den skal angripe den faktiske konklusjonen, slik oppgaven sier («Assume the final recommendation is wrong»). Det krever at det finnes en konklusjon å angripe.
- Rekkefølge: parallelle analytikere → cross-check → komité-utkast → devil's advocate → endelig komitébeslutning.

### C2. Scoresystemet
- **Dobbelttelling:** Fundamental, Quality og Growth overlapper (ROIC og marginer inngår i både fundamental og kvalitet). Forslag: definér hver delscore entydig, så hver metrikk bare inngår ett sted. Fundamental blir da en samlebetegnelse for Quality + Growth + Financial Strength.
- **Risk-retning:** Det må være entydig at høy risk-score betyr *lav* risiko (eller omvendt) før den vektes inn.
- **Gating i stedet for bare vekting:** Punkt 39 («høy kvalitet + attraktiv pris + katalysator + akseptabel risiko») er en *og*-betingelse, ikke et vektet snitt. Forslag: harde terskler (f.eks. risk under X gir maks HOLD uansett totalscore, og datakvalitet under 50 gir ingen BUY).
- **Sektor-relativ scoring:** En P/E på 8 er dyrt for shipping på toppen av syklusen og billig for en kvalitetsindustri. Delscorer beregnes som persentil mot sektor og mot egen historikk.
- **Stance-mapping:** Definer eksplisitt hvordan score + konfidens + gating gir stance. «SPECULATIVE BUY» kan for eksempel bety høy score, men lav datakvalitet eller høy risiko.

### C3. Teknologi: enklere der det ikke koster noe
- **Database:** PostgreSQL + Docker er tungt for ett personlig verktøy. Forslag: SQLAlchemy med **SQLite som standard** (null oppsett) og Postgres som valg via `DATABASE_URL`. TimescaleDB er unødvendig med EOD-data: ~250 aksjer × 20 år × 250 dager ≈ 1,25 mill. rader, og det klarer SQLite fint. DuckDB kan brukes til tunge backtest-spørringer.
- **FastAPI:** ikke nødvendig i første runde. CLI + MCP-server dekker behovet. Legg det til hvis vi lager web-UI.
- **MCP som «UI»:** MCP-serveren kan kobles direkte til Claude Desktop eller Claude Code. Da kan du chatte med dataene dine («sammenlign marginene til MOWI og SALM siste 5 år») uten egen UI. Det er en stor gevinst tidlig.
- **LLM-abstraksjon:** et tynt `LLMClient`-grensesnitt (Anthropic som standard, mulig å bytte), modellvalg per agent i `agents.yaml` (billig modell til nyhetsklassifisering, sterkeste modell til komité), strukturert output validert med Pydantic, og logging av token-bruk og kostnad.

### C4. Multi-marked fra dag én (Norden → UK → USA)
Billig å designe inn nå, dyrt å bygge om senere:
- **Instrument-identitet:** intern `instrument_id` + ISIN + MIC (XOSL, XSTO, XCSE, XHEL, XLON, XNYS/XNAS) + ticker + Børsdata-ID + valuta + land. Tickere er ikke unike på tvers av børser (EQNR finnes både på Oslo og NYSE).
- **Analyse-ID:** `XOSL-EQNR-2026-11-26-001`, ikke `EQNR-2026-11-26-001`.
- **Markedsprofil per børs** (`config/markets.yaml`): handelskalender, valuta, referanseindeks (OSEBX, OMXS30, OMXC25, OMXH25, FTSE All-Share, S&P 500), meldingskilde (NewsWeb, Nasdaq Nordic, RNS, SEC EDGAR), innsidekilde og tilsynsmyndighet (Finanstilsynet, FI, Finanssivalvonta, FCA, SEC).
- **Valuta:** all sammenligning på tvers av marked i felles valuta (NOK som standard), med FX-kilde og -dato lagret.
- **Providers per kildetype**, ikke per land: `price_provider`, `fundamentals_provider`, `announcements_provider`, `insider_provider`, `macro_provider`. Børsdata dekker kurs og fundamentale data for Norden + global. Meldinger og innsidedata byttes per marked.

### C5. Portefølje-input
Import fra **CSV** (og gjerne Nordnet- eller DNB-eksport) i stedet for manuell inntasting. Ta med konto (ASK eller depot), valuta, kontanter og transaksjonshistorikk, ikke bare snittkurs. Da blir tidsvektet avkastning og skatteeffekter mulig.

### C6. Testing
I tillegg til listen i oppgaven:
- **property-based tester** for beregninger (f.eks. drawdown ≤ 0, RSI i [0, 100])
- **referansetester** for indikatorer mot kjente verdier
- **innspilte LLM-svar** (record/replay), så agent-testene er deterministiske og gratis
- **golden-file-tester** for rapportformatet
- **backtest-sanity-tester**, for eksempel at en strategi med look-ahead *må* feile testen

### C7. Rettigheter og bruksvilkår
Børsdata-data er lisensiert for personlig bruk. Lokal caching er greit, men rapporter med rådata bør ikke deles offentlig. Web-scraping skal respektere robots.txt og vilkår. Bruk offisielle API-er og RSS der det finnes.

---

## Del D – Revidert byggerekkefølge

| Fase | Innhold | Verdi når fasen er ferdig |
|---|---|---|
| **0** | Discovery-script mot Børsdata (kjøres med din nøkkel): logg faktiske felter, verifiser norsk dekning for innsidedata, avnoterte selskaper og estimater | Vi bygger på fakta, ikke gjetning |
| **1** | Datamodeller (instrument, evidens/proveniens, point-in-time), DB, Børsdata-provider med cache, rate limit, retries og logging med maskering | Pålitelig og sporbar data |
| **2** | Beregningsbibliotek (teknisk, fundamental, verdsettelse, DCF, risikoregler) + sektorprofiler | Alle tall, testet |
| **3** | MCP-server med tools | Brukbart i Claude Desktop/Code allerede her |
| **4** | Kvant-scoring (`scoring.yaml`), datakvalitetsscore, screener (strategier + naturlig språk → filter) | `stockai screen` fungerer |
| **5** | **Backtest-motor** + faktor-IC | Vi vet hvilke faktorer som virker på Oslo Børs |
| **6** | NewsWeb-provider (børsmeldinger + innsidemeldinger) + makro (Norges Bank, SSB) + web-søk | Fersk, primærkildebasert informasjon |
| **7** | LLM-lag: analytikeragenter → cross-check → komité-utkast → devil's advocate → komité, med evidensvalidator | `stockai analyze EQNR --deep` |
| **8** | Rapportgenerator (terminal + Markdown/HTML), analysis runs, `compare_analysis`/history | Sporbare rapporter over tid |
| **9** | Portefølje, watchlist, varsler, beslutningsjournal, paper track record | Daglig bruk |
| **10** | Utvidelse: Sverige, Danmark og Finland (samme provider), deretter UK/USA | Flere markeder |

Fasene 1–5 gir et nyttig verktøy *uten* LLM-kostnader. LLM-laget kommer på toppen av et fundament som er testet.

---

## Del E – Avklaringer jeg trenger fra deg

1. **Hvor skal koden ligge?** Dette repoet (`trening`) er treningsappen din. Jeg anbefaler et eget repo, f.eks. `stockai`. Alternativt bygger jeg i en undermappe `stockai/` på denne branchen og flytter den senere.
2. **Har du Børsdata Pro+?** (REST-API krever det.) Og vil du at jeg ber om å få `apiservice.borsdata.se` åpnet i dette miljøet, med nøkkelen lagret som en sikker hemmelighet? Det går via et skjema, ikke chatten. Ellers bygger jeg mot dokumentasjonen og mock-data, og du kjører discovery lokalt.
3. **Horisont og stil:** Mest langsiktig investering (kvalitet/verdi, 1–5 år), aktiv swing-trading (uker til måneder) eller begge?
4. **Hvordan vil du helst bruke det?** CLI, chat via Claude Desktop/Code (MCP), eller et enkelt web-dashboard senere?
5. **LLM-leverandør og budsjett:** Er Anthropic API greit som standard? Har du en grov grense for kostnad per dyp analyse?
6. **Nyheter/web-søk** krever et søke-API (f.eks. Brave Search eller Tavily) med egen nøkkel. Greit?

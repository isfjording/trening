# Beslutninger og sjekkliste før bygging

Dato: 2026-11-26
Bygger på: `01-gjennomgang-av-prompt.md` og svarene dine

---

## 1. Det som er bestemt

| Tema | Beslutning |
|---|---|
| Investeringsprofil | Langsiktig. Hovedmålet er å kunne **leve av utbytte**. I tillegg et eget spor for **sterkt momentum** (vekstaksjer uten utbytte). |
| Form | En egen app som er installert på PC-en, med tilgang fra mobil. Web-dashboard som kan installeres på mobilen som en app (PWA). |
| Data | Børsdata Pro+ er hovedkilden (venter på API-nøkkel). Nordnet-transaksjoner importeres som fil. |
| LLM | Anthropic |
| Websøk | Lav kostnad er et krav (se punkt 4) |
| Rekkefølge | Ingenting bygges før sjekklisten i punkt 6 er ferdig |

---

## 2. Hva dette endrer i planen

### 2.1 To strategispor i stedet for én score
Utbytteaksjer og momentumaksjer skal vurderes på helt ulike kriterier. Én felles totalscore ville straffet begge typer. Derfor:

**Spor A – Utbyttekjerne**
- **Utbyttesikkerhet-score:** utbyttegrad mot både resultat og fri kontantstrøm, gjeldsgrad, antall år uten kutt, utbyttevekst (CAGR 5/10 år), syklisitet i inntjeningen og om utbyttet er finansiert med gjeld
- **Kvalitet og verdi:** ROIC, stabile marginer, fornuftig pris (direkteavkastning mot egen historikk og mot sektor)
- **Varsel om kuttrisiko:** når utbyttet ikke dekkes av kontantstrøm, eller gjelden stiger
- **Yield on cost:** utbytte i prosent av din egen kjøpskurs

**Spor B – Momentum**
- **Momentum-score:** 12-1-måneders avkastning, relativ styrke mot OSEBX, trend (over/under 200-dagers snitt), stabilitet i trenden og volumbekreftelse
- **Kvalitetsfilter:** så vi unngår rent spekulative raketter (likviditet, ikke ekstrem utvanning, en viss fundamental bekreftelse)
- **Exit-regler:** momentumaksjer krever klare salgssignaler, f.eks. brudd på trend eller fall i relativ styrke. De skal ikke «eies for alltid».

Begge sporene **backtestes på Oslo Børs** før vi stoler på dem. Vektene ligger i `config/scoring.yaml` med ett sett per spor.

### 2.2 «Leve av utbytte» som et mål systemet følger
- Du setter et mål: utbytte per år etter skatt
- Systemet viser:
  - forventet utbytte neste 12 måneder for porteføljen, basert på siste utbetalte utbytte. Det merkes som **estimat**.
  - faktisk mottatt utbytte per år, fra Nordnet-historikken. Det merkes som **rapportert**.
  - gapet mellom mål og dagens nivå, og hvor mye kapital som trengs ved dagens direkteavkastning
  - **utbyttekalender:** kommende ex-datoer og utbetalinger
- Det tas hensyn til skatt: ASK og AF-konto, kildeskatt på utenlandske utbytter og skjermingsfradrag. Det vises som et estimat, og systemet sier tydelig at det ikke er skatterådgivning.

### 2.3 Porteføljen som overvåkingsområde
- **Nordnet-import:** transaksjonshistorikk (CSV) → posisjoner, gjennomsnittlig anskaffelsesverdi (GAV), realisert og urealisert gevinst, mottatte utbytter, kildeskatt, kurtasje, per konto
  - Importen kan kjøres flere ganger uten duplikater (den gjenkjenner rader den har sett før)
  - Splitt og andre selskapshendelser håndteres
  - Rader som ikke kan tolkes, flagges. Systemet gjetter aldri.
  - Kobling Nordnet → Børsdata skjer via ISIN
- **Gjennomgang:**
  - **ukentlig sammendrag:** endringer i score, nye børsmeldinger og innsidehandler, momentum-brudd og utbytterisiko
  - **ekstra gjennomgang** når et selskap i porteføljen legger fram kvartalstall
  - **månedlig porteføljerapport:** konsentrasjon, sektorer, valuta, korrelasjon, utbyttemål og om sporene er i balanse
- **Beslutningsjournal:** når du kjøper eller selger, kobles begrunnelsen til transaksjonen, og systemet følger den opp senere

### 2.4 Kjøremiljø: PC + mobil
Anbefaling:
- **Backend:** Python (FastAPI) + SQLite. Kjører som en bakgrunnstjeneste på PC-en. Gjør også de planlagte jobbene: daglig datahenting etter kl. 20 UTC, varsler og gjennomganger.
- **Frontend:** et web-dashboard som PWA. Kan legges til på hjemskjermen på mobilen og oppfører seg som en app.
- **Mobiltilgang:** **Tailscale** (gratis for privat bruk). Gir et privat, kryptert nett mellom PC og mobil. Ingen porter åpnes mot internett, og ingen data ligger i skyen. Porteføljen din er sensitiv, så det er den tryggeste løsningen.
- **Begrensning:** PC-en må være påslått for at mobilen skal få kontakt og for at varsler skal kjøre. Er den ofte av, er alternativet en liten alltid-på-maskin (mini-PC, Raspberry Pi eller en privat skyserver til ca. 50–70 kr/mnd). Appen lages slik at den kan flyttes uten endringer.
- **Varsler til mobil:** push-varsler via PWA eller en enkel tjeneste som ntfy (gratis)
- **MCP-serveren** følger med. Da kan du også chatte med dataene dine i Claude Desktop på PC-en.

---

## 3. Lagring og personvern
- Porteføljedata, transaksjoner og API-nøkler blir **kun på din maskin**
- Koden ligger i et **privat** GitHub-repo. Mappen med data (`data/`) og `.env` committes aldri.
- LLM-kall sender bare det som trengs for analysen til Anthropic (selskapsdata, nyheter). Porteføljebeløp sendes bare når du ber om en porteføljeanalyse, og det kan slås av.

---

## 4. Kostnader (estimat)

| Post | Kostnad |
|---|---|
| Børsdata Pro+ | Har du allerede |
| Tailscale, ntfy | Gratis |
| **Websøk** | Vi bruker Anthropics innebygde websøk: **$10 per 1000 søk (≈ 1 øre per søk)**, på samme API-nøkkel. Ingen egen søketjeneste eller ekstra nøkkel trengs. |
| Børsmeldinger (NewsWeb) | Gratis (offentlig) |
| Makro (Norges Bank, SSB) | Gratis (åpne API-er) |
| **Dyp analyse av én aksje** | Grovt anslag: **$1–2 (≈ 10–25 kr)**. Billig modell (Haiku/Sonnet) til nyhetsklassifisering og delanalyser, sterkeste modell (Opus) bare til komitéen. |
| **Kvant-screening av hele børsen** | **0 kr** i LLM-kostnad (ren beregning) |
| Ukentlig porteføljegjennomgang (~15 aksjer, lett pass) | Anslag: noen få kroner per uke |

Månedlig total ved normal bruk: sannsynligvis **under 100–200 kr**. Appen får en innebygd kostnadsteller og en **månedlig maksgrense** som du setter selv. Anslagene over er estimater og må måles når systemet kjører.

---

## 5. Repo-struktur (forslag)
Eget privat repo: `stockai`

```
stockai/
├── backend/            Python: providers, beregninger, scoring, agenter, API, scheduler
│   ├── providers/      borsdata/, newsweb/, nordnet_import/, macro/, web/
│   ├── analysis/       teknisk, fundamental, verdsettelse, utbytte, momentum, risiko
│   ├── agents/         LLM-agenter + evidensvalidator
│   ├── backtest/
│   ├── portfolio/
│   ├── mcp_server/
│   └── api/            FastAPI for dashboardet
├── frontend/           PWA-dashboard
├── config/             scoring.yaml, agents.yaml, sectors.yaml, markets.yaml
├── tests/
├── docs/
└── data/               (gitignored) SQLite, cache, importfiler, rapporter
```

---

## 6. Sjekkliste – må være på plass før vi bygger

| # | Hva | Hvem | Status |
|---|---|---|---|
| 1 | **Privat GitHub-repo `stockai`** opprettet, og Claude GitHub App gitt tilgang til det. Ny Claude-økt startes med repoet valgt. (Tilgangen til `trening` virker heller ikke i dag.) | Du | ☐ |
| 2 | **Børsdata API-nøkkel** | Du (venter) | ☐ |
| 3 | **Anthropic API-nøkkel** fra console.anthropic.com, med månedlig forbruksgrense satt. NB: et Claude-abonnement gir *ikke* API-tilgang. API-et faktureres separat. | Du | ☐ |
| 4 | **Eksempelfil fra Nordnet:** eksport av transaksjoner («Transaksjoner og sluttsedler» → eksporter), helst med flere typer rader: kjøp, salg, utbytte, innskudd, gjerne splitt og utenlandsk utbytte med kildeskatt. Du kan slette rader eller endre beløp, men behold kolonnene og formatet uendret. | Du | ☐ |
| 5 | **Hvilket operativsystem PC-en har** (Windows, Mac eller Linux), og om den står på det meste av tiden | Du | ☐ |
| 6 | **Hvilke kontotyper** du har hos Nordnet (ASK, AF, IPS/aksjesparekonto, utenlandske aksjer) | Du | ☐ |
| 7 | **Utbyttemål:** ønsket utbytte per år. Valgfritt, kan settes i appen senere. | Du | ☐ |
| 8 | **Godkjenne denne planen** eller si hva du vil endre | Du | ☐ |

Når punkt 1, 4, 5 og 8 er klare, kan jeg begynne. Børsdata-nøkkelen (punkt 2) trengs først når klienten skal verifiseres mot ekte data. Frem til da bygger jeg mot dokumentasjonen og testdata, og første oppgave med nøkkelen blir et discovery-script som du kjører én gang.

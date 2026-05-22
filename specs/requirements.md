# requirements.md — Requirements

> Last updated: 2026-05-22
> Status: Complete for Demo phase
> Source: docs/01–08 (PRD-dokumenter levert 2026-05-22)

---

## Functional Requirements — Consumer App (PWA)

### Browsing og discovery
FR-001: Bruker kan se hjemskjerm med hero, utvalgte fordeler og kategorisnarveier
FR-002: Bruker kan bla i fullstendig fordelsliste
FR-003: Bruker kan filtrere fordeler på kategori via filter-chips
FR-004: Bruker kan åpne fordelsdetaljside
FR-005: Utløpte, pausede og arkiverte fordeler vises ikke i hovedfeed
FR-006: Fordeler sorteres etter prioritet satt av admin, deretter nyeste publisering
FR-007: Hjemskjerm viser fallback-hero dersom ingen målrettet hero matcher brukeren
FR-008: Hjemskjerm viser aldri tom forside — alltid nasjonalt fallback-innhold

### Bruk av fordeler (redemption)
FR-010: Bruker kan vise generell rabattkode (kode er skjult til bruker trykker)
FR-011: Bruker kan kopiere rabattkode — hendelse logges
FR-012: Bruker kan hente unik kode — systemet tildeler atomisk én kode per bruker/session
FR-013: Samme bruker/session får alltid samme unike kode ved gjentatt besøk
FR-014: Tom kodepool gir tydelig feilmelding, ikke crash
FR-015: Bruker kan vise QR-kode med instruksjon
FR-016: Bruker kan klikke ekstern lenke — hendelse logges, UTM-parametere støttes
FR-017: Bruker kan sende leadskjema med samtykke — lead lagres med status new
FR-018: Leadskjema validerer påkrevde felter og krever samtykke før innsending
FR-019: Bruker ser kvittering etter innsendt lead

### Lagring og profil
FR-020: Bruker kan lagre og avlagre fordeler
FR-021: Lagrede fordeler vises under «Mine fordeler»
FR-022: Utløpte lagrede fordeler merkes som utløpt, ikke slettet fra historikk
FR-023: Bruker kan oppgi postnummer for lokale fordeler
FR-024: Bruker kan sette flyttestatus (nylig flyttet / flyttet tidligere / ikke flyttet / ukjent)
FR-025: Appen fungerer fullt ut uten innlogging og uten postnummer (graceful degradation)

### Nær deg
FR-030: Bruker kan se fordeler filtrert på postnummer
FR-031: Uten postnummer: bruker spørres lavterskel og ser nasjonale fordeler
FR-032: Ingen lokale treff: vis nasjonale fordeler og hyggelig tomtilstand — aldri blank side

### Targeting
FR-040: Fordeler kan målrettes mot: spesifikke postnummer, postnummerområder, kommune, fylke, nasjonalt
FR-041: Fordeler kan målrettes mot: nylig flyttet, tidligere flyttet, ikke-flytter, alle
FR-042: Brukere uten kjent segment/lokasjon ser alltid nasjonale/fallback-fordeler
FR-043: Targeting vurderes på starttidspunkt for visning — ikke ved opprettelse

### PWA
FR-050: Appen er installabel som PWA på iPhone (Safari) og Android (Chrome)
FR-051: Appen har manifest.json med ikoner og theme-color
FR-052: Appen har enkel offline/dårlig-nett-opplevelse med feilmelding
FR-053: Appen viser installasjonsinstruksjon tilpasset iOS og Android

### Hendelseslogging
FR-060: Minimumshendelser logges: benefit_viewed, code_revealed, code_copied, qr_opened, external_link_clicked, lead_submitted, benefit_saved, hero_clicked

---

## Functional Requirements — Admin (Backoffice)

### Auth
FR-100: Admin-brukere må logge inn for å få tilgang til alle admin-ruter
FR-101: Uautentiserte forespørsler til admin-API returnerer 401

### Dashboard
FR-110: Admin ser: antall aktive fordeler, planlagte fordeler, utløper snart, nye leads, kodepooler med lav beholdning

### Fordeler
FR-120: Admin kan opprette fordel med alle felter fra datamodellen
FR-121: Admin kan lagre fordel som utkast
FR-122: Admin kan publisere fordel — validering sjekker påkrevde felter
FR-123: Admin kan pause, arkivere og slette (soft delete) fordel
FR-124: Admin kan duplisere fordel for ny kampanjeperiode
FR-125: Admin kan sette start- og sluttdato — fordel utløper automatisk
FR-126: Admin kan sette prioritet (integer) for sortering
FR-127: Admin kan sette targeting (segment + geografi)
FR-128: Admin ser mobil forhåndsvisning av fordelskort
FR-129: Admin kan filtrere fordelliste på status, annonsør, kategori, segment, periode

### Annonsører
FR-130: Admin kan opprette, redigere og deaktivere annonsører
FR-131: Annonsør har: navn, slug, logo, nettside, kontaktinfo, interne notater

### Heroer
FR-140: Admin kan opprette hero med: tittel, bilde, CTA, segment- og geografiregler, prioritet, periode
FR-141: Admin kan merke hero som fallback (vises når ingen målrettet hero matcher)
FR-142: Hero kan lenke til: fordel, kategori, ekstern URL, intern side, eller ingen lenke

### Koder
FR-150: Admin kan legge inn generell kode direkte på fordel
FR-151: Admin kan opprette kodepool og laste opp koder via CSV eller copy-paste
FR-152: Admin ser antall tilgjengelige/tildelte koder per pool
FR-153: Systemet deduplicerer koder ved opplasting

### Leads
FR-160: Admin kan se alle leads med filtrering på annonsør, fordel, status, dato
FR-161: Admin kan eksportere leads som CSV — status settes til exported
FR-162: Admin kan slette enkeltlead (soft delete)
FR-163: Leadstatus er begrenset til: new / exported / failed / deleted — ingen CRM-statuser

---

## Non-Functional Requirements

NFR-001: All databasetilgang går gjennom Prisma ORM — ingen rå SQL i applikasjonskode
NFR-002: Admin-endepunkter krever auth — rollebasert tilgang (admin/editor/viewer)
NFR-003: Persondata (leads) behandles som sensitiv — ikke logg i klartekst
NFR-004: Unik kode-tildeling er atomisk — databasetransaksjon forhindrer race conditions
NFR-005: Alle skjemaer valideres server-side — ikke bare klient-side
NFR-006: Soft delete på alle kritiske entiteter (fordeler, annonsører, leads)
NFR-007: Audit log på publisering, arkivering, sletting og lead-eksport
NFR-008: Kodebase er migrasjonsvennlig — ingen hardkodet infrastruktur i forretningslogikk
NFR-009: Miljøvariabler brukes for alle hemmeligheter og infrastruktur-URL-er
NFR-010: Kode kommenteres der migrasjonsvalg eller free-tier-begrensninger påvirker implementasjonen

---

## Out of Scope (Demo og MVP)
- Native iOS/Android-app
- Desktoptilpasning for sluttbrukerapp
- Avansert kartvisning (kart-API)
- Annonsørportal (selvbetjening)
- Betaling i app
- Lojalitetspoengmotor
- «Du har spart»-funksjon
- AI-basert personalisering
- Push-varsler med avanserte journeys
- Automatisk anonymisering av leads (vurderes til MVP)

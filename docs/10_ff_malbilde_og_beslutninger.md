# 10 Målbilde og beslutninger: felles backend for FF web, app og e-post

> Opprettet: 2026-10-12
> Kilde: beslutninger fra produkteier og analyse av dagens løsning (se 09).
> Formål: retningen prototypen skal utvikles i. Seksjon 2 er **beslutninger**. Seksjon 3 og utover er **forslag** som skal konkretiseres gjennom CR-er. Ingenting her er endelig fasit, men beslutningene skal ikke fravikes uten å spørre.

---

## 1. Grunnidé

Dagens FF er bygget rundt et **løp** som slutter ved bekreftelsessiden. Den nye skal bygges rundt en **relasjon**: én person som får relevante fordeler over tid, i flytteløpet på web, i appen og på e-post.

Det betyr at kjernen i systemet er **personen og fordelene**, ikke sidene. Web, app og e-post er tre flater mot samme kjerne.

## 2. Beslutninger

1. **Felles backend** for FF web, FF app og e-post. Prototypen lages i dette repoet, med forslag til ny admin og hele websiden i tillegg til appen.
2. **Annonsetreet forenkles til en direkte kjede: Page → Fordel → Product.**
   - Endpoint og Container fjernes.
   - TemplateOffer fjernes mest sannsynlig, men behovet den dekker (flere produktvalg på samme kort) må dekkes. Se 3.1.
   - **Ikke innfør nye nivåer, mellomlag eller koblingstabeller** i denne kjeden uten å spørre. Beskriv behovet og spør.
3. **Fordelen er en fristilt entitet** som kan vises i web, i app, eller begge, og ha én eller flere grafiske fremvisninger i appen (for eksempel hero og normal).
4. **Appen er ikke et tre eller en prosess.** Den er et sted brukeren får nye fordeler kontinuerlig, i kategorier, karuseller og egne flater. Flate og format påvirker utseende og hvilke medier som trengs.
5. **Ingen sporing for å "ta med" fordeler til appen.** Det finnes, og skal videreutvikles, et system for hvilke fordeler en person eksponeres for. Samme regler gir samme svar for samme person i alle kanaler.
6. **E-post med fordeler etter løpet videreføres**, til de som samtykker, som kampanjer tilpasset mottakerne.
7. **A/B-testing skal være svært enkelt**: på innhold (bilde, tekst), på format (hero mot normal i app), og på plassering, også strukturelt, i alle tre kanaler.
8. **Appen krever innlogging.** Unntak: før innlogging vises én eller to svært gode introduksjonstilbud. Klikk på et av dem krever innlogging og sender deretter brukeren til fordelen.
9. **Innløsning** i appen omfatter blant annet klikk til kundens side. **Å åpne en fordel er et viktig målepunkt** i seg selv.
10. **Rapporteringen fornyes**, med dagens statistikkadmin som utgangspunkt (se 09, seksjon 5).
11. **Overgangen fra web til app fakes i denne fasen.** "Last ned appen her" åpner webappen. Appen er en webapp (PWA). Hjemskjerm, push og plattformforskjeller er utenfor scope nå.
12. **Prototypen er en start, ikke en fasit.** Eksisterende kode og specs kan endres.

## 3. Datamodell (forslag)

### 3.1 Fordel

Begrepet **Fordel** (Benefit i kode) erstatter annonse, template og tilbud. Det henger sammen med navnet Flyttefordel og beskriver det brukeren får.

```
Fordel
  innhold: tittel, tekst, kulepunkter, vilkår, kunde
  produkter: ett eller flere Product (flere = flere valg på samme kort)
  leveringsmåte: e-post, SMS, telefon, befaring, direkte (hvordan kunden følger opp)
  innløsning: bestilling/lead via produkt, ekstern lenke, kode, unik kode, QR, info
  regler: hvem som er kvalifisert, periode (felles for alle kanaler)
  inntektsmodell: leadpris, pris per klikk, pris per visning, fast kampanjepris, CPA (alle valgfrie)
  visninger: én eller flere
```

### 3.2 Visninger

En visning beskriver hvor og hvordan fordelen vises. Forslag til typer:

| Visning | Kanal | Plassering | Typiske felter |
|---|---|---|---|
| web | FF web | Page og rekkefølge på siden | logo, overskrift, tekst, kulepunkter, knappetekst |
| app-normal | App | kategori, lister, rutenett | kortbilde, tittel, merketekst |
| app-hero | App | karusell | bredt bilde, kort overskrift, CTA |
| app-intro | App før innlogging | forsiden for ikke-innloggede | bilde, overskrift, CTA |
| e-post | E-post | plass i utsendelse | bilde i e-postbredde, kort tekst, lenke |

Konsekvenser:
- **Kanal trenger ikke et eget felt.** En fordel vises der den har en visning.
- **Page-koblingen hører til web-visningen**, ikke fordelen. Kjeden Page → Fordel → Product holdes uten nytt mellomlag i treet fordi visningen eies av fordelen.
- **Hero blir en visning av en fordel.** Heroer som ikke handler om en fordel (kategori, redaksjonell kampanje) må vurderes særskilt.
- **Medier følger visningen.** Admin bør kunne utlede formater fra ett hovedbilde med beskjæring, og bare kreve egne bilder der det gir effekt. Flere formater må ikke bli en flaskehals for redaksjon og annonsører.

Alternativ som er vurdert: faste felter per format på fordelen (heroBilde, kortBilde osv.). Enklere med få formater, men stivt når appen får flere flater og når et format skal ha egen periode eller prioritet.

### 3.3 Person og identitet

- Én intern person-ID. Koblet til Vipps. **Aldri telefonnummer i URL.**
- Alle brukere i web og app er innlogget. Unntaket er app-intro før innlogging.
- I prototypen simuleres Vipps med en enkel innlogging som gir stabil person-ID, bygget slik at den kan byttes med ekte Vipps uten å berøre resten.
- Personopplysninger reglene bruker: flyttedato, fra- og tiladresse, boligtype, samtykker.

### 3.4 Tid som felles akse

- Én felles definisjon av faser regnet fra **flyttedato**, ikke fra når brukeren åpnet en kanal. 24-tiltaksdokumentet beskriver en aktiv fase på 180 dager og deretter "fast fordel". Prototypen bruker 60 dager for "nylig flyttet". Dette må samordnes til én definisjon.

## 4. Utvelgelse (forslag)

Én funksjon: **gitt person og tidspunkt, hvilke fordeler er personen kvalifisert for.**

- Brukes av web (fordeler per side), app (fordeler per flate) og e-post (fordeler per mottaker i et utvalg).
- Regeldimensjoner: tid siden flytting, postnummer, kommune, fylke, boligtype, samtykke, og **hva personen har valgt eller innløst før** (for kryssalg).
- Perioder og utløp ligger på fordelen. Tidsbegrensning per person regnes fra en persondato.
- Før innlogging (app-intro): utvelgelse uten persondata, ut fra periode og prioritet. Fordeler med intro-visning bør ha regler som gjør nesten alle kvalifisert etter innlogging. Admin bør advare ellers.

## 5. A/B-testing (forslag)

Prinsipp: **en test velger mellom ting som allerede finnes i modellen.** Den ligger som et lag oppå, ikke i treet.

- **Innhold**: to visninger av samme format på samme fordel.
- **Format**: hero mot normal på samme fordel.
- **Plassering**: alternative plasseringer (side, posisjon, flate, plass i e-post).
- **Struktur**: rekkefølge eller oppsett av hele løpet eller appforsiden (for eksempel scroll mot paginert). Peker på sider eller flater i stedet for visninger.

Test: hvilke alternativer, fordeling, periode, hovedmål (åpnet, innløst, inntekt).

Tildeling: regnes ut fra person-ID og test-ID, slik at samme person alltid får samme variant i alle kanaler uten lagring. E-post splittes ved utsendelse med samme regel. Utvelgelsen velger variant, så frontend vet ingenting om testing. Hendelser merkes med test og variant. Rapporteringen viser resultat per variant og om forskjellen er til å stole på.

## 6. Hendelser og rapportering (forslag)

Én felles hendelsesstrøm som alle rapporter og flere funksjoner bygger på.

Hendelse: person, fordel, visning, kanal, test og variant, type, tidspunkt.

Typer:
- **vist**
- **åpnet** (viktig målepunkt)
- **valgt** (web: "Ja takk", sendes samlet ved fullføring)
- **innløst**, med undertype: bestilling, lead, klikk til kundens side, kode hentet, QR vist
- **app-intro**: vist og klikket før innlogging, knyttes til person ved innlogging hvis det er tillatt (se åpne spørsmål)

Kanal er en egenskap ved hendelsen. **Ikke lag egne produktvarianter per kanal** slik dagens "Flyttemailen"-produkter gjør.

Rapporter:
- Dagens nøkkeltall (fullførte, innlogginger, leadinntekt, produkter, inntekt per fullført) regnes fra strømmen.
- Nytt: trakt per fordel (vist, åpnet, innløst), visning mot visning, kanal mot kanal for samme fordel, A/B-resultater, kohorter etter flyttedato, andel som går fra web til app.
- Foreslått hovedtall: **verdi per flytter over tolv måneder, på tvers av web, e-post og app.**

Samme strøm gir sosiale bevis og "Mest valgt" (regnet per fordel, aldri redaksjonelt satt), og triggere for kryssalg.

## 7. Kanalene

### 7.1 FF web

- Sidene er bare en rekkefølge av kategorier. Rekkefølgen er data, slik at strukturelle tester er mulige.
- Fordelskort med leveringsmåte, flere produktvalg og "Ja takk". Valg samles og sendes ved fullføring.
- Bekreftelsessiden blir en overgang: valgte fordeler, andre aktuelle fordeler og "Last ned appen her".
- If er en egen komponent med personlig pris fra If. Kan trenge eget spor.
- Integrasjoner kjøres asynkront. Brukeren skal få bekreftelsen umiddelbart.

### 7.2 FF app

- Krever innlogging. Forside for ikke-innloggede med én eller to app-intro-fordeler.
- Flater: kategorier, karuseller (hero), lister, detaljside, lagrede. Endelige flater og formater er ikke bestemt.
- Innløsning skjer med en gang (lenke, kode, lead osv.).

### 7.3 E-post

- Samme fordel, e-post-visning. Samme utvelgelse, pluss samtykke som filter.
- Kampanjer som utvalg kjørt mot utvelgelsen for en gruppe mottakere.
- Utsendelse via IDA, simulert i prototypen.
- Lenker identifiserer mottaker og fordel (som puff i dag).
- E-post er også en vei til appen.

## 8. Admin (forslag)

Én admin for innhold og rapportering, bygget rundt arbeidsflyt med fordelen i sentrum:

1. Opprett fordel, velg kunde og produkt(er), leveringsmåte og innløsning.
2. Legg til visninger, med medier per format (utledet fra hovedbilde der det går).
3. Sett regler og periode.
4. Forhåndsvis i hver kanal.
5. Planlegg publisering. Statusfarger og valideringer som i prototypen.
6. Se resultatene for akkurat denne fordelen på samme sted.

I tillegg: sider og rekkefølge for web, flater for app, e-postkampanjer, A/B-tester, kunder og produkter, rapportering.

## 9. Integrasjoner

Alle bak egne grensesnitt med simulert implementasjon i prototypen: Vipps, SMS-innlogging, If, IDA, kundenes leads-API-er, skiltleverandør, oppslag på person og flyttedato, overgang fra Posten.

## 10. Foreslått rekkefølge

1. Modellen: fordel, visninger, person og identitet, utvelgelse, hendelser.
2. Admin for fordeler.
3. FF web-løpet mot ny backend, med bekreftelsesside og overgang til app.
4. Appen på samme backend, med intro og innlogging.
5. E-post som tredje kanal.
6. A/B-lag og rapportering v2.

For produksjon (utenfor prototypen): la ny backend overta én del av gangen ved siden av dagens API.

## 11. Skrivestil

Bruk aldri tankestrek i tekst (dokumentasjon, UI-tekst, CR-er). Bruk komma, kolon eller del opp i to setninger.

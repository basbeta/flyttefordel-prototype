# vision.md — Product Vision

> Last updated: 2026-05-22

## Product Name
Fordelsklubben (working title) — Demo / Prototype

## One-Line Description
En mobil PWA som samler relevante fordeler, rabattkoder, kampanjer og nyttig innhold for personer i Norge — uansett om de har flyttet eller ikke.

## Problem Being Solved
Det finnes ingen samlet, kuratert mobilapp for relevante hverdagsfordeler i Norge. Flytting er en sterk trigger for behov (forsikring, strøm, internett, interiør), men produktet skal være nyttig langt utover selve flytteøyeblikket.

## Target Users

### Sluttbrukere (konsumenter)
- Norske mobilbrukere som ønsker relevante fordeler og rabatter
- Nylig flyttet (0–60 dager): høy relevans for bolig/hjem-tjenester
- Flyttet tidligere (>60 dager): vedlikehold, hverdag, hjem
- Ikke-flyttere: generelle fordeler, hverdagstilbud
- Alle segmenter støttes — ingen låses ute

### Admin-brukere (Bas/Posten internt)
- Intern stab som oppretter og vedlikeholder fordeler, annonsører, heroer og kampanjer
- Trenger ikke utviklerbistand til daglig drift

### Annonsører
- Kommersielle partnere som tilbyr rabatter, koder, QR, lenker eller leadbaserte tilbud

## Core Value Proposition
- Kuraterte fordeler samlet på ett sted
- Relevant for alle — ikke bare dem som nettopp har flyttet
- Lav terskel: verdi uten tung registrering
- Admin kan drifte uten utvikler

## Demo Scope (nåværende fase)
- Mobil PWA for iPhone/Android
- Hjemskjerm med hero, utvalgte fordeler og kategorier
- Fordelsliste med kategorifilter
- Fordelsdetalj med alle redemption-typer (kode, unik kode, QR, ekstern lenke, leadskjema)
- Enkel admin: fordeler, annonsører, heroer, koder, leads
- Supabase (free tier) + Vercel (free tier)
- Migrasjonsvennlig arkitektur for MVP og produksjon

## MVP Scope (neste fase)
- Samme funksjonalitet, men på Bas/Postens infrastruktur
- Ytelseskrav og SLAer definert
- Produksjonsgrad auth og sikkerhet

## Out of Scope (demo og MVP)
- Native iOS/Android-app
- Desktoptilpasning for sluttbrukerapp
- Avansert kartvisning
- Annonsørportal (selvbetjening)
- Betaling i app
- Lojalitetspoengmotor
- «Du har spart»-funksjon
- AI-basert personalisering

## Success Metrics (demo)
- Alle redemption-typer fungerer end-to-end
- Admin kan opprette, publisere og administrere fordeler uten utvikler
- PWA kan installeres på iPhone og Android
- Kodebase er portabel til ny infrastruktur uten arkitekturendringer

## Strategic Goal
Norges største fordelsapp — med moveringen som trigger, men hverdagen som produkt.

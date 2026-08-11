# entities.md — Data Entities

> Last updated: 2026-05-22
> Kilde: docs/05_datamodell_og_api_forslag.txt
> Implementert som Prisma-schema i /lib/db/schema.prisma
> Dette er kilden til sannhet for datamodellen. Ingen entitet kan brukes i kode uten å være definert her.

---

## Enums

### UserMovingStatus
- `recently_moved` — Nylig flyttet (0–60 dager)
- `moved_past` — Flyttet for mer enn 60 dager siden
- `not_moving` — Ikke i flytteprosess
- `unknown` — Ukjent (default)

### BenefitStatus
- `draft` — Utkast, ikke synlig i app
- `scheduled` — Ferdig, men startdato frem i tid
- `active` — Publisert og synlig
- `paused` — Midlertidig skjult
- `expired` — Passert sluttdato
- `archived` — Tatt ut av drift, beholdt for historikk
- `deleted` — Soft delete

CR-016: Admin-UI viser i tillegg en **beregnet visningsstatus** (ikke lagret,
ikke en egen enum-verdi) som grupperer statusene over i 4 farge-bøtter:
- Grønn — `active` uten registrert problem
- Gul — `scheduled` uten registrert problem
- Grå — `draft`, `paused`, `archived`, `deleted`
- Rød ("Feilet") — `expired`, ELLER `active`/`scheduled` med et reelt
  konfigurasjonsproblem (manglende redemption-innhold for valgt
  `BenefitRedemptionType`, tom kodepool, eller en `ends_at`/`starts_at`
  som er inkonsistent med statusen). Se `src/lib/benefits/displayStatus.ts`.

### BenefitRedemptionType
- `generic_code` — Én kode som alle kan bruke
- `unique_code` — Kode fra kodepool, tildeles én gang per bruker/session
- `qr_code` — QR-kode (statisk eller URL-basert)
- `external_link` — Ekstern URL med UTM-støtte
- `lead_form` — Kontaktskjema med samtykke
- `info_only` — Informasjonsfordel uten redemption-mekanisme
- `mixed` — Kombinasjon (f.eks. kode + ekstern lenke)

### BenefitVisibility
- `public` — Synlig for alle kvalifiserte brukere
- `targeted` — Kun for spesifikke segmenter/geografier
- `hidden` — Skjult (admin-internt)

### LeadStatus
- `new` — Nytt lead, ikke behandlet
- `exported` — Eksportert/sendt til annonsør
- `failed` — Teknisk feil ved eksport
- `deleted` — Slettet

### CodeStatus
- `available` — Klar for tildeling
- `reserved` — Midlertidig reservert
- `assigned` — Tildelt bruker
- `expired` — Utløpt
- `disabled` — Deaktivert av admin

### HeroStatus
- `draft` | `scheduled` | `active` | `paused` | `expired` | `archived`

### CTAType
- `benefit` | `category` | `external_url` | `internal_page` | `none`

### AdminRole
- `admin` — Full tilgang inkl. sletting
- `editor` — Kan opprette og redigere, ikke slette
- `viewer` — Lesetilgang

---

## Entity: User

Brukere kan være anonyme eller identifiserte. Appen fungerer uten innlogging.

Fields:
- id: uuid (PK)
- external_auth_id: string? (kobling til Supabase Auth — nullstilles ved auth-migrasjon)
- email: string?
- phone: string?
- name: string?
- postcode: string? (brukes for targeting)
- municipality: string? (utledet fra postcode)
- county: string? (utledet fra postcode)
- moving_status: UserMovingStatus (default: unknown)
- moved_at: date?
- created_at / updated_at / deleted_at: timestamp

Relations:
- has_many: UserSession
- has_many: SavedBenefit
- has_many: BenefitEvent

---

## Entity: UserSession

Kobler hendelser til anonym eller kjent bruker.

Fields:
- id: uuid (PK)
- user_id: uuid? FK User (null for anonyme)
- anonymous_id: string (settes i cookie/localStorage)
- device_type: string?
- platform: string?
- created_at / last_seen_at: timestamp

Relations:
- belongs_to: User (optional)

---

## Entity: Advertiser

Kommersiell partner som tilbyr fordeler.

Fields:
- id: uuid (PK)
- name: string
- slug: string (UNIQUE)
- org_number: string?
- logo_url: string? (URL-streng — populeres via admin-opplasting til S3-kompatibel storage, se CR-012, eller fortsatt en direkte ekstern URL for eldre data)
- website_url: string?
- contact_name / contact_email / contact_phone: string?
- internal_notes: text? (aldri eksponert i app)
- is_active: boolean (default: true)
- created_at / updated_at / deleted_at: timestamp

Relations:
- has_many: Benefit
- has_many: Lead

---

## Entity: Category

Kategoridefinisjoner — aldri hardkodet i frontend.

Fields:
- id: uuid (PK)
- name: string
- slug: string (UNIQUE)
- description: text?
- icon: string?
- sort_order: integer (default: 0)
- is_active: boolean (default: true)
- created_at / updated_at: timestamp

Relations:
- has_many: Benefit

---

## Entity: Benefit

Hoveddatamodell for fordeler.

Fields:
- id: uuid (PK)
- advertiser_id: uuid FK Advertiser
- category_id: uuid FK Category
- title: string
- slug: string (UNIQUE, autogenerert fra tittel)
- short_description: string (vises på fordelskort)
- long_description: text (vises på detaljside)
- image_url: string? (populeres via admin-opplasting til S3-kompatibel storage, se CR-012, eller en direkte ekstern URL)
- image_alt: string?
- badge_text: string? (f.eks. "Ny", "Tidsbegrenset")
- status: BenefitStatus
- visibility: BenefitVisibility (default: public)
- redemption_type: BenefitRedemptionType
- priority: integer (default: 0, høyere = øverst i feed)
- starts_at / ends_at: timestamp?
- auto_expire: boolean (default: true)
- terms_text: text?
- usage_instruction: text?
- consent_text: text? (for lead-fordeler)
- is_featured: boolean (default: false)
- is_time_limited: boolean (default: false)
- created_by / updated_by: uuid? (AdminUser)
- created_at / updated_at / deleted_at: timestamp

Relations:
- belongs_to: Advertiser
- belongs_to: Category
- has_one: BenefitRedemption
- has_one: TargetingRule
- has_many: BenefitEvent
- has_many: SavedBenefit

---

## Entity: BenefitRedemption

Redemption-konfigurasjon per fordel (1:1 med Benefit).

Fields:
- id: uuid (PK)
- benefit_id: uuid FK Benefit (UNIQUE)
- type: BenefitRedemptionType
- generic_code: string? (for generic_code-type)
- external_url: string? (for external_link og mixed)
- qr_value: text? (QR-innhold)
- qr_image_url: string? (ferdig generert QR-bilde)
- code_pool_id: uuid? FK CodePool (for unique_code)
- lead_form_id: uuid? FK LeadForm (for lead_form)
- cta_label: string?
- opens_in_new_tab: boolean (default: true)
- created_at / updated_at: timestamp

---

## Entity: CodePool

Beholdning av unike koder per fordel.

Fields:
- id: uuid (PK)
- benefit_id: uuid FK Benefit
- name: string
- description: text?
- total_codes: integer (default: 0)
- available_codes: integer (default: 0, oppdateres ved tildeling)
- low_stock_threshold: integer (default: 10)
- is_active: boolean (default: true)
- created_at / updated_at: timestamp

Relations:
- has_many: Code

---

## Entity: Code

Individuell kode i en pool.

Fields:
- id: uuid (PK)
- code_pool_id: uuid FK CodePool
- benefit_id: uuid FK Benefit
- code_value: string
- status: CodeStatus (default: available)
- assigned_user_id: uuid? FK User
- assigned_session_id: uuid? FK UserSession
- assigned_at: timestamp?
- reserved_until: timestamp?
- expires_at: timestamp?
- created_at / updated_at: timestamp

Note: Tildeling skjer i databasetransaksjon — se `/lib/codes/assignUniqueCode.ts`

---

## Entity: Hero

Hero-banner på hjemskjerm.

Fields:
- id: uuid (PK)
- title: string
- description: text?
- image_url: string? (populeres via admin-opplasting til S3-kompatibel storage, se CR-012, eller en direkte ekstern URL)
- image_alt: string?
- cta_label: string?
- cta_type: CTAType
- cta_target: string? (benefit ID, kategori-slug, URL eller intern rute)
- status: HeroStatus
- priority: integer (default: 0, høyere vises først)
- is_fallback: boolean (default: false, vises når ingen målrettet hero matcher)
- starts_at / ends_at: timestamp?
- created_at / updated_at / deleted_at: timestamp

Relations:
- has_one: TargetingRule

---

## Entity: TargetingRule

Regler for hvem som ser en fordel eller hero.

Fields:
- id: uuid (PK)
- entity_type: string ("benefit" eller "hero")
- entity_id: uuid (FK til benefit.id eller hero.id)
- moving_statuses: jsonb? (array av UserMovingStatus)
- postcodes: jsonb? (array av postcode-strings)
- postcode_ranges: jsonb? (array av {from, to})
- municipalities: jsonb?
- counties: jsonb?
- include_unknown_location: boolean (default: true)
- applies_nationally: boolean (default: false)
- created_at / updated_at: timestamp

---

## Entity: BenefitEvent

Hendelseslogg for analytics.

Fields:
- id: uuid (PK)
- user_id: uuid? FK User
- session_id: uuid? FK UserSession
- benefit_id: uuid? FK Benefit
- event_type: string (benefit_viewed, code_revealed, code_copied, qr_opened, external_link_clicked, lead_form_started, lead_submitted, benefit_saved)
- metadata: jsonb?
- created_at: timestamp

---

## Entity: SavedBenefit

Brukerens lagrede fordeler.

Fields:
- id: uuid (PK)
- user_id: uuid? FK User
- session_id: uuid? FK UserSession
- benefit_id: uuid FK Benefit
- created_at / deleted_at: timestamp

Indexes:
- UNIQUE (user_id, benefit_id) WHERE deleted_at IS NULL
- UNIQUE (session_id, benefit_id) WHERE deleted_at IS NULL

---

## Entity: LeadForm

Skjemadefinisjon per fordel.

Fields:
- id: uuid (PK)
- benefit_id: uuid FK Benefit
- name: string
- fields: jsonb (array av feltdefinisjoner: {name, label, type, required})
- consent_required: boolean (default: true)
- created_at / updated_at: timestamp

---

## Entity: Lead

Innsendt kontaktskjema.

Fields:
- id: uuid (PK)
- benefit_id: uuid FK Benefit
- advertiser_id: uuid FK Advertiser
- user_id: uuid? FK User
- session_id: uuid? FK UserSession
- form_data: jsonb (persondata — aldri logg i klartekst)
- consent_text: text (teksten bruker samtykket til)
- consent_accepted_at: timestamp
- status: LeadStatus (default: new)
- exported_at: timestamp?
- deleted_at: timestamp?
- created_at / updated_at: timestamp

Note: Statuser er begrenset til teknisk håndtering — ingen CRM-statuser for annonsørens oppfølging.

---

## Entity: AdminUser

Interne brukere med tilgang til backoffice.

Fields:
- id: uuid (PK)
- email: string (UNIQUE)
- name: string
- role: AdminRole
- is_active: boolean (default: true)
- created_at / updated_at: timestamp

---

## Entity: AuditLog

Append-only historikk for admin-handlinger.

Fields:
- id: uuid (PK)
- admin_user_id: uuid? FK AdminUser
- action: string (f.eks. "benefit.published", "lead.exported", "benefit.deleted")
- entity_type: string
- entity_id: uuid
- before: jsonb? (state før handling)
- after: jsonb? (state etter handling)
- created_at: timestamp

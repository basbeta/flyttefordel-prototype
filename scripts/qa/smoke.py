#!/usr/bin/env python3
"""QA smoke suite for the running app (prod by default). Deterministic, HTTP only, stdlib only.

Usage:
    python scripts/qa/smoke.py                 # against QA_BASE_URL or the prod prototype
    python scripts/qa/smoke.py --no-order      # skip the order flow (creates an order + leads)
    python scripts/qa/smoke.py --no-admin      # skip the admin part even if credentials exist

Config (environment variables, or KEY=VALUE lines in a gitignored .env.qa in the repo root):
    QA_BASE_URL        default https://flyttefordel-prototype.basbeta.no
    QA_ADMIN_EMAIL     optional, admin part is skipped without it
    QA_ADMIN_PASSWORD  optional, never printed

It creates test data (fictive test persons, an order with leads). That is fine for the prototype.
Rate limits (per IP): person login 30 / 15 min (a run uses about 8), new test person 10 / hour,
order 10 / hour (a run uses 2), admin login 5 / 15 min (a run uses 1).

Exit code: 0 = all checks passed, 1 = at least one failed. Skipped sections are listed, not failed.
"""

import http.cookiejar
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
UUID_RE = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
SEEDED = ["Test Nylig-Flyttet", "Test Flyttet-Tidligere", "Test Ikke-Flytter", "Test Ukjent", "Test Nord-Norge"]


def load_env():
    path = os.path.join(ROOT, ".env.qa")
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env()
BASE = os.environ.get("QA_BASE_URL", "https://flyttefordel-prototype.basbeta.no").rstrip("/")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


class Client:
    """A browser-like client with its own cookie jar. Never follows redirects (we assert on them)."""

    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(NoRedirect, urllib.request.HTTPCookieProcessor(self.jar))

    def request(self, method, path, body=None, headers=None):
        data = json.dumps(body).encode() if body is not None else None
        h = {"content-type": "application/json"}
        h.update(headers or {})
        r = urllib.request.Request(BASE + path, data=data, method=method, headers=h)
        try:
            resp = self.opener.open(r, timeout=40)
            return resp.status, resp.read().decode("utf-8", "replace"), resp.headers
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode("utf-8", "replace"), e.headers

    def cookie(self, name):
        for c in self.jar:
            if c.name == name:
                return c.value
        return None


results = []  # (section, name, ok, detail)
skipped = []
section = ""


def check(name, ok, detail=""):
    results.append((section, name, bool(ok), detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"   [{detail}]" if detail and not ok else ""))
    return bool(ok)


def start(title):
    global section
    section = title
    print(f"\n== {title}")


def location_path(headers):
    loc = headers.get("location") or ""
    return loc.replace(BASE, "")


def login(client, person_id, email):
    return client.request("POST", "/api/auth/login", {"personId": person_id, "email": email})


def list_persons(client):
    s, html, _ = client.request("GET", "/logg-inn")
    if s != 200:
        return []
    return re.findall(r'name="person" value="(' + UUID_RE + r')".*?cardName[^>]*>([^<]+)', html, re.S)


def flow_lines(client, first_path):
    """benefit/product ids of the first page of the web flow (read from the rendered payload)."""
    s, html, _ = client.request("GET", first_path)
    if s != 200:
        return []
    found = re.findall(r'benefitId\\?":\\?"(' + UUID_RE + r')\\?".*?products\\?":\[\{\\?"id\\?":\\?"(' + UUID_RE + r')', html, re.S)
    seen, out = set(), []
    for b, p in found:
        if b not in seen:
            seen.add(b)
            out.append((b, p))
    return out


def flow_cards(client, first_path, max_pages=30):
    """Crawl the web flow page by page (each page links to the next) and return
    {slug: (benefitId, productId)} for every card the person is shown."""
    cards, seen, path = {}, set(), first_path
    while path and path not in seen and len(seen) < max_pages:
        seen.add(path)
        s, html, _ = client.request("GET", path)
        if s != 200:
            break
        for b, slug, p in re.findall(
            r'benefitId\\?":\\?"(' + UUID_RE + r')\\?",\\?"slug\\?":\\?"([^"\\]+)\\?"(?:(?!benefitId).)*?products\\?":\[\{\\?"id\\?":\\?"(' + UUID_RE + r')',
            html,
            re.S,
        ):
            cards.setdefault(slug, (b, p))
        nxt = [h for h in re.findall(r'href="(/flytting/' + UUID_RE + r')"', html) if h not in seen]
        path = nxt[0] if nxt else None
    return cards


def app_slugs(client, prefix=""):
    """Slugs of the benefits in the app list (/benefits), optionally only those with a prefix."""
    s, html, _ = client.request("GET", "/benefits")
    slugs = set(re.findall(r'href="/benefits/([a-z0-9-]+)"', html)) if s == 200 else set()
    return {x for x in slugs if x.startswith(prefix)}


def order_payload(benefit_id, product_id, email):
    return {
        "submissionId": str(uuid.uuid4()),
        "name": "Test QA-Agent",
        "email": email,
        "postcode": "0150",
        "consentShare": True,
        "consentEmail": False,
        "consentMail": False,
        "consentSms": False,
        "lines": [{"benefitId": benefit_id, "productId": product_id}],
    }


# Keep in step with src/lib/selection/demo.ts (a unit test guards personas vs rules there).
DEMO_PREFIX = "demo-sel-"
EXPECTED_DEMO = {
    "Test Nylig-Flyttet": {"forste-60", "grunn", "leilighet"},
    "Test Flyttet-Tidligere": {"enebolig-rekkehus", "etter-180", "grunn"},
    "Test Ikke-Flytter": {"enebolig-rekkehus", "grunn"},
    "Test Ukjent": {"grunn"},
    "Test Nord-Norge": {"enebolig-rekkehus", "forste-60", "grunn"},
}


def benefit_count(client, path="/benefits"):
    s, html, _ = client.request("GET", path)
    return s, len(set(re.findall(r'href="/benefits/([a-z0-9-]+)"', html)))


def main():
    args = set(sys.argv[1:])
    print(f"QA smoke against {BASE}")

    anon = Client()

    # ------------------------------------------------------------------ 1. login wall
    start("Login-mur (utlogget)")
    for p in ["/", "/benefits", "/saved", "/profile", "/nearby", "/flytting", "/flytting/oppsummering"]:
        s, _, h = anon.request("GET", p)
        check(f"GET {p} redirecter til /logg-inn", s == 307 and location_path(h).startswith("/logg-inn"), f"{s} {location_path(h)}")
    for m, p in [("POST", "/api/track"), ("POST", "/api/flow/order"), ("POST", "/api/benefits/x/save"), ("PATCH", "/api/session/profile")]:
        s, _, _ = anon.request(m, p, {})
        check(f"{m} {p} gir 401", s == 401, str(s))
    for p in ["/logg-inn", "/manifest.json", "/admin/login"]:
        s, _, _ = anon.request("GET", p)
        check(f"GET {p} er åpen", s == 200, str(s))
    s, _, h = anon.request("GET", "/admin/benefits")
    check("/admin/benefits utlogget redirecter til /admin/login", s == 307 and location_path(h) == "/admin/login", f"{s} {location_path(h)}")
    s, _, h = anon.request("GET", "/flytting/oppsummering?x=1")
    check("next tar med query", "next=%2Fflytting%2Foppsummering%3Fx%3D1" in (h.get("location") or ""), h.get("location") or "")

    # ------------------------------------------------------------------ 2. seeded persons
    start("Seedede testpersoner")
    persons = list_persons(anon)
    names = {n.strip(): i for i, n in persons}
    for n in SEEDED:
        check(f"{n} finnes på /logg-inn", n in names)
    s, html, _ = anon.request("GET", "/logg-inn")
    leaked = [e for e in re.findall(r"[\w.+-]+@[\w-]+\.[\w.]+", html) if e != "navn@bas.no"]
    check("innloggingssiden lekker ingen e-postadresser (kun placeholder)", not leaked, f"{len(leaked)} funnet")
    s, _, _ = anon.request("GET", "/logg-inn?next=https://evil.example")
    check("/logg-inn med ekstern next gir fortsatt siden (next saneres ved innlogging)", s == 200, str(s))

    # ------------------------------------------------------------------ 3. per persona
    start("Innlogging per testperson")
    table = []
    for n in SEEDED:
        if n not in names:
            continue
        c = Client()
        email = f"qa-agent+{re.sub('[^a-z]', '', n.lower())}@example.test"
        s, body, h = login(c, names[n], email)
        ok = s == 200 and c.cookie("person_token") is not None
        check(f"{n}: innlogging gir 200 og person_token", ok, str(s))
        if not ok:
            continue
        check(f"{n}: person_token er httpOnly", "httponly" in (h.get("set-cookie") or "").lower())
        pages = {}
        for p in ["/", "/benefits", "/saved", "/profile", "/nearby"]:
            ps, phtml, _ = c.request("GET", p)
            pages[p] = ps
            if p == "/profile":
                check(f"{n}: profilsiden viser personen og e-posten", n in phtml and email in phtml and "Bytt person" in phtml)
        check(f"{n}: appens sider gir 200", all(v == 200 for v in pages.values()), str(pages))
        s, _, h = c.request("GET", "/flytting")
        check(f"{n}: /flytting går til første side", s == 307 and location_path(h).startswith("/flytting/"), f"{s} {location_path(h)}")
        _, app_n = benefit_count(c)
        flow_n = len(flow_lines(c, location_path(h))) if s == 307 else 0
        table.append((n, app_n, flow_n))
        s, _, _ = c.request("PATCH", "/api/session/profile", {"postcode": "0150"})
        check(f"{n}: profilen er skrivebeskyttet (403)", s == 403, str(s))
        c.request("POST", "/api/auth/logout")
        s, _, h = c.request("GET", "/")
        check(f"{n}: etter logout redirecter / til innlogging", s == 307 and location_path(h).startswith("/logg-inn"), str(s))
    if table:
        print("\n  Fordeler per testperson (viser at targeting følger personen):")
        print(f"  {'Person':<26}{'App /benefits':>15}{'Web-løp, 1. side':>18}")
        for n, a, f in table:
            print(f"  {n:<26}{a:>15}{f:>18}")

    # ------------------------------------------------------------------ 4. create + login new person
    start("Ny testperson")
    c = Client()
    uniq = time.strftime("%H%M%S")
    s, body, _ = c.request("POST", "/api/auth/test-persons", {"name": f"Test QA-Agent {uniq}", "postcode": "9008", "movingStatus": "recently_moved", "movedAt": "2026-10-01", "housingType": "enebolig"})
    check("oppretter testperson (201)", s == 201, str(s))
    new_id = None
    try:
        new_id = json.loads(body)["person"]["id"]
    except Exception:
        pass
    check("ugyldig testperson avvises (400)", c.request("POST", "/api/auth/test-persons", {"name": "", "movingStatus": "unknown"})[0] == 400)
    check("kan ikke sette isTest/seedKey fra klient (400)", c.request("POST", "/api/auth/test-persons", {"name": "T", "movingStatus": "unknown", "isTest": False})[0] == 400)
    if new_id:
        check("ugyldig e-post avvises (400)", login(c, new_id, "ikke-epost")[0] == 400)
        check("ukjent person gir 404", login(c, "00000000-0000-4000-8000-000000000000", "a@example.test")[0] == 404)
        s, _, _ = login(c, new_id, f"qa-agent+{uniq}@example.test")
        check("ny testperson kan logge inn", s == 200, str(s))
        _, plist, _ = c.request("GET", "/profile")
        check("profilen viser den nye personen", f"Test QA-Agent {uniq}" in plist)

    # ------------------------------------------------------------------ 5. order flow
    start("Bestilling i web-løpet")
    if "--no-order" in args or "Test Nylig-Flyttet" not in names:
        skipped.append("Bestilling (--no-order eller seed mangler)")
        print("  (hoppet over)")
    else:
        c = Client()
        login(c, names["Test Nylig-Flyttet"], "qa-agent+order@example.test")
        s, _, h = c.request("GET", "/flytting")
        lines = flow_lines(c, location_path(h))
        check("fant minst én fordel med produkt i løpet", len(lines) >= 1, f"{len(lines)} linjer")
        if lines:
            sub = str(uuid.uuid4())
            order = {
                "submissionId": sub,
                "name": "Test QA-Agent",
                "email": "qa-agent+order@example.test",
                "postcode": "0150",
                "consentShare": True,
                "consentEmail": False,
                "consentMail": False,
                "consentSms": False,
                "lines": [{"benefitId": lines[0][0], "productId": lines[0][1]}],
            }
            s1, b1, _ = c.request("POST", "/api/flow/order", order)
            check("bestilling gir 201 og orderId", s1 == 201 and "orderId" in b1, f"{s1} {b1[:120]}")
            s2, b2, _ = c.request("POST", "/api/flow/order", order)
            same = False
            try:
                same = json.loads(b1)["orderId"] == json.loads(b2)["orderId"]
            except Exception:
                pass
            check("samme submissionId gir 200 og samme orderId (idempotent)", s2 == 200 and same, f"{s2}")
            bad = dict(order, submissionId=str(uuid.uuid4()), consentShare=False)
            check("manglende samtykke avvises (400)", c.request("POST", "/api/flow/order", bad)[0] == 400)
            bogus = dict(order, submissionId=str(uuid.uuid4()), lines=[{"benefitId": str(uuid.uuid4()), "productId": str(uuid.uuid4())}])
            sb, bb, _ = c.request("POST", "/api/flow/order", bogus)
            check("ugyldig linje avvises (400)", sb == 400, f"{sb} {bb[:100]}")
            s, shtml, _ = c.request("GET", "/flytting/oppsummering")
            check("oppsummeringen er forhåndsutfylt med personen", s == 200 and "Test Nylig-Flyttet" in shtml and "qa-agent+order@example.test" in shtml)
            s, _, _ = c.request("GET", "/flytting/bekreftelse")
            check("bekreftelsessiden gir 200", s == 200, str(s))

    # ------------------------------------------------------------------ 5b. selection (CR-029)
    start("Utvelgelse (CR-029): regler per testperson og kryssalg")
    seeded_ok = all(n in names for n in EXPECTED_DEMO)
    probe = Client()
    if seeded_ok:
        login(probe, names["Test Nylig-Flyttet"], "qa-agent+utvalg-probe@example.test")
    has_demo = seeded_ok and bool(app_slugs(probe, DEMO_PREFIX))
    if not has_demo:
        skipped.append("Utvelgelse (kjør npm run db:seed-persons og npm run db:seed-selection, og deploy CR-029)")
        print("  (hoppet over, demo-fordeler for utvalg finnes ikke ennå)")
    else:
        for n, expected in EXPECTED_DEMO.items():
            c = Client()
            login(c, names[n], f"qa-agent+utvalg-{re.sub('[^a-z]', '', n.lower())}@example.test")
            want = {DEMO_PREFIX + k for k in expected}
            got_app = app_slugs(c, DEMO_PREFIX)
            check(f"{n}: appens liste har riktig utvalg", got_app == want, f"fikk {sorted(got_app)} forventet {sorted(want)}")
            s, _, h = c.request("GET", "/flytting")
            got_flow = {k for k in flow_cards(c, location_path(h)) if k.startswith(DEMO_PREFIX)} if s == 307 else set()
            check(f"{n}: web-løpet har riktig utvalg (samme som appen)", got_flow == want, f"fikk {sorted(got_flow)}")

        # Cross-sell with fresh people (no earlier orders), so the run can be repeated. Creates orders.
        stamp = time.strftime("%H%M%S")
        p1 = Client()
        s, body, _ = p1.request("POST", "/api/auth/test-persons", {"name": f"Test QA-Utvalg {stamp}", "movingStatus": "unknown"})
        pid = json.loads(body)["person"]["id"] if s == 201 else None
        check("oppretter en ny testperson uten data for kryssalg-testen", pid is not None, str(s))
        if pid:
            email = f"qa-agent+utvalg-{stamp}@example.test"
            login(p1, pid, email)
            check("ny person uten data ser bare grunnpakken i appen", app_slugs(p1, DEMO_PREFIX) == {DEMO_PREFIX + "grunn"}, str(sorted(app_slugs(p1, DEMO_PREFIX))))
            s, _, h = p1.request("GET", "/flytting")
            cards = flow_cards(p1, location_path(h))
            g, k = cards.get(DEMO_PREFIX + "grunn"), cards.get(DEMO_PREFIX + "kryssalg")
            check("web-løpet viser grunnpakken men ikke kryssalget før noe er valgt", g is not None and k is None, f"{sorted(x for x in cards if x.startswith(DEMO_PREFIX))}")

            if "--no-order" in args:
                skipped.append("Kryssalg-bestillinger (--no-order)")
            elif g is not None:
                s, b, _ = p1.request("POST", "/api/flow/order", order_payload(g[0], g[1], email))
                check("bestiller grunnpakken (201)", s == 201, f"{s} {b[:100]}")
                after = app_slugs(p1, DEMO_PREFIX)
                check("etter bestilling er grunnpakken skjult i appen (hideIfChosen)", DEMO_PREFIX + "grunn" not in after, str(sorted(after)))
                check("etter bestilling vises kryssalget i appen (requiresChosen)", DEMO_PREFIX + "kryssalg" in after, str(sorted(after)))
                s, _, h = p1.request("GET", "/flytting")
                cards2 = flow_cards(p1, location_path(h))
                check("etter bestilling er grunnpakken borte og kryssalget med i web-løpet", DEMO_PREFIX + "grunn" not in cards2 and DEMO_PREFIX + "kryssalg" in cards2, f"{sorted(x for x in cards2 if x.startswith(DEMO_PREFIX))}")
                k2 = cards2.get(DEMO_PREFIX + "kryssalg")
                if k2:
                    s, b, _ = p1.request("POST", "/api/flow/order", order_payload(k2[0], k2[1], email))
                    check("kan bestille kryssalget etter grunnpakken (valideringen kjenner tidligere valg)", s == 201, f"{s} {b[:100]}")
                    # Someone who never chose grunn must not be able to order the cross-sell card.
                    p3 = Client()
                    s3, b3, _ = p3.request("POST", "/api/auth/test-persons", {"name": f"Test QA-Utvalg3 {stamp}", "movingStatus": "unknown"})
                    if s3 == 201:
                        login(p3, json.loads(b3)["person"]["id"], f"qa-agent+utvalg3-{stamp}@example.test")
                        s, b, _ = p3.request("POST", "/api/flow/order", order_payload(k2[0], k2[1], f"qa-agent+utvalg3-{stamp}@example.test"))
                        check("uten å ha valgt grunnpakken avvises bestilling av kryssalget (400)", s == 400, f"{s} {b[:100]}")

        # Day boundaries of "første 60 dager" (0..60 inclusive, UTC days) with fresh people (no orders).
        import datetime as _dt
        today = _dt.datetime.now(_dt.timezone.utc).date()
        for days, want in [(-1, False), (0, True), (60, True), (61, False)]:
            pc = Client()
            s, b, _ = pc.request("POST", "/api/auth/test-persons", {"name": f"Test QA-Dager {days} {stamp}", "movingStatus": "unknown", "movedAt": (today - _dt.timedelta(days=days)).isoformat()})
            if s == 201:
                login(pc, json.loads(b)["person"]["id"], f"qa-agent+dager-{stamp}@example.test")
                got = (DEMO_PREFIX + "forste-60") in app_slugs(pc, DEMO_PREFIX)
                check(f"{days} dager siden flytting: forste-60 {'vises' if want else 'skjules'}", got == want, str(got))
        # Documented limitation: targeting hides from lists, not from the detail page.
        s, _, _ = probe.request("GET", f"/benefits/{DEMO_PREFIX}etter-180")
        check("skjult fordel er fortsatt tilgjengelig på detaljsiden (kjent begrensning)", s == 200, str(s))

    # ------------------------------------------------------------------ 6. token / role security
    start("Token og roller")
    if "Test Nylig-Flyttet" in names:
        c = Client()
        login(c, names["Test Nylig-Flyttet"], "qa-agent+sec@example.test")
        pt = c.cookie("person_token")
        s, _, h = anon.request("GET", "/admin/benefits", headers={"cookie": f"admin_token={pt}"})
        check("persontoken som admin_token gir IKKE admin", s == 307 and location_path(h) == "/admin/login", f"{s} {location_path(h)}")
        s, _, h = c.request("GET", "/admin/benefits")
        check("person-cookie alene gir IKKE admin", s == 307 and location_path(h) == "/admin/login", f"{s}")
        s, _, _ = c.request("PUT", "/api/admin/benefits/00000000-0000-4000-8000-000000000000/views/app_card", {})
        check("admin-API med person-cookie gir 401", s == 401, str(s))
        s, _, _ = anon.request("POST", "/api/track", {"eventType": "code_copied"}, headers={"x-person-id": names["Test Nylig-Flyttet"]})
        check("forfalsket x-person-id uten innlogging gir 401", s == 401, str(s))
        s, _, _ = anon.request("GET", "/", headers={"cookie": "person_token=ikke-en-jwt"})
        check("ugyldig person_token slipper ikke inn", s == 307, str(s))
    else:
        skipped.append("Token og roller (seed mangler)")

    # ------------------------------------------------------------------ 6b. CR-028 utforskende regresjon
    start("CR-028 grensetilfeller")
    for raw, want in [("https://evil.example", "/"), ("//evil.example", "/"), ("/\\evil.example", "/"), ("/api/track", "/"), ("/benefits", "/benefits")]:
        _, nh, _ = anon.request("GET", "/logg-inn?next=" + urllib.parse.quote(raw, safe=""))
        got = re.findall(r'\\"next\\":\\"(.*?)\\"[,}]', nh)
        check(f"next={raw} saneres til {want}", got[:1] == [want], str(got[:1]))
    if "Test Nylig-Flyttet" in names and "Test Nord-Norge" in names:
        c = Client()
        login(c, names["Test Nylig-Flyttet"], "qa-agent+edge@example.test")
        tok = c.cookie("person_token") or ""
        parts = tok.split(".")
        if len(parts) == 3:
            for label, cookie in [("tom", "person_token="), ("manipulert signatur", f"person_token={parts[0]}.{parts[1]}.{parts[2][:-3]}AAA"), ("alg none", "person_token=eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0." + parts[1] + ".")]:
                s, _, _ = anon.request("GET", "/profile", headers={"cookie": cookie})
                check(f"person_token {label} slipper ikke inn", s == 307, str(s))
        _, prof, _ = c.request("GET", "/profile", headers={"x-person-id": names["Test Nord-Norge"]})
        check("x-person-id med gyldig innlogging endrer ikke hvem man er", "Test Nylig-Flyttet" in prof and "Test Nord-Norge" not in prof)
        s, _, _ = c.request("POST", "/api/auth/login", {"personId": names["Test Nylig-Flyttet"], "email": "a@example.test", "isTest": False})
        check("login avviser ekstra felt (400)", s == 400, str(s))
        _, b0, _ = c.request("GET", "/benefits")
        n_nylig = len(set(re.findall(r'href="/benefits/([a-z0-9-]+)"', b0)))
        c2 = Client()
        login(c2, names["Test Nord-Norge"], "qa-agent+edge2@example.test")
        _, b1, _ = c2.request("GET", "/benefits")
        n_nord = len(set(re.findall(r'href="/benefits/([a-z0-9-]+)"', b1)))
        check("postnummer 0150 gir flere fordeler enn 9008 (lokal targeting)", n_nylig > n_nord, f"{n_nylig} vs {n_nord}")
    cp = Client()
    s, b, _ = cp.request("POST", "/api/auth/test-persons", {"name": "Test QA-Valid", "movingStatus": "recently_moved", "movedAt": "2026-02-31"})
    check("ugyldig kalenderdato (2026-02-31) avvises, rulles ikke over til 2026-03-03", s == 400, f"{s} {b[:90]}")
    s, b, _ = cp.request("POST", "/api/auth/test-persons", {"name": "Test QA-Valid", "movingStatus": "unknown", "postcode": "abcd"})
    check("ugyldig postnummer avvises (400)", s == 400, str(s))
    s, b, _ = cp.request("POST", "/api/auth/test-persons", {"name": "x" * 500, "movingStatus": "unknown"})
    check("for langt navn avvises (400)", s == 400, str(s))

    # ------------------------------------------------------------------ 7. admin
    start("Admin (egen innlogging)")
    email, password = os.environ.get("QA_ADMIN_EMAIL"), os.environ.get("QA_ADMIN_PASSWORD")
    if "--no-admin" in args or not (email and password):
        skipped.append("Admin (QA_ADMIN_EMAIL/QA_ADMIN_PASSWORD ikke satt)")
        print("  (hoppet over, ingen admin-innlogging konfigurert)")
    else:
        a = Client()
        s, _, h = a.request("POST", "/api/admin/auth/login", {"email": email, "password": password})
        ok = s == 200 and a.cookie("admin_token") is not None
        check("admin-innlogging gir 200 og admin_token", ok, str(s))
        if ok:
            for p in ["/admin", "/admin/benefits", "/admin/flow-pages", "/admin/leads", "/admin/advertisers", "/admin/categories", "/admin/heroes", "/admin/analytics", "/admin/profitability", "/admin/codes", "/admin/settings"]:
                s, _, h = a.request("GET", p)
                check(f"GET {p} gir 200 (eller 404 hvis siden ikke finnes)", s in (200, 404), f"{s} {location_path(h)}")
            s, _, h = a.request("GET", "/benefits")
            check("admin-token alene gir IKKE forbrukerappen (krever person-innlogging)", s == 307 and location_path(h).startswith("/logg-inn"), str(s))
            s, _, _ = a.request("PUT", "/api/admin/benefits/00000000-0000-4000-8000-000000000000/views/app_card", {})
            check("admin-API med admin-cookie slipper forbi auth (404 ukjent fordel)", s == 404, str(s))

    # ------------------------------------------------------------------ summary
    failed = [r for r in results if not r[2]]
    print(f"\n{'=' * 60}\nResultat: {len(results) - len(failed)} av {len(results)} sjekker bestått mot {BASE}")
    for s, n, _, d in failed:
        print(f"  FEILET [{s}] {n}" + (f"  ({d})" if d else ""))
    for sk in skipped:
        print(f"  Hoppet over: {sk}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

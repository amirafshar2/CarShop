# SiteKit – Website-Baukasten mit Einrichtungs-Assistent (Vibe-Coding-Projekt)

> 🇮🇷 Persische Version: [README.fa.md](README.fa.md)

<p>
  <img alt=".NET 9" src="https://img.shields.io/badge/.NET-9.0-512BD4?logo=dotnet&logoColor=white">
  <img alt="ASP.NET Core" src="https://img.shields.io/badge/ASP.NET%20Core-Web%20API-512BD4?logo=dotnet&logoColor=white">
  <img alt="EF Core" src="https://img.shields.io/badge/EF%20Core-SQLite%20%7C%20SQL%20Server-6DB33F">
  <img alt="Next.js 15" src="https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-1%20Container-2496ED?logo=docker&logoColor=white">
  <img alt="Tests" src="https://img.shields.io/badge/Tests-64%20gr%C3%BCn-2ea44f">
</p>

## 💡 Über dieses Projekt

Eine **Idee, die ich aus Neugier umgesetzt habe**, wieder per **Vibe Coding mit Claude**.
Dieses Repository hieß zuerst **CarShop** – eine Website für genau eine Branche (Autohaus). Daraus ist SiteKit geworden: Ich wollte wissen,
ob man daraus eine **Vorlage** machen kann, bei der **alles im Admin-Panel änderbar** ist – Name, Logo, Farben, Texte, Menü, Felder, Inhalte –
und die beim ersten Öffnen einen **Assistenten** zeigt, der Schritt für Schritt erklärt, was man eintragen muss, bis die Seite fertig ist.

Dieselbe Installation kann ein Autohaus, ein Reisebüro, ein Shop oder ein Salon werden. Jede Installation ist unabhängig
(eigener Container, eigene Datenbank) und startet wahlweise **leer**, **mit Beispielinhalt** oder **mit einem exportierten Inhaltspaket**.

Ich habe Ideen, Anforderungen und Entscheidungen vorgegeben und alles getestet; Claude hat Code, Tests und Dokumentation mitgeschrieben.

## ✨ Funktionen

- **4 Branchen-Vorlagen:** Autohaus, Reisebüro, Shop, Dienstleistung/Salon – jeweils mit passenden Bezeichnungen („Tour“, „Fahrzeug“ …), Feldern (Ziel, Dauer, Hotel / Baujahr, km …), Kategorien und Menü.
- **Alles im Panel änderbar:** Name, Logo-Upload, Hauptfarbe, Hell/Dunkel, Ecken, Startseite (Hero mit Bild oder Video, Vorteile, Über uns, Zahlen, FAQ, CTA), Kontakt, Menü, aktive Seiten, Footer, SEO, eigene Felder und Filter.
- **Einrichtungs-Assistent in 8 Schritten:** Branche → Name & Logo → Aussehen (mit Live-Vorschau) → Kontakt → Startseite → erster Eintrag → Leistungen → Veröffentlichen. Jeder Schritt erklärt *warum* und gibt Tipps; ein schwebender **„Hilfe“-Knopf** zeigt überall die Checkliste.
- **Unveröffentlicht = „Demnächst“-Seite** für Besucher; Admin/Mitarbeiter sehen die echte Seite mit Vorschau-Leiste.
- **Inhaltspaket:** Alles (Einstellungen, Einträge, Leistungen) als JSON exportieren und in eine andere Installation importieren; „Von vorne beginnen“ leer oder mit Beispielinhalt.
- **Erster Admin per Setup-Key:** Eine frische Seite hat keinen Admin; wer den Key kennt, wird auf `/setup` Admin. Später dient der Key auch als Admin-Login, solange kein SMS-Panel angebunden ist.
- Allgemeine Einträge mit Bildern, Preisen (fest / „ab“ / auf Anfrage, Streichpreis), Status (Entwurf, veröffentlicht, versteckt, ausverkauft), Filter & Suche; Leistungen mit Preisliste; Anfragen (Leads); Benutzer & Rollen; Login per SMS-Code.

## 📸 Screenshots

| Assistent: Branche wählen | Einstellungen: Aussehen mit Vorschau |
|---|---|
| ![Assistent](docs/screenshots/wizard.jpg) | ![Aussehen](docs/screenshots/look.jpg) |
| **Eigene Felder & Kategorien** | **Veröffentlichen, Export/Import, Neustart** |
| ![Felder](docs/screenshots/catalog.jpg) | ![Veröffentlichen](docs/screenshots/publish.jpg) |
| **Beispiel: Vorlage „Autohaus“ mit Beispielinhalt** | **Ergebnis des Assistenten: „Reisebüro“** |
| ![Autohaus](docs/screenshots/home.jpg) | ![Reisebüro](docs/screenshots/result-travel.jpg) |
| **Liste mit Filtern aus eigenen Feldern** | **Admin-Dashboard mit Fortschritt** |
| ![Liste](docs/screenshots/items.jpg) | ![Dashboard](docs/screenshots/dashboard.jpg) |

**Erster Start auf dem Handy – von leer bis online:**

<p>
  <img src="docs/screenshots/mobile-coming-soon.jpg" width="150" alt="Demnächst">
  <img src="docs/screenshots/mobile-setup.jpg" width="150" alt="Admin anlegen">
  <img src="docs/screenshots/mobile-wizard-type.jpg" width="150" alt="Branche">
  <img src="docs/screenshots/mobile-wizard-brand.jpg" width="150" alt="Name und Logo">
  <img src="docs/screenshots/mobile-wizard-item.jpg" width="150" alt="Erster Eintrag">
  <img src="docs/screenshots/mobile-result.jpg" width="150" alt="Fertige Seite">
</p>

## 🧭 Ablauf beim ersten Start

```mermaid
flowchart LR
    A["Container startet<br/>Seed__Mode"] -->|blank| B["Leere Seite<br/>„Demnächst“"]
    A -->|demo| D["Beispielinhalt<br/>veröffentlicht"]
    A -->|content| C["Inhaltspaket<br/>importiert"]
    B --> E["/setup<br/>Handy + Setup-Key → Admin"]
    C --> E
    E --> F["Assistent<br/>8 Schritte"]
    F --> G["Veröffentlichen"]
    D -.->|„Von vorne beginnen“| B
```

## 🏗️ Architektur

```mermaid
flowchart TB
    subgraph Container["1 Docker-Container pro Website"]
        direction TB
        WEB["Next.js 15 (RTL)<br/>liest /api/v1/site → Farben, Logo, Menü, Texte"]
        API["ASP.NET Core 9 API"]
        subgraph Clean["Clean Architecture"]
            DOM["Domain<br/>Listing · Service · Lead · SiteSettings"]
            APP["Application<br/>SiteContent (JSON) · Presets · Regeln"]
            INF["Infrastructure<br/>EF Core · Identity · SMS"]
        end
        DATA[("/app/data<br/>SQLite + Uploads")]
        WEB -- "/api/* (gleicher Origin)" --> API
        API --> APP --> DOM
        API --> INF --> DATA
    end
    Browser((Browser)) --> WEB
```

**Warum ein JSON-Dokument für die Einstellungen?** Alle Texte, Farben, Menüpunkte und Felddefinitionen liegen in *einer* Zeile (`SiteSettings.ContentJson`).
Neue Optionen brauchen keine Migration, und Export/Import ist trivial. Branchenspezifische Werte eines Eintrags (z. B. `destination`, `km`) liegen ebenfalls als JSON am Eintrag;
die Liste wird gecacht und im Speicher gefiltert – für den Katalog eines kleinen Unternehmens schnell genug und unabhängig vom Datenbank-Anbieter.

## 🧩 Technologien

| Bereich | Technologie | Wofür |
|---|---|---|
| Backend | **ASP.NET Core 9**, C# 13 | REST-API (`/api/v1`), ProblemDetails, FluentValidation |
| Architektur | **Clean Architecture** | Domain · Application · Infrastructure · Api |
| Daten | **EF Core 9**, SQLite (Standard), SQL Server optional | Optimistic Concurrency (Version-Token), Soft Delete, Audit-Log |
| Cache | **HybridCache** mit Tags | Seite, Einträge, Leistungen; Invalidierung bei jeder Änderung |
| Auth | ASP.NET Identity, **JWT** + HttpOnly-Refresh-Cookie mit Rotation | SMS-Code (OTP, als HMAC gespeichert), Setup-Key für den ersten Admin |
| Uploads | eigene Ablage in `/app/data/uploads` | Prüfung per Magic Bytes (JPG/PNG/WEBP/GIF/MP4), kein SVG/HTML, zufällige Namen |
| Frontend | **Next.js 15** (App Router), **React 19**, TypeScript, **Tailwind v4** | Theme per CSS-Variablen aus den Einstellungen, Vazirmatn-Schrift, RTL |
| UI | Komponenten von **21st.dev** (Navbar, Footer, Sidebar, CTA, Pricing Card …) + eigene Formular-Bausteine | siehe [docs/21st-components.md](docs/21st-components.md) |
| Tests | **xUnit**, WebApplicationFactory, **Playwright** | 64 Tests (Unit + Integration), E2E des Assistenten |
| Deployment | **Docker** (ein Container: API + Website), docker-compose | eine Instanz pro Website mit eigenem Volume |

## 🚀 Starten

### Mit Visual Studio
`SiteKit.sln` öffnen → Profil **„SiteKit (سایت + API)“** → **F5**. Die API startet, `npm run dev` wird automatisch gestartet, der Browser öffnet sich.
In der Entwicklung startet die Seite mit Beispielinhalt (Vorlage „Autohaus“); auf der Login-Seite gibt es Ein-Klick-Logins für Admin und Mitarbeiter.

### Ohne Visual Studio
```bash
# API (http://localhost:5080)
dotnet run --project src/SiteKit.Api
# Website (http://localhost:3000)
cd web && cp .env.example .env.local && npm install && npm run dev
```
Andere Startart in der Entwicklung, z. B. leer als Reisebüro:
`Seed__Mode=blank Seed__Preset=travel ConnectionStrings__Default="Data Source=blank.db" dotnet run --project src/SiteKit.Api`

### Als Container (eine Website pro Instanz)
```bash
cp .env.example .env      # SETUP_KEY, JWT_SIGNING_KEY, OTP_HASH_KEY (≥ 32 Zeichen), SEED_MODE, SEED_PRESET
docker compose up -d --build
```

| `SEED_MODE` | Ergebnis beim ersten Start |
|---|---|
| `blank` | leere Seite, „Demnächst“, Assistent beim ersten Login (`/setup` mit Setup-Key) |
| `demo` | Beispielinhalt der gewählten Vorlage, veröffentlicht |
| `content` | Inhaltspaket aus `CONTENT_FILE` (exportiert aus einer anderen Installation), unveröffentlicht – mit `SEED_PUBLISH=true` sofort veröffentlicht (fertige Demo) |

Der Modus gilt nur für den allerersten Start (leere Datenbank); danach ändert man alles im Panel.

## 🔐 Sicherheit

- Links und Bild-URLs aus dem Panel: nur relativ, `https:`, `tel:`, `mailto:` – kein `javascript:` / `data:` / `//`.
- Uploads nur für Mitarbeiter, Typ-Erkennung über die ersten Bytes, Auslieferung mit festem Content-Type und `nosniff`.
- Rollen: Admin ändert Einstellungen, Preise und Benutzer; Mitarbeiter dürfen lesen und neue Einträge anlegen.
- Setup-Key wird zeitkonstant verglichen; nach dem ersten Admin kann niemand anderes die Seite übernehmen.
- Gleichzeitiges Bearbeiten: veraltete Formulare werden mit 409 abgelehnt statt still zu überschreiben.
- Keine Secrets im Code: alles über Umgebungsvariablen.

## 📁 Projektstruktur

```
src/
  SiteKit.Domain/          Listing, ServiceItem, Lead, SiteSettings, Preisregeln
  SiteKit.Application/     SiteContent + Validierung, Presets (4 Branchen), Listing-/Site-/Lead-Services
  SiteKit.Infrastructure/  EF Core, Identity, OTP/SMS, Seeder (blank/demo/content)
  SiteKit.Api/             Controller (Site, Listings, Services, Leads, Auth, Files, Admin)
tests/                     Unit- und Integrationstests
web/src/app/               Website (/, /items, /services, /contact) + Panel (/admin/…) + /setup
web/src/components/admin/  Assistent-Bausteine: Bild-Upload, Farbwahl, Listen-Editor, Abschnitte
```

## Credits
Beispielfotos: Unsplash-Lizenz, siehe [CREDITS.md](CREDITS.md). UI-Komponenten: [docs/21st-components.md](docs/21st-components.md).

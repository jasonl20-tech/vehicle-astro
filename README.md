# Astro + Contentful + Cloudflare Pages

Saubere Projektstruktur für Astro mit Contentful CMS und Cloudflare Pages.

## Struktur

```
src/
├── components/     # Wiederverwendbare UI-Komponenten
├── layouts/       # Seiten-Layouts
├── lib/           # Hilfsfunktionen, Contentful-Client
├── pages/         # Routen
│   ├── blog/      # Blog-Übersicht & Posts
│   └── [...slug].astro  # Dynamische Seiten aus Contentful
└── styles/        # Globale Styles
```

## Contentful Content Types

- **page**: `slug`, `title`, `body` (Rich Text)
- **blogPost**: `slug`, `title`, `body` (Rich Text), `publishedAt`

## Setup

1. `.env` aus `.env.example` erstellen
2. Contentful Space anlegen, API-Token holen
3. `npm run dev` — lokale Entwicklung

## Skripte

- `npm run dev` — Astro Dev-Server (http://localhost:4321)
- `npm run build` — Build für Cloudflare
- `npm run dev:cf` — Cloudflare Pages lokal testen

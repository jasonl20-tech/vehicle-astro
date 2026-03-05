# Contentful Blog-Stack – vollständige Anleitung

Vollständiger Stack für den Blog: **Blog Author**, **Blog Category**, **Blog Post** inkl. aller SEO-relevanten Felder, Referenzen und Nutzung im Frontend.

---

## Übersicht

| Content Type   | API-ID      | Zweck |
|----------------|-------------|--------|
| Blog Author    | `blogAuthor`  | Autor:innen mit Avatar, Bio, Social; Referenz in Blog Post; optional Autor-Seiten |
| Blog Category  | `blogCategory`| Kategorien (z.B. API, Product); Filterung `/blog?category=api` |
| Blog Post      | `blogPost`    | Artikel mit Body, Featured Image, Autor, Kategorie, vollem SEO-Set |

---

## Option A: Per Script (empfohlen)

1. **Management Token anlegen**  
   Contentful → **Settings** → **API keys** → **Content management tokens** → **Generate personal access token**.

2. **`.env` ergänzen**
   ```env
   CONTENTFUL_SPACE_ID=deine_space_id
   CONTENTFUL_ACCESS_TOKEN=dein_delivery_token
   CONTENTFUL_MANAGEMENT_TOKEN=dein_management_token
   ```

3. **Script ausführen**
   ```bash
   node scripts/create-blog-content-types.mjs
   ```
   Erstellt nacheinander `blogAuthor`, `blogCategory`, `blogPost`. Existierende Types werden übersprungen.

---

## Option B: Manuell in Contentful

Content Type jeweils über **Content model** → **Add content type** anlegen. **API Identifier** wie in der Tabelle (z.B. `blogAuthor`).

---

## 1. Blog Author (`blogAuthor`)

**Display field:** Name

| # | Name | API ID | Typ | Pflicht | Validierung / Hinweise |
|---|------|--------|-----|---------|------------------------|
| 1 | Name | `name` | Short text | ✅ | Max. 120 |
| 2 | Slug | `slug` | Short text | ✅ | Regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$` (für `/blog/author/jane-doe`) |
| 3 | Avatar | `avatar` | Media | Nein | 1 Asset |
| 4 | Short Bio | `shortBio` | Long text | Nein | |
| 5 | Website | `website` | Short text | Nein | URL |
| 6 | Twitter Handle | `twitter` | Short text | Nein | z.B. `vehicleimagery` |
| 7 | LinkedIn URL | `linkedIn` | Short text | Nein | URL |
| 8 | Meta Title (Autor-Seite) | `metaTitle` | Short text | Nein | SEO Autor-Seite |
| 9 | Meta Description (Autor-Seite) | `metaDescription` | Long text | Nein | Max. 160 Zeichen |

---

## 2. Blog Category (`blogCategory`)

**Display field:** Name

| # | Name | API ID | Typ | Pflicht | Validierung / Hinweise |
|---|------|--------|-----|---------|------------------------|
| 1 | Name | `name` | Short text | ✅ | Max. 80 |
| 2 | Slug | `slug` | Short text | ✅ | Regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$` (z.B. `api`, `product`) |
| 3 | Description | `description` | Long text | Nein | Für Kategorie-Seite |
| 4 | Meta Title (Kategorie-Seite) | `metaTitle` | Short text | Nein | SEO |
| 5 | Meta Description (Kategorie-Seite) | `metaDescription` | Long text | Nein | Max. 160 |

---

## 3. Blog Post (`blogPost`)

**Display field:** Title

| # | Name | API ID | Typ | Pflicht | Validierung / Hinweise |
|---|------|--------|-----|---------|------------------------|
| 1 | Title | `title` | Short text | ✅ | Max. 200 |
| 2 | Slug | `slug` | Short text | ✅ | Regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$` → URL `/blog/{slug}` |
| 3 | Excerpt | `excerpt` | Long text | Nein | Max. 320; Listen & Fallback für Meta Description |
| 4 | Body | `body` | Rich text | ✅ | Hauptinhalt, eingebettete Assets erlaubt |
| 5 | Featured Image | `featuredImage` | Media | Nein | 1 Asset; Fallback für OG Image |
| 6 | Featured Image Alt | `featuredImageAlt` | Short text | Nein | Alt-Text |
| 7 | Published At | `publishedAt` | Date and time | Nein | Sortierung & „Erscheinungsdatum“ |
| 8 | Author | `author` | Reference | Nein | **Link to entry** → Content type: **Blog Author** |
| 9 | Category | `category` | Reference | Nein | **Link to entry** → Content type: **Blog Category** |
| 10 | Tags | `tags` | Short text | Nein | **Allow multiple values** (z.B. API, Cars) |
| 11 | SEO Title | `seoTitle` | Short text | Nein | Max. 60; Override für `<title>` / og:title |
| 12 | SEO Description | `seoDescription` | Long text | Nein | Max. 160; Override für meta description / og:description |
| 13 | OG Image | `ogImage` | Media | Nein | 1 Asset; empfohlen 1200×630 px |
| 14 | OG Image Alt | `ogImageAlt` | Short text | Nein | Alt für Social Share |
| 15 | Canonical URL | `canonicalUrl` | Short text | Nein | Absolut-URL, falls Artikel woanders kanonisch ist |
| 16 | No Index | `noIndex` | Boolean | Nein | `true` = Draft; `<meta name="robots" content="noindex">` |
| 17 | Reading Time (minutes) | `readingTimeMinutes` | Integer | Nein | Optional; sonst im Frontend aus Body berechenbar |
| 18 | Related Posts | `relatedPosts` | Reference | Nein | **Allow multiple entries** → **Blog Post** |

**Referenzen in der UI:**  
Bei **Author** und **Category** unter „Validation“ den erlaubten Content Type auswählen (**Blog Author** bzw. **Blog Category**). Bei **Related Posts** den Typ **Blog Post** einschränken.

---

## SEO: Zuordnung Contentful → HTML / Meta

| Contentful-Feld (Blog Post) | Verwendung im Frontend |
|-----------------------------|------------------------|
| `seoTitle`                  | `<title>`, `og:title`, `twitter:title` (Fallback: `title`) |
| `seoDescription`            | `meta name="description"`, `og:description`, `twitter:description` (Fallback: `excerpt`) |
| `ogImage`                  | `og:image`, `twitter:image` (Fallback: `featuredImage`) |
| `ogImageAlt`                | `og:image:alt`, Barrierefreiheit |
| `canonicalUrl`              | `<link rel="canonical" href="…">` (Fallback: aktuelle Seiten-URL) |
| `noIndex`                   | Bei `true`: `<meta name="robots" content="noindex">` |

**Empfehlungen:**  
- OG Image: 1200×630 px, gleiches Seitenverhältnis für Twitter.  
- Meta Title: ca. 50–60 Zeichen.  
- Meta Description: ca. 150–160 Zeichen.

---

## JSON-LD (Schema.org Article)

Für Suchmaschinen und Rich Snippets im Frontend aus den gleichen Feldern ableiten:

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "<aus title oder seoTitle>",
  "description": "<aus seoDescription oder excerpt>",
  "image": "<aus ogImage oder featuredImage, absolute URL>",
  "datePublished": "<publishedAt ISO-8601>",
  "dateModified": "<sys.updatedAt oder publishedAt>",
  "author": {
    "@type": "Person",
    "name": "<author.fields.name>",
    "url": "<author.fields.website>"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Vehicle Imagery",
    "logo": { "@type": "ImageObject", "url": "<absolute URL zum Logo>" }
  }
}
```

`author` nur ausgeben, wenn `author` (Referenz) geladen ist; sonst weglassen oder nur `"name": "Vehicle Imagery"` nutzen.

---

## Abruf im Frontend (Delivery API)

- **Liste (Blog-Übersicht):**  
  `getEntries({ content_type: 'blogPost', order: '-fields.publishedAt', limit: 20 })`  
  Für Kategorie-Filter: `content_type: 'blogPost', 'fields.category.sys.id': categoryId` oder Slug über Resolve verknüpfter Eintrag.

- **Einzelpost (Detail):**  
  `getEntries({ content_type: 'blogPost', 'fields.slug': slug, include: 2 })`  
  `include: 2` lädt Autor, Kategorie und Assets (Featured Image, OG Image, Autor-Avatar) mit.

- **Autoren:**  
  `getEntries({ content_type: 'blogAuthor' })`  
  Für Autor-Seite: `getEntries({ content_type: 'blogAuthor', 'fields.slug': authorSlug })`.

- **Kategorien:**  
  `getEntries({ content_type: 'blogCategory' })`  
  Für Kategorie-Seite: Filter Blog Posts nach `category.sys.id` oder über Slug.

Beim **Build** alle relevanten Blog-Posts (und ggf. Autor-/Kategorie-Seiten) per `getStaticPaths` / `getEntries` laden; Inhalte sind statisch, SEO und OG werden serverseitig gerendert.

---

## Checkliste vor Go-Live (Blog SEO)

- [ ] Jeder Blog Post hat `slug`, `title`, `body`, `publishedAt`.
- [ ] `seoTitle` und `seoDescription` gesetzt (oder sinnvolle Fallbacks aus `title`/`excerpt`).
- [ ] OG Image gesetzt (oder Featured Image); 1200×630 empfohlen.
- [ ] Kein versehentliches `noIndex: true` bei veröffentlichten Artikeln.
- [ ] Canonical nur setzen, wenn der Artikel woanders kanonisch ist.
- [ ] Autor-Referenz und ggf. Kategorie gesetzt für bessere Snippets und Filterung.
- [ ] Im Frontend: JSON-LD Article einbinden; Meta-Tags und OG aus obiger Tabelle befüllen.

---

## Dateien im Projekt

| Datei | Zweck |
|-------|--------|
| `docs/contentful-blog-model.json` | Struktur der drei Content Types (Referenz / Import) |
| `docs/CONTENTFUL_BLOG_STACK.md` | Diese Anleitung |
| `scripts/create-blog-content-types.mjs` | Anlegen von blogAuthor, blogCategory, blogPost in Contentful |

Nach dem Anlegen der Types: Blog-Posts in Contentful anlegen, Frontend (z.B. `src/pages/blog/index.astro`, `src/pages/blog/[...slug].astro`) wie bisher mit `blogPost` und ggf. `include: 2` für Autor/Kategorie/Assets nutzen; SEO-Felder in Layout und Detail-Seite auslesen und in Meta/OG/JSON-LD mappen.

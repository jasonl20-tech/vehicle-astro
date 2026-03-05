# Contentful: Einziges Content Model „Blog Post“

Alles in **einem** Content Type. Kein Author- oder Category-Type nötig – Autor und Kategorie sind Felder im gleichen Eintrag.

---

## Option A: Per Script (empfohlen)

1. **Management Token:** Contentful → **Settings** → **API keys** → **Content management tokens** → **Generate personal access token**
2. **`.env`:** `CONTENTFUL_MANAGEMENT_TOKEN=dein_token` eintragen
3. Ausführen: **`npm run contentful:create-blog-post`**

Der Blog-Post-Content-Type wird automatisch angelegt.

---

## Option B: Manuell in Contentful

1. **Content model** → **Add content type**
2. **Name:** Blog Post  
3. **API Identifier:** blogPost
4. **Description:** Blog-Artikel in einem Content Type. Alle Felder inkl. Autor, SEO, OG.

---

## Felder (in dieser Reihenfolge)

Für jedes Feld: **Add field** → Typ wählen → **Create and configure**

### Inhalt

| # | Name | API ID | Typ | Pflicht | Hinweise |
|---|------|--------|-----|---------|----------|
| 1 | Title | `title` | Short text | ✅ | Max. 200 Zeichen |
| 2 | Slug | `slug` | Short text | ✅ | URL: `/blog/{slug}`. Regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| 3 | Subtitle | `subtitle` | Long text | Nein | Untertitel unter der Überschrift |
| 4 | Excerpt | `excerpt` | Rich text | Nein | Kurzfassung für Listen & Meta (im Frontend zu Plain Text für Meta) |
| 5 | Body | `body` | Rich text | Nein | Hauptinhalt, Bilder/Assets einbettbar |
| 6 | Featured Image | `featuredImage` | Media | Nein | 1 Asset |
| 7 | Featured Image Alt | `featuredImageAlt` | Short text | Nein | Alt-Text |
| 8 | Gallery | `gallery` | Media | Nein | **Mehrere** Assets (Allow multiple files) |
| 9 | Published At | `publishedAt` | Date and time | Nein | Sortierung & Anzeige „Datum“ |
| 10 | Category | `category` | Short text | Nein | Anzeigename, z.B. API, Product |
| 11 | Category Slug | `categorySlug` | Short text | Nein | Für Filter `/blog?category=api` |
| 12 | Tags | `tags` | Short text | Nein | **Allow multiple values** |

### Autor (alles in einem Eintrag)

| # | Name | API ID | Typ | Pflicht | Hinweise |
|---|------|--------|-----|---------|----------|
| 13 | Author Name | `authorName` | Short text | Nein | Anzeigename |
| 14 | Author Slug | `authorSlug` | Short text | Nein | Für `/blog/author/jane-doe` |
| 15 | Author Avatar | `authorAvatar` | Media | Nein | 1 Asset |
| 16 | Author Bio | `authorBio` | Rich text | Nein | Kurzbio (mit Formatierung) |
| 17 | Author Website | `authorWebsite` | Short text | Nein | URL |
| 18 | Author Twitter | `authorTwitter` | Short text | Nein | Handle ohne @ |
| 19 | Author LinkedIn | `authorLinkedIn` | Short text | Nein | URL |

### Zusatz & Verknüpfung

| # | Name | API ID | Typ | Pflicht | Hinweise |
|---|------|--------|-----|---------|----------|
| 20 | Reading Time (minutes) | `readingTimeMinutes` | Integer | Nein | Optional, sonst im Frontend berechnen |
| 21 | Related Post Slugs | `relatedPostSlugs` | Short text | Nein | **Allow multiple values** – Slugs anderer Posts |

### SEO

| # | Name | API ID | Typ | Pflicht | Hinweise |
|---|------|--------|-----|---------|----------|
| 22 | SEO Title | `seoTitle` | Short text | Nein | `<title>`, og:title. Max. 60. Fallback: Title |
| 23 | SEO Description | `seoDescription` | Rich text | Nein | Meta description, og:description (im Frontend zu Plain Text, max. 160). Fallback: Excerpt |
| 24 | OG Image | `ogImage` | Media | Nein | 1 Asset, 1200×630. Fallback: Featured Image |
| 25 | OG Image Alt | `ogImageAlt` | Short text | Nein | Alt für Social Share |
| 26 | Canonical URL | `canonicalUrl` | Short text | Nein | Absolut-URL, wenn Artikel woanders kanonisch |
| 27 | No Index | `noIndex` | Boolean | Nein | true = Draft, `<meta name="robots" content="noindex">` |
| 28 | Meta Keywords | `metaKeywords` | Short text | Nein | Optional, kommagetrennt |
| 29 | Twitter Card | `twitterCard` | Short text | Nein | z.B. summary_large_image (optional) |
| 30 | Facebook App ID | `fbAppId` | Short text | Nein | Optional für Facebook Insights |

---

## Slug-Validierung

Bei **Slug** → **Validations** → **Regex**: `^[a-z0-9]+(?:-[a-z0-9]+)*$`

---

## Gallery

**Type:** Media → **Allow multiple files** aktivieren.

---

## Tags & Related Post Slugs

**Type:** Short text → **Allow multiple values** aktivieren.

---

## Display Field

**Display field:** `title`

---

## SEO-Zuordnung (Frontend)

| Contentful-Feld | Verwendung |
|-----------------|------------|
| `seoTitle` | `<title>`, `og:title`, `twitter:title` (Fallback: `title`) |
| `seoDescription` | `meta name="description"`, `og:description` (Fallback: `excerpt`) |
| `ogImage` | `og:image`, `twitter:image` (Fallback: `featuredImage`) |
| `ogImageAlt` | `og:image:alt` |
| `canonicalUrl` | `<link rel="canonical">` (Fallback: aktuelle URL) |
| `noIndex` | Bei true: `<meta name="robots" content="noindex">` |
| `metaKeywords` | Optional: `<meta name="keywords">` |

---

## Fertig

Nach dem Speichern Blog-Posts anlegen. Die Website nutzt `content_type: 'blogPost'` und lädt alle Felder inkl. Assets mit `include: 2`.

# Contentful: Einziges Content Model „Changelog“

Alles in **einem** Content Type. Kein zweites Modell nötig.

---

## Option A: Per Script (empfohlen)

1. In Contentful: **Settings** → **API keys** → **Content management tokens** → **Generate personal access token**
2. In `.env` eintragen: `CONTENTFUL_MANAGEMENT_TOKEN=dein_token`
3. Ausführen: `npm run contentful:create-changelog`

Das Changelog-Modell wird automatisch angelegt.

---

## Option B: Manuell in Contentful

1. **Content model** → **Add content type**
2. **Name:** Changelog  
3. **API Identifier:** changelog (wird automatisch vorgeschlagen)
4. **Description:** Changelog-Einträge für die Vehicle Imagery Website

---

## Felder anlegen (in dieser Reihenfolge)

Für jedes Feld: **Add field** → Typ wählen → **Create and configure**

| # | Name | API ID | Typ | Pflicht | Hinweise |
|---|------|--------|-----|---------|----------|
| 1 | Title | `title` | Short text | ✅ | Max. 200 Zeichen |
| 2 | Slug | `slug` | Short text | ✅ | URL-Pfad, z.B. `bmw-x5-2024` |
| 3 | Body | `body` | Rich text | Nein | Hauptinhalt, Bilder einbettbar |
| 4 | Excerpt | `excerpt` | Long text | Nein | Kurzfassung |
| 5 | Featured Image | `featuredImage` | Media | Nein | 1 Asset |
| 6 | Featured Image Alt | `featuredImageAlt` | Short text | Nein | Alt-Text |
| 7 | Gallery | `gallery` | Media | Nein | **Mehrere** Assets |
| 8 | OG Image | `ogImage` | Media | Nein | 1 Asset, 1200×630 px |
| 9 | OG Image Alt | `ogImageAlt` | Short text | Nein | Alt für Social Share |
| 10 | Changes | `changesText` | Long text | Nein | Siehe Format unten |
| 11 | Version | `version` | Short text | Nein | z.B. v2.1.0 |
| 12 | Category | `category` | Short text | Nein | z.B. New Feature |
| 13 | Published Date | `publishedDate` | Date and time | Nein | |
| 14 | Author | `author` | Short text | Nein | |
| 15 | Tags | `tags` | Short text | Nein | **List** (mehrere Werte) |
| 16 | Meta Title | `metaTitle` | Short text | Nein | SEO |
| 17 | Meta Description | `metaDescription` | Long text | Nein | Max. 160 Zeichen |

---

## Slug-Validierung

Bei **Slug** → **Validations** → **Add validation** → **Predefined values** oder **Regex**:

- Regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- Oder: **Unique** aktivieren

---

## Gallery: mehrere Medien

Bei **Gallery**:

- **Type:** Media
- **Allow multiple files:** aktivieren

---

## Tags: Liste

Bei **Tags**:

- **Type:** Short text
- **Allow multiple values:** aktivieren

---

## Format für „Changes“ (changesText)

Eine Änderung pro Zeile. Format:

```
type: Titel
```

oder

```
type: Titel - Beschreibung
```

**Erlaubte types:** `added`, `fixed`, `changed`, `deprecated`, `removed`

**Beispiel:**

```
added: BMW X5 2024 Coverage
added: 3 interior views for all vehicles
fixed: API response format for large images
changed: Default image quality - Now 82% for better balance
```

---

## Display Field

**Display field:** `title` (für die Anzeige in der Contentful-UI)

---

## Fertig

Nach dem Speichern kannst du Changelog-Einträge anlegen. Die Website rendert alles automatisch.

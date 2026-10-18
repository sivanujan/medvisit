# MedVisit Page Builder — Phase 1 Design

**Date:** 2026-10-18
**Status:** Approved in conversation, awaiting written-spec review
**Scope:** Phase 1 of 4 (multi-page, rename, full Style/Advanced tabs with responsive values, global colors & fonts)

## Goal

Turn the existing single-page GrapesJS builder into a multi-page website builder for clinics with Elementor-level styling control, branded as **MedVisit Page Builder**. Ideas are drawn from studying how Elementor (GPLv3) structures its editor; no Elementor code, names, or assets are used.

## Current state (as of commit `4cf0bce`)

- Laravel + Inertia/React; builder at `resources/js/Pages/Website/PageBuilder.tsx` (~2,875 lines) on GrapesJS 0.23.
- One page only: `ClinicWebsiteController` hard-codes `slug = 'home'` in `showBuilder`, `saveBuilder`, `publishBuilder`, `listRevisions`, `renderPublicHome` and related methods.
- Table `clinic_pages` already stores draft (`html`, `css`, `content_json`) and published (`published_html`, `published_css`, `published_json`) copies, SEO fields, and `theme_preset`. Revisions (`clinic_page_revisions`) are keyed by `page_id`.
- Header/footer config lives on the tenant (`website_header`, `website_footer`); theme on `website_theme`.
- GrapesJS Style Manager, Selector Manager, and Layer Manager are mounted into containers but nearly unused; the Style tab exposes only color and text-align buttons.
- Device breakpoints: Tablet ≤ 992px, Mobile ≤ 480px.

## Decisions

| Topic | Decision |
|---|---|
| Engine | Keep GrapesJS; expose its managers through custom React UI |
| Page URLs | `/p/{slug}`; homepage stays at `/` |
| Publishing | Per page (each page has its own draft/published state) |
| Fonts | Curated Google Fonts list incl. Noto Sans Sinhala and Noto Sans Tamil; no uploads in Phase 1 |
| Branding | "MedVisit Page Builder"; remove all "Elementor" wording |

## 1. Pages: data, URLs, admin actions

### Database

Migration adding to `clinic_pages`:

- `is_homepage` boolean, default `false`. Exactly one per tenant (enforced in application logic inside a transaction). Data migration sets `is_homepage = true` on each tenant's existing `home` row.
- `sort_order` unsigned integer, default `0`.
- `deleted_at` (soft deletes). The existing unique index `(tenant_id, slug)` stays; restoring a page whose slug was reused fails validation with a clear message.

"Unpublished changes" is derived: `is_published && updated_at > published_at` (draft saves must not touch `published_at`).

### Slug rules

- Pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 60 chars, unique per tenant (including soft-deleted rows).
- Auto-generated from title (lowercase, non-alphanumerics → `-`, collapse/trim dashes); user-editable. Shared slugify logic exists in PHP (validation/authoritative) and TS (live preview).

### Public routes (tenant subdomain)

- `GET /` → published homepage (unchanged behavior).
- `GET /p/{slug}` → published page; 404 if not published or soft-deleted.
- `GET /p/{homepage-slug}` → 301 redirect to `/`.
- `GET /preview/p/{slug}` → draft preview, authenticated clinic staff only (same guard as existing `/preview`). Existing `/preview` keeps previewing the homepage.

### Admin routes (inside the existing authenticated tenant group)

| Method & path | Action |
|---|---|
| `GET /website/pages` | List pages (JSON) |
| `POST /website/pages` | Create (title, slug, `source`: `blank` / `copy:{pageId}` / `template:{key}`) |
| `POST /website/pages/{page}/duplicate` | Duplicate as draft, slug `{slug}-copy[-n]` |
| `PATCH /website/pages/{page}` | Update title, slug, SEO title/description, sort order |
| `DELETE /website/pages/{page}` | Soft delete (rejected for the homepage) |
| `POST /website/pages/{page}/restore` | Restore from trash |
| `POST /website/pages/{page}/homepage` | Make homepage (clears previous flag) |
| `GET /website/builder/{page?}` | Open builder; no page → homepage |
| `POST /website/builder/{page}/save` | Save draft + revision |
| `POST /website/builder/{page}/publish` | Publish this page only |
| `GET /website/builder/{page}/revisions` | List this page's revisions |
| `POST /website/builder/{page}/revert/{revision}` | Revert (revision must belong to page) |

Every `{page}` / `{revision}` binding is checked against the current tenant, following the existing pattern for revisions and media assets (403/404 on mismatch). Old unparameterized builder routes are removed; `GET /website/builder` resolves to the homepage so bookmarks keep working.

### Menus

Header/footer `menu_items` entries gain an optional `page_id`. The menu editor offers "Link to page" (dropdown) or "Custom URL". At render time, page links resolve to `/` (homepage) or `/p/{slug}`; links to unpublished or deleted pages are omitted on public pages. Existing items without `page_id` behave as custom URLs.

## 2. Builder UI

### Rename and main menu

- `resources/js/Layouts/AuthenticatedLayout.tsx`: add sidebar item **MedVisit Page Builder** (links to the page list on `/website`), alongside "Clinic Website".
- Replace the four "Elementor" references (`Website/Index.tsx` lines ~191, ~229, ~237; `PageBuilder.tsx` comment ~1365; controller docblock ~210). Header button → "MedVisit Page Builder"; banner → "MedVisit Page Builder — design your clinic website…".

### Page list (`Website/Index.tsx`)

The "Launch Visual Builder" banner becomes a **Pages** table:

- Columns: title, URL, status badge (Draft / Published / Unpublished changes), homepage ★, last edited.
- Row actions: Edit in builder, View live, Duplicate, Settings, Set as homepage, Delete.
- "+ New page" dialog: title, auto slug (editable, live validation), starting point (Blank / Copy of page / starter template from the existing `getTemplateHtml` set).
- "Trash" view to restore deleted pages.

### Builder

- **Page switcher:** clinic name in the top bar becomes a dropdown of pages with status dots plus "+ New page". Switching with unsaved changes prompts *Save draft / Discard / Cancel*. Switching navigates to `/website/builder/{page}` (full Inertia visit; editor is re-initialized).
- **Page settings:** clicking the "⚙ Page" label above the canvas opens title, slug, SEO title, meta description, and "Set as homepage" in the right panel.
- Save Draft / Publish Live / History / Preview act on the current page; Preview opens `/preview/p/{slug}` (or `/preview` for the homepage).

### Refactor (first, behavior-preserving)

Split `PageBuilder.tsx` into `resources/js/Components/PageBuilder/`:

- `TopBar.tsx`, `PageSwitcher.tsx`
- `LeftPanel/` — `WidgetsTab.tsx`, `LayersTab.tsx`, `HeaderTab.tsx`, `FooterTab.tsx`, `SiteSettingsTab.tsx` (new)
- `Inspector/` — `ContentTab.tsx`, `StyleTab.tsx`, `AdvancedTab.tsx`, `PageSettings.tsx`
- `blocks/registerBlocks.ts` (block definitions moved verbatim)
- `lib/` — pure helpers (slugify, responsive resolution, kit → CSS, font URL)

`Pages/Website/PageBuilder.tsx` remains the page entry and wires editor state into these components. The existing `MediaLibraryModal.tsx` is reused.

## 3. Style & Advanced tabs

### Mechanism

Custom React controls read and write through the GrapesJS Style Manager API on the selected target, so the active device and state are applied automatically, undo/redo and dirty-tracking keep working, and rules are scoped to the component ID (configure `selectorManager.componentFirst` so ID rules are used rather than shared classes).

### Responsive behavior

- Each responsive control shows a device icon; clicking it switches the canvas device.
- Inheritance: Mobile → Tablet → Desktop. Inherited values render as grey placeholders; overridden values are bold with a ↺ reset that removes the property from that device's rule.
- Normal / Hover state toggle for color, background, border, and shadow groups (GrapesJS `:hover` state).

### Style tab (collapsible groups, shown only when applicable)

- **Typography:** family (global fonts + curated list), size (px/rem/em/vw), weight, line-height, letter-spacing, transform, style, decoration.
- **Color & alignment:** text color (global swatches or custom), text-align.
- **Background:** none / color / linear gradient (2 stops + angle) / image (media library; position, size, repeat) + optional overlay color.
- **Border:** style, width per side, color, radius per corner.
- **Shadows:** box-shadow, text-shadow.
- **Size:** width, max-width, height, min-height.
- **Layout** (sections/columns): flex direction, justify, align, gap, wrap.

### Advanced tab

- **Spacing:** margin and padding per side with link toggle.
- **CSS ID & classes.**
- **Responsive visibility:** hide on Desktop/Tablet/Mobile → `display:none` in that device's rule; hidden elements render at reduced opacity in the editor only (editor-only canvas style).
- **Entrance animation:** fade-in, slide-up/left/right, zoom-in; duration and delay. Stored as `data-mv-animation`, `data-mv-duration`, `data-mv-delay` attributes. Public pages include a small IntersectionObserver script and keyframes; `prefers-reduced-motion: reduce` disables animations.
- **Sticky:** `position: sticky` with top offset; position and z-index controls.
- **Custom CSS:** per element; the keyword `selector` is replaced with the component's ID selector. Server-side sanitization on save/publish strips `</style`, `<script`, `@import`, `expression(`, and `javascript:`; rejected content is removed, not executed.

The existing Content tab is unchanged.

## 4. Global colors & fonts (site kit)

### Storage

New JSON column `website_kit` on `tenants` (alongside `website_header` / `website_footer`):

```json
{
  "colors": [
    { "id": "primary", "name": "Primary", "value": "#0E9E8F" },
    { "id": "secondary", "name": "Secondary", "value": "#0F172A" },
    { "id": "accent", "name": "Accent", "value": "#F59E0B" },
    { "id": "text", "name": "Text", "value": "#334155" }
  ],
  "fonts": { "heading": "Poppins", "body": "Inter" },
  "typography": {
    "h1": { "size": { "desktop": "48px", "tablet": "40px", "mobile": "32px" }, "weight": 800, "lineHeight": 1.15 },
    "body": { "size": { "desktop": "16px" }, "weight": 400, "lineHeight": 1.6 }
  }
}
```

Four system colors (fixed IDs) plus up to 10 custom named colors (`custom-*` IDs). Typography presets: `h1`–`h6`, `body`, `button`.

### Rendering

- Kit compiles to CSS custom properties (`--mv-color-{id}`, `--mv-font-heading`, `--mv-font-body`) plus base element rules for h1–h6/body/button with per-device media queries. Output is injected into the editor canvas and every public page (homepage and `/p/*`) at render time, so kit changes take effect without republishing.
- Choosing a global swatch stores `var(--mv-color-{id})` in the element's style; linked controls show 🔗 with an "Unlink" action that writes the resolved value.
- Deleting a custom color moves it to a hidden `retired` list in the kit. Retired colors are still emitted as CSS variables with their last value, so pages that reference them never break; they no longer appear as swatches.

### Presets and migration

The five existing palettes (as listed on the Website screen: MedVisit Teal, Ocean Blue, Emerald Health, Royal Specialist, Slate Executive) become kit presets that fill the color set. On first load, a tenant without `website_kit` gets a kit generated from its current `website_theme`, so live sites are visually unchanged. `theme_preset` / `website_theme` stay readable for backward compatibility.

### Fonts

- One curated list shared by PHP and TS: `resources/js/Components/PageBuilder/lib/fonts.json`, imported directly by TS and read by PHP through a small `App\Support\PageBuilderFonts` class (`resource_path(...)`, cached). Families: Poppins, Inter, Roboto, Lato, Open Sans, Montserrat, Nunito, Source Sans 3, Raleway, Merriweather, Playfair Display, DM Sans, Work Sans, Rubik, Mulish, Noto Sans, Noto Serif, **Noto Sans Sinhala**, **Noto Sans Tamil**.
- Public pages emit one Google Fonts `<link>` containing only fonts used: kit fonts plus families from the curated list found in the page's published CSS. `display=swap`.
- The canvas loads the same URL builder output for the current page.

### UI

"🌐 Site Settings" in the builder top bar opens the `SiteSettingsTab` in the left panel: Global Colors, Global Fonts, Typography. Canvas updates live; Save shows "Applies to all published pages immediately."

### Routes

- `GET /website/kit`, `PUT /website/kit` (validated: hex colors, font families from the curated list, sizes matching `^\d+(\.\d+)?(px|rem|em|vw)$`).

## Error handling

- Validation errors return field-level messages surfaced inline (slug taken, invalid slug, homepage deletion attempt, unknown font).
- Saving with a stale page (deleted in another tab) returns 404 with a toast and redirects to the page list.
- Publish failure leaves the previous published copy intact (single DB transaction).

## Testing

**PHPUnit feature tests**
- Page CRUD, duplicate, soft delete/restore, sort order.
- Tenant isolation for every page, revision, and kit route.
- Slug validation and uniqueness (incl. soft-deleted).
- Homepage rules: exactly one, cannot delete, switching clears previous.
- Per-page publish does not change other pages; draft save does not change `published_at`.
- Public: `/p/{slug}` 200 when published, 404 when draft/deleted; homepage slug 301 → `/`; preview requires auth.
- Custom CSS sanitization.
- Kit save/validation; kit generated from `website_theme` when missing.
- Menu rendering omits links to unpublished pages.

**JS unit tests** (`node --test tests/Unit/js/*.test.mjs`)
- slugify, responsive value resolution/inheritance, kit → CSS output, Google Fonts URL builder.

**Manual verification**
- Builder and public pages on desktop/tablet/mobile; create → edit → publish → view flow; kit change propagates to linked elements.

## Delivery

- Work on a feature branch in `medvisit`; one commit per logical step (refactor, migration, routes/controller, page list UI, switcher, style tab, advanced tab, kit, rename), each with passing tests.
- No new dependencies expected (GrapesJS, dnd-kit, lucide-react already present). Any new dependency requires approval per `AGENTS.md`.

## Out of scope (later phases)

- Phase 2: templates library, global header/footer as editable sections, layers/context-menu/keyboard shortcuts.
- Phase 3: new widgets (tabs, carousel, testimonials, counters, pricing, gallery, social icons), forms, popups.
- Phase 4: dynamic tags (clinic data), display conditions.
- Custom font uploads.

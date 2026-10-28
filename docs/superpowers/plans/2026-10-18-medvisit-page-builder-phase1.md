# MedVisit Page Builder Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Multi-page clinic websites with per-page publishing, Elementor-level Style/Advanced controls with responsive values, and a global colors/fonts kit, branded "MedVisit Page Builder".

**Architecture:** Laravel controllers + Inertia React pages on the existing GrapesJS editor. Pages extend `clinic_pages`; the kit lives in the tenant's virtual `data` JSON (like `website_header`). Kit → CSS and font-URL logic is written once in TypeScript and used by both the editor canvas and the public `ClinicLanding` page; PHP only validates and stores.

**Tech Stack:** PHP 8.5 / Laravel / stancl tenancy / PHPUnit; React 18 + TypeScript + Inertia 2 + Tailwind 3; GrapesJS 0.23; Node `--test` for TS unit tests.

**Spec:** `docs/superpowers/specs/2026-10-18-medvisit-page-builder-phase1-design.md`

## Global Constraints

- Branch: `feature/page-builder-phase1`. One commit per task; tests green before each commit.
- No new Composer or npm dependencies (AGENTS.md requires approval).
- Follow sibling conventions: `declare(strict_types=1);`, tenant tests in `tests/Feature/Tenant/`, URLs `"http://{$sub}.{$this->baseDomain}/..."`, JS tests in `tests/Unit/js/*.test.mjs` importing `.ts` directly (erasable TS only: no `enum`, no `namespace`, no parameter properties).
- Product name in UI copy: "MedVisit Page Builder". The string "Elementor" must not appear in `resources/js` or `app` when done.
- Page URLs: homepage `/`; others `/p/{slug}`; slug `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 60 chars, unique per tenant including soft-deleted.
- Breakpoints: Tablet `max-width: 992px`, Mobile `max-width: 480px`.
- Builder/page/kit admin routes live in the existing `role:clinic_admin|super_admin` group (`routes/tenant.php` ~line 249). Preview routes require auth + same roles.
- CSS variables: `--mv-color-{id}`, `--mv-font-heading`, `--mv-font-body`.
- Curated fonts (exact list): Poppins, Inter, Roboto, Lato, Open Sans, Montserrat, Nunito, Source Sans 3, Raleway, Merriweather, Playfair Display, DM Sans, Work Sans, Rubik, Mulish, Noto Sans, Noto Serif, Noto Sans Sinhala, Noto Sans Tamil.

## Review Focus

1. **Slug collision with a soft-deleted page** — creating `about` when a trashed `about` exists must return a validation error, not a DB unique-constraint 500. (Task 3 test `test_slug_taken_by_trashed_page_is_rejected`.)
2. **Switching homepage concurrently / leaving zero homepages** — after any homepage change exactly one page per tenant has `is_homepage = true`. (Task 3 test `test_setting_homepage_leaves_exactly_one`.)
3. **Custom CSS breaking out of `<style>`** — `</style><script>` inside element CSS must not survive publish. (Task 6 test `test_publish_strips_style_breakout_from_css`.)
4. **Menu link to a page later unpublished or deleted** — public header must omit it rather than link to a 404. (Task 5 test `test_menu_omits_links_to_unpublished_pages`.)
5. **Tenant without `website_kit` after deploy** — public pages and builder must render using a kit derived from `website_theme`, never crash on null. (Task 7 test `test_kit_defaults_from_theme_when_missing`.)

---

### Task 1: Split `PageBuilder.tsx` (no behavior change)

**Files:**
- Modify: `resources/js/Pages/Website/PageBuilder.tsx`
- Create: `resources/js/Components/PageBuilder/TopBar.tsx`, `LeftPanel/WidgetsTab.tsx`, `LeftPanel/LayersTab.tsx`, `LeftPanel/HeaderTab.tsx`, `LeftPanel/FooterTab.tsx`, `Inspector/Inspector.tsx`, `Inspector/ContentTab.tsx`, `Inspector/StyleTab.tsx`, `Inspector/AdvancedTab.tsx`, `blocks/registerBlocks.ts`, `types.ts`

**Interfaces:**
- Produces: `registerBlocks(editor: Editor): void`; `types.ts` exports `HeaderConfig`, `FooterConfig`, `MenuItem`, `BuilderPageProps` (moved from `PageBuilder.tsx`); each tab component takes `{ editor: Editor | null; selectedComponent: Component | null }` plus the state it renders today. Mount-point IDs (`#builder-blocks-container`, `#builder-layers-container`, `#builder-styles-container`, `#builder-selectors-container`, `#builder-traits-container`) stay identical and always mounted.

- [ ] **Step 1:** Move block registration (`registerCustomBlocks`, lines ~497–820) verbatim to `blocks/registerBlocks.ts`.
- [ ] **Step 2:** Move JSX regions into the components above (top bar ~1540–1700, left panel ~1700–2290, inspector ~2293–end); `PageBuilder.tsx` keeps editor init, state, save/publish handlers, and composes the components.
- [ ] **Step 3: Verify** — Run `npm run build`. Expected: exit 0, no TS errors. Run `php artisan test --filter=VisualPageBuilderTest`. Expected: all pass.
- [ ] **Step 4: Manual check** — `composer run dev`, open `/website/builder`: drag a Heading, edit text, undo, switch Tablet, Save Draft. All behave as before.
- [ ] **Step 5: Commit** — `git commit -m "Split PageBuilder into focused components"`

### Task 2: Shared TS helpers and font list

**Files:**
- Create: `resources/js/Components/PageBuilder/lib/fonts.json`, `lib/slug.ts`, `lib/responsive.ts`, `lib/kit.ts`, `lib/fonts.ts`
- Test: `tests/Unit/js/page_builder_lib.test.mjs`

**Interfaces:**
- Produces:
  - `fonts.json`: `[{ "family": "Poppins", "weights": [400,500,600,700,800] }, ...]` — the 19 Global Constraints families; Sinhala/Tamil entries use weights `[400,500,600,700]`.
  - `slugify(title: string): string`; `isValidSlug(slug: string): boolean`
  - `type Device = 'desktop' | 'tablet' | 'mobile'`; `resolveResponsive<T>(values: Partial<Record<Device, T>>, device: Device): { value: T | undefined; inheritedFrom: Device | null }` (mobile → tablet → desktop; `inheritedFrom` null when set on `device` itself)
  - `type SiteKit = { colors: KitColor[]; retired: KitColor[]; fonts: { heading: string; body: string }; typography: Record<TypographyKey, TypographyPreset> }`, `KitColor = { id: string; name: string; value: string }`, `TypographyKey = 'h1'|'h2'|'h3'|'h4'|'h5'|'h6'|'body'|'button'`, `TypographyPreset = { size: Partial<Record<Device,string>>; weight: number; lineHeight: number }`
  - `kitToCss(kit: SiteKit): string`
  - `usedFontFamilies(kit: SiteKit, pageCss: string): string[]`; `googleFontsUrl(families: string[]): string | null`

- [ ] **Step 1: Write failing tests**

```js
test('slugify', () => {
  assert.equal(slugify('  About Us & Team!! '), 'about-us-team');
  assert.equal(slugify('Doctors---List'), 'doctors-list');
  assert.equal(isValidSlug('about-us'), true);
  assert.equal(isValidSlug('About'), false);
  assert.equal(isValidSlug('a'.repeat(61)), false);
});
test('responsive inheritance', () => {
  assert.deepEqual(resolveResponsive({ desktop: '48px' }, 'mobile'), { value: '48px', inheritedFrom: 'desktop' });
  assert.deepEqual(resolveResponsive({ desktop: '48px', tablet: '40px' }, 'mobile'), { value: '40px', inheritedFrom: 'tablet' });
  assert.deepEqual(resolveResponsive({ mobile: '32px' }, 'mobile'), { value: '32px', inheritedFrom: null });
});
test('kitToCss emits variables, retired colors and breakpoints', () => {
  const css = kitToCss(sampleKit); // primary #0E9E8F, retired custom-old #FF0000, h1 desktop 48px / mobile 32px
  assert.match(css, /--mv-color-primary:\s*#0E9E8F/);
  assert.match(css, /--mv-color-custom-old:\s*#FF0000/);
  assert.match(css, /--mv-font-heading:\s*'Poppins'/);
  assert.match(css, /@media \(max-width: 480px\)\s*\{[^}]*h1\s*\{[^}]*font-size:\s*32px/);
});
test('fonts URL includes only curated families in use', () => {
  const fams = usedFontFamilies(sampleKit, ".x{font-family:'Noto Sans Sinhala'} .y{font-family:'Comic Sans MS'}");
  assert.deepEqual(fams.sort(), ['Inter', 'Noto Sans Sinhala', 'Poppins']);
  const url = googleFontsUrl(fams);
  assert.ok(url.startsWith('https://fonts.googleapis.com/css2?'));
  assert.match(url, /family=Noto\+Sans\+Sinhala:wght@400;500;600;700/);
  assert.match(url, /display=swap$/);
  assert.equal(googleFontsUrl([]), null);
});
```

- [ ] **Step 2:** Run `npm test`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement the five files. `kitToCss` output order: `:root{…vars…}`, base rules for `h1`–`h6`, `body`, `.mv-button, button` using `var(--mv-font-heading)` for headings and `var(--mv-font-body)` otherwise, then `@media (max-width: 992px){…}` and `@media (max-width: 480px){…}` for tablet/mobile sizes.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add page builder slug, responsive, kit and font helpers"`

### Task 3: Pages data model and page management API

**Files:**
- Create: `database/migrations/2026_10_18_100000_add_multipage_columns_to_clinic_pages.php`, `app/Support/PageSlug.php`, `app/Http/Controllers/Tenant/ClinicPageController.php`, `app/Http/Requests/Tenant/StoreClinicPageRequest.php`, `app/Http/Requests/Tenant/UpdateClinicPageRequest.php`
- Modify: `app/Models/ClinicPage.php`, `routes/tenant.php`
- Test: `tests/Feature/Tenant/ClinicPagesTest.php`

**Interfaces:**
- Produces:
  - Columns `is_homepage` (bool, default false), `sort_order` (unsigned int, default 0), `deleted_at`. Migration `up()` sets `is_homepage = true` where `slug = 'home'`.
  - `ClinicPage` uses `SoftDeletes`; casts `is_homepage`; `scopeForTenant(Builder $q, string $tenantId)`; `hasUnpublishedChanges(): bool` (`is_published && updated_at > published_at`); `publicUrl(): string` (`/` or `/p/{slug}`); `static homepageFor(string $tenantId): ?ClinicPage`; `makeHomepage(): void` (transaction: clear others, set self).
  - `PageSlug::PATTERN = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/'`; `PageSlug::rule(string $tenantId, ?int $ignoreId = null): array` (validation rules incl. `Rule::unique('clinic_pages','slug')->where('tenant_id',…)` without soft-delete filter); `PageSlug::nextAvailable(string $tenantId, string $base): string` (`base-copy`, `base-copy-2`, …).
  - Routes (names `tenant.website.pages.*`): `GET /website/pages` index (JSON list: id, title, slug, url, is_homepage, is_published, has_unpublished_changes, updated_at, sort_order), `GET /website/pages/trash`, `POST /website/pages` store (`title`, `slug`, `source` one of `blank` | `copy:{id}` | `template:{key}`; template keys = those in `getTemplateHtml`), `POST /website/pages/{page}/duplicate`, `PATCH /website/pages/{page}` (title, slug, seo_title, seo_description, sort_order), `DELETE /website/pages/{page}` (422 for homepage), `POST /website/pages/{pageId}/restore` (resolves `withTrashed()` scoped to tenant), `POST /website/pages/{page}/homepage`. Every action aborts 404 when `$page->tenant_id !== tenant('id')`.
  - Templates stay client-side (`getTemplateHtml`): for `source=template:{key}` the client also sends `html`; the server stores it after `HtmlSanitizer::sanitize`. For `copy:{id}` the server copies `html`, `css`, `content_json` from that tenant page.

- [ ] **Step 1: Write failing tests** in `ClinicPagesTest` (setup copied from `VisualPageBuilderTest`: tenants A and B, clinic admin per tenant, receptionist on A):
  - `test_admin_can_create_blank_page` → 201/redirect JSON; DB row `slug=about-us`, `is_published=false`, `is_homepage=false`.
  - `test_invalid_slug_is_rejected` (`About Us`) → 422 `slug`.
  - `test_slug_taken_by_trashed_page_is_rejected` → create `about`, delete it, create `about` again → 422 `slug`.
  - `test_duplicate_creates_copy_slug` → `about-copy`, then `about-copy-2`; html copied; unpublished.
  - `test_homepage_cannot_be_deleted` → 422; row still present.
  - `test_setting_homepage_leaves_exactly_one` → after switching twice, `ClinicPage::where('tenant_id',A)->where('is_homepage',true)->count() === 1`.
  - `test_soft_delete_and_restore`.
  - `test_receptionist_cannot_manage_pages` → 403.
  - `test_tenant_b_cannot_touch_tenant_a_pages` → PATCH/DELETE/homepage on A's page via B's subdomain → 404.
  - `test_migration_marks_existing_home_as_homepage` (create row slug `home` pre-flag via `DB::table`, run the migration's backfill method or assert via `homepageFor`).
- [ ] **Step 2:** `php artisan test --filter=ClinicPagesTest`. Expected: FAIL.
- [ ] **Step 3:** Implement migration, model changes, `PageSlug`, form requests, controller, routes.
- [ ] **Step 4:** `php artisan migrate && php artisan test --filter=ClinicPagesTest`. Expected: PASS. Also run `--filter=VisualPageBuilderTest`: PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add multi-page clinic pages with management API"`

### Task 4: Page-aware builder routes

**Files:**
- Modify: `app/Http/Controllers/Tenant/ClinicWebsiteController.php` (`showBuilder`, `saveBuilder`, `publishBuilder`, `listRevisions`, `revertRevision`), `routes/tenant.php`, `tests/Feature/Tenant/VisualPageBuilderTest.php`

**Interfaces:**
- Consumes: `ClinicPage::homepageFor`, tenant check pattern from Task 3.
- Produces: routes `GET /website/builder/{page?}` (`tenant.website.builder`), `POST /website/builder/{page}/save`, `POST /website/builder/{page}/publish`, `GET /website/builder/{page}/revisions`, `POST /website/builder/{page}/revert/{revision}`. Inertia props for `Website/PageBuilder` add `page.id`, `page.is_homepage`, `page.public_url`, `pages` (same shape as the pages index list), `siteKit` (added in Task 7; pass `null` for now). Draft save must not modify `published_at`. Revert aborts 404 if `$revision->page_id !== $page->id`.

- [ ] **Step 1:** Update existing tests to the new URLs (use the homepage id) and add:
  - `test_publish_only_affects_target_page` → two pages, publish page 2; page 1 `published_html` unchanged.
  - `test_draft_save_keeps_published_at` → publish, travel 1 minute, save draft → `published_at` unchanged, `hasUnpublishedChanges()` true.
  - `test_revert_rejects_revision_from_other_page` → 404.
  - `test_builder_without_page_opens_homepage` → Inertia prop `page.id` equals homepage id.
- [ ] **Step 2:** Run `--filter=VisualPageBuilderTest`. Expected: new tests FAIL.
- [ ] **Step 3:** Implement; remove every `slug', 'home'` lookup in these methods (`showBuilder` creates the homepage via the existing default content if none exists, with `is_homepage = true`).
- [ ] **Step 4:** Run `--filter=VisualPageBuilderTest` and `--filter=ClinicPagesTest`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "Make builder save, publish and revisions page-aware"`

### Task 5: Public page routes, preview guard, menu page links

**Files:**
- Modify: `app/Http/Controllers/Tenant/ClinicWebsiteController.php` (`publicHome`, `previewHome`, `renderPublicHome` → `renderPage(?ClinicPage $page, bool $isPreview)`), `routes/tenant.php`, `resources/js/Pages/Public/ClinicLanding.tsx`
- Test: `tests/Feature/Tenant/PublicPagesTest.php`

**Interfaces:**
- Produces: `GET /p/{slug}` (`tenant.page`), `GET /preview` and `GET /preview/p/{slug}` (`tenant.preview`, `tenant.preview.page`) moved inside `auth` + `role:clinic_admin|super_admin`. Menu items accept optional `page_id` (int); a protected `resolveMenuItems(array $items, Collection $pages): array` maps page links to `publicUrl()` and drops links to pages not published (or missing). `ClinicLanding` props unchanged in shape except `headerConfig.menu_items` / `footerConfig` arrive resolved.

- [ ] **Step 1: Write failing tests:**
  - `test_published_page_renders_at_p_slug` → 200, Inertia `customPage.html` contains page html.
  - `test_draft_page_returns_404` and `test_trashed_page_returns_404`.
  - `test_homepage_slug_redirects_to_root` → 301 to `/`.
  - `test_preview_requires_login` → guest GET `/preview/p/about` redirects to login; admin gets 200 with draft html.
  - `test_menu_omits_links_to_unpublished_pages` → header items `[{label:'About',page_id:X},{label:'Book',url:'/book'}]`, X unpublished → rendered `menu_items` has only Book; after publishing X, About resolves to `/p/about`.
- [ ] **Step 2:** `php artisan test --filter=PublicPagesTest`. Expected: FAIL.
- [ ] **Step 3:** Implement; `GET /` uses `ClinicPage::homepageFor`. Also route existing `test_public_landing_renders_published_builder_page` still passes.
- [ ] **Step 4:** Run `--filter="PublicPagesTest|VisualPageBuilderTest|WebsiteAndPublicBookingTest"`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "Serve pages at /p/{slug} and protect draft previews"`

### Task 6: CSS sanitizer hardening

**Files:**
- Modify: `app/Support/HtmlSanitizer.php` (`sanitizeCss`)
- Test: `tests/Feature/Tenant/VisualPageBuilderTest.php`

**Interfaces:**
- Produces: `HtmlSanitizer::sanitizeCss` additionally removes any `</style` and `<script` sequences (case-insensitive, with optional whitespace), `<!--`/`-->`, and `javascript:` anywhere. Existing behavior (@import, expression, -moz-binding) unchanged. Save and publish already call it; confirm both paths do (add the call where missing).

- [ ] **Step 1:** Write `test_publish_strips_style_breakout_from_css` → publish with css `#a{color:red}</style><script>alert(1)</script>` → stored `published_css` contains `#a{color:red}` and not `</style`, `<script`.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `--filter=VisualPageBuilderTest`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "Harden page CSS sanitization against style breakout"`

### Task 7: Site kit backend and rendering

**Files:**
- Create: `app/Support/PageBuilderFonts.php`, `app/Support/SiteKit.php`, `app/Http/Controllers/Tenant/SiteKitController.php`
- Modify: `app/Http/Controllers/Tenant/ClinicWebsiteController.php` (pass `siteKit` to builder and public renders), `routes/tenant.php`, `resources/js/Pages/Public/ClinicLanding.tsx`
- Test: `tests/Feature/Tenant/SiteKitTest.php`

**Interfaces:**
- Consumes: `lib/fonts.json`, `kitToCss`, `usedFontFamilies`, `googleFontsUrl` (Task 2).
- Produces:
  - `PageBuilderFonts::families(): array` (reads `resource_path('js/Components/PageBuilder/lib/fonts.json')`, cached in a static).
  - `SiteKit::THEME_COLORS` mapping the five presets to primary/secondary/accent/text hexes (`medvisit-teal` primary `#0E9E8F`, `ocean-blue` `#1E6FD9`, `emerald-health` `#059669`, `royal-specialist` `#7C3AED`, `slate-executive` `#0F172A`; secondary `#0F172A` except slate `#334155`; accent `#F59E0B`; text `#334155`); `SiteKit::defaultsForTheme(string $theme): array`; `SiteKit::resolveFor(Tenant $tenant): array` (stored kit or defaults); `SiteKit::rules(): array`.
  - Validation: colors 4 system ids + ≤10 `custom-[a-z0-9-]+`; values `^#[0-9A-Fa-f]{6}$`; names ≤40 chars; fonts in `PageBuilderFonts::families()`; sizes `^\d+(\.\d+)?(px|rem|em|vw)$`; weight 100–900 step 100; lineHeight 0.8–3. Removing a custom color moves it into `retired`.
  - Routes `GET /website/kit`, `PUT /website/kit` (`tenant.website.kit`, `tenant.website.kit.update`); stored as `$tenant->website_kit`.
  - `ClinicLanding` and builder canvas inject `<style>{kitToCss(kit)}</style>` and the `googleFontsUrl(usedFontFamilies(kit, css))` stylesheet link.
- [ ] **Step 1: Write failing tests:** `test_kit_defaults_from_theme_when_missing` (tenant `website_theme=ocean-blue`, no kit → `GET /website/kit` primary `#1E6FD9`; public `/` Inertia prop `siteKit.colors[0].value` same); `test_admin_can_save_kit`; `test_kit_rejects_unknown_font` (422 `fonts.heading`); `test_kit_rejects_bad_hex` and `test_kit_rejects_eleventh_custom_color`; `test_removed_custom_color_is_retired`; `test_receptionist_cannot_update_kit` (403).
- [ ] **Step 2:** `php artisan test --filter=SiteKitTest`. Expected: FAIL.
- [ ] **Step 3:** Implement PHP + `ClinicLanding` injection.
- [ ] **Step 4:** Run `--filter="SiteKitTest|PublicPagesTest"` and `npm run build`. Expected: PASS / exit 0.
- [ ] **Step 5: Commit** — `git commit -m "Add global site kit for colors and fonts"`

### Task 8: Rename, sidebar item, and Pages list UI

**Files:**
- Modify: `resources/js/Layouts/AuthenticatedLayout.tsx` (after the `Clinic Website` item, add `{ name: 'MedVisit Page Builder', href: '/website#pages', icon: LayoutTemplate, visible: isClinicAdmin }`), `resources/js/Pages/Website/Index.tsx`, `app/Http/Controllers/Tenant/ClinicWebsiteController.php` (`index` passes `pages`), `tests/Feature/Tenant/NavigationTest.php`
- Create: `resources/js/Components/PageBuilder/PagesTable.tsx`, `NewPageDialog.tsx`, `PageSettingsDialog.tsx`

**Interfaces:**
- Consumes: page routes (Task 3), `slugify`/`isValidSlug` (Task 2).
- Produces: `<PagesTable pages={PageSummary[]} />` with actions Edit (`/website/builder/{id}`), View live (`page.url`, disabled when unpublished), Duplicate, Settings, Set as homepage, Delete, and a Trash toggle; `<NewPageDialog templates={string[]} pages={PageSummary[]} />` posting `source`. `PageSummary` type exported from `types.ts`.

- [ ] **Step 1:** Add NavigationTest assertion `test_admin_sees_page_builder_menu_item` if NavigationTest asserts menu items server-side; otherwise skip and rely on Step 4.
- [ ] **Step 2:** Replace the "Launch Visual Builder" banner with `PagesTable`; rename header button to "MedVisit Page Builder"; banner copy "MedVisit Page Builder — design your clinic website with drag-and-drop sections, live doctor & session widgets, and responsive previews."
- [ ] **Step 3: Verify no "Elementor" remains** — `grep -rni elementor resources/js app` → no output. `npm run build` → exit 0.
- [ ] **Step 4: Manual check** — create, duplicate, rename slug (live validation), set homepage, delete, restore; status badges update.
- [ ] **Step 5: Commit** — `git commit -m "Add Pages list and rename builder to MedVisit Page Builder"`

### Task 9: Builder page switcher, page settings, menu page links

**Files:**
- Create: `resources/js/Components/PageBuilder/PageSwitcher.tsx`, `Inspector/PageSettings.tsx`
- Modify: `TopBar.tsx`, `LeftPanel/HeaderTab.tsx`, `LeftPanel/FooterTab.tsx`, `Pages/Website/PageBuilder.tsx`

**Interfaces:**
- Consumes: builder props `page`, `pages` (Task 4); page PATCH/homepage routes (Task 3).
- Produces: `<PageSwitcher pages current isDirty onSaveDraft />` — selecting a page while dirty opens a modal *Save draft / Discard / Cancel*, then `router.visit('/website/builder/{id}')`. Save/Publish/History/Preview use `page.id`; Preview opens `/preview` (homepage) or `/preview/p/{slug}`. Header/Footer menu item editor gets a "Link to: Page ▾ | Custom URL" toggle storing `page_id` or `url`. Also register a `beforeunload` guard while dirty. A 404 from save/publish (page deleted in another tab) shows a toast "This page was deleted" and visits `/website#pages`.

- [ ] **Step 1:** Implement components.
- [ ] **Step 2:** `npm run build` → exit 0; `php artisan test --filter="VisualPageBuilderTest|PublicPagesTest"` → PASS.
- [ ] **Step 3: Manual check** — switch pages with unsaved changes (all three choices), edit page settings, link a menu item to a draft page and confirm it's hidden on `/` until published.
- [ ] **Step 4: Commit** — `git commit -m "Add page switcher, page settings and page menu links"`

### Task 10: Style tab with responsive and hover controls

**Files:**
- Create: `resources/js/Components/PageBuilder/controls/useStyleProp.ts`, `controls/DeviceToggle.tsx`, `controls/UnitInput.tsx`, `controls/ColorControl.tsx`, `controls/BoxSidesControl.tsx`, `controls/StateToggle.tsx`
- Modify: `Inspector/StyleTab.tsx`, `Pages/Website/PageBuilder.tsx` (editor config `selectorManager: { componentFirst: true, appendTo: ... }`)

**Interfaces:**
- Consumes: `resolveResponsive`, `Device` (Task 2).
- Produces: `useStyleProp(editor: Editor, prop: string): { value: string; inheritedFrom: Device | null; set(v: string): void; reset(): void }` — reads per-device values by querying `editor.Css.getRule('#id', { atRuleType: 'media', atRuleParams })` for each breakpoint (and the `:hover` state when active), writes via `editor.StyleManager.addStyleProps({ [prop]: v })` on the selected target so the active device/state apply, re-renders on `component:styleUpdate` / `device:change` / `selector:state`. `DeviceToggle` calls `editor.setDevice('Desktop'|'Tablet'|'Mobile')`.
- Groups and properties exactly as spec §3 Style tab; Layout group visible only when the selected component is a section/column block type (`custom-name` starts with `Section`/`Column`, or tag is `section`).

- [ ] **Step 1:** Add JS test cases to `page_builder_lib.test.mjs` for any pure logic extracted (`parseUnitValue('1.5rem') → { number: 1.5, unit: 'rem' }`, `formatShadow({x:0,y:4,blur:12,spread:0,color:'#0003'}) → '0px 4px 12px 0px #0003'`); put them in `lib/cssValues.ts`.
- [ ] **Step 2:** `npm test` → FAIL; implement `lib/cssValues.ts`; `npm test` → PASS.
- [ ] **Step 3:** Build the controls and Style tab groups.
- [ ] **Step 4: Manual check** — set heading font-size 48px desktop, 32px mobile: mobile shows bold 32px, tablet shows grey inherited 48px; ↺ on mobile reverts to inherited; hover color applies only on hover in preview; Undo reverts a style edit; published `/p/{slug}` reflects all three breakpoints.
- [ ] **Step 5:** `npm run build` → exit 0. **Commit** — `git commit -m "Add responsive Style tab controls"`

### Task 11: Advanced tab and public animations

**Files:**
- Create: `resources/js/Components/PageBuilder/lib/animations.ts`, `Inspector/CustomCssEditor.tsx`
- Modify: `Inspector/AdvancedTab.tsx`, `resources/js/Pages/Public/ClinicLanding.tsx`
- Test: `tests/Unit/js/page_builder_lib.test.mjs`

**Interfaces:**
- Produces: `ANIMATIONS = ['fade-in','slide-up','slide-left','slide-right','zoom-in'] as const`; `animationCss(): string` (keyframes + `[data-mv-animation]{opacity:0}` + `.mv-animated` rules + `@media (prefers-reduced-motion: reduce){[data-mv-animation]{opacity:1;animation:none}}`); `initEntranceAnimations(root: HTMLElement): () => void` (IntersectionObserver adds `mv-animated`, applies `data-mv-duration`/`data-mv-delay` ms; returns cleanup). `expandSelectorKeyword(css: string, componentId: string): string` replaces whole-word `selector` with `#${componentId}`. Custom CSS per element is stored on the component as attribute `data-mv-custom-css` (raw, for re-editing) and its expanded form added to the page CSS via `editor.Css.addRules`.
- Visibility: `display:none` in the device's media rule; editor-only canvas style `[data-mv-hidden-{device}]{opacity:.35 !important;display:block !important}` (canvas only, not exported).

- [ ] **Step 1: Failing tests:** `expandSelectorKeyword('selector:hover{color:red} .selectors{}', 'i3x')` → `'#i3x:hover{color:red} .selectors{}'`; `animationCss()` contains `prefers-reduced-motion`.
- [ ] **Step 2:** `npm test` → FAIL; implement; `npm test` → PASS.
- [ ] **Step 3:** Build Advanced tab (spacing with link toggle, ID/classes via GrapesJS selector API, visibility, animation, sticky + offset, position, z-index, custom CSS) and call `initEntranceAnimations` in `ClinicLanding` after custom HTML mounts.
- [ ] **Step 4: Manual check** — hide on mobile (faded in editor, gone on live mobile), slide-up animation plays once on scroll, sticky header block sticks, custom CSS `selector{border:2px solid red}` applies only to that element and survives save/reload.
- [ ] **Step 5:** `npm run build` → exit 0. **Commit** — `git commit -m "Add Advanced tab with visibility, animations, sticky and custom CSS"`

### Task 12: Site Settings panel and global swatch linking

**Files:**
- Create: `resources/js/Components/PageBuilder/LeftPanel/SiteSettingsTab.tsx`
- Modify: `TopBar.tsx` (🌐 Site Settings button), `controls/ColorControl.tsx`, `Inspector/StyleTab.tsx` (font family options), `Pages/Website/PageBuilder.tsx` (canvas kit style + fonts link, kept in sync)

**Interfaces:**
- Consumes: `siteKit` prop, `PUT /website/kit` (Task 7), `kitToCss`, `googleFontsUrl`, `fonts.json`.
- Produces: kit editor (system colors, add/rename/delete custom colors, preset picker filling colors from `SiteKit::THEME_COLORS` mirrored in TS, heading/body font selects, typography presets with per-device size via `DeviceToggle`). Canvas updates live by replacing a `<style id="mv-kit">` and `<link id="mv-fonts">` in the GrapesJS canvas document on every kit change. `ColorControl` shows kit swatches; choosing one writes `var(--mv-color-{id})` and shows 🔗 with "Unlink" (writes resolved hex). Save shows "Applies to all published pages immediately."

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `npm run build` → exit 0; `php artisan test --filter=SiteKitTest` → PASS.
- [ ] **Step 3: Manual check** — link a heading to Primary, change Primary in Site Settings: canvas recolors live; save; `/` and `/p/{slug}` recolor without republishing; switch heading font to Noto Sans Sinhala and confirm Sinhala text renders and the fonts URL includes it.
- [ ] **Step 4: Commit** — `git commit -m "Add Site Settings panel with global colors and fonts"`

### Task 13: Full verification

- [ ] **Step 1:** `php artisan test` → all pass (paste summary line).
- [ ] **Step 2:** `npm test` → all pass. `npm run build` → exit 0.
- [ ] **Step 3:** `grep -rni elementor resources/js app` → no output.
- [ ] **Step 4:** Browser walkthrough at desktop, tablet (768px), mobile (375px): create "About Us" from a template → style → publish → visit `/p/about-us`; homepage unchanged; draft preview blocked when logged out.
- [ ] **Step 5:** Commit any fixes; report results with evidence.

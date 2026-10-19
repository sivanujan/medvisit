# MedVisit Page Builder Phase 1b Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the MedVisit builder edit like Elementor: no false "Unsaved Changes", no overlapping labels, widget-specific Content controls, and Elementor-style canvas editing.

**Architecture:** All work is frontend (React + GrapesJS 0.23.8) inside `resources/js/Components/PageBuilder/` and `resources/js/Pages/Website/PageBuilder.tsx`. Pure logic goes in `lib/*.ts` with node tests; React panels call the GrapesJS component/style APIs so undo/redo and dirty tracking keep working.

**Tech Stack:** React 18 + TypeScript + Tailwind 3, GrapesJS 0.23.8, Node `--test`.

**Spec:** `docs/superpowers/specs/2026-10-19-medvisit-page-builder-phase1b-design.md`

## Global Constraints

- Work in worktree `C:\Users\Sivanujan_PC\Desktop\medvisit-page-builder`, branch `page-builder/phase1b` (from `faf057b`). No new Composer/npm dependencies.
- Erasable TS only in `lib/` (node tests import `.ts`; `allowImportingTsExtensions` is on). Tests: `npm test`; `npx tsc --noEmit`; `npm run build`; PHP suite `DB_DATABASE=medvisit_testing_pb php artisan test` must stay green.
- Editor-only visuals go in the canvas-only `#mv-editor-only` style; nothing editor-only may appear in saved HTML/CSS.
- Widget labels exactly as spec §1 `WIDGET_LABELS`. Product copy "MedVisit Page Builder"; no "Elementor" strings.
- All component edits go through GrapesJS APIs (no direct DOM mutation of the canvas document for content).

## Review Focus

1. **Tag change on heading/container loses data** — changing H2→H3 or section→div must keep id, classes, attributes, styles (ID rule) and children. (Task 3 / Task 4 tests on a pure `retagPlan` helper + manual.)
2. **Paste style across devices** — copying style from an element with desktop + mobile rules and pasting onto another must reproduce both device rules, not only the current device. (Task 8 helper test `pickStyleForClipboard`.)
3. **Shortcuts firing while typing** — Ctrl+V / Delete inside an inspector input or inline text edit must not paste/delete components. (Task 8 guard helper `shouldHandleShortcut` test.)
4. **Overlay drift** — "+ Add section" buttons must reposition after scroll, device switch and component add/remove (Task 7 manual check by controller).
5. **Dirty after intentional loads** — revision restore and template apply must still end dirty, while a plain open must not (Task 1 manual + code review).

---

### Task 1: Fix false "Unsaved Changes" and the overlapping Page label

**Files:** Modify `resources/js/Pages/Website/PageBuilder.tsx` (load handler ~lines 299–338, left tab strip ~line 780–800, page bar ~lines 907–921).

- [ ] **Step 1:** Add `isLoadingRef = useRef(true)`; `markDirty` returns early while it is true. At the end of the `load` handler (after setStyle, kit, custom CSS, refresh) clear `editor.UndoManager` stack, set `isLoadingRef.current = false`, `setIsDirty(false)`. Revision restore and template apply set the flag around their setComponents/setStyle and then call `setIsDirty(true)`.
- [ ] **Step 2:** Left tab strip: no overflow — tabs wrap (`flex-wrap`, `min-w-0`, `overflow-hidden` on the strip), rename the theme tab label to "Theme".
- [ ] **Step 3:** Leave the page bar for Task 7 (breadcrumbs) but ensure nothing from the left panel can draw over it (`relative z-10` on the bar, panel `overflow-hidden`).
- [ ] **Step 4: Verify:** `npx tsc --noEmit`, `npm run build`, `npm test` pass.
- [ ] **Step 5: Commit** — `Fix false unsaved state on load and left tab overflow`

### Task 2: Widget kinds and block markers

**Files:** Create `lib/widgetKinds.ts`; modify `blocks/registerBlocks.ts`; test `tests/Unit/js/page_builder_lib.test.mjs`.

**Interfaces — Produces:** `type WidgetKind` (spec §1 list); `WIDGET_LABELS: Record<WidgetKind,string>`; `detectWidgetKind(info: { tagName: string; classes: string[]; attributes: Record<string,string>; childCount: number }): WidgetKind`; `describeComponent(component): { kind: WidgetKind; label: string }` in `Inspector/componentHelpers.ts` (reads tagName, classes, attributes, `components().length` from a GrapesJS component).

- [ ] **Step 1: Failing tests:** `data-mv-widget="faq"`→faq (wins over tag); `data-widget="doctors-list"`→doctors; `h3`→heading; `p`→text; `a` with class `btn`→button; `a` with inline style containing `background` and `padding`→button; plain `a`→text; `img`→image; `iframe` src youtube→video; src `google.com/maps`→map; `ul`→icon-list; `div` childCount 2→container; `div` childCount 0→generic; `section` childCount 0→container; `WIDGET_LABELS.text === 'Text Editor'`.
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** implement; add `data-mv-widget` to every block root in registerBlocks.ts (layout blocks → `container`). **Step 4:** `npm test`, `tsc`, build → PASS.
- [ ] **Step 5: Commit** — `Add widget kind detection and block markers`

### Task 3: Content router + Heading, Text, Button, Image panels

**Files:** Modify `Inspector/ContentTab.tsx`; create `Inspector/content/{HeadingContent,TextContent,ButtonContent,ImageContent,ElementSection}.tsx`, `lib/contentHelpers.ts`; tests in the lib test file.

**Interfaces — Consumes:** `describeComponent` (Task 2), `useStyleProp` (controls/), `openMediaLibrary(onPick)` (PageBuilder prop). **Produces:** `ContentPanelProps = { editor: Editor; component: Component; openMediaLibrary: (onPick: (url: string) => void) => void }`; `lib/contentHelpers.ts`: `buttonSizePreset(size: 'sm'|'md'|'lg'|'xl'): { padding: string; 'font-size': string }` (sm `8px 16px`/`13px`, md `12px 24px`/`15px`, lg `16px 32px`/`17px`, xl `20px 40px`/`19px`); `retagPlan(tag: string, allowed: string[]): string | null` (lowercases, returns null if not allowed).

- [ ] **Step 1: Failing tests** for `buttonSizePreset` values and `retagPlan('H3', ['h1','h2','h3'])==='h3'`, `retagPlan('script', …)===null`.
- [ ] **Step 2:** RED → implement helpers → GREEN.
- [ ] **Step 3:** ContentTab shows "Edit <label>" and routes by kind; unknown kinds → ElementSection only. ElementSection = existing ID/Title traits container (keep `#builder-traits-container` mounted). Heading: text, tag (h1–h6,p,div via `replaceWith` keeping attributes/classes/children; reselect the new component), link + new tab (wrap/unwrap inner `<a>`). Text: textarea when no child elements, else note + "Edit as plain text" (confirm). Button: text, href, new tab (`target=_blank` + `rel="noopener"`), size → `buttonSizePreset` via style write, full width (`display:block;width:100%`). Image: media pick → `src`, alt, link wrap/unwrap.
- [ ] **Step 4:** `npm test`, `tsc`, build pass. **Step 5: Commit** — `Add widget-specific Content panels for heading, text, button, image`

### Task 4: Video, Map, Icon list, FAQ, Icon, Container panels

**Files:** create `Inspector/content/{VideoContent,MapContent,IconListContent,FaqContent,IconContent,ContainerContent}.tsx`; extend `lib/contentHelpers.ts`; tests.

**Produces:** `toVideoEmbedUrl(url: string, o: { autoplay: boolean; mute: boolean; loop: boolean; controls: boolean }): string | null` (YouTube watch/short/youtu.be → `https://www.youtube.com/embed/<id>?…`; loop adds `playlist=<id>`; Vimeo → `https://player.vimeo.com/video/<id>?…`; else null); `toMapEmbedUrl(query: string, zoom: number): string` (`https://www.google.com/maps?q=<encodeURIComponent>&z=<1..20 clamped>&output=embed`).

- [ ] **Step 1: Failing tests:** `toVideoEmbedUrl('https://youtu.be/abc123', {autoplay:true,mute:true,loop:true,controls:false})` contains `/embed/abc123`, `autoplay=1`, `mute=1`, `loop=1`, `playlist=abc123`, `controls=0`; vimeo `https://vimeo.com/76979871` → `player.vimeo.com/video/76979871`; `toVideoEmbedUrl('https://example.com')===null`; `toMapEmbedUrl('Colombo 07', 25)` → `q=Colombo%2007&z=20&output=embed`.
- [ ] **Step 2:** RED → implement → GREEN.
- [ ] **Step 3:** Panels per spec table: icon-list/faq item editors add/remove/reorder child components (keep existing markup pattern of the block); Icon panel hosts the existing Medical Icon Picker (move it out of ContentTab); Container: tag (section/div/header/footer/article/aside via retag), content width Full/Boxed + max width (writes `max-width` + `margin-left/right:auto` on the inner wrapper if present, else on itself), min height (responsive, via useStyleProp), "Layout settings" button switching inspector to Style tab.
- [ ] **Step 4:** checks pass. **Step 5: Commit** — `Add Content panels for video, map, lists, FAQ, icon, container`

### Task 5: Dynamic widget panels

**Files:** create `Inspector/content/{DoctorsContent,SessionsContent,BookTokenContent,AnnouncementContent}.tsx`, `lib/dynamicWidgets.ts`; tests.

**Interfaces — Consumes:** builder props `doctors` / `upcomingSessions` (check `BuilderPageProps` in `types.ts`; the doctors block already renders from `doctors` in `registerBlocks(editor, doctors)`). **Produces:** `renderDoctorsHtml(doctors, { limit: number; layout: 'grid'|'list'; showFee: boolean }): string` and `renderSessionsHtml(sessions, { daysAhead: 7|14; max: number }): string` — inner HTML matching the existing block markup style; settings stored as `data-mv-limit`, `data-mv-layout`, `data-mv-show-fee`, `data-mv-days`, `data-mv-max` on the widget root.

- [ ] **Step 1: Failing tests:** `renderDoctorsHtml` with 5 doctors and limit 3 contains exactly 3 doctor names; showFee false omits fee text; escapes HTML in names (`<b>` → `&lt;b&gt;`); sessions max 2 renders 2.
- [ ] **Step 2:** RED → implement → GREEN.
- [ ] **Step 3:** Panels: changing a setting writes the data attributes and replaces the widget's inner components with the regenerated HTML. Book token: heading text, button text, button link. Announcement: text, link, tone (Info `#eff6ff/#1e40af`, Warning `#fffbeb/#92400e`, Success `#ecfdf5/#065f46` background/text).
- [ ] **Step 4:** checks pass. **Step 5: Commit** — `Add Content panels for MedVisit dynamic widgets`

### Task 6: Canvas outlines, badges, handles, drop areas

**Files:** modify `Pages/Website/PageBuilder.tsx` (editor config + `syncCanvasStyles`), create `canvas/editorCanvasCss.ts`, `canvas/toolbars.ts`.

**Interfaces — Consumes:** `describeComponent`. **Produces:** `editorCanvasCss(): string` (hover dashed 1px `#14b8a6`, selected solid 2px `#14b8a6`, badge styling, empty-container placeholder "Drag widget here" with `min-height: 80px` via `:empty::before`); `toolbarFor(kind: WidgetKind): ToolbarItem[]` (container: select-parent, move, duplicate, add-inside, delete; widget: edit, move, duplicate, delete) using GrapesJS commands `core:component-exit`, `tlb-move`, `tlb-clone`, `tlb-delete` and custom `mv:edit` (switch inspector to Content) / `mv:add-inside` (open Widgets tab).

- [ ] **Step 1:** Node test for `toolbarFor('container')` / `toolbarFor('heading')` command lists.
- [ ] **Step 2:** RED → implement → GREEN.
- [ ] **Step 3:** On `component:selected` / `component:add`, set the component toolbar from `toolbarFor(kind)` and, when no custom name exists, set the badge name from `WIDGET_LABELS`. Inject `editorCanvasCss()` into `#mv-editor-only`. Confirm via `editor.getHtml()` in a node-free manual note that no editor-only classes/attributes are exported (GrapesJS hover/selected classes are not exported).
- [ ] **Step 4:** checks pass. **Step 5: Commit** — `Add Elementor-style canvas outlines, handles and drop areas`

### Task 7: Breadcrumbs bar and "+ Add section"

**Files:** create `canvas/Breadcrumbs.tsx`, `canvas/AddSectionOverlay.tsx`, `canvas/LayoutPicker.tsx`, `lib/canvasHelpers.ts`; modify `PageBuilder.tsx` (replace page bar).

**Produces:** `breadcrumbPath(chain: { id: string; kind: WidgetKind; customName?: string }[]): { id: string; label: string }[]` (root first, body excluded, custom names win, max 6 with leading "…" when longer); `layoutPresetHtml(preset: '1'|'2'|'3'|'1-2'|'2-1'): string` (section + inner flex row + column divs with `data-mv-widget="container"`, column widths 100 / 50-50 / 33.33×3 / 33.33-66.67 / 66.67-33.33, gap 24px, stacks on mobile via the Phase 1 mobile breakpoint).

- [ ] **Step 1: Failing tests:** `breadcrumbPath` order + truncation; `layoutPresetHtml('1-2')` contains two columns with `33.33%` and `66.67%` and `data-mv-widget="container"`.
- [ ] **Step 2:** RED → implement → GREEN.
- [ ] **Step 3:** Breadcrumbs bar (page title first, crumbs clickable → `editor.select`, "⚙ Page settings" at right). AddSectionOverlay absolutely positioned over the canvas frame; computes top-level section rects from the frame (`editor.Canvas.getFrameEl()` offset + `el.getBoundingClientRect()`), recomputes on frame scroll, window resize, `device:select`, `component:add/remove`, `canvas:frame:load`; "+" between sections and a dashed "+ Add new section" zone after the last; LayoutPicker inserts `layoutPresetHtml` at index via `editor.getWrapper().components().add(html, { at })` and selects it.
- [ ] **Step 4:** checks pass. **Step 5: Commit** — `Add breadcrumbs bar and add-section overlay`

### Task 8: Right-click menu, clipboard, shortcuts

**Files:** create `canvas/ContextMenu.tsx`, `canvas/clipboard.ts`; modify `PageBuilder.tsx`; extend `lib/canvasHelpers.ts`; tests.

**Produces:** `clampMenuPosition(x, y, w, h, viewW, viewH): { x: number; y: number }`; `pickStyleForClipboard(rules: { media: string; state: string; style: Record<string,string> }[]): { media: string; state: string; style: Record<string,string> }[]` (drops empty styles, keeps all medias/states); `shouldHandleShortcut(target: { tagName: string; isContentEditable: boolean }): boolean` (false for INPUT, TEXTAREA, SELECT, contentEditable). `clipboard.ts`: `copyComponent(editor)`, `pasteComponent(editor, mode: 'after'|'inside')`, `copyStyle(editor)`, `pasteStyle(editor)` (writes each media/state rule onto the target's ID rule via `editor.Css.setRule('#id', style, { atRuleType: 'media', atRuleParams, state })`), `resetStyle(editor)` (removes the target's ID rules for all medias/states).

- [ ] **Step 1: Failing tests** for the three pure helpers (clamp near right/bottom edge; empty style dropped; desktop+mobile kept; INPUT → false, DIV → true, contentEditable → false).
- [ ] **Step 2:** RED → implement → GREEN.
- [ ] **Step 3:** `contextmenu` listener on the canvas frame document selects the hovered component and opens ContextMenu (Edit, Duplicate, Copy, Paste, Copy style, Paste style, Reset style, Navigator, Delete; Paste disabled when clipboard empty; "Paste inside" only for containers). Keyboard listener on window and frame document using `shouldHandleShortcut`: Ctrl/Cmd+C, V, D, Shift+C, Shift+V, Delete/Backspace. Close menu on Escape, click outside, scroll.
- [ ] **Step 4:** checks pass. **Step 5: Commit** — `Add right-click menu, clipboard and editing shortcuts`

### Task 9: Verification (controller)

- [ ] Full PHP suite, `npm test`, `tsc`, build, `grep -rni elementor resources/js app` → empty.
- [ ] Browser walkthrough per spec "Testing" on the worktree app (port 8010, DB `medvisit_pb_dev`, Vite 5181).
- [ ] Final whole-branch review; then merge `page-builder/phase1b` into the user's `medvisit` checkout after their OK.

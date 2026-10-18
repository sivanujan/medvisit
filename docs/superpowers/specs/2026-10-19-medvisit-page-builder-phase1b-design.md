# MedVisit Page Builder — Phase 1b Design (Elementor-style editing)

**Date:** 2026-10-19
**Builds on:** Phase 1 (`2026-10-18-medvisit-page-builder-phase1-design.md`), merged at `faf057b`.
**Scope chosen by user:** fix two bugs; widget-specific Content controls; Elementor-style canvas editing (hover outline, section/column handles, "+ add section", drop areas, right-click menu, breadcrumbs).

Behaviour is modelled on how Elementor's editor works; no Elementor code, names, or assets are used. UI keeps the MedVisit dark theme.

## Bugs

**B1 — "Unsaved Changes" on open.** Cause: the GrapesJS `load` handler re-applies the page CSS (`editor.setStyle(initialCss)`), kit styles, and custom-CSS styles; those fire `style:update` / `component:styleUpdate` / `component:add`, which `markDirty` treats as edits. Fix: dirty listeners ignore events while an `isLoadingRef` flag is set; the flag is cleared (and `isDirty` reset to false) after the load handler finishes and GrapesJS's initial UndoManager stack is cleared. The same guard wraps revision restore and page-template application (which are intentional edits and must still end dirty — they call `setIsDirty(true)` explicitly after the guarded load).

**B2 — overlapping "Page" label.** Cause: the left-panel tab strip (Widgets, Layers, Header, Footer, Page) overflows the panel and its "⚙ Page" tab draws over the canvas's page bar. Fix: left tabs become icon + short label that wrap to a second row when narrow (no overflow, `min-w-0`, `overflow-hidden`), and the theme tab is renamed "Theme" (it holds the clinic theme preset). The canvas page bar is replaced by the breadcrumbs bar (§3.6), whose right end keeps the "⚙ Page settings" button.

## 1. Widget recognition

Pure helper `resources/js/Components/PageBuilder/lib/widgetKinds.ts`:

```ts
type WidgetKind = 'container' | 'heading' | 'text' | 'button' | 'image' | 'video' | 'map'
  | 'icon-list' | 'faq' | 'icon' | 'doctors' | 'sessions' | 'book-token' | 'announcement' | 'generic';
detectWidgetKind(info: { tagName: string; classes: string[]; attributes: Record<string,string>; childCount: number; srcHint?: string }): WidgetKind
WIDGET_LABELS: Record<WidgetKind, string>  // "Heading", "Text Editor", "Button", "Image", "Video", "Google Map", "Icon List", "FAQ Accordion", "Icon", "Container", "Doctors List", "Sessions This Week", "Book Token Box", "Announcement", "Element"
```

Order of rules: `data-mv-widget` attribute wins; then legacy `data-widget` (`doctors-list`→doctors, `channeling-sessions`→sessions, `book-token-box`→book-token, `announcement-banner`→announcement); then tag heuristics: `h1`–`h6`→heading; `p`→text; `a`/`button` whose classes or inline style mark it as a button (`btn`, `button`, or has background + padding) → button; plain `a` inside text → text (not a widget); `img`→image; `iframe` with youtube/vimeo src→video, google maps src→map; `ul`/`ol` → icon-list; `details` or an element containing `details` children → faq; `svg` → icon; `section`, `header`, `footer`, `article`, or `div` with child components → container; else generic.

All Phase 1 blocks in `blocks/registerBlocks.ts` get `data-mv-widget="<kind>"` on their root element so new content is recognised exactly; existing pages rely on the heuristics. `HtmlSanitizer` already allows `data-*`.

The builder registers no new GrapesJS component types for this; the inspector calls `detectWidgetKind` on the selected component (tag, classes, attributes, child count) each selection.

## 2. Content controls per widget

`Inspector/ContentTab.tsx` becomes a router: header "Edit <Label>" + the panel for the detected kind (files under `Inspector/content/`). Panels edit the selected GrapesJS component through its API (`components()`, `set('content')`, `addAttributes`/`removeAttributes`, `replaceWith` for tag changes) so undo/redo and dirty tracking work. Every panel ends with a collapsed "Element" section holding the existing ID / Title traits.

| Kind | Fields |
|---|---|
| heading | Title text; HTML tag (H1–H6, p, div — changing tag keeps id, classes, attributes, children); Link URL + open in new tab (wraps text in / unwraps from `<a>`) |
| text | Text (textarea) when the element has no child elements; otherwise a note "Double-click the text on the canvas to edit it" plus a "Edit as plain text" button that flattens to text after confirm |
| button | Text; Link URL; open in new tab; Size (Small / Medium / Large / Extra large → writes padding + font-size through the Style mechanics on the current device); Full width toggle |
| image | Choose image (media library); Alt text; Link URL + new tab (wrap/unwrap `<a>`) |
| video | YouTube or Vimeo URL (converted to embed URL); Autoplay; Mute; Loop; Show controls |
| map | Address or place (→ `https://www.google.com/maps?q=<encoded>&z=<zoom>&output=embed`); Zoom 1–20; Height (px) |
| icon-list | Items (add, remove, reorder, edit text) |
| faq | Items (question + answer; add, remove, reorder) |
| icon | Pick from the existing 15 medical icons (current Medical Icon Picker moves here) |
| container | HTML tag (section, div, header, footer, article, aside); Content width (Full width / Boxed) + Boxed max width (px); Min height (px, responsive); a shortcut button "Layout settings" that opens Style › Layout |
| doctors | Number of doctors (1–12); Layout (Grid / List); Show fee — regenerates the block's inner HTML from the builder's current doctors data |
| sessions | Days ahead (7 / 14); Max sessions (1–20) — regenerates inner HTML from builder data |
| book-token | Heading text; Button text; Button link (default `/book`) |
| announcement | Text; Link URL; Tone (Info / Warning / Success) |
| generic | Element section only + existing traits |

Settings for doctors/sessions are stored as `data-mv-*` attributes on the widget root so the panel can re-read them. Public pages keep rendering the saved snapshot (live data is Phase 4).

Pure helpers (with node tests): `toVideoEmbedUrl(url, opts)`, `toMapEmbedUrl(query, zoom)`, `buttonSizePreset(size)`.

## 3. Canvas editing

All editor-only visuals live in the canvas-only style element (`#mv-editor-only`, never exported).

1. **Hover outline:** dashed 1px teal outline + small name badge (WIDGET_LABELS) on hovered element; selected element: solid 2px teal outline. Uses GrapesJS hover/selected classes and custom badge name (`component.getName` override via `custom-name` set from the detected kind when absent).
2. **Element handles (toolbar):** GrapesJS toolbar per selected component, restyled as a compact handle: Containers → [⬆ Select parent, ✥ Move, ⧉ Duplicate, ＋ Add widget inside (opens Widgets panel), 🗑 Delete]; widgets → [✎ Edit (Content tab), ✥ Move, ⧉ Duplicate, 🗑 Delete].
3. **"+ Add section":** a React overlay over the canvas shows a round "+" between top-level sections on hover and a large dashed "+ Add new section" drop zone after the last section. Clicking opens a layout picker (1 / 2 / 3 columns, 1/3+2/3, 2/3+1/3) and inserts that structure at that index. Overlay positions come from component element rects and update on canvas scroll, resize, device change, and component add/remove.
4. **Drop areas:** empty containers/columns show a dashed "Drag widget here" placeholder (editor-only `:empty` / min-height rule) so they stay visible and droppable.
5. **Right-click menu:** on a canvas element: Edit, Duplicate, Copy, Paste (after / inside when container), Copy style, Paste style, Reset style, Navigator (opens Layers), Delete. Clipboard = builder state (component JSON + the component's ID-rule styles for all devices/states). Paste style writes those styles to the target through the Style mechanics per device. Menu is positioned at the cursor, clamped inside the canvas, closed on Escape/click-away/scroll.
6. **Breadcrumbs bar** (replaces the page bar): `Page title › Section › Container › Heading` from the selected component's ancestors (labels from WIDGET_LABELS); clicking a crumb selects it; right end: "⚙ Page settings".
7. **Shortcuts:** Ctrl/Cmd+C copy, Ctrl/Cmd+V paste, Ctrl/Cmd+D duplicate, Ctrl/Cmd+Shift+C / V copy/paste style, Delete/Backspace delete (ignored while typing in inputs or inline text editing).

Pure helpers (node tests): `breadcrumbPath(chain)`, `clampMenuPosition(x, y, menuW, menuH, viewW, viewH)`, `pickStyleForClipboard(rulesByMedia)`, `layoutPresetHtml(preset)`.

## Testing

- Node tests for every pure helper above.
- PHP: none expected (no server changes); full suite must stay green.
- Controller browser walkthrough: open page (no Unsaved badge), left tabs not overlapping, select heading/button/image/container and edit Content fields, hover outlines + handles, add section between sections and at end, drag a widget into an empty column, right-click copy/paste/paste style, breadcrumbs selection, shortcuts; save and confirm published output has no editor-only markup.

## Out of scope

New widgets, template library, global header/footer sections, live dynamic data, single-left-panel layout redesign (Phase 2+).

import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoadGuard } from '../../../resources/js/Components/PageBuilder/lib/loadGuard.ts';

test('load guard starts loading when asked and stops on release', () => {
    const guard = createLoadGuard(true);
    assert.equal(guard.isLoading(), true);
    guard.release();
    assert.equal(guard.isLoading(), false);
});

test('load guard marks programmatic work as loading and restores afterwards', () => {
    const guard = createLoadGuard(false);
    let seen = null;
    const result = guard.run(() => {
        seen = guard.isLoading();
        return 42;
    });
    assert.equal(seen, true);
    assert.equal(result, 42);
    assert.equal(guard.isLoading(), false);
});

test('load guard handles nesting and exceptions', () => {
    const guard = createLoadGuard(false);
    guard.run(() => {
        guard.run(() => {});
        assert.equal(guard.isLoading(), true, 'still loading after inner run ends');
    });
    assert.throws(() => guard.run(() => { throw new Error('boom'); }), /boom/);
    assert.equal(guard.isLoading(), false, 'exception must not leave the guard stuck');
});

import { detectWidgetKind, WIDGET_LABELS } from '../../../resources/js/Components/PageBuilder/lib/widgetKinds.ts';

const info = (tagName, extra = {}) => ({ tagName, classes: [], attributes: {}, childCount: 0, ...extra });

test('data-mv-widget wins over tag heuristics', () => {
    assert.equal(detectWidgetKind(info('div', { attributes: { 'data-mv-widget': 'faq' }, childCount: 3 })), 'faq');
});

test('legacy data-widget markers map to dynamic kinds', () => {
    assert.equal(detectWidgetKind(info('section', { attributes: { 'data-widget': 'doctors-list' } })), 'doctors');
    assert.equal(detectWidgetKind(info('section', { attributes: { 'data-widget': 'channeling-sessions' } })), 'sessions');
    assert.equal(detectWidgetKind(info('section', { attributes: { 'data-widget': 'book-token-box' } })), 'book-token');
    assert.equal(detectWidgetKind(info('div', { attributes: { 'data-widget': 'announcement-banner' } })), 'announcement');
});

test('tag heuristics recognise common widgets', () => {
    assert.equal(detectWidgetKind(info('h3')), 'heading');
    assert.equal(detectWidgetKind(info('P')), 'text');
    assert.equal(detectWidgetKind(info('a', { classes: ['btn'] })), 'button');
    assert.equal(detectWidgetKind(info('a', { attributes: { style: 'background:#0E9E8F; padding: 12px 24px' } })), 'button');
    assert.equal(detectWidgetKind(info('a')), 'text');
    assert.equal(detectWidgetKind(info('img')), 'image');
    assert.equal(detectWidgetKind(info('iframe', { attributes: { src: 'https://www.youtube.com/embed/abc' } })), 'video');
    assert.equal(detectWidgetKind(info('iframe', { attributes: { src: 'https://www.google.com/maps?q=x&output=embed' } })), 'map');
    assert.equal(detectWidgetKind(info('ul')), 'icon-list');
    assert.equal(detectWidgetKind(info('svg')), 'icon');
    assert.equal(detectWidgetKind(info('div', { childCount: 2 })), 'container');
    assert.equal(detectWidgetKind(info('div')), 'generic');
    assert.equal(detectWidgetKind(info('section')), 'container');
});

test('widget labels are the user-facing names', () => {
    assert.equal(WIDGET_LABELS.text, 'Text Editor');
    assert.equal(WIDGET_LABELS.map, 'Google Map');
    assert.equal(WIDGET_LABELS.generic, 'Element');
});

import { buttonSizePreset, retagPlan } from '../../../resources/js/Components/PageBuilder/lib/contentHelpers.ts';

test('button size presets set padding and font size', () => {
    assert.deepEqual(buttonSizePreset('sm'), { padding: '8px 16px', 'font-size': '13px' });
    assert.deepEqual(buttonSizePreset('md'), { padding: '12px 24px', 'font-size': '15px' });
    assert.deepEqual(buttonSizePreset('lg'), { padding: '16px 32px', 'font-size': '17px' });
    assert.deepEqual(buttonSizePreset('xl'), { padding: '20px 40px', 'font-size': '19px' });
});

test('retagPlan only allows listed tags', () => {
    assert.equal(retagPlan('H3', ['h1', 'h2', 'h3']), 'h3');
    assert.equal(retagPlan('script', ['h1', 'h2', 'h3']), null);
    assert.equal(retagPlan('', ['div']), null);
});

import { escapeHtml, linkAttributes } from '../../../resources/js/Components/PageBuilder/lib/contentHelpers.ts';

test('escapeHtml neutralises markup in typed text', () => {
    assert.equal(escapeHtml('Tom & <b>"Jerry"</b>'), 'Tom &amp; &lt;b&gt;&quot;Jerry&quot;&lt;/b&gt;');
});

test('linkAttributes adds target and rel only for new tab', () => {
    assert.deepEqual(linkAttributes('/book', false), { href: '/book' });
    assert.deepEqual(linkAttributes('https://x.lk', true), { href: 'https://x.lk', target: '_blank', rel: 'noopener' });
});

test('linkAttributes refuses javascript: urls', () => {
    assert.deepEqual(linkAttributes(' JavaScript:alert(1)', false), { href: '#' });
});

import { toVideoEmbedUrl, toMapEmbedUrl } from '../../../resources/js/Components/PageBuilder/lib/contentHelpers.ts';

test('toVideoEmbedUrl converts YouTube links with options', () => {
    const url = toVideoEmbedUrl('https://youtu.be/abc123', { autoplay: true, mute: true, loop: true, controls: false });
    assert.match(url, /^https:\/\/www\.youtube\.com\/embed\/abc123\?/);
    for (const part of ['autoplay=1', 'mute=1', 'loop=1', 'playlist=abc123', 'controls=0']) assert.ok(url.includes(part), part);
    assert.match(toVideoEmbedUrl('https://www.youtube.com/watch?v=XyZ_9', { autoplay: false, mute: false, loop: false, controls: true }), /\/embed\/XyZ_9/);
    assert.match(toVideoEmbedUrl('https://www.youtube.com/shorts/s1', { autoplay: false, mute: false, loop: false, controls: true }), /\/embed\/s1/);
});

test('toVideoEmbedUrl converts Vimeo and rejects other sites', () => {
    assert.match(toVideoEmbedUrl('https://vimeo.com/76979871', { autoplay: false, mute: false, loop: false, controls: true }), /^https:\/\/player\.vimeo\.com\/video\/76979871/);
    assert.equal(toVideoEmbedUrl('https://example.com/v', { autoplay: false, mute: false, loop: false, controls: true }), null);
});

test('toMapEmbedUrl encodes the place and clamps zoom', () => {
    assert.equal(toMapEmbedUrl('Colombo 07', 25), 'https://www.google.com/maps?q=Colombo%2007&z=20&output=embed');
    assert.equal(toMapEmbedUrl('Kandy', 0), 'https://www.google.com/maps?q=Kandy&z=1&output=embed');
});

import { renderDoctorsHtml, renderSessionsHtml } from '../../../resources/js/Components/PageBuilder/lib/dynamicWidgets.ts';

const doctorList = [1, 2, 3, 4, 5].map((i) => ({ id: i, name: `Dr. Person ${i}`, specialty: 'Physician', doctor_fee: 250000, clinic_fee: 50000 }));

test('renderDoctorsHtml respects the limit', () => {
    const html = renderDoctorsHtml(doctorList, { limit: 3, layout: 'grid', showFee: true });
    assert.equal((html.match(/Dr\. Person/g) || []).length, 3);
    assert.match(html, /repeat\(3, 1fr\)/);
    assert.match(html, /Rs\. 3,000\.00/);
});

test('renderDoctorsHtml hides fees and switches to list layout', () => {
    const html = renderDoctorsHtml(doctorList, { limit: 2, layout: 'list', showFee: false });
    assert.doesNotMatch(html, /Rs\./);
    assert.match(html, /grid-template-columns: 1fr/);
});

test('renderDoctorsHtml escapes doctor names', () => {
    const html = renderDoctorsHtml([{ id: 9, name: '<b>X</b>', specialty: 'A & B' }], { limit: 3, layout: 'grid', showFee: false });
    assert.match(html, /&lt;b&gt;X&lt;\/b&gt;/);
    assert.match(html, /A &amp; B/);
});

test('renderSessionsHtml filters by days ahead and max', () => {
    const sessions = [
        { id: 1, doctor: { name: 'Dr. A', specialty: 'S' }, session_date: '2026-10-20', start_time: '16:30:00', room_number: 'Suite 1' },
        { id: 2, doctor: { name: 'Dr. B', specialty: 'S' }, session_date: '2026-10-22', start_time: '09:00:00' },
        { id: 3, doctor: { name: 'Dr. C', specialty: 'S' }, session_date: '2026-10-30', start_time: '10:00:00' },
    ];
    const week = renderSessionsHtml(sessions, { daysAhead: 7, max: 20, today: '2026-10-19' });
    assert.match(week, /Dr\. A/);
    assert.match(week, /Dr\. B/);
    assert.doesNotMatch(week, /Dr\. C/);
    const two = renderSessionsHtml(sessions, { daysAhead: 14, max: 2, today: '2026-10-19' });
    assert.equal((two.match(/<tr/g) || []).length, 2);
});

import { toolbarFor, editorCanvasCss, editorChromeCss } from '../../../resources/js/Components/PageBuilder/lib/canvasToolbars.ts';

test('containers get select-parent, move, duplicate, add-inside and delete handles', () => {
    assert.deepEqual(toolbarFor('container').map((t) => t.command), ['core:component-exit', 'tlb-move', 'tlb-clone', 'mv:add-inside', 'tlb-delete']);
});

test('widgets get edit, move, duplicate and delete handles', () => {
    assert.deepEqual(toolbarFor('heading').map((t) => t.command), ['mv:edit', 'tlb-move', 'tlb-clone', 'tlb-delete']);
    assert.ok(toolbarFor('heading').every((t) => t.title.length > 0));
});

test('editor canvas css outlines selection and labels empty drop areas', () => {
    const css = editorCanvasCss();
    assert.match(css, /\.gjs-selected/);
    assert.match(css, /Drag widget here/);
    assert.match(editorChromeCss(), /\.gjs-badge/);
    assert.match(editorChromeCss(), /\.gjs-toolbar/);
});

import { breadcrumbPath, layoutPresetHtml } from '../../../resources/js/Components/PageBuilder/lib/canvasHelpers.ts';

test('breadcrumbPath labels ancestors root first, custom names win', () => {
    const path = breadcrumbPath([
        { id: 'a', kind: 'container' },
        { id: 'b', kind: 'container', customName: 'Hero' },
        { id: 'c', kind: 'heading' },
    ]);
    assert.deepEqual(path, [
        { id: 'a', label: 'Container' },
        { id: 'b', label: 'Hero' },
        { id: 'c', label: 'Heading' },
    ]);
});

test('breadcrumbPath truncates long chains with an ellipsis crumb', () => {
    const chain = Array.from({ length: 9 }, (_, i) => ({ id: String(i), kind: 'container' }));
    const path = breadcrumbPath(chain);
    assert.equal(path.length, 6);
    assert.deepEqual(path[0], { id: '', label: '…' });
    assert.equal(path[5].id, '8');
});

test('layoutPresetHtml builds columns with the right widths', () => {
    const html = layoutPresetHtml('1-2');
    assert.match(html, /33\.33%/);
    assert.match(html, /66\.67%/);
    assert.ok((html.match(/data-mv-widget="container"/g) || []).length >= 3);
    assert.equal((layoutPresetHtml('3').match(/33\.33%/g) || []).length, 3);
    assert.match(layoutPresetHtml('1'), /100%/);
});

import { clampMenuPosition, pickStyleForClipboard, shouldHandleShortcut } from '../../../resources/js/Components/PageBuilder/lib/canvasHelpers.ts';

test('clampMenuPosition keeps the menu inside the canvas', () => {
    assert.deepEqual(clampMenuPosition(50, 60, 200, 300, 1000, 800), { x: 50, y: 60 });
    assert.deepEqual(clampMenuPosition(950, 700, 200, 300, 1000, 800), { x: 792, y: 492 });
    assert.deepEqual(clampMenuPosition(-20, -5, 200, 300, 1000, 800), { x: 8, y: 8 });
});

test('pickStyleForClipboard keeps every device and state, drops empty rules', () => {
    const picked = pickStyleForClipboard([
        { media: '', state: '', style: { color: 'red' } },
        { media: '(max-width: 480px)', state: '', style: { 'font-size': '14px' } },
        { media: '', state: 'hover', style: {} },
    ]);
    assert.deepEqual(picked, [
        { media: '', state: '', style: { color: 'red' } },
        { media: '(max-width: 480px)', state: '', style: { 'font-size': '14px' } },
    ]);
});

test('shortcuts are ignored while typing', () => {
    assert.equal(shouldHandleShortcut({ tagName: 'INPUT', isContentEditable: false }), false);
    assert.equal(shouldHandleShortcut({ tagName: 'textarea', isContentEditable: false }), false);
    assert.equal(shouldHandleShortcut({ tagName: 'SELECT', isContentEditable: false }), false);
    assert.equal(shouldHandleShortcut({ tagName: 'DIV', isContentEditable: true }), false);
    assert.equal(shouldHandleShortcut({ tagName: 'DIV', isContentEditable: false }), true);
});

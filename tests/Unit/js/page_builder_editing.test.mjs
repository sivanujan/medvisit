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

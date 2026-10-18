import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify, isValidSlug } from '../../../resources/js/Components/PageBuilder/lib/slug.ts';
import { resolveResponsive } from '../../../resources/js/Components/PageBuilder/lib/responsive.ts';
import { kitToCss } from '../../../resources/js/Components/PageBuilder/lib/kit.ts';
import { parseUnitValue, formatUnitValue, formatShadow, parseShadow, formatGradient, parseGradient, extractUrl, formatImageBackground, parseImageBackground, isLayoutContainer } from '../../../resources/js/Components/PageBuilder/lib/cssValues.ts';
import { usedFontFamilies, googleFontsUrl } from '../../../resources/js/Components/PageBuilder/lib/fonts.ts';

const preset = (d, m, weight = 400) => ({ size: { desktop: d, mobile: m }, weight, lineHeight: 1.4 });
const sampleKit = {
  colors: [{ id: 'primary', name: 'Primary', value: '#0E9E8F' }],
  retired: [{ id: 'custom-old', name: 'Old', value: '#FF0000' }],
  fonts: { heading: 'Poppins', body: 'Inter' },
  typography: {
    h1: preset('48px', '32px', 700), h2: preset('36px', '28px', 700), h3: preset('28px', '24px', 600),
    h4: preset('24px', '20px', 600), h5: preset('20px', '18px', 600), h6: preset('16px', '16px', 600),
    body: preset('16px', '15px'), button: preset('16px', '16px', 600),
  },
};

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
  const css = kitToCss(sampleKit);
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

test('parseUnitValue / formatUnitValue', () => {
  assert.deepEqual(parseUnitValue('1.5rem'), { number: 1.5, unit: 'rem' });
  assert.deepEqual(parseUnitValue('-12px'), { number: -12, unit: 'px' });
  assert.deepEqual(parseUnitValue('100%'), { number: 100, unit: '%' });
  assert.deepEqual(parseUnitValue('auto'), { number: null, unit: 'auto' });
  assert.equal(formatUnitValue(2, 'em'), '2em');
});

test('formatShadow / parseShadow', () => {
  assert.equal(formatShadow({ x: 0, y: 4, blur: 12, spread: 0, color: '#0003' }), '0px 4px 12px 0px #0003');
  assert.equal(formatShadow({ x: 1, y: 2, blur: 3, color: '#000' }), '1px 2px 3px #000');
  assert.deepEqual(parseShadow('0px 4px 12px 0px rgba(0, 0, 0, 0.2)'), { x: 0, y: 4, blur: 12, spread: 0, color: 'rgba(0, 0, 0, 0.2)' });
  assert.deepEqual(parseShadow('1px 2px 3px #000'), { x: 1, y: 2, blur: 3, color: '#000' });
  assert.equal(parseShadow('none'), null);
});

test('gradient and url helpers', () => {
  assert.equal(formatGradient({ angle: 90, from: '#fff', to: '#000' }), 'linear-gradient(90deg, #fff, #000)');
  assert.deepEqual(parseGradient('linear-gradient(45deg, rgba(0, 0, 0, 0.5), #fff)'), { angle: 45, from: 'rgba(0, 0, 0, 0.5)', to: '#fff' });
  assert.equal(parseGradient('url(a.png)'), null);
  assert.equal(extractUrl('url("/storage/a b.png")'), '/storage/a b.png');
  assert.equal(extractUrl('none'), '');
});

test('image background with overlay round-trips', () => {
  const css = formatImageBackground('/a.png', 'rgba(0, 0, 0, 0.4)');
  assert.equal(css, 'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("/a.png")');
  assert.deepEqual(parseImageBackground(css), { url: '/a.png', overlay: 'rgba(0, 0, 0, 0.4)' });
  assert.deepEqual(parseImageBackground(formatImageBackground('/b.png')), { url: '/b.png', overlay: '' });
});

test('isLayoutContainer', () => {
  assert.equal(isLayoutContainer('section', 0), true);
  assert.equal(isLayoutContainer('DIV', 2), true);
  assert.equal(isLayoutContainer('div', 0), false);
  assert.equal(isLayoutContainer('h1', 3), false);
});

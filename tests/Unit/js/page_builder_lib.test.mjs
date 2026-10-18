import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify, isValidSlug } from '../../../resources/js/Components/PageBuilder/lib/slug.ts';
import { resolveResponsive } from '../../../resources/js/Components/PageBuilder/lib/responsive.ts';
import { kitToCss } from '../../../resources/js/Components/PageBuilder/lib/kit.ts';
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

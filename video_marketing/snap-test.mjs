import puppeteer from 'puppeteer';
import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const EXPORT_DIR = path.join(ROOT_DIR, 'promo-30s', 'export');
const STILLS_DIR = path.join(EXPORT_DIR, 'stills');
await mkdir(STILLS_DIR, { recursive: true });

async function snapStills(name, htmlFile, width, height, times) {
  const fileUrl = pathToFileURL(path.join(ROOT_DIR, 'promo-30s', htmlFile)).href + '?clean=1';
  console.log(`Checking ${name}: ${fileUrl}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--enable-gpu', '--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(fileUrl, { waitUntil: 'load', timeout: 60000 });

  await page.waitForFunction('window.OPENER && window.OPENER.ready', { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);

  for (const st of times) {
    await page.evaluate((t) => { window.OPENER.seek(t); }, st.time);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const outPath = path.join(STILLS_DIR, `${name}_${st.name}.png`);
    await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width, height } });
    console.log(`Saved: ${outPath}`);
  }

  await browser.close();
}

await snapStills('16x9', 'index.html', 1920, 1080, [
  { time: 2.5, name: 'scene1_hook' },
  { time: 5.5, name: 'scene2_brand' },
  { time: 11.8, name: 'scene3_booking_otp' },
  { time: 16.5, name: 'scene4_live_queue' },
  { time: 22.0, name: 'scene5_doctor_tools' },
  { time: 27.5, name: 'scene6_cta' }
]);

await snapStills('9x16', 'reels.html', 1080, 1920, [
  { time: 5.5, name: 'scene2_brand' },
  { time: 11.8, name: 'scene3_booking_otp' },
  { time: 16.5, name: 'scene4_live_queue' },
  { time: 27.5, name: 'scene6_cta' }
]);

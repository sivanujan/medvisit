import puppeteer from 'puppeteer';
import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const EXPORT_DIR = path.join(ROOT_DIR, 'promo-30s', 'export');
const STILLS_DIR = path.join(EXPORT_DIR, 'stills');

await mkdir(STILLS_DIR, { recursive: true });

async function renderVideo({ name, htmlFile, width, height, fps = 30, duration = 30, stillTimes = [] }) {
  console.log(`\n==================================================`);
  console.log(`Starting render for ${name} (${width}x${height} @ ${fps}fps, ${duration}s)`);
  console.log(`==================================================`);

  const framesDir = path.join(EXPORT_DIR, `frames_${name}`);
  await mkdir(framesDir, { recursive: true });

  const fileUrl = pathToFileURL(path.join(ROOT_DIR, 'promo-30s', htmlFile)).href + '?clean=1';
  console.log(`Loading URL: ${fileUrl}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--enable-gpu', '--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(fileUrl, { waitUntil: 'load', timeout: 60000 });

  await page.waitForFunction('window.OPENER && window.OPENER.ready', { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { window.OPENER.seek(0); });

  // 1. Capture requested Still Frames
  for (const st of stillTimes) {
    await page.evaluate((t) => {
      window.OPENER.seek(t);
    }, st.time);
    // double rAF
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

    const stillPath = path.join(STILLS_DIR, `${name}_${st.name}.png`);
    await page.screenshot({ path: stillPath, clip: { x: 0, y: 0, width, height } });
    console.log(`✓ Captured still frame: ${path.basename(stillPath)} (at ${st.time}s)`);
  }

  // 2. Render all frames
  const totalFrames = Math.ceil(duration * fps);
  console.log(`Rendering ${totalFrames} frames...`);

  for (let i = 0; i < totalFrames; i++) {
    const t = i / fps;
    await page.evaluate((time) => {
      window.OPENER.seek(time);
    }, t);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

    const frameFile = path.join(framesDir, `f_${String(i).padStart(5, '0')}.png`);
    await page.screenshot({
      path: frameFile,
      clip: { x: 0, y: 0, width, height },
      optimizeForSpeed: true
    });

    if (i % (fps * 2) === 0 || i === totalFrames - 1) {
      process.stdout.write(`\rRendered ${i + 1}/${totalFrames} frames (${t.toFixed(1)}s / ${duration}s)`);
    }
  }

  await browser.close();
  console.log(`\nFrames rendered. Encoding to MP4 via FFmpeg...`);

  const mp4Path = path.join(EXPORT_DIR, `medvisit-promo-${name}.mp4`);
  const ffmpegCmd = `ffmpeg -y -framerate ${fps} -i "${path.join(framesDir, 'f_%05d.png')}" -c:v libx264 -pix_fmt yuv420p -crf 18 -preset fast "${mp4Path}"`;
  
  execSync(ffmpegCmd, { stdio: 'inherit' });
  console.log(`✓ Video generated: ${mp4Path}`);
}

// 1. Render 16:9 Promo
await renderVideo({
  name: '16x9',
  htmlFile: 'index.html',
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 30,
  stillTimes: [
    { time: 5.5, name: 'brand_reveal' },
    { time: 11.8, name: 'booking_otp' },
    { time: 16.5, name: 'live_queue_sync' },
    { time: 27.5, name: 'call_to_action' }
  ]
});

// 2. Render 9:16 Reels Promo
await renderVideo({
  name: '9x16',
  htmlFile: 'reels.html',
  width: 1080,
  height: 1920,
  fps: 30,
  duration: 30,
  stillTimes: [
    { time: 5.5, name: 'brand_reveal' },
    { time: 11.8, name: 'booking_otp' },
    { time: 16.5, name: 'live_queue_sync' },
    { time: 27.5, name: 'call_to_action' }
  ]
});

console.log('\nAll renders and still frames completed successfully!');

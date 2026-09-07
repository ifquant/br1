import { chromium } from '@playwright/test';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const html = join(root, 'reading-concepts.html');
const arguments_ = process.argv.slice(2);
const unknownOptions = arguments_.filter((argument) => argument.startsWith('--') && argument !== '--posters');
if (unknownOptions.length) throw new Error(`unknown option: ${unknownOptions[0]}`);
const outputParents = arguments_.filter((argument) => !argument.startsWith('--'));
if (outputParents.length > 1) throw new Error('usage: render-reading-concepts.mjs [output-parent] [--posters]');
const outputParent = resolve(outputParents[0] ?? tmpdir());
await mkdir(outputParent, { recursive: true });
const frameRoot = await mkdtemp(join(outputParent, 'br1-reading-concepts-'));
const posterRoot = arguments_.includes('--posters') ? join(frameRoot, 'posters') : null;
const fps = 12;
const frames = 20 * fps;

async function assertPlaybackControls(page) {
  await page.waitForTimeout(80);
  await page.evaluate(() => window.setReadingConceptPlayback(false));
  const pausedAt = await page.evaluate(() => window.getReadingConceptTime());
  await page.waitForTimeout(80);
  const stillPausedAt = await page.evaluate(() => window.getReadingConceptTime());
  if (Math.abs(stillPausedAt - pausedAt) > 0.005) throw new Error('Pause did not preserve the current frame');
  await page.evaluate(() => window.setReadingConceptPlayback(true));
  await page.waitForTimeout(80);
  const resumedAt = await page.evaluate(() => window.getReadingConceptTime());
  if (resumedAt <= pausedAt + 0.03) throw new Error('Play did not continue after Pause');
  await page.evaluate(() => window.setReadingConceptPlayback(false));
}

if (posterRoot) await mkdir(posterRoot, { recursive: true });

const browser = await chromium.launch();
try {
  for (const story of ['war', 'grimm']) {
    // The demo page has 16 px outer padding on both sides; this yields a 1200 px canvas screenshot.
    const page = await browser.newPage({ viewport: { width: 1232, height: 800 }, deviceScaleFactor: 1 });
    await page.goto(`${pathToFileURL(html).href}?story=${story}`);
    // Keep a runnable check beside the capture path: Pause must hold position, and Play must resume it.
    await assertPlaybackControls(page);
    // Freeze the live demo before deterministic rendering so requestAnimationFrame cannot repaint a captured frame.
    await page.evaluate(() => window.setReadingConceptPlayback(false));
    const size = await page.evaluate(() => window.getReadingConceptSize());
    if (size.width !== 1200 || size.height !== 720 || size.seconds !== 20 || size.fps !== fps) throw new Error('Unexpected concept canvas contract');
    const directory = join(frameRoot, story);
    await mkdir(directory);
    // Each frame gets an exact timestamp so headless timing cannot alter the GIF.
    for (let index = 0; index < frames; index += 1) {
      const renderedPhase = await page.evaluate(({ story, time }) => window.renderReadingConcept(story, time), { story, time: index / fps });
      if (renderedPhase !== Math.floor(index / 60)) throw new Error(`Wrong phase at frame ${index}: ${renderedPhase}`);
      await page.locator('#concept').screenshot({ path: join(directory, `${String(index).padStart(3, '0')}.png`) });
    }
    if (posterRoot) {
      // Capture framing at desktop and mobile widths; inspect small labels at full size.
      for (const [name, viewport] of [['desktop', { width: 1232, height: 800 }], ['mobile', { width: 390, height: 844 }]]) {
        await page.setViewportSize(viewport);
        const renderedPhase = await page.evaluate(({ story }) => window.renderReadingConcept(story, 12.5), { story });
        if (renderedPhase !== 2) throw new Error(`Poster rendered phase ${renderedPhase}, expected 2`);
        await page.screenshot({ path: join(posterRoot, `${story}-${name}.png`), fullPage: true });
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(frameRoot);

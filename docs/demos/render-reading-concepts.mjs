import { chromium } from '@playwright/test';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const html = join(root, 'reading-concepts.html');
const arguments_ = process.argv.slice(2);
const unknown = arguments_.filter((argument) => argument.startsWith('--') && argument !== '--posters');
if (unknown.length) throw new Error(`unknown option: ${unknown[0]}`);
const outputParents = arguments_.filter((argument) => !argument.startsWith('--'));
if (outputParents.length > 1) throw new Error('usage: render-reading-concepts.mjs [output-parent] [--posters]');
const outputParent = resolve(outputParents[0] ?? tmpdir());
await mkdir(outputParent, { recursive: true });
const frameRoot = await mkdtemp(join(outputParent, 'br1-reading-concepts-'));
const posterRoot = arguments_.includes('--posters') ? join(frameRoot, 'posters') : null;
const seconds = 12;
const fps = 10;
const frames = seconds * fps;

async function waitForArt(page) {
  await page.evaluate(() => window.readingConceptAssetsReady);
  if (await page.locator('#load-error').isVisible()) throw new Error('Concept artwork reported a loading error');
}

async function assertControls(page, story) {
  if (!(await page.locator('#concept-caption').textContent()).trim()) throw new Error('Initial scene caption was not set');
  await page.evaluate(() => window.setReadingConceptPlayback(false));
  const paused = await page.evaluate(() => window.getReadingConceptTime());
  await page.waitForTimeout(80);
  if (Math.abs(await page.evaluate(() => window.getReadingConceptTime()) - paused) > 0.005) throw new Error('Pause did not hold time');
  await page.getByRole('button', { name: 'Play' }).click();
  await page.waitForTimeout(80);
  if (await page.evaluate(() => window.getReadingConceptTime()) <= paused + 0.03) throw new Error('Play did not resume time');
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Restart' }).click();
  if (await page.evaluate(() => window.getReadingConceptTime()) > 0.15) throw new Error('Restart did not reset time');
  await page.evaluate(() => { window.setReadingConceptPlayback(false); window.renderReadingConcept('war', 0); });
  const beforeStoryChange = await page.locator('#concept').screenshot();
  await page.getByLabel('Story').selectOption('grimm');
  if (await page.evaluate(() => document.querySelector('#story-selector').value) !== 'grimm') throw new Error('Story selector did not change story');
  if (beforeStoryChange.equals(await page.locator('#concept').screenshot())) throw new Error('Story selector did not redraw artwork');
  if (!(await page.locator('#concept-caption').textContent()).includes('frog comes to the castle')) throw new Error('Story selector did not update caption');
  await page.evaluate(() => window.setReadingConceptPlayback(false));
}

async function assertReducedMotion(browser) {
  const page = await browser.newPage({ viewport: { width: 352, height: 400 }, reducedMotion: 'reduce' });
  await page.goto(pathToFileURL(html).href);
  await waitForArt(page);
  const paused = await page.evaluate(() => window.getReadingConceptTime());
  await page.waitForTimeout(80);
  if (Math.abs(await page.evaluate(() => window.getReadingConceptTime()) - paused) > 0.005) throw new Error('Reduced motion did not start paused');
  if (await page.getByRole('button', { name: 'Play' }).count() !== 1) throw new Error('Reduced motion did not expose Play');
  await page.close();
}

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHROME_CHANNEL || undefined });
try {
  await assertReducedMotion(browser);
  if (posterRoot) await mkdir(posterRoot, { recursive: true });
  for (const story of ['war', 'grimm']) {
    const page = await browser.newPage({ viewport: { width: 512, height: 500 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${pathToFileURL(html).href}?story=${story}`);
    await waitForArt(page);
    await assertControls(page, story);
    const size = await page.evaluate(() => window.getReadingConceptSize());
    if (size.width !== 480 || size.height !== 270 || size.seconds !== seconds || size.fps !== fps) throw new Error('Unexpected concept canvas contract');
    const captureCaption = await page.evaluate(() => {
      window.renderReadingConcept('grimm', 9);
      return document.querySelector('#concept-caption').textContent;
    });
    if (!captureCaption.includes('A promise kept')) throw new Error('Capture API did not update phase caption');
    const directory = join(frameRoot, story);
    await mkdir(directory);
    for (let index = 0; index < frames; index += 1) {
      const phase = await page.evaluate(({ story, time }) => window.renderReadingConcept(story, time), { story, time: index / fps });
      if (phase !== Math.floor(index / (fps * 3))) throw new Error('Unexpected scene phase');
      await page.locator('#concept').screenshot({ path: join(directory, `${String(index).padStart(3, '0')}.png`) });
    }
    if (posterRoot) {
      for (const [name, viewport] of [['desktop', { width: 992, height: 700 }], ['mobile', { width: 390, height: 844 }]]) {
        await page.setViewportSize(viewport);
        await page.evaluate(({ story }) => window.renderReadingConcept(story, 9), { story });
        await page.screenshot({ path: join(posterRoot, `${story}-${name}.png`), fullPage: true });
      }
    }
    if (errors.length) throw new Error(errors.join('\n'));
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(frameRoot);

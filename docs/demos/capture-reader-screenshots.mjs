import { chromium, expect } from '@playwright/test';
import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Supply the unmodified Gutenberg EPUB; no library fixtures or persisted user
// profile are loaded. Routing supplies book bytes, not simulated app responses.
const book = process.argv[2];
if (!book) throw new Error('Usage: node docs/demos/capture-reader-screenshots.mjs <pride-and-prejudice.epub>');
await access(book);
const images = resolve(dirname(fileURLToPath(import.meta.url)), '../images');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.route('**/books/pride-and-prejudice.epub', route => route.fulfill({
    path: resolve(book), contentType: 'application/epub+zip',
  }));
  await page.goto('http://127.0.0.1:1420/reader?' + new URLSearchParams({
    source: 'asset', url: '/books/pride-and-prejudice.epub', label: 'Pride and Prejudice', mode: 'window',
  }));
  await page.getByLabel('目录预览').getByRole('button', { name: 'Chapter I.', exact: true }).click();
  const stage = page.getByLabel('reader stage', { exact: true });
  await expect(stage).toContainText('Chapter I.');
  await stage.scrollIntoViewIfNeeded();
  await stage.hover({ position: { x: 500, y: 15 } });
  await page.waitForTimeout(1500);
  await stage.screenshot({ path: resolve(images, 'br1-reading-english.png') });

  // A native text selection enters the same selectionchange path as a drag.
  // This is Austen's actual first paragraph, not an injected sample passage.
  const selectPassage = () => page.evaluate(() => {
    const view = document.querySelector('foliate-view');
    for (const { doc } of view.renderer.getContents()) {
      const paragraph = [...doc.querySelectorAll('p')].find(p =>
        p.textContent.replace(/\s+/g, ' ').includes('a truth universally acknowledged'));
      if (!paragraph) continue;
      const range = doc.createRange();
      range.selectNodeContents(paragraph);
      const selection = doc.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      doc.dispatchEvent(new Event('selectionchange'));
      return;
    }
    throw new Error('The expected Austen paragraph was not rendered');
  });
  await selectPassage();
  const toolbar = page.getByRole('toolbar', { name: '选中文本操作' });
  await expect(toolbar).toBeVisible();
  console.log('Selection toolbar:', await toolbar.innerText());
  await stage.screenshot({ path: resolve(images, 'br1-annotation-english.png') });
  await toolbar.getByRole('button', { name: '高亮', exact: true }).click();
  await selectPassage();
  const note = 'The opening presents marriage as a public rule before the family conversation reveals whose interests it serves.';
  page.once('dialog', dialog => dialog.accept(note));
  await toolbar.getByRole('button', { name: '笔记', exact: true }).click();
  await page.evaluate(() => {
    for (const { doc } of document.querySelector('foliate-view').renderer.getContents()) {
      doc.getSelection()?.removeAllRanges();
      doc.dispatchEvent(new Event('selectionchange'));
    }
  });
  await page.getByRole('button', { name: '隐藏侧栏', exact: true }).click();
  await expect(page.getByRole('complementary')).toContainText(note);
  await page.waitForTimeout(500);
  await page.locator('.workspace').screenshot({ path: resolve(images, 'br1-notes-english.png') });
  await page.getByLabel('收起笔记工作台', { exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.getByRole('button', { name: '更多操作', exact: true }).click();
  console.log('Settings:', await page.getByRole('menu').innerText());
  await stage.screenshot({ path: resolve(images, 'br1-settings-english.png') });
  await page.getByRole('menuitemradio', { name: '总是显示', exact: true }).click();
  await page.setViewportSize({ width: 1800, height: 900 });
  await page.getByRole('button', { name: '开启并行阅读', exact: true }).click();
  const secondary = page.getByRole('region', { name: '并行阅读窗格' });
  await expect(secondary).toContainText('Pride and Prejudice');
  await expect.poll(() => page.evaluate(() =>
    document.querySelectorAll('foliate-view')[1]?.book?.toc?.length ?? 0)).toBeGreaterThan(0);
  // Each pane contains the same real book; navigate the companion independently.
  await page.evaluate(async () => {
    const views = [...document.querySelectorAll('foliate-view')];
    const target = views[1].book.toc.find(entry => entry.label.includes('CHAPTER II.'));
    if (!target) throw new Error('Missing Chapter II in the companion table of contents');
    await views[1].goTo(target.href);
  });
  await page.waitForTimeout(1500);
  await page.locator('.reader-stage-stack').screenshot({ path: resolve(images, 'br1-parallel-english.png') });
} finally {
  await browser.close();
}

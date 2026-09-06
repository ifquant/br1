import { expect, test } from '@playwright/test';
import path from 'node:path';

const foliateRoot = path.resolve(process.cwd(), '../foliate-js');
const zipWriterUrl = `/@fs/${foliateRoot}/node_modules/@zip.js/zip.js/index.js`;

const buildEpub = (page: import('@playwright/test').Page) =>
  page.evaluate(async (zipWriterUrl) => {
    const { BlobWriter, TextReader, ZipWriter } = await import(/* @vite-ignore */ zipWriterUrl);
    const writer = new ZipWriter(new BlobWriter());
    await writer.add('mimetype', new TextReader('application/epub+zip'), { level: 0 });
    await writer.add(
      'META-INF/container.xml',
      new TextReader('<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
    );
    await writer.add(
      'OPS/content.opf',
      new TextReader('<?xml version="1.0"?><package version="3.0" unique-identifier="id" xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">c13b2a</dc:identifier><dc:title>C13B2a Bookmark Origin</dc:title><dc:language>en</dc:language></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>')
    );
    await writer.add(
      'OPS/chapter.xhtml',
      new TextReader('<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body><p>Bookmark provenance must come from this rendered EPUB range.</p></body></html>')
    );
    return Array.from(new Uint8Array(await (await writer.close()).arrayBuffer()));
  }, zipWriterUrl);

const persistedBookmarks = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const bookmarks: Array<Record<string, unknown>> = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith('br1.reader.bookmarks:')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) bookmarks.push(...parsed.filter((entry): entry is Record<string, unknown> =>
        !!entry && typeof entry === 'object'
      ));
    }
    return bookmarks;
  });

test('persists rendered EPUB bookmark provenance across a reader reload', async ({ page }) => {
  const assetUrl = '/samples/c13b2a-bookmark-origin.epub';
  await page.goto('/library');
  const archive = await buildEpub(page);
  await page.route(`**${assetUrl}`, (route) =>
    route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(archive) })
  );
  await page.goto(`/reader?${new URLSearchParams({ source: 'asset', url: assetUrl, label: 'C13B2a EPUB' })}`);
  await expect(page.getByRole('main', { name: 'reader stage' })).toContainText('书籍已打开', { timeout: 15000 });
  await page.getByLabel('阅读侧栏标签').getByRole('tab', { name: '书签' }).click();
  await page.getByRole('button', { name: '保存当前页位置' }).click();

  await expect.poll(() => persistedBookmarks(page)).toEqual([
    expect.objectContaining({
      locator: expect.stringMatching(/^epubcfi\(/),
      targetHref: expect.stringMatching(/^epubcfi\(/),
      locatorOrigin: 'br1-epub-rendered-v1',
      targetHrefOrigin: 'br1-epub-rendered-v1'
    })
  ]);

  await page.reload();
  await expect(page.getByRole('main', { name: 'reader stage' })).toContainText('书籍已打开', { timeout: 15000 });
  await page.getByLabel('阅读侧栏标签').getByRole('tab', { name: '书签' }).click();
  await expect(page.getByRole('button', { name: '移除当前页书签' })).toBeVisible();
  expect(await persistedBookmarks(page)).toEqual([
    expect.objectContaining({
      locatorOrigin: 'br1-epub-rendered-v1',
      targetHrefOrigin: 'br1-epub-rendered-v1'
    })
  ]);
});

test('keeps non-EPUB bookmark identities untagged', async ({ page }) => {
  await page.goto('/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=C13B2a%20TXT');
  await expect(page.getByRole('main', { name: 'reader stage' })).toContainText('书籍已打开', { timeout: 15000 });
  await page.getByLabel('阅读侧栏标签').getByRole('tab', { name: '书签' }).click();
  await page.getByRole('button', { name: '保存当前页位置' }).click();

  await expect.poll(() => persistedBookmarks(page)).toHaveLength(1);
  const [bookmark] = await persistedBookmarks(page);
  expect(bookmark).not.toHaveProperty('locatorOrigin');
  expect(bookmark).not.toHaveProperty('targetHrefOrigin');
});

test('opens the disabled bookmarks panel without rewriting malformed web storage', async ({ page }) => {
  const storageKey = 'br1.reader.bookmarks:/samples/sample-book.txt';
  const raw = JSON.stringify([{ id: 'invalid', locatorOrigin: 7 }]);
  await page.addInitScript(({ storageKey, raw }) => localStorage.setItem(storageKey, raw), { storageKey, raw });

  await page.goto('/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=C13B2a%20TXT%20Failure');
  await expect(page.getByRole('main', { name: 'reader stage' })).toContainText('书籍已打开', { timeout: 15000 });
  await page.getByRole('button', { name: '添加当前位置书签' }).click();

  const bookmarksPanel = page.getByRole('region', { name: '书签面板' });
  await expect(bookmarksPanel).toContainText('书签读取失败，已暂停保存。请重新打开本书重试。');
  await expect(bookmarksPanel.getByRole('button', { name: '保存当前页位置' })).toBeDisabled();
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), storageKey)).toBe(raw);
});

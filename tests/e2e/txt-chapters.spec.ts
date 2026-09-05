import { expect, test } from '@playwright/test';
import path from 'node:path';

const tauriMocksUrl = `/@fs/${path.resolve(process.cwd(), 'node_modules/@tauri-apps/api/mocks.js')}`;

const toUtf16Bytes = (text: string, littleEndian: boolean) => {
  const bytes = new Uint8Array(2 + text.length * 2);
  bytes[0] = littleEndian ? 0xff : 0xfe;
  bytes[1] = littleEndian ? 0xfe : 0xff;
  for (let index = 0; index < text.length; index += 1) {
    const value = text.charCodeAt(index);
    const offset = 2 + index * 2;
    bytes[offset] = littleEndian ? value & 0xff : value >> 8;
    bytes[offset + 1] = littleEndian ? value >> 8 : value & 0xff;
  }
  return Array.from(bytes);
};

const longChapterFixture = [
  '第一章 开端',
  '',
  '```ts',
  'const answer = 42;',
  '第一章 代码中的伪标题',
  '<script>window.__BR1_TXT_CHAPTER_XSS__ = 1</script>',
  '```',
  '',
  ...Array.from({ length: 90 }, (_, index) => `开端正文 ${index}: 这一行确保第一章有足够的可滚动长度。`),
  '***',
  '场景转换仍属于第一章。',
  '--------',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '第二章 远行',
  '远行正文可见锚点',
  ...Array.from({ length: 90 }, (_, index) => `远行正文 ${index}: 这一行确保第二章的进度可恢复。`),
  '',
  '番外：归途',
  ...Array.from({ length: 30 }, (_, index) => `番外正文 ${index}`)
].join('\n');

const chapterHeadingIsVisible = (heading: string) => {
  const surface = document.querySelector('.plain-text-reader');
  if (!(surface instanceof HTMLElement)) return false;

  const textWalker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT);
  let node = textWalker.nextNode();
  while (node) {
    const offset = node.textContent?.indexOf(heading) ?? -1;
    if (offset >= 0) {
      const range = document.createRange();
      range.setStart(node, offset);
      range.setEnd(node, offset + heading.length);
      const headingRect = range.getBoundingClientRect();
      const surfaceRect = surface.getBoundingClientRect();
      return headingRect.top >= surfaceRect.top && headingRect.bottom <= surfaceRect.bottom;
    }
    node = textWalker.nextNode();
  }
  return false;
};

test('decodes BOM-aware UTF text and GB18030 bytes', async ({ page }) => {
  await page.goto('/library');

  const utf8Bom = Array.from(new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('第一章 UTF-8 BOM')]));
  const utf8Strict = Array.from(new TextEncoder().encode('第一章 UTF-8 strict'));
  const decoded: string[] = await page.evaluate(async ({ utf8Bom, utf8Strict, utf16le, utf16be, gb18030 }) => {
    const modulePath = '/src/lib/reader/plainText.ts';
    const { decodePlainText } = await import(/* @vite-ignore */ modulePath);
    const decode = (bytes: number[]) => decodePlainText(Uint8Array.from(bytes).buffer);
    const file = new File([Uint8Array.from(gb18030)], 'legacy-gb18030.txt', { type: 'text/plain' });
    return [decode(utf8Bom), decode(utf8Strict), decode(utf16le), decode(utf16be), decode(gb18030), decodePlainText(await file.arrayBuffer())];
  }, {
    utf8Bom,
    utf8Strict,
    utf16le: toUtf16Bytes('第一章 UTF-16 LE', true),
    utf16be: toUtf16Bytes('第一章 UTF-16 BE', false),
    // GBK's Chinese subset is also valid GB18030: 第一章.
    gb18030: [0xb5, 0xda, 0xd2, 0xbb, 0xd5, 0xc2]
  });

  expect(decoded).toEqual([
    '第一章 UTF-8 BOM',
    '第一章 UTF-8 strict',
    '第一章 UTF-16 LE',
    '第一章 UTF-16 BE',
    '第一章',
    '第一章'
  ]);
});

test('builds TXT chapters without promoting prose, scene breaks, or fenced code', async ({ page }) => {
  await page.goto('/library');

  const text = [
    '第一章 开端',
    '一个人穿过清晨。',
    '***',
    '一阵风吹过屋檐。',
    '--------',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '```ts',
    '第一章 代码中的伪标题',
    '```',
    '第一封信',
    '第四本书',
    '第三部手机',
    '第一卷 起',
    '第四本 书',
    '第一章天地',
    '番外：雨夜',
    '外传：旧城',
    '第二章 归来'
  ].join('\n');
  const chapters: Array<{ label: string; start: number }> = await page.evaluate(async (source) => {
    const modulePath = '/src/lib/reader/plainText.ts';
    const { parsePlainTextChapters } = await import(/* @vite-ignore */ modulePath);
    return parsePlainTextChapters(source);
  }, text);

  expect(chapters).toEqual([
    { label: '第一章 开端', start: text.indexOf('第一章 开端') },
    { label: '第一卷 起', start: text.indexOf('第一卷 起') },
    { label: '第四本 书', start: text.indexOf('第四本 书') },
    { label: '第一章天地', start: text.indexOf('第一章天地') },
    { label: '番外：雨夜', start: text.indexOf('番外：雨夜') },
    { label: '外传：旧城', start: text.indexOf('外传：旧城') },
    { label: '第二章 归来', start: text.indexOf('第二章 归来') }
  ]);
});

test('keeps 3b03 title limits separate from separators and UTF-16 offsets', async ({ page }) => {
  await page.goto('/library');

  const title36 = '甲'.repeat(36);
  const title37 = '甲'.repeat(37);
  const cases = [
    { label: `第一章：(2026) 2026 ${title36}`, accepted: true },
    { label: `第一章：(2026) 2026 ${title37}`, accepted: false },
    { label: `前言：${title36}`, accepted: true },
    { label: `前言：${title37}`, accepted: false },
    { label: `一、${title36}`, accepted: true },
    { label: `一、${title37}`, accepted: false }
  ];
  const parsed: Array<{
    accepted: boolean;
    label: string;
    chapters: Array<{ label: string; start: number }>;
  }> = await page.evaluate(async (headingCases) => {
    const modulePath = '/src/lib/reader/plainText.ts';
    const { parsePlainTextChapters } = await import(/* @vite-ignore */ modulePath);
    return headingCases.map(({ label, accepted }) => {
      const source = `😀\n${label}`;
      return {
        accepted,
        label,
        chapters: parsePlainTextChapters(source)
      };
    });
  }, cases);

  expect(parsed).toEqual(
    cases.map(({ label, accepted }) => ({
      accepted,
      label,
      chapters: accepted ? [{ label, start: 3 }] : []
    }))
  );
});

test('keeps date prose out of numeric fallback chapters', async ({ page }) => {
  await page.goto('/library');

  const dateProse = [
    '2024年1月我们在上海相识',
    '2025年1月我们再次相见',
    '2024 年我们在上海相识',
    '2024.06.01 日记'
  ].join('\n');
  const numbered = '1、起始\n正文\n2. 终点';
  const parsed: {
    dateProse: Array<{ label: string; start: number }>;
    numbered: Array<{ label: string; start: number }>;
  } = await page.evaluate(async ({ dateProse, numbered }) => {
    const modulePath = '/src/lib/reader/plainText.ts';
    const { parsePlainTextChapters } = await import(/* @vite-ignore */ modulePath);
    return {
      dateProse: parsePlainTextChapters(dateProse),
      numbered: parsePlainTextChapters(numbered)
    };
  }, { dateProse, numbered });

  expect(parsed.dateProse).toEqual([]);
  expect(parsed.numbered).toEqual([
    { label: '1、起始', start: numbered.indexOf('1、起始') },
    { label: '2. 终点', start: numbered.indexOf('2. 终点') }
  ]);
});

test('keeps a short requested chapter active while selection context follows the selected section', async ({ page }) => {
  const assetUrl = '/samples/s2-r04b-short-chapters.txt';
  await page.route(`**${assetUrl}`, (route) =>
    route.fulfill({
      contentType: 'text/plain; charset=utf-8',
      body: '第一章 A\n甲\n第二章 B\n乙'
    })
  );
  await page.goto(
    `/reader?${new URLSearchParams({ source: 'asset', url: assetUrl, label: 'Short TXT Chapters' }).toString()}`
  );

  const surface = page.getByLabel('plain text reading surface');
  const toc = page.getByRole('navigation', { name: '目录预览' });
  const secondChapter = toc.getByRole('button', { name: '第二章 B', exact: true });
  await expect(surface).toBeVisible();
  await expect.poll(() => surface.evaluate((element) => element.scrollHeight - element.clientHeight)).toBe(0);
  await secondChapter.click();
  await expect(secondChapter).toHaveClass(/(?:^|\s)active(?:\s|$)/);

  await page.evaluate(() => {
    const section = document.querySelector<HTMLElement>('[data-txt-section="0"]');
    const textNode = section?.querySelector('pre')?.firstChild;
    if (!(textNode instanceof Text)) throw new Error('expected selectable text in the first TXT section');
    const start = textNode.data.indexOf('甲');
    if (start < 0) throw new Error('expected the first TXT section to contain 甲');
    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, start + 1);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });

  await page.getByLabel('阅读侧栏标签').getByRole('tab', { name: '笔记' }).click();
  const selectionPreview = page.getByLabel('当前选中文本预览');
  await expect(selectionPreview).toContainText('第一章 A');
  await expect(selectionPreview).toContainText('甲');
});

test('keeps a short final TXT chapter active at the clamped scroll end', async ({ page }) => {
  const assetUrl = '/samples/s2-r04b-clamped-final-chapter.txt';
  const fixture = [
    '第一章 长篇',
    ...Array.from({ length: 180 }, (_, index) => `长篇正文 ${index}: 这一行确保最后一章无法滚动到顶部。`),
    '第二章 尾声',
    '乙'
  ].join('\n');
  await page.route(`**${assetUrl}`, (route) =>
    route.fulfill({ contentType: 'text/plain; charset=utf-8', body: fixture })
  );
  await page.goto(
    `/reader?${new URLSearchParams({ source: 'asset', url: assetUrl, label: 'Clamped TXT Chapters' }).toString()}`
  );

  const surface = page.getByLabel('plain text reading surface');
  const secondChapter = page
    .getByRole('navigation', { name: '目录预览' })
    .getByRole('button', { name: '第二章 尾声', exact: true });
  await expect(surface).toBeVisible();
  await expect.poll(() => surface.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0);
  await secondChapter.click();
  await expect(secondChapter).toHaveClass(/(?:^|\s)active(?:\s|$)/);
  await expect.poll(() => surface.evaluate((element) => {
    const maximum = element.scrollHeight - element.clientHeight;
    return maximum > 0 && Math.abs(element.scrollTop - maximum) < 1;
  })).toBe(true);
});

test('navigates intercepted TXT chapters and reopens a desktop library-file route from explicit resume inputs', async ({ page }) => {
  const assetUrl = '/samples/s2-r04b-chapters.txt';
  await page.addInitScript(() => {
    (window as Window & { __BR1_TXT_CHAPTER_XSS__?: number }).__BR1_TXT_CHAPTER_XSS__ = 0;
  });
  await page.route(`**${assetUrl}`, (route) =>
    route.fulfill({
      contentType: 'text/plain; charset=utf-8',
      body: longChapterFixture
    })
  );

  await page.goto(
    `/reader?${new URLSearchParams({
      source: 'asset',
      url: assetUrl,
      label: 'S2-R04B TXT Chapters'
    }).toString()}`
  );

  const surface = page.getByLabel('plain text reading surface');
  const toc = page.getByRole('navigation', { name: '目录预览' });
  const firstChapter = toc.getByRole('button', { name: '第一章 开端', exact: true });
  const secondChapter = toc.getByRole('button', { name: '第二章 远行', exact: true });
  await expect(surface).toBeVisible();
  await expect(toc.getByRole('button')).toHaveText(['第一章 开端', '第二章 远行', '番外：归途']);
  await expect(firstChapter).toHaveAttribute(
    'data-href',
    `txt-chapter:${longChapterFixture.indexOf('第一章 开端')}`
  );
  await expect(secondChapter).toHaveAttribute(
    'data-href',
    `txt-chapter:${longChapterFixture.indexOf('第二章 远行')}`
  );
  await expect.poll(() =>
    surface.locator('[data-txt-section]').evaluateAll((sections) =>
      sections.map((section) => section.getAttribute('data-txt-section'))
    )
  ).toEqual(['0', '1', '2']);
  await expect(toc.getByText('***', { exact: true })).toHaveCount(0);
  await expect(toc.getByText('--------', { exact: true })).toHaveCount(0);
  await expect(surface.locator('.plain-text-code-block')).toBeVisible();
  await expect(surface.locator('.reader-code-token-keyword')).toContainText('const');
  await expect(surface.locator('script')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => (window as Window & { __BR1_TXT_CHAPTER_XSS__?: number }).__BR1_TXT_CHAPTER_XSS__ ?? 0)
    )
    .toBe(0);

  await secondChapter.click();
  await expect(secondChapter).toHaveClass(/(?:^|\s)active(?:\s|$)/);
  await expect.poll(() => page.evaluate(chapterHeadingIsVisible, '第二章 远行')).toBe(true);
  const resume = await surface.evaluate((element) => {
    const maximum = element.scrollHeight - element.clientHeight;
    if (maximum <= 0) throw new Error('expected a scrollable TXT chapter fixture');
    const fraction = element.scrollTop / maximum;
    if (fraction <= 0) throw new Error('expected chapter navigation to produce resumable progress');
    return {
      fraction,
      location: `txt:${fraction.toFixed(6)}`
    };
  });

  const libraryResumeHref = `/reader?${new URLSearchParams({
    source: 'library-file',
    path: assetUrl,
    label: 'S2-R04B TXT Chapters',
    fraction: String(resume.fraction),
    location: resume.location
  }).toString()}`;
  await page.evaluate(async ({ mocksUrl, fixture, href }) => {
    const { mockIPC } = await import(/* @vite-ignore */ mocksUrl);
    const bytesBase64 = btoa(
      Array.from(new TextEncoder().encode(fixture), (byte) => String.fromCharCode(byte)).join('')
    );
    mockIPC((command: string) => {
      if (command === 'load_library_file_fingerprint') return 's2-r04b-txt-chapters';
      if (command === 'load_library_book_binary') {
        return {
          bytesBase64,
          name: 's2-r04b-chapters.txt',
          mimeType: 'text/plain'
        };
      }
      return null;
    });
    const link = document.createElement('a');
    link.href = href;
    document.body.append(link);
    link.click();
  }, { mocksUrl: tauriMocksUrl, fixture: longChapterFixture, href: libraryResumeHref });
  await page.waitForURL((url) => url.searchParams.get('source') === 'library-file');

  const restoredToc = page.getByRole('navigation', { name: '目录预览' });
  const restoredSecondChapter = restoredToc.getByRole('button', { name: '第二章 远行', exact: true });
  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();
  await expect(restoredSecondChapter).toHaveClass(/(?:^|\s)active(?:\s|$)/);
  await expect.poll(() => page.evaluate(chapterHeadingIsVisible, '第二章 远行')).toBe(true);
});

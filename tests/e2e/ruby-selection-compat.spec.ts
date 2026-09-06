import { expect, test } from '@playwright/test';
import path from 'node:path';

const foliateRoot = path.resolve(process.cwd(), '../foliate-js');
const zipWriterUrl = `/@fs/${foliateRoot}/node_modules/@zip.js/zip.js/index.js`;
const selectionTextUrl = '/src/lib/reader/selectionText.ts';

type EpubChapter = { id: string; href: string; body: string };
type FoliateLocation = { index: number; anchor: (doc: Document) => unknown };
type FoliateView = HTMLElement & {
  getCFI?: (index: number, range: Range) => string;
  resolveCFI?: (cfi: string) => FoliateLocation | null;
};

const buildEpub = (page: import('@playwright/test').Page, chapters: EpubChapter[]) =>
  page.evaluate(
    async ({ zipWriterUrl, chapters }) => {
      const { BlobWriter, TextReader, ZipWriter } = await import(/* @vite-ignore */ zipWriterUrl);
      const writer = new ZipWriter(new BlobWriter());
      const xhtml = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>S2-R04C12</title></head><body>${body}</body></html>`;
      await writer.add('mimetype', new TextReader('application/epub+zip'), { level: 0 });
      await writer.add(
        'META-INF/container.xml',
        new TextReader(`<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`)
      );
      await writer.add(
        'OPS/content.opf',
        new TextReader(`<?xml version="1.0"?><package version="3.0" unique-identifier="id" xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">s2-r04c12</dc:identifier><dc:title>S2-R04C12 Ruby</dc:title><dc:language>ja</dc:language></metadata><manifest>${chapters.map(({ id, href }) => `<item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${chapters.map(({ id }) => `<itemref idref="${id}"/>`).join('')}</spine></package>`)
      );
      for (const chapter of chapters) await writer.add(`OPS/${chapter.href}`, new TextReader(xhtml(chapter.body)));
      return Array.from(new Uint8Array(await (await writer.close()).arrayBuffer()));
    },
    { zipWriterUrl, chapters }
  );

const openEpub = async (page: import('@playwright/test').Page, body: string) => {
  const assetUrl = '/samples/s2-r04c12-ruby.epub';
  await page.goto('/library');
  const archive = await buildEpub(page, [{ id: 'chapter', href: 'chapter.xhtml', body }]);
  await page.route(`**${assetUrl}`, (route) =>
    route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(archive) })
  );
  await page.goto(
    `/reader?${new URLSearchParams({ source: 'asset', url: assetUrl, label: 'S2-R04C12 Ruby' }).toString()}`
  );
  const frame = page.frameLocator('iframe').first();
  await expect(frame.locator('body')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('main', { name: 'reader stage' })).toContainText('书籍已打开', { timeout: 15000 });
  return frame;
};

const installClipboardMock = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(() => {
    const writes: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => void writes.push(text) }
    });
    (window as Window & { __BR1_RUBY_COPY_WRITES__?: string[] }).__BR1_RUBY_COPY_WRITES__ = writes;
  });
};

const clipboardWrites = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as Window & { __BR1_RUBY_COPY_WRITES__?: string[] }).__BR1_RUBY_COPY_WRITES__ ?? []);

const selectTextBoundaries = (target: import('@playwright/test').Locator) =>
  target.evaluate((node) => {
    const walker = node.ownerDocument.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const first = walker.nextNode() as Text | null;
    let last = first;
    for (let next = walker.nextNode() as Text | null; next; next = walker.nextNode() as Text | null) last = next;
    if (!first || !last) throw new Error('expected text boundaries');
    const range = node.ownerDocument.createRange();
    range.setStart(first, 0);
    range.setEnd(last, last.length);
    const selection = node.ownerDocument.getSelection();
    if (!selection) throw new Error('expected native iframe selection API');
    selection.removeAllRanges();
    selection.addRange(range);
    node.ownerDocument.dispatchEvent(new Event('selectionchange'));
  });

test('extracts base-only ruby text from complete and partial browser ranges without mutating the source DOM', async ({ page }) => {
  await page.goto('/library');

  const result = await page.evaluate(async (moduleUrl) => {
    const { copyReaderRubySelection, getReaderSelectionText } = await import(/* @vite-ignore */ moduleUrl);
    const rangeFor = (doc: Document, id: string, kind: 'complete' | 'base' | 'rt' | 'rp' | 'rp-end' | 'rt-start' | 'rt-end' | 'utf16') => {
      const target = doc.querySelector(`#${id}`)!;
      const range = doc.createRange();
      if (kind === 'complete') range.selectNodeContents(target);
      if (kind === 'base') range.selectNodeContents(target.querySelector('ruby')!.firstChild!);
      if (kind === 'rt') range.selectNodeContents(target.querySelector('rt')!);
      if (kind === 'rp') range.selectNodeContents(target.querySelector('rp')!);
      if (kind === 'rp-end') {
        const end = target.querySelector('rp')!.firstChild!;
        range.setStart(target.firstChild!, 0);
        range.setEnd(end, 1);
      }
      if (kind === 'rt-start') {
        const rt = target.querySelector('rt')!.firstChild!;
        const end = target.lastChild!;
        range.setStart(rt, 1);
        range.setEnd(end, end.textContent!.length);
      }
      if (kind === 'rt-end') {
        const end = target.querySelector('rt')!.firstChild!;
        range.setStart(target.firstChild!, 0);
        range.setEnd(end, 1);
      }
      if (kind === 'utf16') {
        const start = target.firstChild!;
        const end = target.lastChild!;
        range.setStart(start, 1);
        range.setEnd(end, 0);
      }
      return range;
    };
    const cases: Array<[string, string | null, string, 'complete' | 'base' | 'rt' | 'rp' | 'rp-end' | 'rt-start' | 'rt-end' | 'utf16']> = [
      ['ja-complete', 'ja', '<p id="target">前<ruby>漢<rp>(</rp><rt>かん</rt><rp>)</rp></ruby>後</p>', 'complete'],
      ['non-ja-complete', 'en', '<p id="target">pre<ruby>漢<rt>かん</rt></ruby>post</p>', 'complete'],
      ['missing-language', null, '<p id="target"><ruby>語<rt>ご</rt></ruby></p>', 'complete'],
      ['partial-base', 'ja', '<p id="target">前<ruby>漢<rt>かん</rt></ruby>後</p>', 'base'],
      ['rt-only', 'ja', '<p id="target"><ruby>漢<rt>かん</rt></ruby></p>', 'rt'],
      ['rt-start', 'ja', '<p id="target">A<ruby>漢<rt>かん</rt></ruby>B</p>', 'rt-start'],
      ['rt-end', 'ja', '<p id="target">A<ruby>漢<rt>かん</rt></ruby>B</p>', 'rt-end'],
      ['nested-ruby', 'ja', '<p id="target"><ruby>熟<rt>じゅく</rt><ruby>語<rp>(</rp><rt>ご</rt><rp>)</rp></ruby></ruby></p>', 'complete'],
      ['rp-only', 'ja', '<p id="target"><ruby>漢<rp>(</rp><rt>かん</rt><rp>)</rp></ruby></p>', 'rp'],
      ['rp-end', 'ja', '<p id="target">A<ruby>漢<rp>(</rp><rt>かん</rt></ruby></p>', 'rp-end'],
      ['entities', 'ja', '<p id="target"><ruby>&#x6f22;<rt>&#x304b;&#x3093;</rt></ruby>&amp;<ruby>&#x5b57;<rt>&#x3058;</rt></ruby></p>', 'complete'],
      ['utf16', 'ja', '<p id="target">A😀<ruby>語<rt>ご</rt></ruby>B</p>', 'utf16']
    ];
    const textCases = cases.map(([name, language, markup, kind]) => {
      const doc = document.implementation.createHTMLDocument(name);
      if (language) doc.documentElement.lang = language;
      doc.body.innerHTML = markup;
      const before = doc.documentElement.outerHTML;
      const range = rangeFor(doc, 'target', kind);
      return { name, raw: range.toString(), text: getReaderSelectionText(range), unchanged: before === doc.documentElement.outerHTML };
    });
    const copy = (name: string, markup: string, rangeSelector: string, eventTargetSelector: string, rootSelector = 'root') => {
      const root = document.createElement('div');
      root.innerHTML = markup;
      document.body.append(root);
      try {
        const range = document.createRange();
        range.selectNodeContents(root.querySelector(rangeSelector)!);
        const selection = document.getSelection();
        if (!selection) throw new Error('expected document selection API');
        selection.removeAllRanges();
        selection.addRange(range);
        const copied: Record<string, string> = {};
        let prevented = false;
        const event = {
          clipboardData: { setData: (type: string, text: string) => void (copied[type] = text) },
          preventDefault: () => void (prevented = true),
          target: eventTargetSelector === 'root' ? root : root.querySelector(eventTargetSelector)
        } as unknown as ClipboardEvent;
        const copyRoot = rootSelector === 'root' ? root : root.querySelector(rootSelector)!;
        return { name, handled: copyReaderRubySelection(event, copyRoot), copied: copied['text/plain'] ?? '', prevented };
      } finally {
        document.getSelection()?.removeAllRanges();
        root.remove();
      }
    };
    return {
      textCases,
      copyCases: [
        copy('owned-ruby', '<p id="selected"><ruby>漢<rt>かん</rt></ruby></p>', '#selected', 'root'),
        copy('editable-ruby', '<p id="selected" contenteditable="true"><ruby>漢<rt>かん</rt></ruby></p>', '#selected', '#selected'),
        copy('stale-selection-on-input-copy', '<input id="input"/><p id="selected"><ruby>漢<rt>かん</rt></ruby></p>', '#selected', '#input'),
        copy('other-root', '<div id="owner"></div><p id="selected"><ruby>漢<rt>かん</rt></ruby></p>', '#selected', 'root', '#owner'),
        copy('plain-text', '<p id="selected">plain text</p>', '#selected', 'root')
      ]
    };
  }, selectionTextUrl);

  expect(result.textCases).toEqual([
    { name: 'ja-complete', raw: '前漢(かん)後', text: '前漢後', unchanged: true },
    { name: 'non-ja-complete', raw: 'pre漢かんpost', text: 'pre漢post', unchanged: true },
    { name: 'missing-language', raw: '語ご', text: '語', unchanged: true },
    { name: 'partial-base', raw: '漢', text: '漢', unchanged: true },
    { name: 'rt-only', raw: 'かん', text: '', unchanged: true },
    { name: 'rt-start', raw: 'んB', text: 'B', unchanged: true },
    { name: 'rt-end', raw: 'A漢か', text: 'A漢', unchanged: true },
    { name: 'nested-ruby', raw: '熟じゅく語(ご)', text: '熟語', unchanged: true },
    { name: 'rp-only', raw: '(', text: '', unchanged: true },
    { name: 'rp-end', raw: 'A漢(', text: 'A漢', unchanged: true },
    { name: 'entities', raw: '漢かん&字じ', text: '漢&字', unchanged: true },
    { name: 'utf16', raw: '😀語ご', text: '😀語', unchanged: true }
  ]);
  expect(result.copyCases).toEqual([
    { name: 'owned-ruby', handled: true, copied: '漢', prevented: true },
    { name: 'editable-ruby', handled: false, copied: '', prevented: false },
    { name: 'stale-selection-on-input-copy', handled: false, copied: '', prevented: false },
    { name: 'other-root', handled: false, copied: '', prevented: false },
    { name: 'plain-text', handled: false, copied: '', prevented: false }
  ]);
});

test('routes a real EPUB ruby selection to base-only actions while preserving raw CFI and TTS text', async ({ page }, testInfo) => {
  await installClipboardMock(page);
  const frame = await openEpub(page, '<p id="selected">前<ruby>漢<rp>(</rp><rt>かん</rt><rp>)</rp></ruby>後</p>');

  const original = await frame.locator('#selected').evaluate((target) => {
    const doc = target.ownerDocument;
    const view = doc.defaultView?.frameElement?.ownerDocument.querySelector('foliate-view') as FoliateView | null;
    if (!view?.getCFI) throw new Error('expected live Foliate CFI support');
    const start = target.firstChild;
    const end = target.lastChild;
    if (!(start instanceof Text) || !(end instanceof Text)) throw new Error('expected explicit EPUB text boundaries');
    const range = doc.createRange();
    range.setStart(start, 0);
    range.setEnd(end, end.length);
    const cfi = view.getCFI(0, range);
    const roundTrip = view.resolveCFI?.(cfi)?.anchor(doc) as Range | null;
    const roundTripExact = !!roundTrip && roundTrip.startContainer === range.startContainer &&
      roundTrip.startOffset === range.startOffset && roundTrip.endContainer === range.endContainer &&
      roundTrip.endOffset === range.endOffset && roundTrip.toString() === range.toString();
    const getCFI = view.getCFI.bind(view);
    const calls: Array<{ cfi: string; rawText: string }> = [];
    view.getCFI = (index, candidate) => {
      const value = getCFI(index, candidate);
      calls.push({ cfi: value, rawText: candidate.toString() });
      return value;
    };
    (view.ownerDocument.defaultView as Window & { __BR1_RUBY_CFI_CALLS__?: () => typeof calls }).__BR1_RUBY_CFI_CALLS__ = () => [...calls];
    const selection = doc.getSelection();
    if (!selection) throw new Error('expected native iframe selection API');
    selection.removeAllRanges();
    selection.addRange(range);
    doc.dispatchEvent(new Event('selectionchange'));
    return { cfi, rawText: range.toString(), roundTripExact };
  });

  const toolbar = page.getByRole('toolbar', { name: '选中文本操作' });
  await expect(toolbar).toBeVisible();
  expect(await toolbar.evaluate((element) => element.getBoundingClientRect().bottom <= window.innerHeight)).toBe(true);
  await expect(toolbar).toContainText('前漢後');
  await expect(toolbar).not.toContainText('かん');
  const rubyRendering = await frame.locator('#selected ruby').evaluate((ruby) => {
    const rt = ruby.querySelector('rt');
    const rp = ruby.querySelector('rp');
    if (!rt || !rp) throw new Error('expected ruby annotation and fallback nodes');
    const rtStyle = ruby.ownerDocument.defaultView?.getComputedStyle(rt);
    const rpStyle = ruby.ownerDocument.defaultView?.getComputedStyle(rp);
    const rtRect = rt.getBoundingClientRect();
    return {
      rtDisplay: rtStyle?.display,
      rtVisibility: rtStyle?.visibility,
      rtSize: { width: rtRect.width, height: rtRect.height },
      rpDisplay: rpStyle?.display
    };
  });
  expect(rubyRendering.rtDisplay).not.toBe('none');
  expect(rubyRendering.rtVisibility).not.toBe('hidden');
  expect(rubyRendering.rtSize.width || rubyRendering.rtSize.height).toBeGreaterThan(0);
  expect(rubyRendering.rpDisplay).toBe('none');
  await page.screenshot({ path: testInfo.outputPath('ruby-selection-reader-popup.png') });

  const nativeCopy = await frame.locator('#selected').evaluate((target) => {
    const doc = target.ownerDocument;
    const copied: Record<string, string> = {};
    const event = new Event('copy', { cancelable: true }) as ClipboardEvent;
    Object.defineProperty(event, 'clipboardData', {
      value: { setData: (type: string, text: string) => void (copied[type] = text) }
    });
    doc.dispatchEvent(event);
    return { copied: copied['text/plain'] ?? '', prevented: event.defaultPrevented };
  });
  // This is a synthetic browser event. It proves the reader-owned handler, not OS clipboard delivery.
  expect(nativeCopy).toEqual({ copied: '前漢後', prevented: true });
  await toolbar.getByRole('button', { name: '复制' }).click();
  await expect.poll(() => clipboardWrites(page)).toEqual(['前漢後']);
  await toolbar.getByRole('button', { name: '高亮' }).click();
  const workspace = page.getByRole('complementary', { name: 'Reader Workspace' });
  await expect(workspace.getByLabel('高亮列表').locator('.workspace-text')).toHaveText('前漢後');

  await selectTextBoundaries(frame.locator('#selected'));
  await expect(toolbar).toBeVisible();
  await toolbar.getByRole('button', { name: '翻译' }).click();
  const translationCard = workspace.getByLabel('翻译阅读面板').locator('.assist-translation-card').first();
  await expect(translationCard.locator('p')).toHaveText('前漢後');

  await selectTextBoundaries(frame.locator('#selected'));
  await expect(toolbar).toBeVisible();
  await toolbar.getByRole('button', { name: '朗读' }).click();
  const ttsTarget = workspace.getByRole('region', { name: '朗读模式' }).locator('.tts-panel').first().locator('p').first();
  await expect(ttsTarget).toHaveText('前漢(かん)後');

  const proof = await page.evaluate(() =>
    (window as Window & { __BR1_RUBY_CFI_CALLS__?: () => Array<{ cfi: string; rawText: string }> }).__BR1_RUBY_CFI_CALLS__?.() ?? []
  );
  expect(original).toEqual({ cfi: expect.stringMatching(/^epubcfi\(/), rawText: '前漢(かん)後', roundTripExact: true });
  expect(proof).toContainEqual({ cfi: original.cfi, rawText: original.rawText });
});

test('keeps safe ruby markup and raw CFI mapping in a real footnote popup while popup actions use base text', async ({ page }) => {
  await installClipboardMock(page);
  const frame = await openEpub(
    page,
    '<p><a id="note-ref" href="#note" epub:type="noteref">[1]</a></p><aside id="note" epub:type="footnote"><p><ruby class="unsafe" onclick="window.__BR1_RUBY_XSS__=1">漢<rp>(</rp><rt>かん</rt><rp>)</rp></ruby></p></aside>'
  );
  const original = await frame.locator('#note ruby').evaluate((ruby) => {
    const doc = ruby.ownerDocument;
    const view = doc.defaultView?.frameElement?.ownerDocument.querySelector('foliate-view') as FoliateView | null;
    if (!view?.getCFI) throw new Error('expected live Foliate CFI support');
    const walker = doc.createTreeWalker(ruby, NodeFilter.SHOW_TEXT);
    const start = walker.nextNode() as Text | null;
    let end = start;
    for (let next = walker.nextNode() as Text | null; next; next = walker.nextNode() as Text | null) end = next;
    if (!start || !end) throw new Error('expected explicit footnote text boundaries');
    const range = doc.createRange();
    range.setStart(start, 0);
    range.setEnd(end, end.length);
    const cfi = view.getCFI(0, range);
    const roundTrip = view.resolveCFI?.(cfi)?.anchor(doc) as Range | null;
    const roundTripExact = !!roundTrip && roundTrip.startContainer === range.startContainer &&
      roundTrip.startOffset === range.startOffset && roundTrip.endContainer === range.endContainer &&
      roundTrip.endOffset === range.endOffset && roundTrip.toString() === range.toString();
    const getCFI = view.getCFI.bind(view);
    const calls: Array<{ cfi: string; rawText: string }> = [];
    view.getCFI = (index, candidate) => {
      const value = getCFI(index, candidate);
      calls.push({ cfi: value, rawText: candidate.toString() });
      return value;
    };
    const resolveCFI = view.resolveCFI?.bind(view);
    const resolutions: Array<{ cfi: string; rawText: string; exact: boolean }> = [];
    if (resolveCFI) {
      view.resolveCFI = (candidate) => {
        const resolved = resolveCFI(candidate);
        const mapped = resolved?.anchor(doc) as Range | null;
        resolutions.push({
          cfi: candidate,
          rawText: mapped?.toString() ?? '',
          exact: !!mapped && mapped.startContainer === range.startContainer && mapped.startOffset === range.startOffset &&
            mapped.endContainer === range.endContainer && mapped.endOffset === range.endOffset
        });
        return resolved;
      };
    }
    (view.ownerDocument.defaultView as Window & {
      __BR1_RUBY_FOOTNOTE_CFI_CALLS__?: () => { getCFI: typeof calls; resolve: typeof resolutions };
    }).__BR1_RUBY_FOOTNOTE_CFI_CALLS__ = () => ({ getCFI: [...calls], resolve: [...resolutions] });
    return { cfi, rawText: range.toString(), roundTripExact };
  });

  await frame.locator('#note-ref').click();
  const dialog = page.getByRole('dialog', { name: '脚注预览' });
  await expect(dialog).toBeVisible();
  const popupRuby = dialog.locator('.footnote-body ruby');
  await expect(popupRuby).toHaveCount(1);
  await expect(popupRuby.locator('rt')).toHaveText('かん');
  expect(await popupRuby.getAttribute('class')).toBeNull();
  expect(await popupRuby.getAttribute('onclick')).toBeNull();

  await selectTextBoundaries(popupRuby);
  const actions = page.getByRole('toolbar', { name: '脚注选区操作' });
  await expect(actions).toBeVisible();
  const nativeCopy = await popupRuby.evaluate((ruby) => {
    const copied: Record<string, string> = {};
    const event = new Event('copy', { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(event, 'clipboardData', {
      value: { setData: (type: string, text: string) => void (copied[type] = text) }
    });
    ruby.ownerDocument.body.dispatchEvent(event);
    return { copied: copied['text/plain'] ?? '', prevented: event.defaultPrevented };
  });
  // This synthetic body event proves the popup document listener, not OS clipboard delivery.
  expect(nativeCopy).toEqual({ copied: '漢', prevented: true });
  await actions.getByRole('button', { name: '复制' }).click();
  await expect.poll(() => clipboardWrites(page)).toEqual(['漢']);

  const proof = await page.evaluate(() =>
    (window as Window & {
      __BR1_RUBY_FOOTNOTE_CFI_CALLS__?: () => {
        getCFI: Array<{ cfi: string; rawText: string }>;
        resolve: Array<{ cfi: string; rawText: string; exact: boolean }>;
      };
    }).__BR1_RUBY_FOOTNOTE_CFI_CALLS__?.() ?? { getCFI: [], resolve: [] }
  );
  expect(original).toEqual({ cfi: expect.stringMatching(/^epubcfi\(/), rawText: '漢(かん)', roundTripExact: true });
  expect(proof.getCFI).toContainEqual({ cfi: original.cfi, rawText: original.rawText });
  expect(proof.resolve).toContainEqual({ cfi: original.cfi, rawText: original.rawText, exact: true });
});

test('passes native copy through unchanged for real PDF text and test-owned ruby markup', async ({ page }) => {
  await page.goto('/reader?source=asset&url=%2Fsamples%2Fsample-outline.pdf&label=Sample%20PDF%20Outline');
  await expect(page.getByLabel('reader stage').getByText(/^PDF$/)).toBeVisible({ timeout: 15000 });

  const result = await page.evaluate(() => {
    type View = HTMLElement & { renderer?: { getContents?: () => Array<{ doc?: Document }> } };
    const view = document.querySelector('foliate-view') as View | null;
    const doc = view?.renderer?.getContents?.().map(({ doc }) => doc).find((doc) =>
      Boolean(doc?.body && doc.querySelector('#textLayer, .textLayer'))
    );
    if (!doc?.body || !doc.defaultView) throw new Error('expected loaded PDF text document');
    const ordinary = Array.from(doc.querySelectorAll<HTMLElement>('#textLayer span, .textLayer span'))
      .find((element) => Boolean(element.textContent?.trim()));
    if (!ordinary) throw new Error('expected ordinary PDF text layer span');
    const copy = (target: Node) => {
      const range = doc.createRange();
      range.selectNodeContents(target);
      const selection = doc.getSelection();
      if (!selection) throw new Error('expected PDF document selection API');
      selection.removeAllRanges();
      selection.addRange(range);
      const writes: Array<[string, string]> = [];
      const event = new doc.defaultView!.Event('copy', { bubbles: true, cancelable: true }) as ClipboardEvent;
      Object.defineProperty(event, 'clipboardData', {
        value: { setData: (type: string, text: string) => void writes.push([type, text]) }
      });
      target.dispatchEvent(event);
      return { prevented: event.defaultPrevented, writes };
    };
    const ruby = doc.createElement('span');
    ruby.dataset.testRubyCopy = 'true';
    ruby.innerHTML = '<ruby>漢<rt>かん</rt></ruby>';
    doc.body.append(ruby);
    try {
      return { ordinary: copy(ordinary), ruby: copy(ruby) };
    } finally {
      doc.getSelection()?.removeAllRanges();
      ruby.remove();
    }
  });

  expect(result).toEqual({
    ordinary: { prevented: false, writes: [] },
    ruby: { prevented: false, writes: [] }
  });
});

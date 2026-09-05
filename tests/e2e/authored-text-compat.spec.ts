import { expect, test } from '@playwright/test';
import path from 'node:path';

const foliateRoot = path.resolve(process.cwd(), '../foliate-js');
const zipWriterUrl = `/@fs/${foliateRoot}/node_modules/@zip.js/zip.js/index.js`;
const epubCfiUrl = `/@fs/${foliateRoot}/epubcfi.js`;

test('repairs only prose RLM runs between upstream Arabic-class characters', async ({ page }) => {
  await page.goto('/library');

  const result = await page.evaluate(async () => {
    const modulePath = '/src/lib/reader/foliate.ts';
    const reader = await import(/* @vite-ignore */ modulePath);
    const transformTarget = new EventTarget();
    reader.installReaderBookTransformGuards({ transformTarget });

    const transform = async (data: string, type: string, name: string) => {
      const detail = { data, type, name };
      transformTarget.dispatchEvent(new CustomEvent('data', { detail }));
      return String(await detail.data);
    };

    const prose = '\u0627\u200F\u200F\u0628 \u064E\u200F\u0628 \u066A\u200F\u066B \uFB8E\u200F\uFB8F A\u200EB \u200F\u0628 \u0627\u200F A\u200F\u0628 \u0627\u200FB \u0661\u200F\u0662 \u06F1\u200F\u06F2 \u0627\u200C\u0628';
    const source = `<!doctype html><html><head><style id="author-style">.sample::before { content: "\u0627\u200F\u0628"; }</style></head><body data-reader-marker="kept"><p id="prose">${prose}</p><p id="entities">A&#8206;B A&#8207;B A&#x200E;B A&#x200F;B</p><p id="literal" title="\u0627\u200F\u0628"><code>\u0627\u200F\u0628</code><pre>\u0627\u200F\u0628</pre><kbd>\u0627\u200F\u0628</kbd></p><script>window.parent.__BR1_BOOK_XSS__ = 1</script><iframe srcdoc="&lt;script&gt;window.parent.__BR1_BOOK_XSS__ = 1&lt;/script&gt;"></iframe><object data="javascript:alert(1)"></object><embed src="javascript:alert(1)"><img src="missing" onerror="window.parent.__BR1_BOOK_XSS__ = 1"></body></html>`;
    const first = await transform(source, 'application/xhtml+xml', 'authored.xhtml');
    const second = await transform(first, 'application/xhtml+xml', 'authored.xhtml');
    const document = new DOMParser().parseFromString(first, 'application/xhtml+xml');

    const svg = await transform(
      `<svg xmlns="http://www.w3.org/2000/svg" onload="window.parent.__BR1_BOOK_XSS__ = 1"><text id="svg-text">\u0627\u200F\u0628</text><circle cx="5" cy="5" r="4"/><script>window.parent.__BR1_BOOK_XSS__ = 1</script></svg>`,
      'image/svg+xml',
      'authored.svg'
    );
    const svgDocument = new DOMParser().parseFromString(svg, 'image/svg+xml');

    return {
      first,
      second,
      proseBeforeLength: prose.length,
      prose: document.querySelector('#prose')?.textContent,
      proseLength: document.querySelector('#prose')?.textContent?.length,
      entities: document.querySelector('#entities')?.textContent,
      title: document.querySelector('#literal')?.getAttribute('title'),
      code: document.querySelector('code')?.textContent,
      pre: document.querySelector('pre')?.textContent,
      kbd: document.querySelector('kbd')?.textContent,
      style: document.querySelector('#author-style')?.textContent,
      svg,
      svgText: svgDocument.querySelector('#svg-text')?.textContent
    };
  });

  expect(result.prose).toBe(
    '\u0627\u200C\u200C\u0628 \u064E\u200C\u0628 \u066A\u200C\u066B \uFB8E\u200C\uFB8F A\u200EB \u200F\u0628 \u0627\u200F A\u200F\u0628 \u0627\u200FB \u0661\u200F\u0662 \u06F1\u200F\u06F2 \u0627\u200C\u0628'
  );
  expect(result.proseLength).toBe(result.proseBeforeLength);
  expect(result.entities).toBe('A\u200EB A\u200FB A\u200EB A\u200FB');
  expect(result.title).toBe('\u0627\u200F\u0628');
  expect(result.code).toBe('\u0627\u200F\u0628');
  expect(result.pre).toBe('\u0627\u200F\u0628');
  expect(result.kbd).toBe('\u0627\u200F\u0628');
  expect(result.style).toContain('\u0627\u200F\u0628');
  expect(result.first).toBe(result.second);
  expect(result.first).toContain('data-reader-marker="kept"');
  expect(result.first).not.toMatch(/<script|<iframe|<object|<embed|srcdoc=|onerror=|javascript:/i);
  expect(result.svg).toMatch(/^<svg\b/);
  expect(result.svg).toContain('<circle');
  expect(result.svgText).toBe('\u0627\u200F\u0628');
  expect(result.svg).not.toMatch(/<html|<script|onload=|javascript:/i);
});

test('enables Russian NBSP guards only for normalized primary metadata language', async ({ page }) => {
  await page.goto('/library');

  const result = await page.evaluate(async () => {
    const modulePath = '/src/lib/reader/foliate.ts';
    const reader = await import(/* @vite-ignore */ modulePath);
    const source = '<html lang="ru"><body><p>в доме</p></body></html>';
    const cases: Array<[unknown, string]> = [
      ['ru', 'в\u00A0доме'],
      [' RU-RU ', 'в\u00A0доме'],
      [['ru-RU', 'en'], 'в\u00A0доме'],
      [[' ', 'Ru-RU'], 'в\u00A0доме'],
      [['en', 'ru'], 'в доме'],
      ['ru_RU', 'в доме'],
      ['rus', 'в доме'],
      ['en', 'в доме'],
      [undefined, 'в доме']
    ];

    return Promise.all(
      cases.map(async ([language, expected]) => {
        const transformTarget = new EventTarget();
        reader.installReaderBookTransformGuards({ metadata: { language }, transformTarget });
        const detail = { data: source, type: 'application/xhtml+xml', name: 'language.xhtml' };
        transformTarget.dispatchEvent(new CustomEvent('data', { detail }));
        const document = new DOMParser().parseFromString(String(await detail.data), 'text/html');
        return { expected, text: document.body.textContent };
      })
    );
  });

  expect(result).toEqual(result.map(({ expected }) => ({ expected, text: expected })));
});

test('glues the upstream Russian word set without touching literal authored content or offsets', async ({ page }) => {
  await page.goto('/library');

  const result = await page.evaluate(async () => {
    const modulePath = '/src/lib/reader/foliate.ts';
    const reader = await import(/* @vite-ignore */ modulePath);
    const longWords = [
      'без', 'для', 'близ', 'под', 'над', 'про', 'при', 'ради', 'сквозь', 'среди',
      'через', 'около', 'перед', 'после', 'между', 'кроме', 'вокруг', 'против', 'вместо',
      'внутри', 'возле', 'или', 'либо', 'ибо', 'если', 'едва', 'дабы', 'чтобы', 'чтоб',
      'хотя', 'пока', 'зато', 'тоже', 'также', 'итак', 'как', 'что', 'чем', 'так', 'даже',
      'лишь', 'ведь', 'вот', 'вон', 'уже', 'хоть', 'разве', 'только', 'именно', 'неужели'
    ];
    const prose = `и в доме Но ветер к 7 в \u0661 в Доме ${longWords
      .map((word) => `${word} дом`)
      .join(' ')} толькото дом в Google в\tдоме в\nдоме в  доме`;
    const source = `<!doctype html><html><head><title id="head-title">и в доме</title><style id="russian-author-style">и в доме</style></head><body><p id="prose">${prose.replace('в Доме', 'в &#1044;оме')}</p><p id="attribute" title="и в доме">атрибут</p><pre>и в доме</pre><code>и в доме</code><kbd>и в доме</kbd><samp>и в доме</samp><textarea>и в доме</textarea><svg><text>и в доме</text></svg><math><mtext>и в доме</mtext></math></body></html>`;
    const transformTarget = new EventTarget();
    reader.installReaderBookTransformGuards({ metadata: { language: 'ru-RU' }, transformTarget });
    const transform = async (data: string, type = 'application/xhtml+xml') => {
      const detail = { data, type, name: 'russian.xhtml' };
      transformTarget.dispatchEvent(new CustomEvent('data', { detail }));
      return String(await detail.data);
    };
    const first = await transform(source);
    const second = await transform(first);
    const document = new DOMParser().parseFromString(first, 'text/html');
    const proseNode = document.querySelector('#prose')?.firstChild;
    if (!(proseNode instanceof Text)) throw new Error('expected prose text node');
    const range = document.createRange();
    range.setStart(proseNode, 0);
    range.setEnd(proseNode, 'и в доме'.length);
    const svg = await transform('<svg xmlns="http://www.w3.org/2000/svg"><text>и в доме</text></svg>', 'image/svg+xml');
    const svgDocument = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const literal = (selector: string) => document.querySelector(selector)?.textContent;

    return {
      first,
      second,
      prose,
      proseText: proseNode.data,
      longWordGaps: longWords.filter((word) => !proseNode.data.includes(`${word}\u00A0дом`)),
      range: { start: range.startOffset, end: range.endOffset, text: range.toString() },
      literals: {
        head: literal('#head-title'),
        style: literal('#russian-author-style'),
        attribute: document.querySelector('#attribute')?.getAttribute('title'),
        pre: literal('pre'),
        code: literal('code'),
        kbd: literal('kbd'),
        samp: literal('samp'),
        textarea: literal('textarea'),
        svg: literal('svg text'),
        math: literal('math mtext'),
        svgResource: svgDocument.querySelector('text')?.textContent
      }
    };
  });

  expect(result.proseText).toContain('и\u00A0в\u00A0доме Но\u00A0ветер к\u00A07 в\u00A0\u0661 в\u00A0Доме');
  expect(result.longWordGaps).toEqual([]);
  expect(result.proseText).toContain('толькото дом в Google в\tдоме в\nдоме в  доме');
  expect(result.proseText).toHaveLength(result.prose.length);
  expect(result.range).toEqual({ start: 0, end: 'и в доме'.length, text: 'и\u00A0в\u00A0доме' });
  expect(result.first).toBe(result.second);
  expect(result.literals).toEqual({
    head: 'и в доме',
    style: 'и в доме',
    attribute: 'и в доме',
    pre: 'и в доме',
    code: 'и в доме',
    kbd: 'и в доме',
    samp: 'и в доме',
    textarea: 'и в доме',
    svg: 'и в доме',
    math: 'и в доме',
    svgResource: 'и в доме'
  });
});

test('loads a Russian EPUB through the installed guard without changing source bytes', async ({ page }) => {
  await page.goto('/library');

  const result = await page.evaluate(async ({ zipWriterUrl, epubCfiUrl }) => {
    const modulePath = '/src/lib/reader/foliate.ts';
    const reader = await import(/* @vite-ignore */ modulePath);
    const { BlobWriter, TextReader, ZipWriter } = await import(/* @vite-ignore */ zipWriterUrl);
    const CFI = await import(/* @vite-ignore */ epubCfiUrl);
    const chapter = '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Russian NBSP</title></head><body><p id="prose">и в &#1044;оме</p></body></html>';
    const writer = new ZipWriter(new BlobWriter());
    await writer.add('mimetype', new TextReader('application/epub+zip'), { level: 0 });
    await writer.add(
      'META-INF/container.xml',
      new TextReader(`<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`)
    );
    await writer.add(
      'OPS/content.opf',
      new TextReader(`<?xml version="1.0"?><package version="3.0" unique-identifier="id" xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">russian-nbsp</dc:identifier><dc:title>Russian NBSP</dc:title><dc:language>ru-RU</dc:language></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>`)
    );
    await writer.add('OPS/chapter.xhtml', new TextReader(chapter));
    const source = new File([await writer.close()], 'russian-nbsp.epub', { type: 'application/epub+zip' });
    const before = new Uint8Array(await source.arrayBuffer());
    const book = await reader.loadReaderBookDocument(source);
    let frame: HTMLIFrameElement | undefined;
    try {
      const section = book.sections?.[0] as
        | { load?: () => Promise<string>; createDocument?: () => Promise<Document> }
        | undefined;
      if (!section?.load || !section.createDocument) throw new Error('expected EPUB section');
      const resource = await section.load();
      const after = new Uint8Array(await source.arrayBuffer());
      const response = await fetch(resource);
      const serialized = await response.text();
      const createdFrame = document.createElement('iframe');
      frame = createdFrame;
      await new Promise<void>((resolve, reject) => {
        createdFrame.addEventListener('load', () => resolve(), { once: true });
        createdFrame.addEventListener('error', () => reject(new Error('expected EPUB blob URL to load')), { once: true });
        createdFrame.src = resource;
        document.body.append(createdFrame);
      });
      const frameDocument = createdFrame.contentDocument;
      if (!frameDocument) throw new Error('expected EPUB blob iframe document');
      const proseNode = frameDocument.querySelector('#prose')?.firstChild;
      if (proseNode?.nodeType !== Node.TEXT_NODE) throw new Error('expected transformed EPUB prose node');
      const proseText = proseNode as Text;
      const range = frameDocument.createRange();
      range.selectNodeContents(proseText);
      const raw = await section.createDocument();
      const rawProseNode = raw.querySelector('#prose')?.firstChild;
      if (rawProseNode?.nodeType !== Node.TEXT_NODE) throw new Error('expected raw EPUB prose node');
      const rawProseText = rawProseNode as Text;
      const rawRange = raw.createRange();
      rawRange.setStart(rawProseText, 2);
      rawRange.setEnd(rawProseText, rawProseText.length);
      const cfi = CFI.fromRange(rawRange);
      const displayRange = CFI.toRange(frameDocument, CFI.parse(cfi));
      if (!displayRange) throw new Error('expected CFI to resolve in transformed EPUB document');
      return {
        bytesUnchanged: before.length === after.length && before.every((byte, index) => byte === after[index]),
        contentType: response.headers.get('content-type'),
        serialized,
        parserError: frameDocument.querySelector('parsererror')?.textContent ?? null,
        text: proseText.data,
        range: { start: range.startOffset, end: range.endOffset, text: range.toString() },
        rawText: rawProseText.data,
        cfi,
        displayCfiRange: {
          start: displayRange.startOffset,
          end: displayRange.endOffset,
          text: displayRange.toString()
        }
      };
    } finally {
      frame?.remove();
      await book.destroy?.();
    }
  }, { zipWriterUrl, epubCfiUrl });

  expect(result.bytesUnchanged).toBe(true);
  expect(result.contentType).toContain('application/xhtml+xml');
  expect(result.serialized).toContain('и&#160;в&#160;Доме');
  expect(result.parserError).toBeNull();
  expect(result.text).toBe('и\u00A0в\u00A0Доме');
  expect(result.range).toEqual({ start: 0, end: 'и в Доме'.length, text: 'и\u00A0в\u00A0Доме' });
  expect(result.rawText).toBe('и в Доме');
  expect(result.cfi).toMatch(/^epubcfi\(/);
  expect(result.displayCfiRange).toEqual({ start: 2, end: 'и в Доме'.length, text: 'в\u00A0Доме' });
});

test('disables ligatures for EPUB code without changing authored prose typography', async ({ page }) => {
  await page.goto('/library');

  const ligatures = await page.evaluate(async () => {
    const readerModulePath = '/src/lib/reader/foliate.ts';
    const settingsModulePath = '/src/lib/reader/settings.ts';
    const { getReaderViewStyles } = await import(/* @vite-ignore */ readerModulePath);
    const { createDefaultReaderSettings } = await import(/* @vite-ignore */ settingsModulePath);
    const frame = document.createElement('iframe');
    document.body.append(frame);
    const frameDoc = frame.contentDocument;
    if (!frameDoc) throw new Error('expected attached EPUB-style document');

    frameDoc.body.innerHTML = '<p id="prose">office</p><code id="code">!== <= => ===</code><pre>office</pre><kbd>office</kbd>';
    const authorStyle = frameDoc.createElement('style');
    authorStyle.textContent = 'p, code, pre, kbd { font-variant-ligatures: common-ligatures !important; }';
    frameDoc.head.append(authorStyle);
    const readerStyle = frameDoc.createElement('style');
    readerStyle.textContent = getReaderViewStyles(createDefaultReaderSettings());
    frameDoc.head.append(readerStyle);

    const read = (selector: string) => {
      const element = frameDoc.querySelector(selector);
      if (!element) throw new Error(`expected ${selector}`);
      return frameDoc.defaultView?.getComputedStyle(element).fontVariantLigatures;
    };
    const code = frameDoc.querySelector('#code');
    if (!code) throw new Error('expected code source');
    const codeRange = frameDoc.createRange();
    codeRange.selectNodeContents(code);

    return {
      styles: {
        prose: read('#prose'),
        code: read('#code'),
        pre: read('pre'),
        kbd: read('kbd')
      },
      codeSource: code.textContent,
      codeCopy: codeRange.toString()
    };
  });

  expect(ligatures.styles).toEqual({
    prose: 'common-ligatures',
    code: 'none',
    pre: 'none',
    kbd: 'none'
  });
  expect(ligatures.codeSource).toBe('!== <= => ===');
  expect(ligatures.codeCopy).toBe('!== <= => ===');
});

test('disables ligatures for fenced TXT code in the reader surface', async ({ page }) => {
  await page.goto(
    `/reader?source=asset&url=${encodeURIComponent('/samples/sample-code-block.txt')}&label=${encodeURIComponent('Sample Code TXT Book')}`
  );

  const codeBlock = page.locator('.plain-text-code-block code').first();
  await expect(codeBlock).toBeVisible({ timeout: 15000 });
  await expect.poll(() => codeBlock.evaluate((element) => getComputedStyle(element).fontVariantLigatures)).toBe('none');
});

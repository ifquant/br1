import { expect, test } from '@playwright/test';

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

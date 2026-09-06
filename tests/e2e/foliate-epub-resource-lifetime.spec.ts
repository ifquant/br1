import { expect, test } from '@playwright/test';
import path from 'node:path';

const foliateRoot = path.resolve(process.cwd(), '../foliate-js');
const zipWriterUrl = `/@fs/${foliateRoot}/node_modules/@zip.js/zip.js/index.js`;
const foliateViewUrl = `/@fs/${foliateRoot}/view.js`;
const svelteNavigationUrl = `/@fs/${process.cwd()}/node_modules/@sveltejs/kit/src/runtime/app/navigation.js`;

type Chapter = { id: string; href: string; body: string };
type ResourceUrls = { chapter: string; css: string; image: string; cssImage: string };
type ReleaseState = { revokes: number[]; unavailable: boolean[] };

const resourceChapter = (id: string, pictureId = 'chapter-picture') => ({
  id,
  href: `${id}.xhtml`,
  body: `<section data-c9-chapter="${id}"><img id="${pictureId}" src="shared.png" alt="chapter picture"/><img src="shared.png" alt="same parent picture"/></section>`
});

const buildEpub = async (page: import('@playwright/test').Page, chapters: Chapter[]) =>
  page.evaluate(
    async ({ zipWriterUrl, chapters }) => {
      const { BlobReader, BlobWriter, TextReader, ZipWriter } = await import(/* @vite-ignore */ zipWriterUrl);
      const xhtml = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>C9 resource lifetime</title><link rel="stylesheet" href="shared.css"/></head><body>${body}</body></html>`;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 2;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('expected browser canvas support for the PNG fixture');
      context.fillStyle = '#d13a4c';
      context.fillRect(0, 0, 2, 2);
      const image = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('failed to encode C9 PNG')), 'image/png')
      );
      const writer = new ZipWriter(new BlobWriter());
      await writer.add('mimetype', new TextReader('application/epub+zip'), { level: 0 });
      await writer.add(
        'META-INF/container.xml',
        new TextReader('<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
      );
      await writer.add(
        'OPS/content.opf',
        new TextReader(`<?xml version="1.0"?><package version="3.0" unique-identifier="id" xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">c9</dc:identifier><dc:title>C9 resource lifetime</dc:title><dc:language>en</dc:language></metadata><manifest><item id="style" href="shared.css" media-type="text/css"/><item id="image" href="shared.png" media-type="image/png"/>${chapters.map(({ id, href }) => `<item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${chapters.map(({ id }) => `<itemref idref="${id}"/>`).join('')}</spine></package>`)
      );
      await writer.add('OPS/shared.css', new TextReader('.one { background-image: url("shared.png") } .two { background-image: url("shared.png") }'));
      await writer.add('OPS/shared.png', new BlobReader(image));
      for (const chapter of chapters) await writer.add(`OPS/${chapter.href}`, new TextReader(xhtml(chapter.body)));
      return Array.from(new Uint8Array(await (await writer.close()).arrayBuffer()));
    },
    { zipWriterUrl, chapters }
  );

const c9PageErrors = new WeakMap<import('@playwright/test').Page, Error[]>();

test.beforeEach(async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  c9PageErrors.set(page, errors);
  await page.addInitScript(() => {
    type Trace = {
      created: Array<{ url: string; type: string; blob: Blob | null }>;
      revoked: string[];
      restore: () => void;
    };
    const host = window as Window & { __BR1_C9_URL_TRACE__?: Trace };
    if (host.__BR1_C9_URL_TRACE__) return;
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    const trace: Trace = {
      created: [],
      revoked: [],
      restore: () => {
        URL.createObjectURL = create;
        URL.revokeObjectURL = revoke;
      }
    };
    URL.createObjectURL = (resource) => {
      const url = create(resource);
      trace.created.push({
        url,
        type: resource instanceof Blob ? resource.type : '',
        blob: resource instanceof Blob ? resource : null
      });
      return url;
    };
    URL.revokeObjectURL = (url) => {
      trace.revoked.push(String(url));
      revoke(url);
    };
    host.__BR1_C9_URL_TRACE__ = trace;
  });
  await page.goto('/library');
});

test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    (window as Window & { __BR1_C9_URL_TRACE__?: { restore: () => void } }).__BR1_C9_URL_TRACE__?.restore();
  }).catch(() => {});
  expect(c9PageErrors.get(page) ?? []).toEqual([]);
});

const runLoaderCase = (
  page: import('@playwright/test').Page,
  archive: number[],
  scenario: 'held-transient' | 'load-content' | 'shared-dependencies'
) =>
  page.evaluate(
    async ({ archive, foliateViewUrl, scenario }) => {
      type Section = {
        load: () => Promise<string>;
        unload: () => void;
        loadContent: () => Promise<string | undefined>;
      };
      type Trace = { created: Array<{ url: string; type: string; blob: Blob | null }>; revoked: string[] };
      const trace = (window as Window & { __BR1_C9_URL_TRACE__?: Trace }).__BR1_C9_URL_TRACE__;
      if (!trace) throw new Error('expected C9 URL trace');
      const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
        if (!condition) throw new Error(message);
      };
      const unavailable = (url: string) => fetch(url).then((response) => !response.ok, () => true);
      const decode = async (url: string, stage: string) => {
        const response = await fetch(url);
        assert(response.ok, `expected fetchable image at ${stage}: ${url}`);
        const decodeUrl = URL.createObjectURL(await response.blob());
        try {
          const image = new Image();
          image.src = decodeUrl;
          await image.decode();
        } finally {
          URL.revokeObjectURL(decodeUrl);
        }
      };
      const urlsFromChapter = async (chapter: string): Promise<ResourceUrls> => {
        const response = await fetch(chapter);
        assert(response.ok, `expected fetchable chapter: ${chapter}`);
        const document = new DOMParser().parseFromString(await response.text(), 'application/xhtml+xml');
        const css = (document.querySelector('link[rel="stylesheet"]') as HTMLLinkElement | null)?.href;
        const image = (document.querySelector('#chapter-picture') as HTMLImageElement | null)?.src;
        assert(css && image, 'expected rewritten chapter CSS and image URLs');
        const cssResponse = await fetch(css);
        assert(cssResponse.ok, `expected fetchable CSS: ${css}`);
        const cssImage = /url\(["']?([^"')]+)["']?\)/.exec(await cssResponse.text())?.[1];
        assert(cssImage, 'expected rewritten CSS image URL');
        return { chapter, css, image, cssImage };
      };
      const fresh = async (urls: ResourceUrls, stage: string) => {
        const chapter = await fetch(urls.chapter);
        const css = await fetch(urls.css);
        assert(chapter.ok && css.ok, `expected fresh chapter and CSS URLs at ${stage}`);
        await decode(urls.image, stage);
        await decode(urls.cssImage, stage);
      };
      const assertUnrevoked = (urls: ResourceUrls, stage: string) => {
        const targets = [...new Set([urls.chapter, urls.css, urls.image, urls.cssImage])];
        assert(targets.every((url) => !trace.revoked.includes(url)), `unexpected target revoke at ${stage}`);
      };
      const releasedOnce = async (urls: ResourceUrls) => {
        const targets = [...new Set([urls.chapter, urls.css, urls.image, urls.cssImage])];
        return {
          revokes: targets.map((url) => trace.revoked.filter((value) => value === url).length),
          unavailable: await Promise.all(targets.map(unavailable))
        };
      };
      const makeBook = async () => {
        const { makeBook } = await import(/* @vite-ignore */ foliateViewUrl);
        return makeBook(new File([new Uint8Array(archive)], 'c9.epub', { type: 'application/epub+zip' }));
      };

      if (scenario === 'held-transient') {
        const book = await makeBook();
        const section = book.sections[0] as Section;
        const urls = await urlsFromChapter(await section.load());
        await fresh(urls, 'initial reader hold');
        assertUnrevoked(urls, 'initial reader hold');
        for (let index = 0; index < 3; index += 1) {
          assert(await section.load() === urls.chapter, 'transient load must reuse the held chapter URL');
          await fresh(urls, `transient load ${index + 1}`);
          assertUnrevoked(urls, `transient load ${index + 1}`);
          section.unload();
          await fresh(urls, `after transient unload ${index + 1}`);
          assertUnrevoked(urls, `after transient unload ${index + 1}`);
        }
        section.unload();
        return { urls, ...(await releasedOnce(urls)) };
      }

      if (scenario === 'load-content') {
        const book = await makeBook();
        const section = book.sections[0] as Section;
        const held = await urlsFromChapter(await section.load());
        for (let index = 0; index < 3; index += 1) {
          assert((await section.loadContent())?.includes('chapter-picture'), 'expected native section content');
          await fresh(held, `held loadContent ${index + 1}`);
          assertUnrevoked(held, `held loadContent ${index + 1}`);
        }
        section.unload();
        const heldResult = await releasedOnce(held);

        const coldBook = await makeBook();
        const coldSection = coldBook.sections[0] as Section;
        const createdAt = trace.created.length;
        assert((await coldSection.loadContent())?.includes('chapter-picture'), 'expected cold native section content');
        const coldChapter = (await Promise.all(trace.created.slice(createdAt).map(async ({ url, type, blob }) => ({
          url,
          type,
          text: blob ? await blob.text() : ''
        })))).find(({ type, text }) => type === 'application/xhtml+xml' && text.includes('data-c9-chapter="chapter"'))?.url;
        assert(coldChapter, 'cold loadContent must create one native chapter URL');
        const cold = await urlsFromChapter(coldChapter);
        await fresh(cold, 'cold loadContent');
        assertUnrevoked(cold, 'cold loadContent');
        coldSection.unload();
        return { heldResult, coldResult: await releasedOnce(cold) };
      }

      const book = await makeBook();
      const first = book.sections[0] as Section;
      const second = book.sections[1] as Section;
      const firstUrls = await urlsFromChapter(await first.load());
      const secondUrls = await urlsFromChapter(await second.load());
      assert(firstUrls.css === secondUrls.css, 'chapters must share one CSS URL');
      assert(firstUrls.image === secondUrls.image && firstUrls.cssImage === secondUrls.cssImage,
        'repeated chapter and CSS references must share one image URL');
      await fresh(firstUrls, 'both shared chapters loaded');
      assertUnrevoked(firstUrls, 'both shared chapters loaded');
      first.unload();
      const afterFirst = await releasedOnce(firstUrls);
      await fresh(secondUrls, 'after first shared chapter unload');
      assertUnrevoked(secondUrls, 'after first shared chapter unload');
      second.unload();
      return { afterFirst, final: await releasedOnce(secondUrls) };
    },
    { archive, foliateViewUrl, scenario }
  );

test('C9 keeps a reader-held section fresh across transient load/unload cycles and releases it once', async ({ page }) => {
  const result = await runLoaderCase(
    page,
    await buildEpub(page, [resourceChapter('chapter')]),
    'held-transient'
  ) as ReleaseState;
  expect(result.revokes).toEqual(result.revokes.map(() => 1));
  expect(result.unavailable).toEqual(result.unavailable.map(() => true));
});

test('C9 makes repeated loadContent borrow a held owner and gives cold loadContent one releasable owner', async ({ page }) => {
  const result = await runLoaderCase(
    page,
    await buildEpub(page, [resourceChapter('chapter')]),
    'load-content'
  ) as { heldResult: ReleaseState; coldResult: ReleaseState };
  expect(result.heldResult.revokes).toEqual(result.heldResult.revokes.map(() => 1));
  expect(result.heldResult.unavailable).toEqual(result.heldResult.unavailable.map(() => true));
  expect(result.coldResult.revokes).toEqual(result.coldResult.revokes.map(() => 1));
  expect(result.coldResult.unavailable).toEqual(result.coldResult.unavailable.map(() => true));
});

test('C9 deduplicates shared CSS and image dependencies until the second chapter unloads', async ({ page }) => {
  const result = await runLoaderCase(
    page,
    await buildEpub(page, [resourceChapter('chapter-one'), resourceChapter('chapter-two')]),
    'shared-dependencies'
  ) as { afterFirst: ReleaseState; final: ReleaseState };
  expect(result.afterFirst.revokes).toEqual([1, 0, 0]);
  expect(result.afterFirst.unavailable).toEqual([true, false, false]);
  expect(result.final.revokes).toEqual(result.final.revokes.map(() => 1));
  expect(result.final.unavailable).toEqual(result.final.unavailable.map(() => true));
});

// Fixed-layout is intentionally excluded: its current C9 source contract does not unload sections.
test('C9 balances two native paginator views on one book across navigation in paginated and scrolled flows', async ({ page }) => {
  test.setTimeout(90_000);
  const archive = await buildEpub(page, [
    resourceChapter('chapter-one'),
    resourceChapter('chapter-two'),
    resourceChapter('chapter-three'),
    resourceChapter('chapter-four'),
    resourceChapter('chapter-five'),
    resourceChapter('chapter-six'),
    resourceChapter('chapter-seven')
  ]);
  const result = await page.evaluate(
    async ({ archive, foliateViewUrl }) => {
      type Trace = { created: Array<{ url: string; type: string; blob: Blob | null }>; revoked: string[] };
      type NativeView = HTMLElement & {
        open: (book: unknown) => Promise<void>;
        init: (options: { showTextStart: boolean }) => Promise<void>;
        goTo: (target: number) => Promise<unknown>;
        close: () => void;
        renderer?: { getContents: () => Array<{ doc?: Document }> };
        perfTracker?: { time: <T>(name: string, operation: () => T) => T };
      };
      const trace = (window as Window & { __BR1_C9_URL_TRACE__?: Trace }).__BR1_C9_URL_TRACE__;
      if (!trace) throw new Error('expected C9 URL trace');
      const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
        if (!condition) throw new Error(message);
      };
      const unavailable = (url: string) => fetch(url).then((response) => !response.ok, () => true);
      const urlsFromView = async (view: NativeView): Promise<ResourceUrls> => {
        const document = view.renderer?.getContents().find(({ doc }) => doc?.querySelector('#chapter-picture'))?.doc;
        const css = (document?.querySelector('link[rel="stylesheet"]') as HTMLLinkElement | null)?.href;
        const image = (document?.querySelector('#chapter-picture') as HTMLImageElement | null)?.src;
        if (!document || !css || !image) throw new Error('expected native rendered chapter resources');
        const marker = document.querySelector<HTMLElement>('[data-c9-chapter]')?.dataset.c9Chapter;
        const cssResponse = await fetch(css);
        if (!cssResponse.ok) throw new Error('expected fetchable native CSS resource');
        const cssImage = /url\(["']?([^"')]+)["']?\)/.exec(await cssResponse.text())?.[1];
        const chapter = (await Promise.all(trace.created.map(async ({ url, type, blob }) => ({
          url,
          type,
          text: blob ? await blob.text() : ''
        })))).find(({ type, text }) => type === 'application/xhtml+xml' &&
          text.includes(`data-c9-chapter="${marker}"`) && text.includes(image))?.url;
        if (!marker || !chapter || !cssImage) throw new Error('expected traced native chapter and CSS image URLs');
        return { chapter, css, image, cssImage };
      };
      const fresh = async (urls: ResourceUrls, stage: string) => {
        const [chapter, css, image, cssImage] = await Promise.all([
          fetch(urls.chapter), fetch(urls.css), fetch(urls.image), fetch(urls.cssImage)
        ]);
        assert(chapter.ok && css.ok && image.ok && cssImage.ok, `expected main view resources at ${stage}`);
        for (const response of [image, cssImage]) {
          const decodeUrl = URL.createObjectURL(await response.blob());
          try {
            const decoded = new Image();
            decoded.src = decodeUrl;
            await decoded.decode();
          } finally {
            URL.revokeObjectURL(decodeUrl);
          }
        }
      };
      const assertUnrevoked = (urls: ResourceUrls, stage: string) => {
        const targets = [...new Set([urls.chapter, urls.css, urls.image, urls.cssImage])];
        assert(targets.every((url) => !trace.revoked.includes(url)), `unexpected target revoke at ${stage}`);
      };
      const fills = new WeakMap<NativeView, Promise<unknown>>();
      const sizeView = (view: NativeView, left: string) => {
        Object.assign(view.style, { position: 'fixed', top: '0', left, width: '600px', height: '500px' });
        // The existing timing hook exposes the real background fill promise.
        // Await it without changing loads, releases, or using a settling sleep.
        view.perfTracker = { time: (name, operation) => {
          const result = operation();
          if (name === 'renderer:display:fillVisibleArea') fills.set(view, Promise.resolve(result));
          return result;
        } };
      };
      const settle = async (view: NativeView) => {
        const fill = fills.get(view);
        assert(fill, 'expected native background fill instrumentation');
        await fill;
      };
      const { makeBook } = await import(/* @vite-ignore */ foliateViewUrl);
      const flows: Array<'paginated' | 'scrolled'> = ['paginated', 'scrolled'];
      const outcomes = [];
      for (const flow of flows) {
        const book = await makeBook(new File([new Uint8Array(archive)], `${flow}.epub`, { type: 'application/epub+zip' }));
        const main = document.createElement('foliate-view') as NativeView;
        main.setAttribute('flow', flow);
        sizeView(main, '0');
        document.body.append(main);
        await main.open(book);
        await main.init({ showTextStart: true });
        await settle(main);
        const urls = await urlsFromView(main);
        await fresh(urls, `${flow}: initial main hold`);
        assertUnrevoked(urls, `${flow}: initial main hold`);
        for (const action of ['close', 'navigate', 'reject'] as const) {
          for (let cycle = 0; cycle < (action === 'reject' ? 1 : 3); cycle += 1) {
            const temporary = document.createElement('foliate-view') as NativeView;
            temporary.setAttribute('flow', flow);
            sizeView(temporary, '620px');
            document.body.append(temporary);
            await temporary.open(book);
            await temporary.init({ showTextStart: true });
            await settle(temporary);
            if (action === 'reject') {
              // Fail before the destination acquires a reference. This tests
              // the surviving owner, not restoration of the failing view's UI.
              const destination = book.sections[6];
              const originalLoad = destination.load;
              let attempts = 0;
              destination.load = async () => {
                attempts += 1;
                throw new Error('C9 expected destination load failure');
              };
              try {
                await temporary.goTo(6);
              } finally {
                destination.load = originalLoad;
              }
              // Rejection has no successful fill promise to await.
              assert(attempts === 1, `${flow}: expected one rejected destination load`);
              assert(!temporary.renderer?.getContents().some(({ doc }) =>
                doc?.querySelector('[data-c9-chapter="chapter-one"]')),
                `${flow}: failed far navigation must exercise old-view retirement`);
              const holder = main.renderer?.getContents().find(({ doc }) =>
                doc?.querySelector('[data-c9-chapter="chapter-one"]'))?.doc;
              assert(holder?.defaultView?.frameElement?.isConnected,
                `${flow}: main holder must remain mounted after destination rejection`);
              assertUnrevoked(urls, `${flow}: rejected destination`);
              await fresh(urls, `${flow}: rejected destination`);
            }
            if (action === 'navigate') {
              // Retire index 0 before onLoad, with another view holding it.
              await temporary.goTo(6);
              await settle(temporary);
              const settled = temporary.renderer?.getContents().some(({ doc }) =>
                doc?.querySelector('[data-c9-chapter="chapter-seven"]'));
              assert(settled, `${flow}: temporary view did not settle on chapter seven`);
              assertUnrevoked(urls, `${flow}: temporary navigation ${cycle + 1}`);
              await fresh(urls, `${flow}: temporary navigation ${cycle + 1}`);
            }
            temporary.close();
            temporary.remove();
            assertUnrevoked(urls, `${flow}: ${action} cycle ${cycle + 1}`);
            await fresh(urls, `${flow}: ${action} cycle ${cycle + 1}`);
          }
        }
        main.close();
        main.remove();
        const targets = [...new Set([urls.chapter, urls.css, urls.image, urls.cssImage])];
        outcomes.push({
          flow,
          revokes: targets.map((url) => trace.revoked.filter((value) => value === url).length),
          unavailable: await Promise.all(targets.map(unavailable))
        });
      }
      return outcomes;
    },
    { archive, foliateViewUrl }
  );
  for (const outcome of result) {
    expect(outcome.revokes).toEqual(outcome.revokes.map(() => 1));
    expect(outcome.unavailable).toEqual(outcome.unavailable.map(() => true));
  }
});

const readerHref = (url: string, label: string) =>
  `/reader?${new URLSearchParams({ source: 'asset', url, label }).toString()}`;

const frameUrls = async (page: import('@playwright/test').Page, frame: import('@playwright/test').FrameLocator) => {
  const details = await frame.locator('html').evaluate((root) => {
    const document = root.ownerDocument;
    const css = (document.querySelector('link[rel="stylesheet"]') as HTMLLinkElement | null)?.href;
    const image = (document.querySelector('#chapter-picture') as HTMLImageElement | null)?.src;
    const marker = document.querySelector<HTMLElement>('[data-c9-chapter]')?.dataset.c9Chapter;
    if (!css || !image || !marker) throw new Error('expected marked main chapter resources');
    return { css, image, marker };
  });
  return page.evaluate(async ({ css, image, marker }) => {
    type Trace = { created: Array<{ url: string; type: string; blob: Blob | null }> };
    const trace = (window as Window & { __BR1_C9_URL_TRACE__?: Trace }).__BR1_C9_URL_TRACE__;
    if (!trace) throw new Error('expected C9 URL trace');
    const chapter = (await Promise.all(trace.created.map(async ({ url, type, blob }) => ({
      url,
      type,
      text: blob ? await blob.text() : ''
    })))).find(({ type, text }) => type === 'application/xhtml+xml' &&
      text.includes(`data-c9-chapter="${marker}"`) && text.includes(image))?.url;
    const cssResponse = await fetch(css);
    const cssImage = cssResponse.ok
      ? /url\(["']?([^"')]+)["']?\)/.exec(await cssResponse.text())?.[1]
      : undefined;
    if (!chapter || !cssImage) throw new Error(`expected traced chapter and CSS image URLs for ${marker}`);
    return { chapter, css, image, cssImage };
  }, details);
};

const expectFresh = async (page: import('@playwright/test').Page, urls: ResourceUrls, stage: string) => {
  await expect.poll(async () => page.evaluate(async (urls) => {
    try {
      const [chapter, css, image, cssImage] = await Promise.all([
        fetch(urls.chapter), fetch(urls.css), fetch(urls.image), fetch(urls.cssImage)
      ]);
      if (!chapter.ok || !css.ok || !image.ok || !cssImage.ok) return false;
      for (const response of [image, cssImage]) {
        const decodeUrl = URL.createObjectURL(await response.blob());
        try {
          const decoded = new Image();
          decoded.src = decodeUrl;
          await decoded.decode();
        } finally {
          URL.revokeObjectURL(decodeUrl);
        }
      }
      return true;
    } catch {
      return false;
    }
  }, urls), { message: `expected fresh C9 resources at ${stage}` }).toBe(true);
};

const traceState = (page: import('@playwright/test').Page, urls: ResourceUrls) =>
  page.evaluate(async (urls) => {
    const trace = (window as Window & { __BR1_C9_URL_TRACE__?: { revoked: string[] } }).__BR1_C9_URL_TRACE__;
    if (!trace) throw new Error('expected C9 URL trace');
    const targets = [...new Set([urls.chapter, urls.css, urls.image, urls.cssImage])];
    return {
      revokes: targets.map((url) => trace.revoked.filter((value) => value === url).length),
      unavailable: await Promise.all(targets.map((url) => fetch(url).then((response) => !response.ok, () => true)))
    };
  }, urls);

const expectUnrevoked = async (page: import('@playwright/test').Page, urls: ResourceUrls, stage: string) => {
  const state = await traceState(page, urls);
  expect(state.revokes, `unexpected target revoke at ${stage}`).toEqual(state.revokes.map(() => 0));
};

test('C9 keeps BR1 primary resources through popup and parallel cycles, then releases replacement and teardown owners', async ({ page }) => {
  const firstUrl = '/samples/c9-primary.epub';
  const replacementUrl = '/samples/c9-replacement.epub';
  const [firstArchive, replacementArchive] = await Promise.all([
    buildEpub(page, [{
      ...resourceChapter('chapter'),
      body: '<section data-c9-chapter="chapter"><img id="chapter-picture" src="shared.png" alt="chapter picture"/><p><a id="note-ref" href="#note" epub:type="noteref">[1]</a></p><aside id="note"><p>Plain text footnote only.</p></aside></section>'
    }]),
    buildEpub(page, [{
      ...resourceChapter('replacement'),
      body: '<section data-c9-chapter="replacement"><img id="chapter-picture" src="shared.png" alt="replacement picture"/><p>valid replacement resource</p></section>'
    }])
  ]);
  await page.route(`**${firstUrl}`, (route) => route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(firstArchive) }));
  await page.route(`**${replacementUrl}`, (route) => route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(replacementArchive) }));
  await page.evaluate(async ({ href, svelteNavigationUrl }) => {
    const { goto } = await import(/* @vite-ignore */ svelteNavigationUrl);
    await goto(href, { keepFocus: true, noScroll: true });
  }, { href: readerHref(firstUrl, 'C9 primary'), svelteNavigationUrl });

  const primary = page.getByRole('main', { name: 'reader stage' });
  await expect(primary).toContainText('书籍已打开', { timeout: 15000 });
  const primaryFrame = primary.frameLocator('iframe').first();
  await expect(primaryFrame.locator('#chapter-picture')).toBeVisible({ timeout: 15000 });
  const primaryUrls = await frameUrls(page, primaryFrame);
  await expectFresh(page, primaryUrls, 'initial BR1 reader');
  await expectUnrevoked(page, primaryUrls, 'initial BR1 reader');
  for (let cycle = 0; cycle < 3; cycle += 1) {
    await primaryFrame.locator('#note-ref').click();
    await expect(page.getByRole('dialog', { name: '脚注预览' })).toContainText('Plain text footnote only.');
    await page.getByRole('dialog', { name: '脚注预览' }).getByRole('button', { name: '关闭脚注' }).click();
    await expectFresh(page, primaryUrls, `after footnote popup ${cycle + 1}`);
    await expectUnrevoked(page, primaryUrls, `after footnote popup ${cycle + 1}`);
  }

  await page.getByRole('button', { name: '开启并行阅读' }).click();
  const secondary = page.getByRole('region', { name: '并行阅读窗格', exact: true });
  await expect(secondary).toContainText('书籍已打开', { timeout: 15000 });
  const secondaryUrls = await frameUrls(page, secondary.frameLocator('iframe').first());
  expect(secondaryUrls.image).not.toBe(primaryUrls.image);
  await page.getByRole('button', { name: '关闭并行阅读' }).click();
  await expect(secondary).toHaveCount(0);
  await expectFresh(page, primaryUrls, 'after parallel close');
  await expectUnrevoked(page, primaryUrls, 'after parallel close');
  const closedSecondary = await traceState(page, secondaryUrls);
  expect(closedSecondary.revokes).toEqual(closedSecondary.revokes.map(() => 1));
  expect(closedSecondary.unavailable).toEqual(closedSecondary.unavailable.map(() => true));

  await page.evaluate(async ({ href, svelteNavigationUrl }) => {
    const { goto } = await import(/* @vite-ignore */ svelteNavigationUrl);
    await goto(href, { keepFocus: true, noScroll: true });
  }, { href: readerHref(replacementUrl, 'C9 replacement'), svelteNavigationUrl });
  await expect(primaryFrame.locator('body')).toContainText('valid replacement resource', { timeout: 15000 });
  const replacedPrimary = await traceState(page, primaryUrls);
  expect(replacedPrimary.revokes).toEqual(replacedPrimary.revokes.map(() => 1));
  expect(replacedPrimary.unavailable).toEqual(replacedPrimary.unavailable.map(() => true));
  const replacementUrls = await frameUrls(page, primaryFrame);
  await expectFresh(page, replacementUrls, 'replacement reader');
  await expectUnrevoked(page, replacementUrls, 'replacement reader');

  await page.getByRole('button', { name: '回到书库', exact: true }).first().click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.locator('foliate-view')).toHaveCount(0);
  const closedReplacement = await traceState(page, replacementUrls);
  expect(closedReplacement.revokes).toEqual(closedReplacement.revokes.map(() => 1));
  expect(closedReplacement.unavailable).toEqual(closedReplacement.unavailable.map(() => true));
});

type PendingCloseStage = 'section.load' | 'loadContent' | 'iframe-load';

const runPendingPaginatorCloseCase = (
  page: import('@playwright/test').Page,
  archive: number[],
  kind: 'background-adjacent' | 'direct-after-reject',
  stage: PendingCloseStage,
  flow: 'paginated' | 'scrolled'
) =>
  page.evaluate(
    async ({ archive, foliateViewUrl, kind, stage, flow }) => {
      type Trace = { created: Array<{ url: string; type: string; blob: Blob | null }>; revoked: string[] };
      type Section = {
        load: () => Promise<string>;
        loadContent: () => Promise<string | undefined>;
        unload: () => void;
      };
      type Renderer = HTMLElement & {
        sections: Section[];
        getContents: () => Array<{ index: number; doc?: Document }>;
      };
      type NativeView = HTMLElement & {
        open: (book: unknown) => Promise<void>;
        init: (options: { showTextStart: boolean }) => Promise<void>;
        goTo: (target: number) => Promise<unknown>;
        close: () => void;
        renderer?: Renderer;
        perfTracker?: { time: <T>(name: string, operation: () => T) => T };
        history: { pushState: (state: unknown) => void };
      };
      const trace = (window as Window & { __BR1_C9_URL_TRACE__?: Trace }).__BR1_C9_URL_TRACE__;
      if (!trace) throw new Error('expected C9 URL trace');
      const traceStart = trace.created.length;
      const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
        if (!condition) throw new Error(message);
      };
      const { makeBook } = await import(/* @vite-ignore */ foliateViewUrl);
      const book = await makeBook(new File([new Uint8Array(archive)], `c9-${kind}-${stage}.epub`, {
        type: 'application/epub+zip'
      }));
      const targetIndex = kind === 'background-adjacent' ? 2 : 6;
      const targetMarker = kind === 'background-adjacent' ? 'chapter-two' : 'chapter-six';

      let releaseGate!: () => void;
      const gate = new Promise<void>((resolve) => { releaseGate = resolve; });
      let enterGate!: () => void;
      const entered = new Promise<void>((resolve) => { enterGate = resolve; });
      let enteredOnce = false;
      const enter = () => {
        if (!enteredOnce) {
          enteredOnce = true;
          enterGate();
        }
      };
      let targetLoads = 0;
      let targetContents = 0;
      let targetIframes = 0;
      let targetUnloads = 0;
      let rejectedLoads = 0;
      let rejectedUnloads = 0;
      let contentFinished = false;
      let targetSrc: string | undefined;
      let targetData: string | undefined;
      let targetUrls: ResourceUrls;
      let targetIframe: HTMLIFrameElement | undefined;
      let fill: Promise<unknown> | undefined;
      let closing = false;
      let lateLoads = 0;
      let lateOverlayers = 0;
      let lateRelocates = 0;
      let lateStabilized = 0;
      let lateHistory = 0;

      const bounded = async <T>(promise: Promise<T>, label: string) => {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          return await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
              timeout = setTimeout(() => reject(new Error(`${label} did not settle`)), 5_000);
            })
          ]);
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      };

      const open = async (left: string, observeTarget = false) => {
        const view = document.createElement('foliate-view') as NativeView;
        view.setAttribute('flow', flow);
        Object.assign(view.style, { position: 'fixed', top: '0', left, width: '560px', height: '420px' });
        view.perfTracker = {
          time: (name, operation) => {
            const container = view.renderer?.shadowRoot?.querySelector('#container');
            const identifyIframe = observeTarget && stage === 'iframe-load' && targetSrc &&
              name === 'renderer:view:iframeLoadWait';
            // The native operation assigns src/srcdoc synchronously. Compare
            // before/after attributes so an older matching frame cannot steal
            // another iframe's timing callback.
            const before = new Map(identifyIframe ? Array.from(
              container?.querySelectorAll('iframe') ?? [],
              (frame) => [frame, { src: frame.src, data: frame.srcdoc }] as const
            ) : []);
            const result = operation();
            if (name === 'renderer:display:fillVisibleArea') fill = Promise.resolve(result);
            if (!identifyIframe) return result;
            const matches = Array.from(container?.querySelectorAll('iframe') ?? []).filter((frame) => {
              const previous = before.get(frame);
              const changed = !previous || previous.src !== frame.src || previous.data !== frame.srcdoc;
              return changed && (targetData
                ? frame.srcdoc === targetData && frame.srcdoc.includes(`data-c9-chapter="${targetMarker}"`)
                : frame.src === targetSrc);
            });
            if (!matches.length) return result;
            assert(matches.length === 1 && !targetIframe, 'expected exactly one concrete target iframe');
            targetIframe = matches[0];
            targetIframes += 1;
            return Promise.resolve(result).then(async (value) => {
              assert(targetIframe?.isConnected && container?.contains(targetIframe),
                'expected target iframe registered in the closing renderer');
              assert(targetIframe.contentDocument?.querySelector(`[data-c9-chapter="${targetMarker}"]`),
                'iframe gate must hold the loaded target chapter');
              enter();
              await gate;
              return value;
            }) as typeof result;
          }
        };
        document.body.append(view);
        await view.open(book);
        const renderer = view.renderer;
        if (!renderer) throw new Error('expected native paginator renderer');
        // Each renderer owns its wrapper. Only the closing reader's concrete
        // section can be held or observed, never the book-wide section object.
        renderer.sections = renderer.sections.map((section) => ({ ...section }));
        renderer.setAttribute('no-preload', '');
        await view.init({ showTextStart: true });
        return { view, renderer, sections: renderer.sections };
      };
      const urlsFor = async (marker: string, originalChapter?: string): Promise<ResourceUrls> => {
        const entries = await Promise.all(trace.created.slice(traceStart).map(async ({ url, type, blob }) => ({
          url,
          type,
          text: blob ? await blob.text() : ''
        })));
        const chapter = entries.find(({ url, type, text }) =>
          (!originalChapter || url === originalChapter) &&
          type === 'application/xhtml+xml' && text.includes(`data-c9-chapter="${marker}"`));
        assert(chapter, `expected traced ${marker} chapter`);
        const document = new DOMParser().parseFromString(chapter.text, 'application/xhtml+xml');
        const css = (document.querySelector('link[rel="stylesheet"]') as HTMLLinkElement | null)?.href;
        const image = (document.querySelector('#chapter-picture') as HTMLImageElement | null)?.src;
        assert(css && image, `expected traced ${marker} dependencies`);
        const cssResponse = await fetch(css);
        assert(cssResponse.ok, `expected fetchable ${marker} CSS`);
        const cssImage = /url\(["']?([^"')]+)["']?\)/.exec(await cssResponse.text())?.[1];
        assert(cssImage, `expected traced ${marker} CSS image`);
        return { chapter: chapter.url, css, image, cssImage };
      };
      const fresh = async (urls: ResourceUrls, label: string) => {
        const [chapter, css, image, cssImage] = await Promise.all([
          fetch(urls.chapter), fetch(urls.css), fetch(urls.image), fetch(urls.cssImage)
        ]);
        assert(chapter.ok && css.ok && image.ok && cssImage.ok, `expected fresh ${label} resources`);
        for (const response of [image, cssImage]) {
          const decodeUrl = URL.createObjectURL(await response.blob());
          try {
            const decoded = new Image();
            decoded.src = decodeUrl;
            await decoded.decode();
          } finally {
            URL.revokeObjectURL(decodeUrl);
          }
        }
      };
      const state = async (urls: ResourceUrls) => {
        const targets = [...new Set([urls.chapter, urls.css, urls.image, urls.cssImage])];
        return {
          revokes: targets.map((url) => trace.revoked.filter((value) => value === url).length),
          unavailable: await Promise.all(targets.map((url) => fetch(url).then((response) => !response.ok, () => true)))
        };
      };

      const survivor = await open('0');
      const survivorUrls = await urlsFor('chapter-zero');
      await fresh(survivorUrls, 'surviving reader before close');
      const closingOwner = await open('580px', true);
      const target = closingOwner.sections[targetIndex];
      const rejected = closingOwner.sections[5];
      if (!target || !rejected) throw new Error('expected C9 pending and rejected sections');

      const nativeTargetLoad = target.load.bind(target);
      target.load = async () => {
        targetLoads += 1;
        const value = await nativeTargetLoad();
        targetSrc = value;
        if (stage === 'section.load') {
          enter();
          await gate;
        }
        return value;
      };
      const nativeTargetContent = target.loadContent.bind(target);
      target.loadContent = async () => {
        targetContents += 1;
        if (stage === 'loadContent') {
          enter();
          await gate;
        }
        const value = await nativeTargetContent();
        contentFinished = true;
        targetData = value;
        return value;
      };
      const nativeTargetUnload = target.unload.bind(target);
      target.unload = () => {
        targetUnloads += 1;
        nativeTargetUnload();
      };

      closingOwner.renderer.addEventListener('load', () => {
        if (closing) lateLoads += 1;
      });
      closingOwner.renderer.addEventListener('create-overlayer', () => {
        if (closing) lateOverlayers += 1;
      });
      closingOwner.renderer.addEventListener('relocate', () => {
        if (closing) lateRelocates += 1;
      });
      closingOwner.renderer.addEventListener('stabilized', () => {
        if (closing) lateStabilized += 1;
      });
      const nativePushState = closingOwner.view.history.pushState.bind(closingOwner.view.history);
      closingOwner.view.history.pushState = (state) => {
        if (closing) lateHistory += 1;
        nativePushState(state);
      };

      const captureTargetAtGate = async () => {
        await bounded(entered, `${kind}:${stage} entry`);
        assert(targetSrc, 'expected original target section URL at gate entry');
        targetUrls = await urlsFor(targetMarker, targetSrc);
        await fresh(targetUrls, 'original target at gate entry');
        assert(stage !== 'loadContent' || !contentFinished, 'content gate must precede the native read');
      };
      const verifyHeldContent = async () => {
        if (stage !== 'loadContent') return;
        assert(targetUnloads === 0 && !contentFinished,
          'close must retain the target owner until pending native content finishes');
        await fresh(targetUrls, 'original target after close before content gate release');
      };

      if (kind === 'direct-after-reject') {
        const nativeRejectedLoad = rejected.load.bind(rejected);
        const nativeRejectedUnload = rejected.unload.bind(rejected);
        rejected.load = async () => {
          rejectedLoads += 1;
          throw new Error('C9 expected reject before acquire');
        };
        rejected.unload = () => {
          rejectedUnloads += 1;
          nativeRejectedUnload();
        };
        await closingOwner.view.goTo(5);
        rejected.load = nativeRejectedLoad;
        assert(rejectedLoads === 1, 'expected one rejected direct load');
        assert(rejectedUnloads === 0, 'reject before acquire must not unload');
        const pending = closingOwner.view.goTo(targetIndex);
        await captureTargetAtGate();
        closing = true;
        closingOwner.view.close();
        closingOwner.view.close();
        closingOwner.view.remove();
        await verifyHeldContent();
        await fresh(survivorUrls, 'surviving reader while direct load is pending');
        releaseGate();
        await bounded(pending, `${kind}:${stage} direct navigation`);
      } else {
        fill = undefined;
        closingOwner.renderer.removeAttribute('no-preload');
        // Use an uncached primary so this operation's display path emits a
        // fresh fill timing callback before it begins the adjacent preload.
        const navigation = closingOwner.view.goTo(1);
        await captureTargetAtGate();
        assert(fill, 'expected native background adjacent fill');
        closing = true;
        closingOwner.view.close();
        closingOwner.view.close();
        closingOwner.view.remove();
        await verifyHeldContent();
        await fresh(survivorUrls, 'surviving reader while background load is pending');
        releaseGate();
        await bounded(navigation, `${kind}:${stage} background navigation`);
        await bounded(fill, `${kind}:${stage} background fill`);
      }

      assert(stage !== 'loadContent' || contentFinished, 'pending content must finish before final release');
      assert(stage !== 'iframe-load' || (targetIframe && !targetIframe.isConnected),
        'the gated target iframe must stay detached after close');
      const targetChapters = (await Promise.all(trace.created.slice(traceStart).map(async ({ url, type, blob }) => ({
        url, type, text: blob ? await blob.text() : ''
      })))).filter(({ type, text }) => type === 'application/xhtml+xml' &&
        text.includes(`data-c9-chapter="${targetMarker}"`));
      assert(targetChapters.length === 1 && targetChapters[0].url === targetUrls!.chapter,
        'pending content must not create a replacement target chapter URL');
      await fresh(survivorUrls, 'surviving reader after pending load settles');
      survivor.view.close();
      survivor.view.remove();
      return {
        targetLoads,
        targetContents,
        targetIframes,
        targetUnloads,
        rejectedLoads,
        rejectedUnloads,
        lateLoads,
        lateOverlayers,
        lateRelocates,
        lateStabilized,
        lateHistory,
        closingContents: closingOwner.renderer.getContents().length,
        survivor: await state(survivorUrls),
        target: await state(targetUrls!)
      };
    },
    { archive, foliateViewUrl, kind, stage, flow }
  );

for (const flow of ['paginated', 'scrolled'] as const) {
  for (const kind of ['background-adjacent', 'direct-after-reject'] as const) {
    for (const stage of ['section.load', 'loadContent', 'iframe-load'] as const) {
      test(`C9 ${flow} releases owner-local ${kind} ${stage} work crossing close exactly once`, async ({ page }) => {
        test.setTimeout(90_000);
        const archive = await buildEpub(page, Array.from({ length: 7 }, (_, index) =>
          resourceChapter(`chapter-${['zero', 'one', 'two', 'three', 'four', 'five', 'six'][index]}`)
        ));
        const result = await runPendingPaginatorCloseCase(page, archive, kind, stage, flow);
        expect(result.targetLoads).toBe(1);
        expect(result.targetContents).toBe(stage === 'section.load' ? 0 : 1);
        expect(result.targetIframes).toBe(stage === 'iframe-load' ? 1 : 0);
        expect(result.targetUnloads).toBe(1);
        expect(result.lateLoads).toBe(0);
        expect(result.lateOverlayers).toBe(0);
        expect(result.lateRelocates).toBe(0);
        expect(result.lateStabilized).toBe(0);
        expect(result.lateHistory).toBe(0);
        expect(result.closingContents).toBe(0);
        expect(result.survivor.revokes).toEqual(result.survivor.revokes.map(() => 1));
        expect(result.survivor.unavailable).toEqual(result.survivor.unavailable.map(() => true));
        expect(result.target.revokes).toEqual(result.target.revokes.map(() => 1));
        expect(result.target.unavailable).toEqual(result.target.unavailable.map(() => true));
        if (kind === 'direct-after-reject') {
          expect(result.rejectedLoads).toBe(1);
          expect(result.rejectedUnloads).toBe(0);
        }
      });
    }
  }
}

for (const flow of ['paginated', 'scrolled'] as const) {
  for (const caller of ['direct', 'background-adjacent'] as const) {
    test(`C9 ${flow} ${caller} empty load acquires nothing and permits a real retry`, async ({ page }) => {
      const archive = await buildEpub(page, ['zero', 'one', 'two'].map((name) => resourceChapter(`chapter-${name}`)));
      const result = await page.evaluate(async ({ archive, foliateViewUrl, flow, caller }) => {
        type Section = {
          load: () => Promise<string | null>;
          loadContent: () => Promise<string | undefined>;
          unload: () => void;
        };
        type NativeView = HTMLElement & {
          open: (book: unknown) => Promise<void>;
          init: (options: { showTextStart: boolean }) => Promise<void>;
          goTo: (index: number) => Promise<unknown>;
          close: () => void;
          renderer: HTMLElement & {
            sections: Section[];
            getContents: () => Array<{ index: number; doc?: Document }>;
          };
          perfTracker: { time: <T>(name: string, operation: () => T) => T };
        };
        const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
          if (!condition) throw new Error(message);
        };
        const trace = (window as Window & { __BR1_C9_URL_TRACE__?: { revoked: string[] } }).__BR1_C9_URL_TRACE__;
        assert(trace, 'expected C9 URL trace');
        const { makeBook } = await import(/* @vite-ignore */ foliateViewUrl);
        const book = await makeBook(new File([new Uint8Array(archive)], 'c9-empty-load.epub', { type: 'application/epub+zip' }));
        const fills = new Map<NativeView, Promise<unknown>>();
        const open = async (left: string) => {
          const view = document.createElement('foliate-view') as NativeView;
          view.setAttribute('flow', flow);
          Object.assign(view.style, { position: 'fixed', top: '0', left, width: '560px', height: '420px' });
          view.perfTracker = { time: (name, operation) => {
            const value = operation();
            if (name === 'renderer:display:fillVisibleArea') fills.set(view, Promise.resolve(value));
            return value;
          } };
          document.body.append(view);
          await view.open(book);
          view.renderer.sections = view.renderer.sections.map((section) => ({ ...section }));
          view.renderer.setAttribute('no-preload', '');
          await view.init({ showTextStart: true });
          return view;
        };
        const survivor = await open('0');
        const held = survivor.renderer.sections[2];
        const heldLoad = held.load.bind(held);
        let chapter: string | null = null;
        held.load = async () => (chapter = await heldLoad());
        await survivor.goTo(2);
        assert(chapter, 'survivor must hold the same target section before the empty attempt');
        const doc = survivor.renderer.getContents().find(({ index }) => index === 2)?.doc;
        const css = doc?.querySelector<HTMLLinkElement>('link[rel="stylesheet"]')?.href;
        const image = doc?.querySelector<HTMLImageElement>('#chapter-picture')?.src;
        assert(css && image, 'expected survivor target CSS and image');
        const cssResponse = await fetch(css);
        assert(cssResponse.ok, 'expected survivor target CSS bytes');
        const cssImage = /url\(["']?([^"')]+)["']?\)/.exec(await cssResponse.text())?.[1];
        assert(cssImage, 'expected survivor target CSS image');
        const targets = [...new Set([chapter, css, image, cssImage])];
        const fresh = async () => {
          assert(targets.every((url) => !trace.revoked.includes(url)), 'empty load must preserve original survivor references');
          for (const url of targets) assert((await fetch(url)).ok, 'original survivor target URL must remain fetchable');
          const decodeUrl = URL.createObjectURL(await (await fetch(image)).blob());
          try {
            const decoded = new Image();
            decoded.src = decodeUrl;
            await decoded.decode();
          } finally {
            URL.revokeObjectURL(decodeUrl);
          }
        };
        const closing = await open('580px');
        const target = closing.renderer.sections[2];
        const nativeLoad = target.load.bind(target);
        const nativeContent = target.loadContent.bind(target);
        const nativeUnload = target.unload.bind(target);
        let emptyCalls = 0;
        let retryCalls = 0;
        let contentCalls = 0;
        let unloads = 0;
        // EPUB allow=false fulfills with null without acquiring a reference.
        // Keep that boundary local to this renderer; the survivor owns index 2.
        target.load = async () => { emptyCalls += 1; return null; };
        target.loadContent = () => { contentCalls += 1; return nativeContent(); };
        target.unload = () => { unloads += 1; nativeUnload(); };
        fills.delete(closing);
        if (caller === 'background-adjacent') closing.renderer.removeAttribute('no-preload');
        await closing.goTo(caller === 'direct' ? 2 : 1);
        if (caller === 'background-adjacent') {
          const fill = fills.get(closing);
          assert(fill, 'expected this uncached primary navigation to expose its background fill');
          await fill;
        }
        assert(emptyCalls === 1, 'expected exactly one fulfilled empty load');
        assert(contentCalls === 0, 'empty load must not call loadContent');
        assert(unloads === 0, 'empty load must not unload an unacquired section');
        assert(!closing.renderer.getContents().some(({ index }) => index === 2), 'empty load must not register a target view');
        await fresh();

        // A public retry of the same target also proves the empty in-flight
        // record was retired, rather than cached as an unusable owner.
        target.load = async () => {
          retryCalls += 1;
          const url = await nativeLoad();
          assert(url === chapter, 'real retry must reuse the survivor-held original chapter URL');
          return url;
        };
        closing.renderer.setAttribute('no-preload', '');
        await closing.goTo(2);
        assert(closing.renderer.getContents().some(({ index, doc }) => index === 2 &&
          doc?.querySelector('[data-c9-chapter="chapter-two"]')), 'real retry must render the target');
        await fresh();
        closing.close();
        closing.close();
        closing.remove();
        await fresh();
        survivor.close();
        survivor.close();
        survivor.remove();
        return {
          emptyCalls, retryCalls, contentCalls, unloads,
          revokes: targets.map((url) => trace.revoked.filter((value) => value === url).length),
          unavailable: await Promise.all(targets.map((url) => fetch(url).then((response) => !response.ok, () => true)))
        };
      }, { archive, foliateViewUrl, flow, caller });
      expect(result.emptyCalls).toBe(1);
      expect(result.retryCalls).toBe(1);
      expect(result.contentCalls).toBe(1);
      expect(result.unloads).toBe(1);
      expect(result.revokes).toEqual([1, 1, 1]);
      expect(result.unavailable).toEqual([true, true, true]);
    });
  }
}

for (const flow of ['paginated', 'scrolled'] as const) {
  test(`C9 ${flow} synchronous stabilized close cancels navigation and history`, async ({ page }) => {
    const archive = await buildEpub(page, [resourceChapter('start'), resourceChapter('target')]);
    const result = await page.evaluate(async ({ archive, foliateViewUrl, flow }) => {
      type Section = { load: () => Promise<string>; unload: () => void };
      type NativeView = HTMLElement & {
        open: (book: unknown) => Promise<void>;
        init: (options: { showTextStart: boolean }) => Promise<void>;
        goTo: (index: number) => Promise<unknown>;
        close: () => void;
        renderer: HTMLElement & {
          sections: Section[];
          getContents: () => Array<{ index: number; doc?: Document }>;
        };
        history: { pushState: (state: unknown) => void };
      };
      const trace = (window as Window & {
        __BR1_C9_URL_TRACE__?: { created: Array<{ url: string; type: string }>; revoked: string[] };
      }).__BR1_C9_URL_TRACE__;
      if (!trace) throw new Error('expected C9 URL trace');
      const { makeBook } = await import(/* @vite-ignore */ foliateViewUrl);
      const book = await makeBook(new File([new Uint8Array(archive)], 'c9-stabilized-close.epub', {
        type: 'application/epub+zip'
      }));
      const createdAt = trace.created.length;
      const view = document.createElement('foliate-view') as NativeView;
      view.setAttribute('flow', flow);
      Object.assign(view.style, { position: 'fixed', inset: '0', width: '560px', height: '420px' });
      document.body.append(view);
      await view.open(book);
      const renderer = view.renderer;
      const acquired = [0, 0];
      const unloaded = [0, 0];
      renderer.sections = renderer.sections.map((section, index) => ({
        ...section,
        load: async () => {
          const url = await section.load();
          if (url) acquired[index] += 1;
          return url;
        },
        unload: () => {
          unloaded[index] += 1;
          section.unload();
        }
      }));
      renderer.setAttribute('no-preload', '');
      await view.init({ showTextStart: true });
      if (renderer.getContents().some(({ index }) => index === 1))
        throw new Error('expected an uncached target after initial navigation');

      let closed = false;
      let stabilizedCloses = 0;
      let targetWasRendered = false;
      const lateHistory: unknown[] = [];
      const nativePush = view.history.pushState.bind(view.history);
      view.history.pushState = (state) => {
        if (closed) lateHistory.push(state);
        nativePush(state);
      };
      // Public listeners run synchronously: close must invalidate the display
      // result before its caller resumes and commits navigation history.
      renderer.addEventListener('stabilized', () => {
        stabilizedCloses += 1;
        targetWasRendered = renderer.getContents().some(({ index, doc }) => index === 1 &&
          !!doc?.querySelector('[data-c9-chapter="target"]'));
        closed = true;
        view.close();
        view.remove();
      }, { once: true });
      const navigation = await view.goTo(1);
      const urls = [...new Set(trace.created.slice(createdAt)
        .filter(({ type }) => ['application/xhtml+xml', 'text/css', 'image/png'].includes(type))
        .map(({ url }) => url))];
      return {
        navigation, stabilizedCloses, targetWasRendered, lateHistory, acquired, unloaded,
        contents: renderer.getContents().length,
        connected: view.isConnected || renderer.isConnected,
        revokes: urls.map((url) => trace.revoked.filter((value) => value === url).length),
        unavailable: await Promise.all(urls.map((url) => fetch(url).then((response) => !response.ok, () => true)))
      };
    }, { archive, foliateViewUrl, flow });
    expect(result.stabilizedCloses).toBe(1);
    expect(result.targetWasRendered).toBe(true);
    expect(result.navigation).toBe(false);
    expect(result.lateHistory).toEqual([]);
    expect(result.contents).toBe(0);
    expect(result.connected).toBe(false);
    expect(result.acquired).toEqual([1, 1]);
    expect(result.unloaded).toEqual([1, 1]);
    expect(result.revokes.length).toBeGreaterThanOrEqual(4);
    expect(result.revokes).toEqual(result.revokes.map(() => 1));
    expect(result.unavailable).toEqual(result.unavailable.map(() => true));
  });
}

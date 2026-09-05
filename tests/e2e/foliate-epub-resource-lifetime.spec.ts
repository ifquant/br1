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

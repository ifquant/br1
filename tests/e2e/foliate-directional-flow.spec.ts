import { expect, test } from '@playwright/test';
import path from 'node:path';

const foliateRoot = path.resolve(process.cwd(), '../foliate-js');
const zipWriterUrl = `/@fs/${foliateRoot}/node_modules/@zip.js/zip.js/index.js`;
const foliateViewUrl = `/@fs/${foliateRoot}/view.js`;
const readerFoliateUrl = '/src/lib/reader/foliate.ts';
const svelteNavigationUrl = `/@fs/${process.cwd()}/node_modules/@sveltejs/kit/src/runtime/app/navigation.js`;
const tauriMocksUrl = `/@fs/${path.resolve(process.cwd(), 'node_modules/@tauri-apps/api/mocks.js')}`;

type Chapter = {
  id: string;
  href: string;
  body: string;
  htmlDir?: 'ltr' | 'rtl';
  bodyDir?: 'ltr' | 'rtl';
  bodyStyle?: string;
};

type NativeViewState = {
  index: number | null;
  marker: string | null;
  contents: number[];
  bookDir: string | null;
  cfi: string | null;
  fraction: number | null;
};

const words = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${prefix}-${index}`).join(' ');

const buildEpub = async (
  page: import('@playwright/test').Page,
  chapters: Chapter[],
  pageProgressionDirection: 'ltr' | 'rtl' = 'ltr'
) =>
  page.evaluate(
    async ({ zipWriterUrl, chapters, pageProgressionDirection }) => {
      const { BlobWriter, TextReader, ZipWriter } = await import(/* @vite-ignore */ zipWriterUrl);
      const writer = new ZipWriter(new BlobWriter());
      const xhtml = ({ body, htmlDir, bodyDir, bodyStyle }: Chapter) => `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"${htmlDir ? ` dir="${htmlDir}"` : ''}><head><title>C10 directional flow</title></head><body${bodyDir ? ` dir="${bodyDir}"` : ''}${bodyStyle ? ` style="${bodyStyle}"` : ''}>${body}</body></html>`;
      await writer.add('mimetype', new TextReader('application/epub+zip'), { level: 0 });
      await writer.add(
        'META-INF/container.xml',
        new TextReader('<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
      );
      await writer.add(
        'OPS/content.opf',
        new TextReader(`<?xml version="1.0"?><package version="3.0" unique-identifier="id" xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">c10</dc:identifier><dc:title>C10 directional flow</dc:title><dc:language>en</dc:language></metadata><manifest>${chapters.map(({ id, href }) => `<item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine page-progression-direction="${pageProgressionDirection}">${chapters.map(({ id }) => `<itemref idref="${id}"/>`).join('')}</spine></package>`)
      );
      for (const chapter of chapters) {
        await writer.add(`OPS/${chapter.href}`, new TextReader(xhtml(chapter)));
      }
      return Array.from(new Uint8Array(await (await writer.close()).arrayBuffer()));
    },
    { zipWriterUrl, chapters, pageProgressionDirection }
  );

const readerHref = (url: string, label: string) =>
  `/reader?${new URLSearchParams({ source: 'asset', url, label }).toString()}`;

const c10PageErrors = new WeakMap<import('@playwright/test').Page, Error[]>();

test.beforeEach(async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  c10PageErrors.set(page, errors);
  await page.goto('/library');
});

test.afterEach(async ({ page }) => {
  expect(c10PageErrors.get(page) ?? []).toEqual([]);
});

const readNativeViewState = (page: import('@playwright/test').Page): Promise<NativeViewState> =>
  page.evaluate(() => {
    type NativeView = HTMLElement & {
      lastLocation?: { cfi?: string; fraction?: number; section?: { current?: number } };
      renderer?: { getContents: () => Array<{ index: number; doc?: Document }> };
    };
    const view = document.querySelector('foliate-view') as NativeView | null;
    const index = view?.lastLocation?.section?.current;
    const contents = view?.renderer?.getContents() ?? [];
    const current = contents.find((content) => content.index === index);
    const bookDir = (view as NativeView & { book?: { dir?: unknown } } | null)?.book?.dir;
    return {
      index: typeof index === 'number' ? index : null,
      marker: current?.doc?.querySelector<HTMLElement>('[data-c10-chapter]')?.dataset.c10Chapter ?? null,
      contents: contents.map((content) => content.index),
      bookDir: typeof bookDir === 'string' ? bookDir : null,
      cfi: typeof view?.lastLocation?.cfi === 'string' ? view.lastLocation.cfi : null,
      fraction: typeof view?.lastLocation?.fraction === 'number' ? view.lastLocation.fraction : null
    };
  });

const observeHostTurns = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    type NativeView = HTMLElement & {
      prev: () => Promise<unknown>;
      next: () => Promise<unknown>;
    };
    type Turn = 'prev' | 'next';
    type TurnObserver = { calls: Record<Turn, number>; settled: Record<Turn, number> };
    const view = document.querySelector('foliate-view') as NativeView | null;
    if (!view) throw new Error('expected native view for turn observation');
    const observer: TurnObserver = { calls: { prev: 0, next: 0 }, settled: { prev: 0, next: 0 } };
    for (const turn of ['prev', 'next'] as const) {
      const original = view[turn].bind(view);
      view[turn] = async () => {
        const call = ++observer.calls[turn];
        try {
          return await original();
        } finally {
          observer.settled[turn] = call;
        }
      };
    }
    (window as Window & { __C10_TURN_OBSERVER__?: TurnObserver }).__C10_TURN_OBSERVER__ = observer;
  });

const issueObservedHostTurn = async (
  page: import('@playwright/test').Page,
  turn: 'prev' | 'next',
  issue: () => Promise<void>
) => {
  const priorCalls = await page.evaluate((turn) =>
    (window as Window & { __C10_TURN_OBSERVER__?: { calls: Record<'prev' | 'next', number> } })
      .__C10_TURN_OBSERVER__?.calls[turn] ?? -1,
  turn);
  await issue();
  await expect.poll(() => page.evaluate((turn) => {
    const observer = (window as Window & {
      __C10_TURN_OBSERVER__?: { calls: Record<'prev' | 'next', number>; settled: Record<'prev' | 'next', number> };
    }).__C10_TURN_OBSERVER__;
    return observer && { calls: observer.calls[turn], settled: observer.settled[turn] };
  }, turn)).toEqual({ calls: priorCalls + 1, settled: priorCalls + 1 });
};

test('C10 detects body or first direct-child vertical writing modes without treating other modes as vertical', async ({ page }) => {
  test.setTimeout(90_000);
  const archive = await buildEpub(page, [
    { id: 'body-rl', href: 'body-rl.xhtml', body: '<p data-c10-chapter="body-rl">body vertical rl</p>', bodyStyle: 'writing-mode:vertical-rl' },
    { id: 'body-lr', href: 'body-lr.xhtml', body: '<p data-c10-chapter="body-lr">body vertical lr</p>', bodyStyle: 'writing-mode:vertical-lr' },
    { id: 'body-vertical-child-horizontal', href: 'body-vertical-child-horizontal.xhtml', body: '<main data-c10-chapter="body-vertical-child-horizontal" style="writing-mode:horizontal-tb">body direction wins</main>', bodyStyle: 'writing-mode:vertical-rl' },
    { id: 'child-rl', href: 'child-rl.xhtml', body: '<div cfi-inert="true" style="writing-mode:horizontal-tb">inert first child</div><main data-c10-chapter="child-rl" style="writing-mode:vertical-rl">child vertical rl</main>' },
    { id: 'child-lr', href: 'child-lr.xhtml', body: '<main data-c10-chapter="child-lr" style="writing-mode:vertical-lr">child vertical lr</main>' },
    { id: 'ordinary-child', href: 'ordinary-child.xhtml', body: '<main data-c10-chapter="ordinary-child">ordinary child stays horizontal</main>' },
    { id: 'later-vertical', href: 'later-vertical.xhtml', body: '<main data-c10-chapter="later-vertical" style="writing-mode:horizontal-tb">first non-inert child stays horizontal</main><aside style="writing-mode:vertical-rl">later vertical child must not override</aside>' },
    { id: 'horizontal', href: 'horizontal.xhtml', body: '<main data-c10-chapter="horizontal" style="writing-mode:horizontal-tb">horizontal only</main>' },
    { id: 'sideways', href: 'sideways.xhtml', body: '<main data-c10-chapter="sideways" style="writing-mode:sideways-rl">sideways is not vertical pagination</main>' },
    { id: 'body-sideways-child-vertical', href: 'body-sideways-child-vertical.xhtml', body: '<main data-c10-chapter="body-sideways-child-vertical" style="writing-mode:vertical-rl">body sideways wins</main>', bodyStyle: 'writing-mode:sideways-rl' },
    { id: 'nested', href: 'nested.xhtml', body: '<main data-c10-chapter="nested"><p style="writing-mode:vertical-rl">nested vertical must not set document direction</p></main>' }
  ]);
  const result = await page.evaluate(
    async ({ archive, foliateViewUrl }) => {
      type NativeView = HTMLElement & {
        open: (book: unknown) => Promise<void>;
        init: (options: { showTextStart: boolean }) => Promise<void>;
        goTo: (target: number) => Promise<unknown>;
        close: () => void;
        renderer?: HTMLElement;
        perfTracker?: { time: <T>(name: string, operation: () => T) => T };
      };
      const { makeBook } = await import(/* @vite-ignore */ foliateViewUrl);
      const book = await makeBook(new File([new Uint8Array(archive)], 'directional.epub', { type: 'application/epub+zip' }));
      const expected = [true, true, true, true, true, false, false, false, false, false, false];
      const vertical: boolean[] = [];

      for (const [index] of expected.entries()) {
        const fills = new WeakMap<NativeView, Promise<unknown>>();
        const view = document.createElement('foliate-view') as NativeView;
        Object.assign(view.style, { position: 'fixed', width: '700px', height: '500px' });
        view.perfTracker = {
          time: (name, operation) => {
            const result = operation();
            if (name === 'renderer:display:fillVisibleArea') fills.set(view, Promise.resolve(result));
            return result;
          }
        };
        document.body.append(view);
        await view.open(book);
        // `foliate-view` does not forward this paginator attribute. Set it on
        // the public renderer before init so each direction case is isolated.
        if (!view.renderer) throw new Error(`expected renderer for direction case ${index}`);
        view.renderer.setAttribute('no-preload', '');
        await view.init({ showTextStart: true });
        await view.goTo(index);
        const fill = fills.get(view);
        if (!fill) throw new Error(`expected fill promise for direction case ${index}`);
        await fill;
        const container = view.renderer?.shadowRoot?.querySelector('#container');
        if (!container) throw new Error(`expected paginator container for direction case ${index}`);
        vertical.push(container.classList.contains('vertical'));
        view.close();
        view.remove();
      }
      return { expected, vertical };
    },
    { archive, foliateViewUrl }
  );
  expect(result.vertical).toEqual(result.expected);
});

test('C10 preserves RTL paginated semantic navigation and restores an anchor after unequal adjacent views preload', async ({ page }) => {
  test.setTimeout(90_000);
  const navigationArchive = await buildEpub(page, [
    { id: 'first', href: 'first.xhtml', body: '<section dir="rtl">first</section>', bodyDir: 'rtl' },
    { id: 'second', href: 'second.xhtml', body: '<section dir="rtl">second</section>', bodyDir: 'rtl' },
    { id: 'third', href: 'third.xhtml', body: '<section dir="rtl">third</section>', bodyDir: 'rtl' }
  ], 'rtl');
  const restoreChapters: Chapter[] = [
    { id: 'before', href: 'before.xhtml', body: `<section data-c10-chapter="before"><p>${words('before', 350)}</p></section>`, htmlDir: 'rtl', bodyDir: 'rtl' },
    { id: 'target', href: 'target.xhtml', body: `<section data-c10-chapter="target"><p>${words('target-start', 1100)}</p><p>${words('target-prefix', 80)} <span id="restore-anchor">saved RTL anchor</span> ${words('target-anchor', 900)}</p><p>${words('target-end', 900)}</p></section>`, htmlDir: 'rtl', bodyDir: 'rtl' },
    { id: 'after', href: 'after.xhtml', body: `<section data-c10-chapter="after"><p>${words('after', 1700)}</p></section>`, htmlDir: 'rtl', bodyDir: 'rtl' }
  ];
  const restoreArchive = await buildEpub(page, restoreChapters, 'rtl');
  const result = await page.evaluate(
    async ({ navigationArchive, restoreArchive, foliateViewUrl }) => {
      type Content = { index: number; doc?: Document };
      type NativeView = HTMLElement & {
        open: (book: unknown) => Promise<void>;
        init: (options: { showTextStart?: boolean; lastLocation?: string }) => Promise<void>;
        goTo: (target: string | number) => Promise<unknown>;
        goLeft: () => Promise<unknown>;
        goRight: () => Promise<unknown>;
        next: () => Promise<unknown>;
        prev: () => Promise<unknown>;
        getCFI: (index: number, range: Range) => string;
        resolveCFI: (cfi: string) => { index: number; anchor: (doc: Document) => Range | Element | number | null } | null;
        close: () => void;
        lastLocation?: { cfi?: string; section?: { current?: number } };
        renderer?: HTMLElement & { getContents: () => Content[] };
        perfTracker?: { time: <T>(name: string, operation: () => T) => T };
      };
      const { makeBook } = await import(/* @vite-ignore */ foliateViewUrl);
      const navigationBook = await makeBook(new File([new Uint8Array(navigationArchive)], 'rtl-navigation.epub', { type: 'application/epub+zip' }));
      const restoreBook = await makeBook(new File([new Uint8Array(restoreArchive)], 'rtl-restore.epub', { type: 'application/epub+zip' }));
      const fills = new WeakMap<NativeView, Promise<unknown>>();
      const open = async (book: unknown) => {
        const view = document.createElement('foliate-view') as NativeView;
        Object.assign(view.style, { position: 'fixed', top: '0', left: '0', width: '700px', height: '500px' });
        view.perfTracker = {
          time: (name, operation) => {
            const result = operation();
            if (name === 'renderer:display:fillVisibleArea') fills.set(view, Promise.resolve(result));
            return result;
          }
        };
        document.body.append(view);
        await view.open(book);
        return view;
      };
      const openWithoutPreload = async (book: unknown) => {
        const view = await open(book);
        if (!view.renderer) throw new Error('expected renderer before no-preload init');
        view.renderer.setAttribute('no-preload', '');
        return view;
      };
      const settle = async (view: NativeView, label: string) => {
        const fill = fills.get(view);
        if (!fill) throw new Error(`expected fill promise at ${label}`);
        await fill;
      };
      const currentIndex = (view: NativeView) => view.lastLocation?.section?.current;
      const isDocumentRange = (value: unknown, doc: Document): value is Range =>
        !!doc.defaultView && value instanceof doc.defaultView.Range;
      const isDocumentNode = (value: unknown, doc: Document): value is Node =>
        !!doc.defaultView && value instanceof doc.defaultView.Node;
      const rangeAtResolvedCfi = (view: NativeView, cfi: string, doc: Document) => {
        const resolved = view.resolveCFI(cfi);
        if (!resolved || resolved.index !== 1) return null;
        const anchor = resolved.anchor(doc);
        if (!isDocumentRange(anchor, doc)) return null;
        const range = anchor.cloneRange();
        let node = range.startContainer;
        let offset = range.startOffset;
        if (node.nodeType !== Node.TEXT_NODE) {
          const walker = doc.createTreeWalker(node, NodeFilter.SHOW_TEXT);
          const textNode = walker.nextNode();
          if (!textNode) throw new Error('expected text at saved CFI start');
          node = textNode;
          offset = 0;
        }
        const text = node.textContent ?? '';
        const visibleRange = doc.createRange();
        visibleRange.setStart(node, Math.min(offset, text.length));
        visibleRange.setEnd(node, Math.min(offset + 24, text.length));
        return visibleRange;
      };
      const describeResolvedCfi = (view: NativeView, cfi: string, doc: Document) => {
        const resolved = view.resolveCFI(cfi);
        const anchor = resolved?.anchor(doc);
        return {
          index: resolved?.index ?? null,
          anchorKind: isDocumentRange(anchor, doc) ? 'range' : isDocumentNode(anchor, doc) ? 'node' : typeof anchor
        };
      };
      const rangeVisibility = (range: Range, renderer: HTMLElement | undefined) => {
        const rect = Array.from(range.getClientRects()).find((candidate) => candidate.width > 0 && candidate.height > 0);
        const doc = range.startContainer.ownerDocument;
        if (!doc) throw new Error('expected range owner document');
        const frame = doc.defaultView?.frameElement as HTMLIFrameElement | null;
        const frameRect = frame?.getBoundingClientRect();
        const viewportRect = renderer?.shadowRoot?.querySelector('#container')?.getBoundingClientRect();
        const scaleX = frame && frameRect && frame.clientWidth ? frameRect.width / frame.clientWidth : 1;
        const scaleY = frame && frameRect && frame.clientHeight ? frameRect.height / frame.clientHeight : 1;
        const visible = !!rect && !!frameRect && !!viewportRect &&
          frameRect.left + rect.right * scaleX > viewportRect.left &&
          frameRect.left + rect.left * scaleX < viewportRect.right &&
          frameRect.top + rect.bottom * scaleY > viewportRect.top &&
          frameRect.top + rect.top * scaleY < viewportRect.bottom;
        return {
          visible,
          containerInViewport: !!viewportRect && viewportRect.right > 0 && viewportRect.left < innerWidth &&
            viewportRect.bottom > 0 && viewportRect.top < innerHeight,
          direction: {
            htmlDir: doc.documentElement.dir,
            htmlComputedDir: doc.defaultView?.getComputedStyle(doc.documentElement).direction ?? '',
            bodyDir: doc.body.dir,
            bodyComputedDir: doc.defaultView?.getComputedStyle(doc.body).direction ?? ''
          },
          rect: rect && { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
          frame: frameRect && { left: frameRect.left, right: frameRect.right, top: frameRect.top, bottom: frameRect.bottom },
          viewport: viewportRect && { left: viewportRect.left, right: viewportRect.right, top: viewportRect.top, bottom: viewportRect.bottom }
        };
      };

      const view = await open(navigationBook);
      await view.init({ showTextStart: true });
      await settle(view, 'initial');
      const container = view.renderer?.shadowRoot?.querySelector('#container');
      if (!container) throw new Error('expected RTL paginator container');
      const containerDirection = getComputedStyle(container).flexDirection;
      await view.next();
      await settle(view, 'next');
      const afterNext = currentIndex(view);
      await view.prev();
      await settle(view, 'prev');
      const afterPrev = currentIndex(view);
      await view.goLeft();
      await settle(view, 'left');
      const afterLeft = currentIndex(view);
      await view.goRight();
      await settle(view, 'right');
      const afterRight = currentIndex(view);
      view.close();
      view.remove();

      const restore = await open(restoreBook);
      await restore.init({ showTextStart: true });
      await settle(restore, 'restore initial');
      await restore.goTo('OPS/target.xhtml#restore-anchor');
      await settle(restore, 'anchor');
      const anchoredIndex = currentIndex(restore);
      if (anchoredIndex !== 1) throw new Error(`expected anchor navigation to reach section 1, got ${anchoredIndex}`);
      const target = restore.renderer?.getContents().find((content) => content.index === 1)?.doc?.querySelector('#restore-anchor');
      if (!target) throw new Error('expected live target anchor');
      const targetRange = target.ownerDocument.createRange();
      targetRange.selectNodeContents(target);
      const targetCfi = restore.getCFI(1, targetRange);
      await restore.goTo(targetCfi);
      await settle(restore, 'exact target CFI');
      const requestedTargetText = targetRange.toString();
      const initialTargetVisibility = rangeVisibility(targetRange, restore.renderer);
      const savedCfi = restore.lastLocation?.cfi;
      if (!savedCfi?.startsWith('epubcfi(')) throw new Error('expected a reported EPUB CFI at the target anchor');
      const savedRange = rangeAtResolvedCfi(restore, savedCfi, target.ownerDocument);
      const savedResolution = describeResolvedCfi(restore, savedCfi, target.ownerDocument);
      const savedText = savedRange?.toString() ?? '';
      const beforeSaveVisibility = savedRange ? rangeVisibility(savedRange, restore.renderer) : null;
      restore.close();
      restore.remove();

      const restored = await open(restoreBook);
      await restored.init({ lastLocation: savedCfi });
      await settle(restored, 'restore');
      const contents = restored.renderer?.getContents() ?? [];
      const restoredTarget = contents.find((content) => content.index === 1)?.doc?.querySelector('#restore-anchor');
      if (!restoredTarget) throw new Error('expected restored target anchor');
      const restoredRange = rangeAtResolvedCfi(restored, savedCfi, restoredTarget.ownerDocument);
      const restoredResolution = describeResolvedCfi(restored, savedCfi, restoredTarget.ownerDocument);
      const restoredText = restoredRange?.toString() ?? '';
      const restoredVisibility = restoredRange ? rangeVisibility(restoredRange, restored.renderer) : null;
      const restoredTargetRange = restoredTarget.ownerDocument.createRange();
      restoredTargetRange.selectNodeContents(restoredTarget);
      const restoredTargetVisibility = rangeVisibility(restoredTargetRange, restored.renderer);
      const widths = contents.map((content) => content.doc?.defaultView?.frameElement?.getBoundingClientRect().width ?? 0);
      const restoredIndex = currentIndex(restored);
      const reportedCfi = restored.lastLocation?.cfi ?? '';
      restored.close();
      restored.remove();

      const noPreloadRestored = await openWithoutPreload(restoreBook);
      await noPreloadRestored.init({ lastLocation: savedCfi });
      await settle(noPreloadRestored, 'no-preload restore');
      const noPreloadRestoredTarget = noPreloadRestored.renderer?.getContents()
        .find((content) => content.index === 1)?.doc?.querySelector('#restore-anchor');
      if (!noPreloadRestoredTarget) throw new Error('expected no-preload restored target');
      const noPreloadRestoredRange = rangeAtResolvedCfi(
        noPreloadRestored,
        savedCfi,
        noPreloadRestoredTarget.ownerDocument
      );
      const noPreloadRestoredVisibility = noPreloadRestoredRange
        ? rangeVisibility(noPreloadRestoredRange, noPreloadRestored.renderer)
        : null;
      const noPreloadTargetRange = noPreloadRestoredTarget.ownerDocument.createRange();
      noPreloadTargetRange.selectNodeContents(noPreloadRestoredTarget);
      const noPreloadTargetVisibility = rangeVisibility(noPreloadTargetRange, noPreloadRestored.renderer);
      const noPreloadRestoredContents = noPreloadRestored.renderer?.getContents().map((content) => content.index) ?? [];
      const noPreloadReportedCfi = noPreloadRestored.lastLocation?.cfi ?? '';
      const noPreloadSavedText = noPreloadRestoredRange?.toString() ?? '';
      noPreloadRestored.close();
      noPreloadRestored.remove();

      return {
        containerDirection,
        afterNext,
        afterPrev,
        afterLeft,
        afterRight,
        anchoredIndex,
        savedCfi,
        reportedCfi,
        restoredIndex,
        preloaded: contents.length,
        distinctWidths: new Set(widths.map((width) => Math.round(width))).size,
        savedText,
        restoredText,
        savedResolution,
        restoredResolution,
        requestedTargetText,
        initialTargetVisibility,
        beforeSaveVisibility,
        restoredVisibility,
        restoredTargetVisibility,
        noPreloadRestoredContents,
        noPreloadRestoredVisibility,
        noPreloadTargetVisibility,
        noPreloadReportedCfi,
        noPreloadSavedText
      };
    },
    { navigationArchive, restoreArchive, foliateViewUrl }
  );
  expect(result.containerDirection).toBe('row');
  expect([result.afterNext, result.afterPrev, result.afterLeft, result.afterRight]).toEqual([1, 0, 1, 0]);
  expect(result.preloaded).toBeGreaterThan(1);
  expect(result.distinctWidths).toBeGreaterThan(1);
  expect(result.anchoredIndex).toBe(1);
  expect(result.restoredIndex).toBe(1);
  expect(result.savedCfi).toMatch(/^epubcfi\(/);
  expect(result.reportedCfi).toBe(result.savedCfi);
  expect(result.requestedTargetText).toBe('saved RTL anchor');
  expect(result.savedResolution).toEqual({ index: 1, anchorKind: 'range' });
  expect(result.restoredResolution).toEqual({ index: 1, anchorKind: 'range' });
  expect(result.savedText).not.toBe('');
  expect(result.restoredText).toBe(result.savedText);
  expect(result.initialTargetVisibility.containerInViewport, JSON.stringify(result.initialTargetVisibility)).toBe(true);
  expect(result.initialTargetVisibility.visible, JSON.stringify(result.initialTargetVisibility)).toBe(true);
  expect(result.beforeSaveVisibility?.containerInViewport, JSON.stringify(result.beforeSaveVisibility)).toBe(true);
  expect(result.beforeSaveVisibility?.visible, JSON.stringify(result.beforeSaveVisibility)).toBe(true);
  expect(result.restoredVisibility?.containerInViewport, JSON.stringify(result.restoredVisibility)).toBe(true);
  expect(result.restoredVisibility?.visible, JSON.stringify(result.restoredVisibility)).toBe(true);
  expect(result.restoredTargetVisibility.containerInViewport, JSON.stringify(result.restoredTargetVisibility)).toBe(true);
  expect(result.restoredTargetVisibility.visible, JSON.stringify(result.restoredTargetVisibility)).toBe(true);
  expect(result.noPreloadRestoredContents).toEqual([1]);
  expect(result.noPreloadReportedCfi).toBe(result.savedCfi);
  expect(result.noPreloadSavedText).toBe(result.savedText);
  expect(result.noPreloadRestoredVisibility?.containerInViewport, JSON.stringify(result.noPreloadRestoredVisibility)).toBe(true);
  expect(result.noPreloadRestoredVisibility?.visible, JSON.stringify(result.noPreloadRestoredVisibility)).toBe(true);
  expect(result.noPreloadTargetVisibility.containerInViewport, JSON.stringify(result.noPreloadTargetVisibility)).toBe(true);
  expect(result.noPreloadTargetVisibility.visible, JSON.stringify(result.noPreloadTargetVisibility)).toBe(true);
});

test('C10 makes BR1 directional controls follow the current rendered RTL document, not EPUB metadata or preloaded order', async ({ page }) => {
  test.setTimeout(90_000);
  const rtlUrl = '/samples/c10-directional-rtl.epub';
  const ltrUrl = '/samples/c10-directional-ltr.epub';
  const rtlArchive = await buildEpub(page, [
    { id: 'rtl-first', href: 'rtl-first.xhtml', body: '<section data-c10-chapter="rtl-first">first RTL section</section>', bodyDir: 'rtl' },
    { id: 'rtl-current', href: 'rtl-current.xhtml', body: '<section data-c10-chapter="rtl-current">current RTL section</section>', bodyDir: 'rtl' },
    { id: 'rtl-after', href: 'rtl-after.xhtml', body: '<section data-c10-chapter="rtl-after">after RTL section</section>', bodyDir: 'rtl' }
  ], 'ltr');
  const ltrArchive = await buildEpub(page, [
    { id: 'ltr-reset', href: 'ltr-reset.xhtml', body: '<section data-c10-chapter="ltr-reset">LTR source reset</section>' }
  ]);
  await page.route(`**${rtlUrl}`, (route) =>
    route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(rtlArchive) })
  );
  await page.route(`**${ltrUrl}`, (route) =>
    route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(ltrArchive) })
  );
  await page.goto(readerHref(rtlUrl, 'C10 body-derived RTL'));
  const stage = page.getByRole('main', { name: 'reader stage' });
  await expect(stage).toContainText('书籍已打开', { timeout: 15000 });
  await expect.poll(() => readNativeViewState(page)).toMatchObject({ index: 0, marker: 'rtl-first', bookDir: 'ltr' });

  const footer = stage.getByLabel('阅读页脚控制');
  await observeHostTurns(page);
  await issueObservedHostTurn(page, 'next', () => footer.getByRole('button', { name: '下一页' }).click());
  await expect.poll(() => readNativeViewState(page)).toMatchObject({ index: 1, marker: 'rtl-current', bookDir: 'ltr' });
  const preloaded = await readNativeViewState(page);
  expect(preloaded.contents[0]).toBe(0);
  expect(preloaded.contents).toContain(1);
  await page.evaluate(() => {
    type Content = { index: number; doc?: Document };
    type NativeView = HTMLElement & {
      lastLocation?: { section?: { current?: number } };
      renderer?: { getContents: () => Content[] };
    };
    const view = document.querySelector('foliate-view') as NativeView | null;
    const renderer = view?.renderer;
    const current = view?.lastLocation?.section?.current;
    if (!renderer || typeof current !== 'number') throw new Error('expected a current rendered document');
    const original = renderer.getContents.bind(renderer);
    const ltrFrame = document.createElement('iframe');
    document.body.append(ltrFrame);
    const ltrDoc = ltrFrame.contentDocument;
    if (!ltrDoc) throw new Error('expected controlled LTR document');
    ltrDoc.body.dir = 'ltr';
    renderer.getContents = () => original().map((content) =>
      content.index === current ? content : { ...content, doc: ltrDoc }
    );
    view.dispatchEvent(new Event('relocate'));
    renderer.getContents = original;
    ltrFrame.remove();
  });
  await expect(footer.getByRole('button', { name: '上一页' })).toHaveText('›');
  await expect(footer.getByRole('button', { name: '下一页' })).toHaveText('‹');

  const beforeFooterPrev = await readNativeViewState(page);
  await issueObservedHostTurn(page, 'prev', () => footer.getByRole('button', { name: '上一页' }).click());
  await expect.poll(() => readNativeViewState(page), {
    message: `semantic footer prev did not leave ${JSON.stringify(beforeFooterPrev)}`
  }).toMatchObject({ index: 0, marker: 'rtl-first' });
  await issueObservedHostTurn(page, 'next', () => footer.getByRole('button', { name: '下一页' }).click());
  await expect.poll(() => readNativeViewState(page)).toMatchObject({ index: 1, marker: 'rtl-current' });

  await issueObservedHostTurn(page, 'next', () => page.keyboard.press('ArrowLeft'));
  await expect.poll(() => readNativeViewState(page)).toMatchObject({ index: 2, marker: 'rtl-after' });
  await issueObservedHostTurn(page, 'prev', () => page.keyboard.press('ArrowRight'));
  await expect.poll(() => readNativeViewState(page)).toMatchObject({ index: 1, marker: 'rtl-current' });
  await issueObservedHostTurn(page, 'prev', () => stage.dispatchEvent('mousedown', { button: 3 }));
  await expect.poll(() => readNativeViewState(page)).toMatchObject({ index: 0, marker: 'rtl-first' });

  await page.evaluate(async ({ href, svelteNavigationUrl }) => {
    const { goto } = await import(/* @vite-ignore */ svelteNavigationUrl);
    await goto(href, { keepFocus: true, noScroll: true });
  }, { href: readerHref(ltrUrl, 'C10 source reset'), svelteNavigationUrl });
  await expect.poll(() => readNativeViewState(page)).toMatchObject({ index: 0, marker: 'ltr-reset', bookDir: 'ltr' });
  await expect(footer.getByRole('button', { name: '上一页' })).toHaveText('‹');
  await expect(footer.getByRole('button', { name: '下一页' })).toHaveText('›');
});

test('C10 persists a managed RTL EPUB CFI and restores that saved progress through the library-file path', async ({ page }) => {
  test.setTimeout(90_000);
  const libraryPath = '/library/c10-persisted-rtl.epub';
  const archive = await buildEpub(page, [
    { id: 'before', href: 'before.xhtml', body: `<section data-c10-chapter="persist-before"><p>${words('persist-before', 700)}</p></section>`, htmlDir: 'rtl', bodyDir: 'rtl' },
    { id: 'saved', href: 'saved.xhtml', body: `<section data-c10-chapter="persist-saved"><p><span id="persist-firstscreen">persist first screen</span> ${words('persist-start', 1300)}</p><p><span id="persist-anchor">persist saved anchor</span> ${words('persist-tail', 1100)}</p></section>`, htmlDir: 'rtl', bodyDir: 'rtl' },
    { id: 'after', href: 'after.xhtml', body: `<section data-c10-chapter="persist-after"><p>${words('persist-after', 700)}</p></section>`, htmlDir: 'rtl', bodyDir: 'rtl' }
  ], 'ltr');
  await page.evaluate(async ({ archive, libraryPath, tauriMocksUrl, svelteNavigationUrl, readerFoliateUrl }) => {
    type NativeCall = { command: string; args: Record<string, unknown> | undefined };
    type Tracker = { time: <T>(name: string, operation: () => T, detail?: unknown) => T };
    type NativeView = HTMLElement & {
      open: (book: unknown) => Promise<void>;
      perfTracker?: Tracker;
    };
    const { ensureFoliateViewDefinition } = await import(/* @vite-ignore */ readerFoliateUrl);
    await ensureFoliateViewDefinition();
    const View = customElements.get('foliate-view') as { prototype: NativeView } | undefined;
    if (!View) throw new Error('expected the production reader definition');
    const open = View.prototype.open;
    const fills = new WeakMap<NativeView, Promise<unknown>>();
    // Observe each new host instance before open() passes its tracker to the
    // renderer. Relocate and "book opened" both precede background fill.
    View.prototype.open = async function (book) {
      const previous = this.perfTracker;
      this.perfTracker = {
        time: (name, operation, detail) => {
          const result = previous ? previous.time(name, operation, detail) : operation();
          if (name === 'renderer:display:fillVisibleArea') fills.set(this, Promise.resolve(result));
          return result;
        }
      };
      await open.call(this, book);
    };
    (window as Window & { __BR1_C10_WAIT_FOR_FILL__?: () => Promise<void> })
      .__BR1_C10_WAIT_FOR_FILL__ = async () => {
        const view = document.querySelector('foliate-view') as NativeView | null;
        const fill = view && fills.get(view);
        if (!fill) throw new Error('expected this host instance to start native fill');
        await fill;
      };
    const { mockIPC } = await import(/* @vite-ignore */ tauriMocksUrl);
    const calls: NativeCall[] = [];
    const bytesBase64 = btoa(String.fromCharCode(...new Uint8Array(archive)));
    mockIPC((command: string, args?: Record<string, unknown>) => {
      calls.push({ command, args: structuredClone(args) });
      if (command === 'load_library_file_fingerprint') return 'c10-persisted-rtl';
      if (command === 'load_library_book_binary') {
        return { bytesBase64, name: 'c10-persisted-rtl.epub', mimeType: 'application/epub+zip' };
      }
      if (command === 'load_library_books') return [];
      if (command === 'detect_readest_library') {
        return { available: false, count: 0, importableCount: 0, missingFileCount: 0 };
      }
      if (command === 'load_reader_bookmarks' || command === 'load_reader_notes') return [];
      if (command === 'update_library_reading_state') return;
      return null;
    });
    (window as Window & { __BR1_C10_LIBRARY_CALLS__?: NativeCall[] }).__BR1_C10_LIBRARY_CALLS__ = calls;
    const { goto } = await import(/* @vite-ignore */ svelteNavigationUrl);
    await goto(`/reader?${new URLSearchParams({ source: 'library-file', path: libraryPath, label: 'C10 persisted RTL' }).toString()}`, { keepFocus: true, noScroll: true });
  }, { archive, libraryPath, tauriMocksUrl, svelteNavigationUrl, readerFoliateUrl });
  const waitForFill = () => page.evaluate(async () => {
    const wait = (window as Window & { __BR1_C10_WAIT_FOR_FILL__?: () => Promise<void> })
      .__BR1_C10_WAIT_FOR_FILL__;
    if (!wait) throw new Error('expected the native fill observer');
    await wait();
  });
  const stage = page.getByRole('main', { name: 'reader stage' });
  await expect(stage).toContainText('书籍已打开', { timeout: 15000 });
  await waitForFill();
  await expect.poll(() => readNativeViewState(page)).toMatchObject({ contents: [0, 1, 2] });
  const cfiTargets = await page.evaluate(() => {
    type View = HTMLElement & { getCFI: (index: number, range: Range) => string; renderer?: { getContents: () => Array<{ index: number; doc?: Document }> } };
    const view = document.querySelector('foliate-view') as View | null;
    const doc = view?.renderer?.getContents().find((content) => content.index === 1)?.doc;
    const first = doc?.querySelector('#persist-firstscreen');
    const anchor = doc?.querySelector('#persist-anchor');
    if (!view || !doc || !first || !anchor) throw new Error('expected managed persistence targets');
    const range = (element: Element) => { const value = doc.createRange(); value.selectNodeContents(element); return value; };
    return { first: view.getCFI(1, range(first)), anchor: view.getCFI(1, range(anchor)) };
  });
  expect(cfiTargets.anchor).not.toBe(cfiTargets.first);
  await page.evaluate(async (cfi) => {
    const view = document.querySelector('foliate-view') as (HTMLElement & { goTo: (target: string) => Promise<void> }) | null;
    if (!view) throw new Error('expected managed native view');
    await view.goTo(cfi);
  }, cfiTargets.anchor);
  await expect.poll(() => readNativeViewState(page)).toMatchObject({ index: 1, marker: 'persist-saved' });
  await expect.poll(async () => {
    const current = await readNativeViewState(page);
    return page.evaluate((cfi) => {
      type NativeCall = { command: string; args?: { progressLocation?: string } };
      const calls = (window as Window & { __BR1_C10_LIBRARY_CALLS__?: NativeCall[] }).__BR1_C10_LIBRARY_CALLS__ ?? [];
      return calls.filter((call) => call.command === 'update_library_reading_state')
        .findLast((call) => call.args?.progressLocation === cfi)?.args?.progressLocation ?? null;
    }, current.cfi);
  }).toMatch(/^epubcfi\(/);
  const savedCfi = await page.evaluate(() => {
    type NativeCall = { command: string; args?: { progressLocation?: string } };
    const calls = (window as Window & { __BR1_C10_LIBRARY_CALLS__?: NativeCall[] }).__BR1_C10_LIBRARY_CALLS__ ?? [];
    return calls.filter((call) => call.command === 'update_library_reading_state')
      .findLast((call) => typeof call.args?.progressLocation === 'string')?.args?.progressLocation ?? '';
  });
  expect(savedCfi).toMatch(/^epubcfi\(/);
  const probe = (cfi: string) => page.evaluate((savedCfi) => {
    type View = HTMLElement & { resolveCFI: (cfi: string) => { anchor: (doc: Document) => Range } | null; renderer?: HTMLElement & { getContents: () => Array<{ index: number; doc?: Document }> } };
    const view = document.querySelector('foliate-view') as View | null;
    const renderer = view?.renderer;
    const doc = renderer?.getContents().find((content) => content.index === 1)?.doc;
    const visible = (range: Range) => {
      const rect = Array.from(range.getClientRects()).find((value) => value.width > 0 && value.height > 0);
      const frameElement = doc?.defaultView?.frameElement as HTMLIFrameElement | null;
      const frame = frameElement?.getBoundingClientRect();
      const box = renderer?.shadowRoot?.querySelector('#container')?.getBoundingClientRect();
      const scaleX = frameElement && frame ? frame.width / frameElement.clientWidth : 1;
      const scaleY = frameElement && frame ? frame.height / frameElement.clientHeight : 1;
      return !!rect && !!frame && !!box &&
        frame.left + rect.right * scaleX > box.left && frame.left + rect.left * scaleX < box.right &&
        frame.top + rect.bottom * scaleY > box.top && frame.top + rect.top * scaleY < box.bottom;
    };
    const first = doc?.querySelector('#persist-firstscreen');
    const anchor = doc?.querySelector('#persist-anchor');
    const resolved = doc && view?.resolveCFI(savedCfi)?.anchor(doc);
    if (!doc || !first || !anchor || !resolved) throw new Error('expected restored managed ranges');
    const range = doc.createRange(); range.selectNodeContents(anchor); const firstRange = doc.createRange(); firstRange.selectNodeContents(first);
    return { contents: renderer?.getContents().map((content) => content.index) ?? [], anchor: visible(range), first: visible(firstRange), saved: visible(resolved), text: resolved.toString(), cfi: (view as View & { lastLocation?: { cfi?: string } }).lastLocation?.cfi ?? '' };
  }, cfi);
  const firstProbe = await probe(savedCfi);
  expect(firstProbe.contents).toContain(0);
  expect(firstProbe.contents).toContain(2);
  expect(firstProbe.anchor).toBe(true); expect(firstProbe.saved).toBe(true); expect(firstProbe.first).toBe(false);
  const currentViewId = () => page.evaluate(() => {
    const view = document.querySelector('foliate-view') as (HTMLElement & { __c10ViewId?: number }) | null;
    if (!view) return null;
    view.__c10ViewId ??= Math.random();
    return view.__c10ViewId;
  });
  const writeCount = () => page.evaluate(() =>
    ((window as Window & { __BR1_C10_LIBRARY_CALLS__?: Array<{ command: string }> })
      .__BR1_C10_LIBRARY_CALLS__ ?? []).filter((call) => call.command === 'update_library_reading_state').length
  );
  const returnToLibrary = () => page.evaluate(async (svelteNavigationUrl) => {
    const { goto } = await import(/* @vite-ignore */ svelteNavigationUrl);
    await goto('/library', { keepFocus: true, noScroll: true });
  }, svelteNavigationUrl);
  const reopen = () => page.evaluate(async ({ libraryPath, savedCfi, svelteNavigationUrl }) => {
    const { goto } = await import(/* @vite-ignore */ svelteNavigationUrl);
    await goto(`/reader?${new URLSearchParams({ source: 'library-file', path: libraryPath, label: 'C10 persisted RTL', location: savedCfi }).toString()}`, { keepFocus: true, noScroll: true });
  }, { libraryPath, savedCfi, svelteNavigationUrl });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const previousView = await currentViewId();
    const boundary = await writeCount();
    await returnToLibrary();
    await expect.poll(() => page.locator('foliate-view').count()).toBe(0);
    await reopen();
    await expect.poll(() => readNativeViewState(page)).toMatchObject({ index: 1, marker: 'persist-saved', cfi: savedCfi });
    await waitForFill();
    await expect.poll(() => readNativeViewState(page)).toMatchObject({ contents: expect.arrayContaining([1, 2]) });
    expect(await currentViewId()).not.toBe(previousView);
    const restored = await probe(savedCfi);
    expect(restored).toMatchObject({ anchor: true, saved: true, first: false, cfi: savedCfi, text: firstProbe.text });
    await expect.poll(writeCount).toBeGreaterThan(boundary);
    const writes = await page.evaluate((boundary) =>
      ((window as Window & { __BR1_C10_LIBRARY_CALLS__?: Array<{ command: string; args?: { progressLocation?: string } }> })
        .__BR1_C10_LIBRARY_CALLS__ ?? [])
        .filter((call) => call.command === 'update_library_reading_state')
        .slice(boundary)
        .map((call) => call.args?.progressLocation),
    boundary);
    expect(writes).toEqual(expect.arrayContaining([savedCfi]));
    expect(writes.every((cfi) => cfi === savedCfi)).toBe(true);
  }
});

test('C10 keeps directional preview state isolated between parallel reader panes', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  const assetUrl = '/samples/c10-parallel-rtl.epub';
  const archive = await buildEpub(page, [
    { id: 'parallel', href: 'parallel.xhtml', body: '<section data-c10-chapter="parallel">parallel RTL section</section>', bodyDir: 'rtl' }
  ], 'ltr');
  const secondaryLtrArchive = await buildEpub(page, [
    { id: 'parallel-ltr', href: 'parallel-ltr.xhtml', body: '<section data-c10-chapter="parallel-ltr">parallel LTR section</section>', bodyDir: 'ltr' }
  ], 'ltr');
  await page.route(`**${assetUrl}`, (route) =>
    route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(archive) })
  );
  await page.goto(readerHref(assetUrl, 'C10 parallel RTL'));
  await expect(page.getByRole('main', { name: 'reader stage' })).toContainText('书籍已打开', { timeout: 15000 });
  await page.getByRole('button', { name: '开启并行阅读' }).click();
  const primary = page.getByRole('region', { name: '主阅读窗格', exact: true });
  const secondary = page.getByRole('region', { name: '并行阅读窗格', exact: true });
  await expect(secondary).toContainText('书籍已打开', { timeout: 15000 });
  const primaryFooter = primary.getByLabel('阅读页脚控制');
  const secondaryFooter = secondary.getByLabel('阅读页脚控制');
  await expect(primaryFooter.getByRole('button', { name: '上一页' })).toHaveText('›');
  await expect(secondaryFooter.getByRole('button', { name: '上一页' })).toHaveText('›');
  await secondary.evaluate(async (pane, { archive, readerFoliateUrl }) => {
    type NativeView = HTMLElement & {
      open: (book: unknown) => Promise<void>;
      init: (options: { showTextStart: boolean }) => Promise<void>;
      close: () => void;
    };
    const view = pane.querySelector('foliate-view') as NativeView | null;
    if (!view) throw new Error('expected mounted secondary native view');
    const { loadReaderBookDocument } = await import(/* @vite-ignore */ readerFoliateUrl);
    const book = await loadReaderBookDocument(
      new File([new Uint8Array(archive)], 'parallel-ltr.epub', { type: 'application/epub+zip' })
    );
    view.close();
    await view.open(book);
    await view.init({ showTextStart: true });
  }, { archive: secondaryLtrArchive, readerFoliateUrl });
  await expect.poll(() => secondary.evaluate((pane) => {
    const view = pane.querySelector('foliate-view') as (HTMLElement & {
      renderer?: { getContents: () => Array<{ doc?: Document }> };
    }) | null;
    return view?.renderer?.getContents()[0]?.doc?.querySelector('[data-c10-chapter]')?.getAttribute('data-c10-chapter') ?? null;
  })).toBe('parallel-ltr');
  await expect(secondaryFooter.getByRole('button', { name: '上一页' })).toHaveText('‹');
  await expect(primaryFooter.getByRole('button', { name: '上一页' })).toHaveText('›');
});

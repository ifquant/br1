import { expect, test } from '@playwright/test';
import path from 'node:path';

const foliateRoot = path.resolve(process.cwd(), '../foliate-js');
const zipWriterUrl = `/@fs/${foliateRoot}/node_modules/@zip.js/zip.js/index.js`;
const foliateViewUrl = `/@fs/${foliateRoot}/view.js`;
const svelteNavigationUrl = `/@fs/${process.cwd()}/node_modules/@sveltejs/kit/src/runtime/app/navigation.js`;

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
  cfi: string | null;
  page: number | null;
  position: number | null;
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
<html xmlns="http://www.w3.org/1999/xhtml"${htmlDir ? ` dir="${htmlDir}"` : ''}><head><title>C11A vertical page turns</title></head><body${bodyDir ? ` dir="${bodyDir}"` : ''}${bodyStyle ? ` style="${bodyStyle}"` : ''}>${body}</body></html>`;
      await writer.add('mimetype', new TextReader('application/epub+zip'), { level: 0 });
      await writer.add(
        'META-INF/container.xml',
        new TextReader('<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
      );
      await writer.add(
        'OPS/content.opf',
        new TextReader(`<?xml version="1.0"?><package version="3.0" unique-identifier="id" xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">c11a</dc:identifier><dc:title>C11A vertical page turns</dc:title><dc:language>en</dc:language></metadata><manifest>${chapters.map(({ id, href }) => `<item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine page-progression-direction="${pageProgressionDirection}">${chapters.map(({ id }) => `<itemref idref="${id}"/>`).join('')}</spine></package>`)
      );
      for (const chapter of chapters) await writer.add(`OPS/${chapter.href}`, new TextReader(xhtml(chapter)));
      return Array.from(new Uint8Array(await (await writer.close()).arrayBuffer()));
    },
    { zipWriterUrl, chapters, pageProgressionDirection }
  );

const readerHref = (url: string, label: string) =>
  `/reader?${new URLSearchParams({ source: 'asset', url, label }).toString()}`;

const c11aPageErrors = new WeakMap<import('@playwright/test').Page, Error[]>();

test.beforeEach(async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  c11aPageErrors.set(page, errors);
  await page.goto('/library');
});

test.afterEach(async ({ page }) => {
  expect(c11aPageErrors.get(page) ?? []).toEqual([]);
});

const readNativeViewState = (page: import('@playwright/test').Page): Promise<NativeViewState> =>
  page.evaluate(() => {
    type NativeView = HTMLElement & {
      lastLocation?: { cfi?: string; section?: { current?: number } };
      renderer?: {
        getContents: () => Array<{ index: number; doc?: Document }>;
        page?: number;
        containerPosition?: number;
      };
    };
    const view = document.querySelector('foliate-view') as NativeView | null;
    const index = view?.lastLocation?.section?.current;
    const contents = view?.renderer?.getContents() ?? [];
    const current = contents.find((content) => content.index === index);
    return {
      index: typeof index === 'number' ? index : null,
      marker: current?.doc?.querySelector<HTMLElement>('[data-c11a-chapter]')?.dataset.c11aChapter ?? null,
      contents: contents.map((content) => content.index),
      cfi: typeof view?.lastLocation?.cfi === 'string' ? view.lastLocation.cfi : null,
      page: typeof view?.renderer?.page === 'number' ? view.renderer.page : null,
      position: typeof view?.renderer?.containerPosition === 'number' ? view.renderer.containerPosition : null
    };
  });

const observeHostTurns = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    type Turn = 'prev' | 'next';
    type NativeView = HTMLElement & { prev: () => Promise<unknown>; next: () => Promise<unknown> };
    type TurnObserver = { calls: Record<Turn, number>; settled: Record<Turn, number> };
    const view = document.querySelector('foliate-view') as NativeView | null;
    if (!view) throw new Error('expected native view for C11A host turn observation');
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
    (window as Window & { __C11A_TURN_OBSERVER__?: TurnObserver }).__C11A_TURN_OBSERVER__ = observer;
  });

const issueObservedHostTurn = async (
  page: import('@playwright/test').Page,
  turn: 'prev' | 'next',
  issue: () => Promise<void>
) => {
  const priorCalls = await page.evaluate((turn) =>
    (window as Window & { __C11A_TURN_OBSERVER__?: { calls: Record<'prev' | 'next', number> } })
      .__C11A_TURN_OBSERVER__?.calls[turn] ?? -1,
  turn);
  await issue();
  await expect.poll(() => page.evaluate((turn) => {
    const observer = (window as Window & {
      __C11A_TURN_OBSERVER__?: { calls: Record<'prev' | 'next', number>; settled: Record<'prev' | 'next', number> };
    }).__C11A_TURN_OBSERVER__;
    return observer && { calls: observer.calls[turn], settled: observer.settled[turn] };
  }, turn)).toEqual({ calls: priorCalls + 1, settled: priorCalls + 1 });
};

test('C11A keeps the vertical paginator host LTR while detecting the effective body or direct child', async ({ page }) => {
  test.setTimeout(90_000);
  const archive = await buildEpub(page, [
    { id: 'body-rl', href: 'body-rl.xhtml', htmlDir: 'ltr', bodyDir: 'ltr', bodyStyle: 'writing-mode:vertical-rl', body: '<main data-c11a-chapter="body-rl">body vertical rl</main>' },
    { id: 'child-rl', href: 'child-rl.xhtml', htmlDir: 'ltr', bodyDir: 'ltr', body: '<div cfi-inert="true" style="writing-mode:horizontal-tb">inert</div><main data-c11a-chapter="child-rl" style="writing-mode:vertical-rl">direct child rl</main>' },
    { id: 'child-lr', href: 'child-lr.xhtml', htmlDir: 'ltr', bodyDir: 'ltr', body: '<div cfi-inert="true">inert</div><main data-c11a-chapter="child-lr" style="writing-mode:vertical-lr">direct child lr</main>' },
    { id: 'later-rl', href: 'later-rl.xhtml', htmlDir: 'ltr', bodyDir: 'ltr', body: '<main data-c11a-chapter="later-rl" style="writing-mode:horizontal-tb">first direct child wins</main><aside style="writing-mode:vertical-rl">later fragment</aside>' },
    { id: 'sideways', href: 'sideways.xhtml', htmlDir: 'ltr', bodyDir: 'ltr', bodyStyle: 'writing-mode:sideways-rl', body: '<main data-c11a-chapter="sideways">sideways is not vertical pagination</main>' }
  ], 'ltr');
  const result = await page.evaluate(async ({ archive, foliateViewUrl }) => {
    type NativeView = HTMLElement & {
      open: (book: unknown) => Promise<void>;
      init: (options: { showTextStart: boolean }) => Promise<void>;
      goTo: (target: number) => Promise<unknown>;
      close: () => void;
      renderer?: HTMLElement;
      perfTracker?: { time: <T>(name: string, operation: () => T) => T };
    };
    const { makeBook } = await import(/* @vite-ignore */ foliateViewUrl);
    const book = await makeBook(new File([new Uint8Array(archive)], 'c11a-directions.epub', { type: 'application/epub+zip' }));
    const results: Array<{ vertical: boolean; dir: string | null }> = [];
    for (let index = 0; index < 5; index += 1) {
      const fills = new WeakMap<NativeView, Promise<unknown>>();
      const view = document.createElement('foliate-view') as NativeView;
      Object.assign(view.style, { position: 'fixed', width: '700px', height: '500px' });
      view.perfTracker = { time: (name, operation) => {
        const result = operation();
        if (name === 'renderer:display:fillVisibleArea') fills.set(view, Promise.resolve(result));
        return result;
      } };
      document.body.append(view);
      await view.open(book);
      if (!view.renderer) throw new Error(`expected renderer for direction case ${index}`);
      view.renderer.setAttribute('no-preload', '');
      await view.init({ showTextStart: true });
      await view.goTo(index);
      const fill = fills.get(view);
      if (!fill) throw new Error(`expected native fill for direction case ${index}`);
      await fill;
      const container = view.renderer.shadowRoot?.querySelector('#container');
      if (!container) throw new Error(`expected paginator container for direction case ${index}`);
      results.push({ vertical: container.classList.contains('vertical'), dir: view.renderer.getAttribute('dir') });
      view.close();
      view.remove();
    }
    return results;
  }, { archive, foliateViewUrl });

  expect(result).toEqual([
    { vertical: true, dir: 'ltr' },
    { vertical: true, dir: 'ltr' },
    { vertical: true, dir: 'ltr' },
    { vertical: false, dir: 'ltr' },
    { vertical: false, dir: 'ltr' }
  ]);
});

test('C11A restores a non-first-screen vertical CFI with real fill and lands across sections without blanks', async ({ page }) => {
  test.setTimeout(90_000);
  const archive = await buildEpub(page, [
    { id: 'before', href: 'before.xhtml', htmlDir: 'ltr', bodyDir: 'ltr', bodyStyle: 'writing-mode:vertical-rl', body: '<main data-c11a-chapter="before">before boundary</main>' },
    { id: 'target', href: 'target.xhtml', htmlDir: 'ltr', bodyDir: 'ltr', bodyStyle: 'writing-mode:vertical-rl', body: `<main data-c11a-chapter="target"><p><span id="first-screen">first screen</span> ${words('target-prefix', 1800)}</p><p><span id="restore-anchor">restored vertical anchor</span> ${words('target-anchor', 1600)}</p><p><span id="target-last">last target page</span></p></main>` },
    { id: 'after', href: 'after.xhtml', htmlDir: 'ltr', bodyDir: 'ltr', bodyStyle: 'writing-mode:vertical-rl', body: '<main data-c11a-chapter="after">after cross-section landing</main>' }
  ], 'ltr');
  const result = await page.evaluate(async ({ archive, foliateViewUrl }) => {
    type Content = { index: number; doc?: Document };
    type NativeView = HTMLElement & {
      open: (book: unknown) => Promise<void>;
      init: (options: { showTextStart?: boolean; lastLocation?: string }) => Promise<void>;
      goTo: (target: string) => Promise<unknown>;
      next: () => Promise<unknown>;
      getCFI: (index: number, range: Range) => string;
      close: () => void;
      lastLocation?: { section?: { current?: number } };
      renderer?: HTMLElement & { getContents: () => Content[] };
      perfTracker?: { time: <T>(name: string, operation: () => T) => T };
    };
    const { makeBook } = await import(/* @vite-ignore */ foliateViewUrl);
    const book = await makeBook(new File([new Uint8Array(archive)], 'c11a-restore.epub', { type: 'application/epub+zip' }));
    const fills = new WeakMap<NativeView, Promise<unknown>>();
    const open = async (noPreload: boolean, lastLocation?: string) => {
      const view = document.createElement('foliate-view') as NativeView;
      Object.assign(view.style, { position: 'fixed', top: '0', left: '0', width: '700px', height: '500px' });
      view.perfTracker = { time: (name, operation) => {
        const result = operation();
        if (name === 'renderer:display:fillVisibleArea') fills.set(view, Promise.resolve(result));
        return result;
      } };
      document.body.append(view);
      await view.open(book);
      if (!view.renderer) throw new Error('expected renderer before C11A init');
      if (noPreload) view.renderer.setAttribute('no-preload', '');
      await view.init(lastLocation ? { lastLocation } : { showTextStart: true });
      const fill = fills.get(view);
      if (!fill) throw new Error('expected native fill after C11A init');
      await fill;
      return view;
    };
    const visible = (range: Range, renderer: HTMLElement) => {
      const rect = Array.from(range.getClientRects()).find((candidate) => candidate.width > 0 && candidate.height > 0);
      const doc = range.startContainer.ownerDocument;
      if (!doc) return false;
      const frame = doc.defaultView?.frameElement as HTMLIFrameElement | null;
      const frameRect = frame?.getBoundingClientRect();
      const viewport = renderer.shadowRoot?.querySelector('#container')?.getBoundingClientRect();
      const scaleX = frame && frameRect && frame.clientWidth ? frameRect.width / frame.clientWidth : 1;
      const scaleY = frame && frameRect && frame.clientHeight ? frameRect.height / frame.clientHeight : 1;
      return !!rect && !!frameRect && !!viewport &&
        frameRect.left + rect.right * scaleX > viewport.left && frameRect.left + rect.left * scaleX < viewport.right &&
        frameRect.top + rect.bottom * scaleY > viewport.top && frameRect.top + rect.top * scaleY < viewport.bottom;
    };
    const run = async (noPreload: boolean) => {
      const source = await open(noPreload);
      await source.goTo('OPS/target.xhtml#restore-anchor');
      const sourceFill = fills.get(source);
      if (!sourceFill) throw new Error('expected source anchor fill');
      await sourceFill;
      const sourceDoc = source.renderer?.getContents().find((content) => content.index === 1)?.doc;
      const sourceAnchor = sourceDoc?.querySelector('#restore-anchor');
      if (!sourceDoc || !sourceAnchor) throw new Error('expected source CFI anchor');
      const sourceRange = sourceDoc.createRange();
      sourceRange.selectNodeContents(sourceAnchor);
      const cfi = source.getCFI(1, sourceRange);
      source.close();
      source.remove();

      const restored = await open(noPreload, cfi);
      const renderer = restored.renderer;
      const doc = renderer?.getContents().find((content) => content.index === 1)?.doc;
      const first = doc?.querySelector('#first-screen');
      const anchor = doc?.querySelector('#restore-anchor');
      const last = doc?.querySelector('#target-last');
      const container = renderer?.shadowRoot?.querySelector<HTMLElement>('#container');
      if (!renderer || !doc || !first || !anchor || !last || !container) throw new Error('expected restored vertical document');
      const firstRange = doc.createRange();
      const anchorRange = doc.createRange();
      firstRange.selectNodeContents(first);
      anchorRange.selectNodeContents(anchor);
      const restoredContents = renderer.getContents().map((content) => content.index);
      const restoredVisible = visible(anchorRange, renderer);
      const firstVisible = visible(firstRange, renderer);
      const positiveScrollTop = container.scrollTop > 0;

      await restored.goTo('OPS/target.xhtml#target-last');
      const endFill = fills.get(restored);
      if (!endFill) throw new Error('expected target-end fill');
      await endFill;
      await restored.next();
      const crossFill = fills.get(restored);
      if (!crossFill) throw new Error('expected cross-section fill');
      await crossFill;
      const index = restored.lastLocation?.section?.current;
      const landing = renderer.getContents().find((content) => content.index === index)?.doc;
      const landingText = landing?.querySelector('[data-c11a-chapter="after"]');
      if (!landing || !landingText) throw new Error('expected actual after-section text');
      const landingRange = landing.createRange();
      landingRange.selectNodeContents(landingText);
      const landingVisible = visible(landingRange, renderer);
      restored.close();
      restored.remove();
      return { cfi, restoredContents, restoredVisible, firstVisible, positiveScrollTop, index, landingVisible };
    };
    return { preloaded: await run(false), noPreload: await run(true) };
  }, { archive, foliateViewUrl });

  for (const scenario of [result.preloaded, result.noPreload]) {
    expect(scenario.cfi).toMatch(/^epubcfi\(/);
    expect(scenario.restoredVisible).toBe(true);
    expect(scenario.firstVisible).toBe(false);
    expect(scenario.positiveScrollTop).toBe(true);
    expect(scenario.index).toBe(2);
    expect(scenario.landingVisible).toBe(true);
  }
  expect(result.preloaded.restoredContents.length).toBeGreaterThan(1);
  expect(result.noPreload.restoredContents).toEqual([1]);
});

test('C11A keeps instant and e-ink vertical swipes horizontal, retains animated vertical gestures, and guards edges', async ({ page }) => {
  test.setTimeout(90_000);
  const verticalRl = await buildEpub(page, [
    { id: 'rl', href: 'rl.xhtml', htmlDir: 'ltr', bodyDir: 'ltr', body: `<div cfi-inert="true">inert</div><main data-c11a-chapter="rl" style="writing-mode:vertical-rl">${words('vertical-rl', 5000)}</main>` }
  ], 'ltr');
  const verticalLr = await buildEpub(page, [
    { id: 'lr', href: 'lr.xhtml', htmlDir: 'ltr', bodyDir: 'ltr', bodyStyle: 'writing-mode:vertical-lr', body: `<main data-c11a-chapter="lr">${words('vertical-lr', 5000)}</main>` }
  ], 'ltr');
  const horizontalLtr = await buildEpub(page, [
    { id: 'ltr', href: 'ltr.xhtml', body: `<main data-c11a-chapter="ltr">${words('horizontal-ltr', 5000)}</main>` }
  ], 'ltr');
  const horizontalRtl = await buildEpub(page, [
    { id: 'rtl', href: 'rtl.xhtml', htmlDir: 'rtl', bodyDir: 'rtl', body: `<main data-c11a-chapter="rtl">${words('horizontal-rtl', 5000)}</main>` }
  ], 'rtl');
  const result = await page.evaluate(async ({ verticalRl, verticalLr, horizontalLtr, horizontalRtl, foliateViewUrl }) => {
    type Renderer = HTMLElement & {
      snap: (vx: number, vy: number, dx: number, dy: number, dt: number) => void;
      page: number;
      containerPosition: number;
      getContents: () => Array<{ index: number; doc?: Document }>;
    };
    type NativeView = HTMLElement & {
      open: (book: unknown) => Promise<void>;
      init: (options: { showTextStart: boolean }) => Promise<void>;
      goToFraction: (fraction: number) => Promise<unknown>;
      close: () => void;
      renderer?: Renderer;
      perfTracker?: { time: <T>(name: string, operation: () => T) => T };
    };
    const { makeBook } = await import(/* @vite-ignore */ foliateViewUrl);
    const fills = new WeakMap<NativeView, Promise<unknown>>();
    const open = async (archive: number[], attributes: Array<[string, string]> = []) => {
      const book = await makeBook(new File([new Uint8Array(archive)], 'c11a-swipe.epub', { type: 'application/epub+zip' }));
      const view = document.createElement('foliate-view') as NativeView;
      Object.assign(view.style, { position: 'fixed', top: '0', left: '0', width: '700px', height: '500px' });
      view.perfTracker = { time: (name, operation) => {
        const result = operation();
        if (name === 'renderer:display:fillVisibleArea') fills.set(view, Promise.resolve(result));
        return result;
      } };
      document.body.append(view);
      await view.open(book);
      const renderer = view.renderer;
      if (!renderer) throw new Error('expected C11A swipe renderer');
      for (const [name, value] of attributes) renderer.setAttribute(name, value);
      await view.init({ showTextStart: true });
      const fill = fills.get(view);
      if (!fill) throw new Error('expected C11A swipe fill');
      await fill;
      return { view, renderer };
    };
    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const snap = async (renderer: Renderer, args: [number, number, number, number, number]) => {
      const relocated = new Promise<void>((resolve) => renderer.addEventListener('relocate', () => resolve(), { once: true }));
      renderer.snap(...args);
      await relocated;
    };
    const snapToPage = async (renderer: Renderer, args: [number, number, number, number, number], page: number) => {
      const reachedPage = new Promise<void>((resolve) => {
        const check = () => {
          if (renderer.page !== page) return;
          renderer.removeEventListener('relocate', check);
          renderer.removeEventListener('stabilized', check);
          resolve();
        };
        renderer.addEventListener('relocate', check);
        renderer.addEventListener('stabilized', check);
      });
      renderer.snap(...args);
      await reachedPage;
    };
    const touch = (renderer: Renderer, type: 'touchstart' | 'touchmove' | 'touchend', x: number, y: number) => {
      const point = new Touch({ identifier: 1, target: renderer, screenX: x, screenY: y, clientX: x, clientY: y });
      renderer.dispatchEvent(new TouchEvent(type, {
        bubbles: true,
        cancelable: true,
        touches: type === 'touchend' ? [] : [point],
        changedTouches: [point]
      }));
    };
    const close = (view: NativeView) => { view.close(); view.remove(); };

    const missingBounds = await (async () => {
      const uninitialized = document.createElement('foliate-view') as NativeView;
      document.body.append(uninitialized);
      const book = await makeBook(new File([new Uint8Array(verticalRl)], 'c11a-missing-bounds.epub', { type: 'application/epub+zip' }));
      await uninitialized.open(book);
      let safe = true;
      try {
        uninitialized.renderer?.snap(-1, 0, -120, 0, 100);
      } catch {
        safe = false;
      }
      uninitialized.close();
      uninitialized.remove();
      return safe;
    })();

    const rl = await open(verticalRl);
    const rlStart = rl.renderer.page;
    await snapToPage(rl.renderer, [-1.2, 0, -180, 0, 120], rlStart + 1);
    const rlRightNext = rl.renderer.page === rlStart + 1;
    await snap(rl.renderer, [1.2, 0, 180, 0, 120]);
    const rlLeftPrevious = rl.renderer.page === rlStart;
    await snapToPage(rl.renderer, [0, 1.2, 0, 180, 120], rlStart + 1);
    const rlUpNext = rl.renderer.page === rlStart + 1;
    await snap(rl.renderer, [0, -1.2, 0, -180, 120]);
    const rlDownPrevious = rl.renderer.page === rlStart;
    const touchRightPage = new Promise<void>((resolve) => {
      const check = () => {
        if (rl.renderer.page !== rlStart + 1) return;
        rl.renderer.removeEventListener('relocate', check);
        rl.renderer.removeEventListener('stabilized', check);
        resolve();
      };
      rl.renderer.addEventListener('relocate', check);
      rl.renderer.addEventListener('stabilized', check);
    });
    touch(rl.renderer, 'touchstart', 420, 320);
    await nextFrame();
    touch(rl.renderer, 'touchmove', 620, 320);
    await nextFrame();
    touch(rl.renderer, 'touchend', 620, 320);
    await touchRightPage;
    const touchRightNext = rl.renderer.page === rlStart + 1;
    await snap(rl.renderer, [1.2, 0, 180, 0, 120]);
    const returnedToStart = rl.renderer.page === rlStart;
    await snap(rl.renderer, [1.2, 0, 180, 0, 120]);
    const previousAtStart = rl.renderer.page === rlStart;
    await rl.view.goToFraction(1);
    const lastFill = fills.get(rl.view);
    if (!lastFill) throw new Error('expected final-page fill');
    await lastFill;
    const lastPage = rl.renderer.page;
    await snap(rl.renderer, [-1.2, 0, -180, 0, 120]);
    const lastBoundary = rl.renderer.page === lastPage;
    close(rl.view);

    const lr = await open(verticalLr);
    const lrStart = lr.renderer.page;
    await snapToPage(lr.renderer, [1.2, 0, 180, 0, 120], lrStart + 1);
    const lrLeftNext = lr.renderer.page === lrStart + 1;
    await snap(lr.renderer, [-1.2, 0, -180, 0, 120]);
    const lrRightPrevious = lr.renderer.page === lrStart;
    await snapToPage(lr.renderer, [0, 1.2, 0, 180, 120], lrStart + 1);
    const lrUpNext = lr.renderer.page === lrStart + 1;
    await snap(lr.renderer, [0, -1.2, 0, -180, 120]);
    const lrDownPrevious = lr.renderer.page === lrStart;
    close(lr.view);

    const eink = await open(verticalRl, [['animated', ''], ['eink', '']]);
    const einkStart = eink.renderer.page;
    await snapToPage(eink.renderer, [-1.2, 0, -180, 0, 120], einkStart + 1);
    const einkRightNext = eink.renderer.page === einkStart + 1;
    await snap(eink.renderer, [1.2, 0, 180, 0, 120]);
    const einkLeftPrevious = eink.renderer.page === einkStart;
    await snapToPage(eink.renderer, [0, 1.2, 0, 180, 120], einkStart + 1);
    const einkUpNext = eink.renderer.page === einkStart + 1;
    await snap(eink.renderer, [0, -1.2, 0, -180, 120]);
    const einkDownPrevious = eink.renderer.page === einkStart;
    close(eink.view);

    const animated = await open(verticalRl, [['animated', '']]);
    const animatedStart = animated.renderer.page;
    await snap(animated.renderer, [-1.2, 0, -180, 0, 120]);
    const animatedHorizontalIsInert = animated.renderer.page === animatedStart;
    await snapToPage(animated.renderer, [0, 1.2, 0, 180, 120], animatedStart + 1);
    const animatedUpNext = animated.renderer.page === animatedStart + 1;
    close(animated.view);

    const ltr = await open(horizontalLtr);
    const ltrStart = ltr.renderer.page;
    await snapToPage(ltr.renderer, [1.2, 0, 180, 0, 120], ltrStart + 1);
    const horizontalLtrUnchanged = ltr.renderer.page === ltrStart + 1;
    close(ltr.view);

    const rtl = await open(horizontalRtl);
    const rtlStart = rtl.renderer.page;
    await snapToPage(rtl.renderer, [-1.2, 0, -180, 0, 120], rtlStart + 1);
    const horizontalRtlUnchanged = rtl.renderer.page === rtlStart + 1;
    close(rtl.view);

    const scrolled = await open(verticalRl, [['flow', 'scrolled']]);
    const scrolledBefore = { page: scrolled.renderer.page, position: scrolled.renderer.containerPosition };
    touch(scrolled.renderer, 'touchstart', 420, 320);
    await nextFrame();
    touch(scrolled.renderer, 'touchmove', 620, 320);
    await nextFrame();
    touch(scrolled.renderer, 'touchend', 620, 320);
    await nextFrame();
    await nextFrame();
    const scrolledUnchanged = scrolled.renderer.page === scrolledBefore.page &&
      scrolled.renderer.containerPosition === scrolledBefore.position;
    close(scrolled.view);

    return {
      missingBounds, rlRightNext, rlLeftPrevious, rlUpNext, rlDownPrevious, touchRightNext,
      returnedToStart, previousAtStart, lastBoundary, lrLeftNext, lrRightPrevious, lrUpNext, lrDownPrevious,
      einkRightNext, einkLeftPrevious, einkUpNext, einkDownPrevious, animatedHorizontalIsInert, animatedUpNext, horizontalLtrUnchanged,
      horizontalRtlUnchanged, scrolledUnchanged
    };
  }, { verticalRl, verticalLr, horizontalLtr, horizontalRtl, foliateViewUrl });

  expect(result).toEqual({
    missingBounds: true,
    rlRightNext: true,
    rlLeftPrevious: true,
    rlUpNext: true,
    rlDownPrevious: true,
    touchRightNext: true,
    returnedToStart: true,
    previousAtStart: true,
    lastBoundary: true,
    lrLeftNext: true,
    lrRightPrevious: true,
    lrUpNext: true,
    lrDownPrevious: true,
    einkRightNext: true,
    einkLeftPrevious: true,
    einkUpNext: true,
    einkDownPrevious: true,
    animatedHorizontalIsInert: true,
    animatedUpNext: true,
    horizontalLtrUnchanged: true,
    horizontalRtlUnchanged: true,
    scrolledUnchanged: true
  });
});

test('C11A mirrors host controls and help from the current direct-child vertical-rl document, then resets for a new source', async ({ page }) => {
  test.setTimeout(90_000);
  const verticalUrl = '/samples/c11a-host-vertical.epub';
  const horizontalUrl = '/samples/c11a-host-horizontal.epub';
  const verticalArchive = await buildEpub(page, [
    { id: 'first-rl', href: 'first-rl.xhtml', htmlDir: 'ltr', bodyDir: 'ltr', bodyStyle: 'writing-mode:vertical-rl', body: `<main data-c11a-chapter="first-rl">${words('host-first', 2200)}</main>` },
    { id: 'current-rl', href: 'current-rl.xhtml', htmlDir: 'ltr', bodyDir: 'ltr', body: `<div cfi-inert="true" style="writing-mode:horizontal-tb">inert</div><main data-c11a-chapter="current-rl" style="writing-mode:vertical-rl"><p>${words('host-middle-before', 2400)}</p><p><span id="middle-anchor">current direct-child anchor</span> ${words('host-middle-after', 2400)}</p></main>` },
    { id: 'after-rl', href: 'after-rl.xhtml', htmlDir: 'ltr', bodyDir: 'ltr', bodyStyle: 'writing-mode:vertical-rl', body: `<main data-c11a-chapter="after-rl">${words('host-after', 2200)}</main>` }
  ], 'ltr');
  const horizontalArchive = await buildEpub(page, [
    { id: 'source-reset', href: 'source-reset.xhtml', htmlDir: 'ltr', bodyDir: 'ltr', body: '<main data-c11a-chapter="source-reset">source reset LTR</main>' }
  ], 'ltr');
  await page.route(`**${verticalUrl}`, (route) =>
    route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(verticalArchive) })
  );
  await page.route(`**${horizontalUrl}`, (route) =>
    route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(horizontalArchive) })
  );
  await page.evaluate(async ({ href, svelteNavigationUrl }) => {
    type Tracker = { time: <T>(name: string, operation: () => T, detail?: unknown) => T };
    type NativeView = HTMLElement & {
      open: (book: unknown) => Promise<void>;
      perfTracker?: Tracker;
    };
    const readerFoliateUrl = '/src/lib/reader/foliate.ts';
    const { ensureFoliateViewDefinition } = await import(/* @vite-ignore */ readerFoliateUrl);
    await ensureFoliateViewDefinition();
    const View = customElements.get('foliate-view') as { prototype: NativeView } | undefined;
    if (!View) throw new Error('expected the production reader definition');
    const open = View.prototype.open;
    const fills = new WeakMap<NativeView, Promise<unknown>>();
    // Observe initial fill before open hands the tracker to the renderer.
    // Cached chapter navigation does not pass through this timing entrypoint.
    View.prototype.open = async function (book) {
      const previous = this.perfTracker;
      this.perfTracker = { time: (name, operation, detail) => {
        const result = previous ? previous.time(name, operation, detail) : operation();
        if (name === 'renderer:display:fillVisibleArea') fills.set(this, Promise.resolve(result));
        return result;
      } };
      await open.call(this, book);
    };
    (window as Window & { __C11A_WAIT_FOR_HOST_FILL__?: () => Promise<void> }).__C11A_WAIT_FOR_HOST_FILL__ = async () => {
      const view = document.querySelector('foliate-view') as NativeView | null;
      const fill = view && fills.get(view);
      if (!fill) throw new Error('expected this host instance to start native fill');
      await fill;
    };
    const { goto } = await import(/* @vite-ignore */ svelteNavigationUrl);
    await goto(href, { keepFocus: true, noScroll: true });
  }, { href: readerHref(verticalUrl, 'C11A host vertical'), svelteNavigationUrl });
  const stage = page.getByRole('main', { name: 'reader stage' });
  const footer = stage.getByLabel('阅读页脚控制');
  await expect(stage).toContainText('书籍已打开', { timeout: 15_000 });
  await page.evaluate(async () => {
    const wait = (window as Window & { __C11A_WAIT_FOR_HOST_FILL__?: () => Promise<void> }).__C11A_WAIT_FOR_HOST_FILL__;
    if (!wait) throw new Error('expected direct-child host fill waiter');
    await wait();
  });
  await expect.poll(() => readNativeViewState(page)).toMatchObject({ index: 0, marker: 'first-rl', contents: [0, 1, 2] });
  await page.evaluate(async () => {
    const view = document.querySelector('foliate-view') as (HTMLElement & { goTo: (target: string) => Promise<unknown> }) | null;
    if (!view) throw new Error('expected native host view for direct-child navigation');
    await view.goTo('OPS/current-rl.xhtml#middle-anchor');
  });
  await expect.poll(() => readNativeViewState(page)).toMatchObject({ index: 1, marker: 'current-rl' });
  await observeHostTurns(page);
  const current = await readNativeViewState(page);
  expect(current.page).not.toBeNull();
  expect(current.position).not.toBeNull();
  expect(current.cfi).toMatch(/^epubcfi\(/);
  expect(await page.evaluate(() => {
    const renderer = (document.querySelector('foliate-view') as { renderer?: HTMLElement } | null)?.renderer;
    return renderer ? !renderer.hasAttribute('animated') : false;
  })).toBe(true);
  await expect(footer.getByRole('button', { name: '上一页' })).toHaveText('›');
  await expect(footer.getByRole('button', { name: '下一页' })).toHaveText('‹');

  // Native anchor navigation focuses the iframe. This case exercises the
  // existing host keyboard owner, not cross-document key forwarding.
  await stage.focus();
  await page.keyboard.press('Shift+?');
  const help = page.getByRole('dialog');
  await expect(help).toBeVisible();
  const mirroredHelp = await page.evaluate(() =>
    Object.fromEntries([...document.querySelectorAll('.shortcuts-dialog dl > div')].map((row) => [
      row.querySelector('dt')?.textContent?.trim() ?? '',
      [...row.querySelectorAll('kbd')].map((key) => key.textContent?.trim() ?? '')
    ]))
  );
  expect(mirroredHelp['上一页']?.[0]).toBe('→');
  expect(mirroredHelp['下一页']?.[0]).toBe('←');
  await page.keyboard.press('Escape');

  const assertHostStep = async (before: NativeViewState, direction: 1 | -1) => {
    const after = await readNativeViewState(page);
    expect(after).toMatchObject({ index: 1, marker: 'current-rl' });
    expect(after.page).toBe((before.page ?? 0) + direction);
    expect(after.position).not.toBeNull();
    expect(before.position).not.toBeNull();
    expect(direction > 0 ? after.position! > before.position! : after.position! < before.position!).toBe(true);
    expect(after.cfi).toMatch(/^epubcfi\(/);
    expect(after.cfi).not.toBe(before.cfi);
    return after;
  };

  await issueObservedHostTurn(page, 'next', () => footer.getByRole('button', { name: '下一页' }).click());
  const footerNext = await assertHostStep(current, 1);
  await issueObservedHostTurn(page, 'prev', () => footer.getByRole('button', { name: '上一页' }).click());
  const footerPrevious = await assertHostStep(footerNext, -1);
  await issueObservedHostTurn(page, 'next', () => page.keyboard.press('ArrowLeft'));
  const keyboardNext = await assertHostStep(footerPrevious, 1);
  await issueObservedHostTurn(page, 'prev', () => page.keyboard.press('ArrowRight'));
  const keyboardPrevious = await assertHostStep(keyboardNext, -1);
  await issueObservedHostTurn(page, 'next', () => stage.dispatchEvent('mousedown', { button: 4 }));
  const mouseNext = await assertHostStep(keyboardPrevious, 1);
  await issueObservedHostTurn(page, 'prev', () => stage.dispatchEvent('mousedown', { button: 3 }));
  await assertHostStep(mouseNext, -1);

  await page.evaluate(async ({ href, svelteNavigationUrl }) => {
    const { goto } = await import(/* @vite-ignore */ svelteNavigationUrl);
    await goto(href, { keepFocus: true, noScroll: true });
  }, { href: readerHref(horizontalUrl, 'C11A source reset'), svelteNavigationUrl });
  await expect.poll(() => readNativeViewState(page)).toMatchObject({ index: 0, marker: 'source-reset' });
  await expect(footer.getByRole('button', { name: '上一页' })).toHaveText('‹');
  await expect(footer.getByRole('button', { name: '下一页' })).toHaveText('›');
  await stage.focus();
  await page.keyboard.press('Shift+?');
  await expect(help).toBeVisible();
  const resetHelp = await page.evaluate(() =>
    Object.fromEntries([...document.querySelectorAll('.shortcuts-dialog dl > div')].map((row) => [
      row.querySelector('dt')?.textContent?.trim() ?? '',
      [...row.querySelectorAll('kbd')].map((key) => key.textContent?.trim() ?? '')
    ]))
  );
  expect(resetHelp['上一页']?.[0]).toBe('←');
  expect(resetHelp['下一页']?.[0]).toBe('→');
});

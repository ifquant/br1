import { expect, test } from '@playwright/test';
import path from 'node:path';

const foliateRoot = path.resolve(process.cwd(), '../foliate-js');
const zipWriterUrl = `/@fs/${foliateRoot}/node_modules/@zip.js/zip.js/index.js`;
const foliateViewUrl = `/@fs/${foliateRoot}/view.js`;

type Chapter = { id: string; href: string; body: string };

const words = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${prefix}-${index}`).join(' ');

const buildEpub = async (page: import('@playwright/test').Page, chapters: Chapter[]) =>
  page.evaluate(async ({ zipWriterUrl, chapters }) => {
    const { BlobWriter, TextReader, ZipWriter } = await import(/* @vite-ignore */ zipWriterUrl);
    const writer = new ZipWriter(new BlobWriter());
    await writer.add('mimetype', new TextReader('application/epub+zip'), { level: 0 });
    await writer.add('META-INF/container.xml', new TextReader('<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'));
    await writer.add('OPS/content.opf', new TextReader(`<?xml version="1.0"?><package version="3.0" unique-identifier="id" xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">turn-load-admission</dc:identifier><dc:title>Turn load admission</dc:title><dc:language>en</dc:language></metadata><manifest>${chapters.map(({ id, href }) => `<item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${chapters.map(({ id }) => `<itemref idref="${id}"/>`).join('')}</spine></package>`));
    for (const chapter of chapters) {
      await writer.add(`OPS/${chapter.href}`, new TextReader(`<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${chapter.id}</title></head><body style="writing-mode:vertical-rl"><main>${chapter.body}</main></body></html>`));
    }
    return Array.from(new Uint8Array(await (await writer.close()).arrayBuffer()));
  }, { zipWriterUrl, chapters });

const pageErrors = new WeakMap<import('@playwright/test').Page, Error[]>();

test.beforeEach(async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  pageErrors.set(page, errors);
  await page.goto('/library');
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page) ?? []).toEqual([]);
});

test('C11B refuses navigation admission while an owned vertical turn loads a section or iframe', async ({ page }) => {
  test.setTimeout(90_000);
  const archive = await buildEpub(page, [
    { id: 'start', href: 'start.xhtml', body: words('admission-start', 24) },
    { id: 'target', href: 'target.xhtml', body: words('admission-target', 900) },
    { id: 'after', href: 'after.xhtml', body: words('admission-after', 24) }
  ]);
  const result = await page.evaluate(async ({ archive, foliateViewUrl }) => {
    type Renderer = HTMLElement & {
      page: number;
      pages: number;
      primaryIndex: number;
      containerPosition: number;
      next: () => Promise<unknown>;
      pan: (dx: number, dy: number) => Promise<unknown>;
      render: () => void;
      setStyles: (styles: string) => void;
      goTo: (target: { index: number; anchor?: unknown }) => Promise<unknown>;
      sections: Array<{ load: () => Promise<unknown> }>;
      getContents: () => Array<{ index: number; doc?: Document }>;
    };
    type NativeView = HTMLElement & {
      open: (book: unknown) => Promise<void>;
      init: (options: { showTextStart: boolean }) => Promise<void>;
      goTo: (target: number) => Promise<unknown>;
      close: () => void;
      renderer?: Renderer;
      history: { pushState: (state: unknown) => void };
      perfTracker?: { time: (name: string, operation: () => unknown, detail?: unknown) => unknown };
    };
    const { makeBook } = await import(/* @vite-ignore */ foliateViewUrl);
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const bounded = async <T>(promise: Promise<T>, label: string) => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          promise,
          new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error(`${label} did not settle`)), 5_000); })
        ]);
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    };
    const run = async (variant: 'section' | 'iframe') => {
      let releaseLoad!: () => void;
      const loadGate = new Promise<void>((resolve) => { releaseLoad = resolve; });
      let enterLoad!: () => void;
      const loadEntered = new Promise<void>((resolve) => { enterLoad = resolve; });
      let targetLoadStarted = false;
      let targetLoadFinished = false;
      let targetLoadCalls = 0;
      let holdIframe = false;
      const book = await makeBook(new File([new Uint8Array(archive)], `turn-load-${variant}.epub`, { type: 'application/epub+zip' }));
      const view = document.createElement('foliate-view') as NativeView;
      Object.assign(view.style, { position: 'fixed', inset: '0', width: '760px', height: '540px' });
      view.perfTracker = { time: (name, operation) => {
        if (variant !== 'iframe' || !holdIframe || name !== 'renderer:view:iframeLoadWait' || targetLoadStarted)
          return operation();
        targetLoadStarted = true;
        targetLoadCalls += 1;
        const work = Promise.resolve(operation());
        return work.then(async (value) => {
          targetLoadFinished = true;
          enterLoad();
          await loadGate;
          return value;
        });
      } };
      document.body.append(view);
      await view.open(book);
      const renderer = view.renderer;
      if (!renderer) throw new Error(`expected ${variant} renderer`);
      renderer.setAttribute('no-preload', '');
      renderer.setAttribute('animated', '');
      renderer.setAttribute('animation-duration', '0');
      let resolveInitialStabilized!: () => void;
      const initialStabilized = new Promise<void>((resolve) => { resolveInitialStabilized = resolve; });
      renderer.addEventListener('stabilized', () => resolveInitialStabilized(), { once: true });
      await view.init({ showTextStart: true });
      await bounded(initialStabilized, `${variant} initial reveal`);
      const initialFonts = renderer.getContents().find(({ index }) => index === 0)?.doc?.fonts?.ready;
      if (initialFonts) await bounded(initialFonts, `${variant} initial fonts`);
      if (renderer.page !== renderer.pages - 2 || renderer.getContents().some(({ index }) => index === 1)) {
        throw new Error(`expected uncached last text page for ${variant}: ${JSON.stringify({
          page: renderer.page, pages: renderer.pages, contents: renderer.getContents().map(({ index }) => index)
        })}`);
      }

      if (variant === 'section') {
        const section = renderer.sections[1];
        if (!section) throw new Error('expected uncached target section');
        const nativeLoad = section.load.bind(section);
        section.load = async () => {
          targetLoadStarted = true;
          targetLoadCalls += 1;
          const value = await nativeLoad();
          targetLoadFinished = true;
          enterLoad();
          await loadGate;
          return value;
        };
      } else holdIframe = true;

      const pushed: unknown[] = [];
      const nativePush = view.history.pushState.bind(view.history);
      view.history.pushState = (state) => { pushed.push(state); nativePush(state); };
      let relocates = 0;
      let focusins = 0;
      let stabilized = 0;
      const reasons: unknown[] = [];
      renderer.addEventListener('relocate', (event) => {
        relocates += 1;
        reasons.push((event as CustomEvent).detail);
      });
      renderer.addEventListener('focusin', () => { focusins += 1; }, true);
      renderer.addEventListener('stabilized', () => { stabilized += 1; });
      let gateReleased = false;
      try {
        let crossSettled = false;
        const cross = renderer.next().then((value) => {
          crossSettled = true;
          return value;
        });
        await bounded(loadEntered, `${variant} target load entry`);
        const beforeCancel = {
          page: renderer.page,
          primaryIndex: renderer.primaryIndex,
          position: renderer.containerPosition,
          relocates,
          stabilized,
          focusins
        };
        const priorFocus = renderer.getContents().map(({ doc }) => [doc, doc?.activeElement] as const);
        renderer.render();
        const refusedPublic = await bounded(view.goTo(0), `${variant} refused public navigation`);
        const refusedRenderer = await bounded(renderer.goTo({ index: 0, anchor: 0 }), `${variant} refused renderer navigation`);
        const refusedTurn = await bounded(renderer.next(), `${variant} refused turn`);
        const refusedPan = await bounded(renderer.pan(60, 0), `${variant} refused pan`);
        await frame();
        await frame();
        const heldAtRealStage = variant === 'iframe' ? targetLoadFinished : targetLoadStarted;
        const refusalPreservesBarrier = !crossSettled && heldAtRealStage && targetLoadCalls === 1 &&
          refusedPublic === false && refusedRenderer === false && refusedTurn === false && refusedPan === false &&
          pushed.length === 0 && renderer.page === beforeCancel.page &&
          renderer.primaryIndex === beforeCancel.primaryIndex && renderer.containerPosition === beforeCancel.position &&
          relocates === beforeCancel.relocates && stabilized === beforeCancel.stabilized && focusins === beforeCancel.focusins;

        releaseLoad();
        gateReleased = true;
        const crossResult = await bounded(cross, `${variant} cancelled cross-section turn`);
        await frame();
        await frame();
        const noCancelledCompletionTails = crossResult === false && targetLoadFinished &&
          relocates === beforeCancel.relocates &&
          stabilized === beforeCancel.stabilized && focusins === beforeCancel.focusins &&
          priorFocus.every(([doc, element]) => !doc?.documentElement?.isConnected || doc.activeElement === element);
        if (!noCancelledCompletionTails) throw new Error(JSON.stringify({
          variant, crossResult, targetLoadFinished, beforeCancel,
          after: { relocates, stabilized, focusins, reasons }
        }));
        const recovered = await bounded(view.goTo(1), `${variant} recovered navigation`);
        const recoveredDoc = renderer.getContents().find(({ index }) => index === 1)?.doc;
        if (!recoveredDoc) throw new Error('expected recovered document');
        await recoveredDoc.fonts.ready;
        const container = renderer.shadowRoot?.querySelector<HTMLElement>('#container');
        if (!container) throw new Error('expected recovered container');
        await bounded((async () => {
          while (getComputedStyle(container).opacity !== '1') await frame();
        })(), `${variant} recovered reveal`);
        await frame();
        await frame();
        const beforeExpansion = relocates;
        // Exercise onExpand itself: an explicit render can relocate without
        // passing the cancelled-view suppression that this recovery must lift.
        renderer.setStyles('body { font-size: 23px !important; }');
        await bounded((async () => {
          while (relocates === beforeExpansion) await frame();
        })(), `${variant} recovered font expansion`);
        const recoveredAfterLoad = recovered !== false && renderer.primaryIndex === 1 &&
          pushed.length === 1 && pushed[0] === 1 && relocates > beforeExpansion &&
          recoveredDoc.defaultView?.getComputedStyle(recoveredDoc.body).fontSize === '23px';
        return { refusalPreservesBarrier, noCancelledCompletionTails, recoveredAfterLoad };
      } finally {
        if (!gateReleased) releaseLoad();
        view.close();
        view.remove();
      }
    };
    return { section: await run('section'), iframe: await run('iframe') };
  }, { archive, foliateViewUrl });

  expect(result).toEqual({
    section: { refusalPreservesBarrier: true, noCancelledCompletionTails: true, recoveredAfterLoad: true },
    iframe: { refusalPreservesBarrier: true, noCancelledCompletionTails: true, recoveredAfterLoad: true }
  });
});

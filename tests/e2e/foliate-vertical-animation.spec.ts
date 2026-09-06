import { expect, test } from '@playwright/test';
import path from 'node:path';

const foliateRoot = path.resolve(process.cwd(), '../foliate-js');
const zipWriterUrl = `/@fs/${foliateRoot}/node_modules/@zip.js/zip.js/index.js`;
const foliateViewUrl = `/@fs/${foliateRoot}/view.js`;
const readerFoliateUrl = '/src/lib/reader/foliate.ts';
const svelteNavigationUrl = `/@fs/${process.cwd()}/node_modules/@sveltejs/kit/src/runtime/app/navigation.js`;

type Chapter = { id: string; href: string; body: string; bodyStyle?: string };

const words = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${prefix}-${index}`).join(' ');

const buildEpub = async (page: import('@playwright/test').Page, chapters: Chapter[]) =>
  page.evaluate(
    async ({ zipWriterUrl, chapters }) => {
      const { BlobWriter, TextReader, ZipWriter } = await import(/* @vite-ignore */ zipWriterUrl);
      const writer = new ZipWriter(new BlobWriter());
      await writer.add('mimetype', new TextReader('application/epub+zip'), { level: 0 });
      await writer.add(
        'META-INF/container.xml',
        new TextReader('<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
      );
      await writer.add(
        'OPS/content.opf',
        new TextReader(`<?xml version="1.0"?><package version="3.0" unique-identifier="id" xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">c11b</dc:identifier><dc:title>C11B animation</dc:title><dc:language>en</dc:language></metadata><manifest>${chapters.map(({ id, href }) => `<item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${chapters.map(({ id }) => `<itemref idref="${id}"/>`).join('')}</spine></package>`)
      );
      for (const chapter of chapters) {
        const style = chapter.bodyStyle ? ` style="${chapter.bodyStyle}"` : '';
        await writer.add(`OPS/${chapter.href}`, new TextReader(`<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>C11B</title></head><body${style}>${chapter.body}</body></html>`));
      }
      return Array.from(new Uint8Array(await (await writer.close()).arrayBuffer()));
    },
    { zipWriterUrl, chapters }
  );

const animationPageErrors = new WeakMap<import('@playwright/test').Page, Error[]>();

test.beforeEach(async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  animationPageErrors.set(page, errors);
  await page.goto('/library');
});

test.afterEach(async ({ page }) => {
  expect(animationPageErrors.get(page) ?? []).toEqual([]);
});

test('C11B follows a horizontal vertical-rl drag through X-only WAAPI exit, one swap, and entry', async ({ page }) => {
  test.setTimeout(90_000);
  const archive = await buildEpub(page, [
    { id: 'vertical-rl', href: 'vertical-rl.xhtml', bodyStyle: 'writing-mode:vertical-rl', body: `<main>${words('vertical-rl-animation', 9200)}</main>` },
    { id: 'vertical-lr', href: 'vertical-lr.xhtml', bodyStyle: 'writing-mode:vertical-lr', body: `<main>${words('vertical-lr-animation', 9200)}</main>` }
  ]);
  const result = await page.evaluate(async ({ archive, foliateViewUrl }) => {
    type Renderer = HTMLElement & {
      page: number;
      primaryIndex: number;
      containerPosition: number;
      snap: (vx: number, vy: number, dx: number, dy: number, dt: number) => void;
      getContents: () => Array<{ doc?: Document }>;
    };
    type NativeView = HTMLElement & {
      open: (book: unknown) => Promise<void>;
      init: (options: { showTextStart: boolean }) => Promise<void>;
      goTo: (target: number) => Promise<unknown>;
      close: () => void;
      renderer?: Renderer;
      perfTracker?: { time: <T>(name: string, operation: () => T) => T };
    };
    const { makeBook } = await import(/* @vite-ignore */ foliateViewUrl);
    const book = await makeBook(new File([new Uint8Array(archive)], 'c11b-phases.epub', { type: 'application/epub+zip' }));
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const waitFor = async (predicate: () => boolean, message: string, describe?: () => string) => {
      const deadline = performance.now() + 5_000;
      while (!predicate()) {
        if (performance.now() > deadline) throw new Error(`timed out: ${message}${describe ? `: ${describe()}` : ''}`);
        await frame();
      }
    };
    const open = async (attributes: Array<[string, string]>) => {
      const fills = new WeakMap<NativeView, Promise<unknown>>();
      const view = document.createElement('foliate-view') as NativeView;
      Object.assign(view.style, { position: 'fixed', inset: '0', width: '760px', height: '540px' });
      view.perfTracker = { time: (name, operation) => {
        const value = operation();
        if (name === 'renderer:display:fillVisibleArea') fills.set(view, Promise.resolve(value));
        return value;
      } };
      document.body.append(view);
      await view.open(book);
      const renderer = view.renderer;
      if (!renderer) throw new Error('expected native vertical paginator');
      renderer.setAttribute('no-preload', '');
      for (const [name, value] of attributes) renderer.setAttribute(name, value);
      await view.init({ showTextStart: true });
      const fill = fills.get(view);
      if (!fill) throw new Error('expected initial real EPUB fill');
      await fill;
      const container = renderer.shadowRoot?.querySelector<HTMLElement>('#container');
      if (!container) throw new Error('expected paginator container');
      await Promise.all(renderer.getContents().map(({ doc }) => doc?.fonts?.ready));
      await waitFor(() => getComputedStyle(container).opacity === '1', 'initial phase reader reveal');
      await frame();
      await frame();
      return { view, renderer, container };
    };
    const touch = (renderer: Renderer, type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel', x: number, y: number) => {
      const point = new Touch({ identifier: 11, target: renderer, screenX: x, screenY: y, clientX: x, clientY: y });
      renderer.dispatchEvent(new TouchEvent(type, {
        bubbles: true,
        cancelable: true,
        touches: type === 'touchend' || type === 'touchcancel' ? [] : [point],
        changedTouches: [point]
      }));
    };
    const matrix = (element: Element) => new DOMMatrixReadOnly(getComputedStyle(element).transform);
    const state = await open([['animated', ''], ['animation-duration', '800']]);
    const { view, renderer, container } = state;
    const background = renderer.shadowRoot?.querySelector<HTMLElement>('#background');
    if (!background) throw new Error('expected vertical animation background');
    const startPage = renderer.page;
    const startPosition = renderer.containerPosition;
    const containerRect = container.getBoundingClientRect();
    const backgroundRect = background.getBoundingClientRect();
    let relocates = 0;
    let exitedOffscreen = false;
    // Relocation is synchronous at the swap, before the entry animation starts.
    // Sample that actual endpoint rather than approximating a steep easing curve.
    renderer.addEventListener('relocate', () => {
      relocates += 1;
      if (renderer.containerPosition !== startPosition) {
        const bounds = container.getBoundingClientRect();
        exitedOffscreen = container.children.length > 0 && Array.from(container.children).every((child) =>
          child.getBoundingClientRect().left >= bounds.right - 0.01);
      }
    });
    touch(renderer, 'touchstart', 260, 270);
    touch(renderer, 'touchmove', 650, 270);
    await frame();
    const dragMatrices = Array.from(container.children, matrix);
    const dragFollowsFinger = dragMatrices.length > 0 && dragMatrices.every((value) => value.m41 > 0 && Math.abs(value.m42) < 0.01);
    const dragPreservesScroll = renderer.containerPosition === startPosition;
    touch(renderer, 'touchend', 650, 270);

    const animations = (targetContainer = container) => targetContainer.getAnimations({ subtree: true }).filter((animation) => {
      const effect = animation.effect as KeyframeEffect | null;
      const target = effect?.target;
      const frames = effect?.getKeyframes() ?? [];
      return target instanceof HTMLElement && target.parentElement === targetContainer &&
        frames.some(({ transform }) => typeof transform === 'string' && transform.includes('translateX'));
    });
    await waitFor(() => animations().length > 0, 'first exit animation');
    const exitAnimations = animations();
    for (const animation of exitAnimations) {
      animation.pause();
      const duration = Number(animation.effect?.getComputedTiming().duration ?? 0);
      animation.currentTime = Math.max(1, duration / 2);
    }
    await frame();
    const midExitRetainsOldLocation = renderer.page === startPage && renderer.containerPosition === startPosition;
    const phaseRect = container.getBoundingClientRect();
    const exitEndpointMatchesWidth = exitAnimations.every((animation) => {
      const frames = (animation.effect as KeyframeEffect | null)?.getKeyframes() ?? [];
      const endpoint = frames[frames.length - 1]?.transform;
      return typeof endpoint === 'string' && Math.abs(Math.abs(new DOMMatrix(endpoint).m41) - phaseRect.width) < 1;
    });
    const exitMatrices = Array.from(container.children, matrix);
    const exitIsXOnly = exitMatrices.length > 0 && exitMatrices.every((value) => Math.abs(value.m42) < 0.01 && value.m41 > 0);
    if (!exitEndpointMatchesWidth) {
      throw new Error(`exit phase geometry mismatch: ${JSON.stringify({
        dragX: dragMatrices.map(({ m41 }) => m41),
        initialContainerWidth: containerRect.width,
        phaseContainerWidth: phaseRect.width,
        phaseContainerRight: phaseRect.right,
        endpoints: exitAnimations.map((animation) => {
          const frames = (animation.effect as KeyframeEffect | null)?.getKeyframes() ?? [];
          return frames[frames.length - 1]?.transform ?? null;
        }),
        childRects: Array.from(container.children, (child) => {
          const rect = child.getBoundingClientRect();
          return { left: rect.left, right: rect.right, width: rect.width };
        })
      })}`);
    }
    const backgroundStaysStill = background.getAnimations({ subtree: true }).length === 0 &&
      Math.abs(matrix(background).m41) < 0.01 && Math.abs(matrix(background).m42) < 0.01 &&
      Math.abs(background.getBoundingClientRect().left - backgroundRect.left) < 0.01;
    for (const animation of exitAnimations) animation.finish();
    await waitFor(() => renderer.page === startPage + 1, 'offscreen swap', () => JSON.stringify({
      startPage,
      currentPage: renderer.page,
      relocates,
      animations: exitAnimations.map((animation) => ({ playState: animation.playState, currentTime: animation.currentTime })),
      transforms: Array.from(container.children, (child) => {
        const value = matrix(child);
        return { x: value.m41, y: value.m42 };
      })
    }));
    const swapMovesOneViewport = Math.abs((renderer.containerPosition - startPosition) - containerRect.height) < 2;
    const swapCount = relocates;

    await waitFor(() => animations().length > 0, 'entry animation');
    const entryAnimations = animations();
    for (const animation of entryAnimations) {
      animation.pause();
      const duration = Number(animation.effect?.getComputedTiming().duration ?? 0);
      animation.currentTime = Math.max(1, duration / 2);
    }
    await frame();
    const entryMatrices = Array.from(container.children, matrix);
    const entryIsOppositeXOnly = entryMatrices.length > 0 && entryMatrices.every((value) => Math.abs(value.m42) < 0.01 && value.m41 < 0) &&
      Array.from(container.children).every((child) => child.getBoundingClientRect().left < containerRect.left);
    for (const animation of entryAnimations) animation.finish();
    await waitFor(() => animations().length === 0, 'entry cleanup');
    await frame();
    const cleaned = Array.from(container.children, matrix).every((value) => Math.abs(value.m41) < 0.01 && Math.abs(value.m42) < 0.01);
    const uniqueSwap = relocates === swapCount && swapCount === 1;

    const zero = await open([['animated', ''], ['animation-duration', '0']]);
    const zeroPage = zero.renderer.page;
    const zeroRect = zero.container.getBoundingClientRect();
    const zeroX = zeroRect.left + zeroRect.width * 0.2;
    touch(zero.renderer, 'touchstart', zeroX, zeroRect.top + zeroRect.height / 2);
    touch(zero.renderer, 'touchmove', zeroX + zeroRect.width * 0.49, zeroRect.top + zeroRect.height / 2);
    await new Promise((resolve) => setTimeout(resolve, 100));
    touch(zero.renderer, 'touchend', zeroX + zeroRect.width * 0.49, zeroRect.top + zeroRect.height / 2);
    await frame();
    await frame();
    const shortDistanceSettles = zero.renderer.page === zeroPage;
    touch(zero.renderer, 'touchstart', zeroX, zeroRect.top + zeroRect.height / 2);
    touch(zero.renderer, 'touchmove', zeroX + 12, zeroRect.top + zeroRect.height / 2);
    await frame();
    touch(zero.renderer, 'touchend', zeroX + 12, zeroRect.top + zeroRect.height / 2);
    await waitFor(() => zero.renderer.page === zeroPage + 1, 'same-direction flick');
    const flickCommits = zero.renderer.page === zeroPage + 1;
    touch(zero.renderer, 'touchstart', zeroX, zeroRect.top + zeroRect.height / 2);
    touch(zero.renderer, 'touchmove', zeroX + zeroRect.width * 0.7, zeroRect.top + zeroRect.height / 2);
    await frame();
    touch(zero.renderer, 'touchmove', zeroX + zeroRect.width * 0.62, zeroRect.top + zeroRect.height / 2);
    touch(zero.renderer, 'touchend', zeroX + zeroRect.width * 0.62, zeroRect.top + zeroRect.height / 2);
    await frame();
    await frame();
    const reverseFlickSettles = zero.renderer.page === zeroPage + 1;
    touch(zero.renderer, 'touchstart', 360, 470);
    touch(zero.renderer, 'touchmove', 360, 120);
    touch(zero.renderer, 'touchend', 360, 120);
    await waitFor(() => zero.renderer.page === zeroPage + 2, 'vertical compatibility turn');
    const verticalLegacyStillTurns = zero.renderer.page === zeroPage + 2;
    const zeroCreatesNoAnimations = animations(zero.container).length === 0;

    const reverse = await open([['animated', ''], ['animation-duration', '240']]);
    const reversePage = reverse.renderer.page;
    const reverseRect = reverse.container.getBoundingClientRect();
    const reverseX = reverseRect.left + reverseRect.width * 0.2;
    touch(reverse.renderer, 'touchstart', reverseX, reverseRect.top + reverseRect.height / 2);
    touch(reverse.renderer, 'touchmove', reverseX + reverseRect.width * 0.7, reverseRect.top + reverseRect.height / 2);
    await frame();
    touch(reverse.renderer, 'touchmove', reverseX + reverseRect.width * 0.62, reverseRect.top + reverseRect.height / 2);
    touch(reverse.renderer, 'touchend', reverseX + reverseRect.width * 0.62, reverseRect.top + reverseRect.height / 2);
    await waitFor(() => animations(reverse.container).length > 0, 'nonzero reverse settle animation');
    await waitFor(() => animations(reverse.container).length === 0, 'nonzero reverse settle cleanup');
    const nonzeroReverseSettles = reverse.renderer.page === reversePage &&
      Array.from(reverse.container.children).every((child) => {
        const value = matrix(child);
        return Math.abs(value.m41) < 0.01 && Math.abs(value.m42) < 0.01;
      });

    const lr = await open([['animated', ''], ['animation-duration', '0']]);
    await lr.view.goTo(1);
    const lrPage = lr.renderer.page;
    const lrRect = lr.container.getBoundingClientRect();
    const lrX = lrRect.left + lrRect.width * 0.8;
    touch(lr.renderer, 'touchstart', lrX, lrRect.top + lrRect.height / 2);
    touch(lr.renderer, 'touchmove', lrX - lrRect.width * 0.55, lrRect.top + lrRect.height / 2);
    touch(lr.renderer, 'touchend', lrX - lrRect.width * 0.55, lrRect.top + lrRect.height / 2);
    await waitFor(() => lr.renderer.page === lrPage + 1, 'vertical-lr left next');
    const verticalLrMirrorsDirection = lr.renderer.page === lrPage + 1;

    const hidden = await open([['animated', ''], ['animation-duration', '800']]);
    const hiddenStart = hidden.renderer.page;
    touch(hidden.renderer, 'touchstart', 250, 260);
    touch(hidden.renderer, 'touchmove', 660, 260);
    touch(hidden.renderer, 'touchend', 660, 260);
    await waitFor(() => animations(hidden.container).length > 0, 'hidden animation');
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => animations(hidden.container).length === 0, 'hidden animation completion');
    Reflect.deleteProperty(document, 'hidden');
    const hiddenCommitsWithoutHanging = hidden.renderer.page === hiddenStart + 1;

    for (const current of [view, zero.view, reverse.view, lr.view, hidden.view]) {
      current.close();
      current.remove();
    }
    return {
      dragFollowsFinger, dragPreservesScroll, midExitRetainsOldLocation, exitEndpointMatchesWidth,
      exitIsXOnly, exitedOffscreen, backgroundStaysStill, swapMovesOneViewport, entryIsOppositeXOnly,
      cleaned, uniqueSwap, shortDistanceSettles, flickCommits,
      reverseFlickSettles, verticalLegacyStillTurns, verticalLrMirrorsDirection,
      zeroCreatesNoAnimations, nonzeroReverseSettles, hiddenCommitsWithoutHanging
    };
  }, { archive, foliateViewUrl });

  expect(result).toEqual({
    dragFollowsFinger: true,
    dragPreservesScroll: true,
    midExitRetainsOldLocation: true,
    exitEndpointMatchesWidth: true,
    exitIsXOnly: true,
    exitedOffscreen: true,
    backgroundStaysStill: true,
    swapMovesOneViewport: true,
    entryIsOppositeXOnly: true,
    cleaned: true,
    uniqueSwap: true,
    shortDistanceSettles: true,
    flickCommits: true,
    reverseFlickSettles: true,
    verticalLegacyStillTurns: true,
    verticalLrMirrorsDirection: true,
    zeroCreatesNoAnimations: true,
    nonzeroReverseSettles: true,
    hiddenCommitsWithoutHanging: true
  });
});

test('C11B cancels stale vertical motion before and after swap without leaking a turn into a new target', async ({ page }) => {
  test.setTimeout(90_000);
  const archive = await buildEpub(page, Array.from({ length: 4 }, (_, index) => ({
    id: `chapter-${index}`, href: `chapter-${index}.xhtml`, bodyStyle: 'writing-mode:vertical-rl',
    body: `<main data-c11b-chapter="${index}">${words(`c11b-cancel-${index}`, 5600)}</main>`
  })));
  const result = await page.evaluate(async ({ archive, foliateViewUrl }) => {
    type Renderer = HTMLElement & {
      page: number;
      containerPosition: number;
      primaryIndex: number;
      next: () => Promise<unknown>;
      goTo: (target: { index: number; anchor?: number }) => Promise<unknown>;
      getContents: () => Array<{ index: number; doc?: Document }>;
    };
    type NativeView = HTMLElement & {
      open: (book: unknown) => Promise<void>;
      init: (options: { showTextStart: boolean }) => Promise<void>;
      close: () => void;
      renderer?: Renderer;
      perfTracker?: { time: <T>(name: string, operation: () => T) => T };
    };
    const { makeBook } = await import(/* @vite-ignore */ foliateViewUrl);
    const book = await makeBook(new File([new Uint8Array(archive)], 'c11b-cancel.epub', { type: 'application/epub+zip' }));
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const waitFor = async (predicate: () => boolean, message: string, describe?: () => string) => {
      const deadline = performance.now() + 5_000;
      while (!predicate()) {
        if (performance.now() > deadline) throw new Error(`timed out: ${message}${describe ? `: ${describe()}` : ''}`);
        await frame();
      }
    };
    const settles = async (...promises: Promise<unknown>[]) => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          Promise.all(promises),
          new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('cancelled operation did not settle')), 5_000); })
        ]);
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    };
    const fills = new WeakMap<NativeView, Promise<unknown>>();
    const view = document.createElement('foliate-view') as NativeView;
    Object.assign(view.style, { position: 'fixed', inset: '0', width: '760px', height: '540px' });
    view.perfTracker = { time: (name, operation) => {
      const value = operation();
      if (name === 'renderer:display:fillVisibleArea') fills.set(view, Promise.resolve(value));
      return value;
    } };
    document.body.append(view);
    await view.open(book);
    const renderer = view.renderer;
    if (!renderer) throw new Error('expected cancellation renderer');
    renderer.setAttribute('animated', '');
    renderer.setAttribute('animation-duration', '800');
    await view.init({ showTextStart: true });
    const initialFill = fills.get(view);
    if (!initialFill) throw new Error('expected initial fill');
    await initialFill;
    const container = renderer.shadowRoot?.querySelector<HTMLElement>('#container');
    if (!container) throw new Error('expected cancellation container');
    const animations = () => container.getAnimations({ subtree: true }).filter((animation) => {
      const effect = animation.effect as KeyframeEffect | null;
      const target = effect?.target;
      const frames = effect?.getKeyframes() ?? [];
      return target instanceof HTMLElement && target.parentElement === container &&
        frames.some(({ transform }) => typeof transform === 'string' && transform.includes('translateX'));
    });
    let relocates = 0;
    let focusins = 0;
    renderer.addEventListener('relocate', () => { relocates += 1; });
    renderer.addEventListener('focusin', () => { focusins += 1; }, true);

    const noLateTail = async () => {
      await frame();
      await frame();
      const snapshot = () => [renderer.page, renderer.primaryIndex, renderer.containerPosition,
        relocates, focusins, getComputedStyle(container).opacity,
        ...Array.from(container.children, (child) => getComputedStyle(child).transform)];
      const before = snapshot();
      const focused = renderer.getContents().map(({ doc }) => [doc, doc?.activeElement] as const);
      await new Promise((resolve) => setTimeout(resolve, 950));
      const after = snapshot();
      return before.every((value, index) => value === after[index]) &&
        focused.every(([doc, element]) => doc?.activeElement === element);
    };

    const preSwapTurn = renderer.next();
    await waitFor(() => animations().length > 0, 'pre-swap animation');
    const preSwapTarget = renderer.goTo({ index: 2, anchor: 0 });
    await settles(preSwapTurn, preSwapTarget);
    await waitFor(() => renderer.primaryIndex === 2, 'pre-swap target');
    const preSwapCancelled = renderer.primaryIndex === 2 && animations().length === 0;

    const postSwapPage = renderer.page;
    const postSwapTurn = renderer.next();
    await waitFor(() => animations().length > 0, 'post-swap exit');
    for (const animation of animations()) animation.finish();
    await waitFor(() => renderer.page === postSwapPage + 1, 'post-swap page commit');
    await waitFor(() => animations().length > 0, 'post-swap entry');
    for (const animation of animations()) {
      animation.pause();
      const duration = Number(animation.effect?.getComputedTiming().duration ?? 0);
      animation.currentTime = Math.max(1, duration / 2);
    }
    await frame();
    const entryXOnly = Array.from(container.children).every((child) => {
      const transform = new DOMMatrixReadOnly(getComputedStyle(child).transform);
      return transform.m41 < 0 && Math.abs(transform.m42) < 0.01;
    });
    const postSwapTarget = renderer.goTo({ index: 0, anchor: 0 });
    await settles(postSwapTurn, postSwapTarget);
    await waitFor(() => renderer.primaryIndex === 0, 'post-swap target');
    const settledRelocates = relocates;
    const settledFocusins = focusins;
    await new Promise((resolve) => setTimeout(resolve, 950));
    const noLateTurn = renderer.primaryIndex === 0 && animations().length === 0 &&
      relocates === settledRelocates && focusins === settledFocusins;

    const touch = (type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel', x: number, y: number) => {
      const point = new Touch({ identifier: 17, target: renderer, screenX: x, screenY: y, clientX: x, clientY: y });
      renderer.dispatchEvent(new TouchEvent(type, {
        bubbles: true,
        cancelable: true,
        touches: type === 'touchend' || type === 'touchcancel' ? [] : [point],
        changedTouches: [point]
      }));
    };
    const pageBeforeRaf = renderer.page;
    touch('touchstart', 240, 270);
    touch('touchmove', 650, 270);
    touch('touchend', 650, 270);
    touch('touchstart', 300, 270);
    touch('touchcancel', 300, 270);
    await frame();
    await frame();
    const touchEndRafCancelled = renderer.page === pageBeforeRaf && animations().length === 0;
    const touchEndHasNoTail = await noLateTail();

    const pureClickStart = renderer.page;
    touch('touchstart', 240, 270);
    touch('touchmove', 650, 270);
    touch('touchend', 650, 270);
    await waitFor(() => animations().length > 0, 'gesture takeover animation');
    touch('touchstart', 420, 270);
    touch('touchend', 420, 270);
    await new Promise((resolve) => setTimeout(resolve, 950));
    const pureClickTakeoverSettles = renderer.page === pureClickStart && animations().length === 0;

    const doc = renderer.getContents().find(({ index }) => index === renderer.primaryIndex)?.doc;
    if (!doc) throw new Error('expected primary document for touchcancel');
    const docPage = renderer.page;
    const docStart = new Touch({ identifier: 18, target: renderer, screenX: 240, screenY: 270, clientX: 240, clientY: 270 });
    const docMove = new Touch({ identifier: 18, target: renderer, screenX: 650, screenY: 270, clientX: 650, clientY: 270 });
    renderer.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [docStart], changedTouches: [docStart] }));
    renderer.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [docMove], changedTouches: [docMove] }));
    await frame();
    doc.dispatchEvent(new TouchEvent('touchcancel', { bubbles: true, cancelable: true, touches: [], changedTouches: [docMove] }));
    await frame();
    await frame();
    const documentTouchCancelSettles = renderer.page === docPage && animations().length === 0 &&
      Array.from(container.children).every((child) => {
        const transform = new DOMMatrixReadOnly(getComputedStyle(child).transform);
        return Math.abs(transform.m41) < 0.01 && Math.abs(transform.m42) < 0.01;
      });
    const documentCancelHasNoTail = await noLateTail();

    touch('touchstart', 240, 270);
    touch('touchmove', 440, 270);
    const dragWasActive = Array.from(container.children).some((child) =>
      new DOMMatrixReadOnly(getComputedStyle(child).transform).m41 > 0);
    renderer.setAttribute('max-inline-size', '640px');
    await frame();
    await frame();
    const cancelledDragPage = renderer.page;
    touch('touchmove', 560, 270);
    touch('touchend', 560, 270);
    await frame();
    await frame();
    const invalidatedGestureStaysCancelled = dragWasActive && renderer.page === cancelledDragPage &&
      animations().length === 0 && Array.from(container.children).every((child) => {
        const transform = new DOMMatrixReadOnly(getComputedStyle(child).transform);
        return Math.abs(transform.m41) < 0.01 && Math.abs(transform.m42) < 0.01;
      });
    renderer.removeAttribute('max-inline-size');
    await frame();

    const layoutTurn = renderer.next();
    await waitFor(() => animations().length > 0, 'layout invalidation animation');
    renderer.setAttribute('max-inline-size', '640px');
    await settles(layoutTurn);
    const layoutCancels = animations().length === 0;
    const layoutHasNoTail = await noLateTail();
    renderer.removeAttribute('max-inline-size');
    await frame();
    const flowTurn = renderer.next();
    await waitFor(() => animations().length > 0, 'flow invalidation animation');
    renderer.setAttribute('flow', 'scrolled');
    await settles(flowTurn);
    const flowCancels = animations().length === 0;
    const flowHasNoTail = await noLateTail();
    renderer.removeAttribute('flow');
    await frame();

    const replacementTurn = renderer.next();
    await waitFor(() => animations().length > 0, 'replacement lock animation');
    const unlockTarget = renderer.goTo({ index: 1, anchor: 0 });
    await settles(replacementTurn, unlockTarget);
    const followUpTurn = renderer.next();
    await waitFor(() => animations().length > 0, 'post-cancel unlock animation');
    const replacementUnlocks = renderer.primaryIndex === 1;
    const finishTarget = renderer.goTo({ index: 0, anchor: 0 });
    await settles(followUpTurn, finishTarget);

    const destroyTurn = renderer.next();
    await waitFor(() => animations().length > 0, 'destroy animation');
    view.close();
    view.remove();
    await settles(destroyTurn);
    const destroyCancels = !container.isConnected && animations().length === 0;
    return {
      preSwapCancelled, entryXOnly, noLateTurn, touchEndRafCancelled, pureClickTakeoverSettles,
      documentTouchCancelSettles, invalidatedGestureStaysCancelled,
      touchEndHasNoTail, documentCancelHasNoTail, layoutHasNoTail, flowHasNoTail,
      layoutCancels, flowCancels, replacementUnlocks, destroyCancels
    };
  }, { archive, foliateViewUrl });

  expect(result).toEqual({
    preSwapCancelled: true,
    entryXOnly: true,
    noLateTurn: true,
    touchEndRafCancelled: true,
    pureClickTakeoverSettles: true,
    documentTouchCancelSettles: true,
    invalidatedGestureStaysCancelled: true,
    touchEndHasNoTail: true,
    documentCancelHasNoTail: true,
    layoutHasNoTail: true,
    flowHasNoTail: true,
    layoutCancels: true,
    flowCancels: true,
    replacementUnlocks: true,
    destroyCancels: true
  });
});

test('C11B keeps the first vertical render visible when layout renders twice before reveal', async ({ page }) => {
  test.setTimeout(90_000);
  const archive = await buildEpub(page, [{
    id: 'first-reveal', href: 'first-reveal.xhtml', bodyStyle: 'writing-mode:vertical-rl',
    body: `<main>${words('c11b-first-reveal', 3200)}</main>`
  }]);
  const result = await page.evaluate(async ({ archive, foliateViewUrl }) => {
    type Renderer = HTMLElement & {
      render: () => void;
      getContents: () => Array<{ doc?: Document }>;
    };
    type NativeView = HTMLElement & {
      open: (book: unknown) => Promise<void>;
      init: (options: { showTextStart: boolean }) => Promise<void>;
      close: () => void;
      renderer?: Renderer;
      perfTracker?: { time: <T>(name: string, operation: () => T) => T };
    };
    const { makeBook } = await import(/* @vite-ignore */ foliateViewUrl);
    const book = await makeBook(new File([new Uint8Array(archive)], 'c11b-first-reveal.epub', { type: 'application/epub+zip' }));
    const fills = new WeakMap<NativeView, Promise<unknown>>();
    const view = document.createElement('foliate-view') as NativeView;
    Object.assign(view.style, { position: 'fixed', inset: '0', width: '760px', height: '540px' });
    view.perfTracker = { time: (name, operation) => {
      const value = operation();
      if (name === 'renderer:display:fillVisibleArea') fills.set(view, Promise.resolve(value));
      return value;
    } };
    document.body.append(view);
    await view.open(book);
    const renderer = view.renderer;
    if (!renderer) throw new Error('expected renderer before first reveal');
    renderer.setAttribute('animated', '');
    renderer.setAttribute('no-preload', '');
    let rendersBeforeReveal = 0;
    let stabilized = 0;
    renderer.addEventListener('stabilized', () => { stabilized += 1; });
    renderer.addEventListener('load', () => {
      renderer.render();
      renderer.render();
      rendersBeforeReveal += 2;
    }, { once: true });
    await view.init({ showTextStart: true });
    const fill = fills.get(view);
    if (!fill) throw new Error('expected initial fill after repeated renders');
    await fill;
    const container = renderer.shadowRoot?.querySelector<HTMLElement>('#container');
    if (!container) throw new Error('expected container after repeated renders');
    const deadline = performance.now() + 5_000;
    // The loader owns the initial reveal even when load observers request renders.
    while (stabilized < 1 || getComputedStyle(container).opacity !== '1') {
      if (performance.now() > deadline) {
        throw new Error(`final repeated-render stabilization did not complete: ${JSON.stringify({
          stabilized,
          opacity: getComputedStyle(container).opacity,
          rendersBeforeReveal
        })}`);
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    const doc = renderer.getContents()[0]?.doc;
    const frame = doc?.defaultView?.frameElement as HTMLIFrameElement | null;
    const root = doc?.querySelector('main');
    if (!frame || !doc || !root) throw new Error('expected rendered vertical frame');
    const containerRect = container.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const range = doc.createRange();
    range.selectNodeContents(root);
    const textRect = Array.from(range.getClientRects()).find((rect) => rect.width > 0 && rect.height > 0);
    const scaleX = frameRect.width / Math.max(1, doc.documentElement.clientWidth);
    const scaleY = frameRect.height / Math.max(1, doc.documentElement.clientHeight);
    const actualTextRect = textRect && {
      left: frameRect.left + textRect.left * scaleX,
      right: frameRect.left + textRect.right * scaleX,
      top: frameRect.top + textRect.top * scaleY,
      bottom: frameRect.top + textRect.bottom * scaleY
    };
    const visibleAfterReveal = getComputedStyle(container).opacity === '1' && container.contains(frame) &&
      !!actualTextRect && actualTextRect.right > containerRect.left && actualTextRect.left < containerRect.right &&
      actualTextRect.bottom > containerRect.top && actualTextRect.top < containerRect.bottom;
    if (!visibleAfterReveal) {
      throw new Error(`first reveal is not visible: ${JSON.stringify({
        opacity: getComputedStyle(container).opacity,
        containsFrame: container.contains(frame),
        container: { left: containerRect.left, top: containerRect.top, right: containerRect.right, bottom: containerRect.bottom },
        frame: { left: frameRect.left, top: frameRect.top, right: frameRect.right, bottom: frameRect.bottom },
        text: actualTextRect ?? null,
        rawText: textRect ? { left: textRect.left, top: textRect.top, right: textRect.right, bottom: textRect.bottom } : null
      })}`);
    }
    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await doc.fonts.ready;
    await nextFrame();
    await nextFrame();
    const layoutReentry: number[] = [];
    for (const moveBeforeRender of [false, true]) {
      renderer.removeAttribute('flow');
      await nextFrame();
      await nextFrame();
      if (moveBeforeRender) container.scrollTop += container.clientHeight;
      let invalidated = false;
      let staleRelocates = 0;
      const onRelocate = () => { if (invalidated) staleRelocates += 1; };
      renderer.addEventListener('relocate', onRelocate);
      await new Promise<void>((resolve) => {
        renderer.addEventListener('stabilized', () => {
          invalidated = true;
          renderer.setAttribute('flow', 'scrolled');
          // The old anchor's microtask runs before this checkpoint; the new
          // flow's legitimate layout frame runs afterward.
          queueMicrotask(() => { invalidated = false; resolve(); });
        }, { once: true });
        renderer.render();
      });
      renderer.removeEventListener('relocate', onRelocate);
      layoutReentry.push(staleRelocates);
      await nextFrame();
      await nextFrame();
    }
    view.close();
    view.remove();
    return { rendersBeforeReveal, visibleAfterReveal, layoutReentry };
  }, { archive, foliateViewUrl });

  expect(result).toEqual({ rendersBeforeReveal: 2, visibleAfterReveal: true, layoutReentry: [0, 0] });
});

test('C11B records View history only after real navigation succeeds or is not cancelled', async ({ page }) => {
  test.setTimeout(90_000);
  const archive = await buildEpub(page, [
    { id: 'history-0', href: 'history-0.xhtml', bodyStyle: 'writing-mode:vertical-rl', body: `<main>${words('c11b-history-zero', 800)}</main>` },
    { id: 'history-1', href: 'history-1.xhtml', bodyStyle: 'writing-mode:vertical-rl', body: `<main>${words('c11b-history-one', 800)}</main>` }
  ]);
  const result = await page.evaluate(async ({ archive, foliateViewUrl }) => {
    type Renderer = HTMLElement & { goTo: (target: unknown) => Promise<unknown> };
    type NativeView = HTMLElement & {
      open: (book: unknown) => Promise<void>;
      init: (options: { lastLocation?: number; showTextStart?: boolean }) => Promise<unknown>;
      goTo: (target: number) => Promise<unknown>;
      goToFraction: (fraction: number) => Promise<unknown>;
      select: (target: number) => Promise<unknown>;
      close: () => void;
      renderer?: Renderer;
      history: { pushState: (state: unknown) => void };
      perfTracker?: { time: <T>(name: string, operation: () => T) => T };
    };
    const { makeBook } = await import(/* @vite-ignore */ foliateViewUrl);
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
    const open = async () => {
      const book = await makeBook(new File([new Uint8Array(archive)], 'c11b-history.epub', { type: 'application/epub+zip' }));
      const fills = new WeakMap<NativeView, Promise<unknown>>();
      const view = document.createElement('foliate-view') as NativeView;
      Object.assign(view.style, { position: 'fixed', inset: '0', width: '760px', height: '540px' });
      view.perfTracker = { time: (name, operation) => {
        const value = operation();
        if (name === 'renderer:display:fillVisibleArea') fills.set(view, Promise.resolve(value));
        return value;
      } };
      document.body.append(view);
      await view.open(book);
      const renderer = view.renderer;
      if (!renderer) throw new Error('expected renderer for View history proof');
      renderer.setAttribute('no-preload', '');
      renderer.setAttribute('animated', '');
      renderer.setAttribute('animation-duration', '0');
      await view.init({ showTextStart: true });
      const fill = fills.get(view);
      if (!fill) throw new Error('expected initial native fill for View history proof');
      await fill;
      return view;
    };
    const cancel = async (
      invoke: (view: NativeView) => Promise<unknown>,
      isOldHistory: (state: unknown) => boolean
    ) => {
      const view = await open();
      const renderer = view.renderer!;
      const pushed: unknown[] = [];
      const nativePush = view.history.pushState.bind(view.history);
      view.history.pushState = (state) => { pushed.push(state); nativePush(state); };
      const nativeGoTo = renderer.goTo.bind(renderer);
      let release!: () => void;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      let entered!: () => void;
      const enteredGate = new Promise<void>((resolve) => { entered = resolve; });
      let first = true;
      renderer.goTo = async (target) => {
        if (first) {
          first = false;
          entered();
          return nativeGoTo(gate.then(() => target));
        }
        return nativeGoTo(target);
      };
      const stale = invoke(view);
      await bounded(enteredGate, 'history target gate');
      const newer = view.goTo(0);
      const staleResult = await bounded(stale, 'cancelled View API');
      const oldHistoryWasRejected = !pushed.some(isOldHistory);
      release();
      await bounded(newer, 'replacement View navigation');
      const replacementHistoryRecorded = pushed.length === 1 && pushed[0] === 0;
      view.close();
      view.remove();
      return { staleResult, oldHistoryWasRejected, replacementHistoryRecorded };
    };
    const cancelled = [
      await cancel((view) => view.init({ lastLocation: 1 }), (state) => state === 1),
      await cancel((view) => view.goTo(1), (state) => state === 1),
      await cancel((view) => view.goToFraction(0.75), (state) =>
        typeof state === 'object' && state !== null && 'fraction' in state && state.fraction === 0.75),
      await cancel((view) => view.select(1), (state) => state === 1)
    ];
    const compatibility = await open();
    const compatibilityRenderer = compatibility.renderer!;
    const nativeCompatibilityGoTo = compatibilityRenderer.goTo.bind(compatibilityRenderer);
    compatibilityRenderer.goTo = async (target) => {
      await nativeCompatibilityGoTo(target);
      return undefined;
    };
    const compatibilityHistory: unknown[] = [];
    const nativeCompatibilityPush = compatibility.history.pushState.bind(compatibility.history);
    compatibility.history.pushState = (state) => { compatibilityHistory.push(state); nativeCompatibilityPush(state); };
    const initResult = await bounded(compatibility.init({ lastLocation: 1 }), 'undefined-success init');
    const goToResult = await bounded(compatibility.goTo(1), 'undefined-success goTo');
    const fractionResult = await bounded(compatibility.goToFraction(0), 'undefined-success fraction');
    const selectResult = await bounded(compatibility.select(1), 'undefined-success select');
    compatibility.close();
    compatibility.remove();
    const compatibilityHistoryMatches = compatibilityHistory.length === 4 &&
      compatibilityHistory[0] === 1 && compatibilityHistory[1] === 1 &&
      typeof compatibilityHistory[2] === 'object' && compatibilityHistory[2] !== null &&
      'fraction' in compatibilityHistory[2] && compatibilityHistory[2].fraction === 0 &&
      compatibilityHistory[3] === 1;
    return {
      cancelled: cancelled.every(({ staleResult, oldHistoryWasRejected, replacementHistoryRecorded }) =>
        staleResult === false && oldHistoryWasRejected && replacementHistoryRecorded),
      undefinedSuccess: initResult === undefined && !!goToResult && fractionResult === undefined && selectResult === undefined &&
        compatibilityHistoryMatches
    };
  }, { archive, foliateViewUrl });

  expect(result).toEqual({ cancelled: true, undefinedSuccess: true });
});

test('C11B keeps sentinel edges local and does not leak a preloaded turn into a second renderer', async ({ page }) => {
  test.setTimeout(90_000);
  const archive = await buildEpub(page, Array.from({ length: 3 }, (_, index) => ({
    id: `edge-${index}`, href: `edge-${index}.xhtml`, bodyStyle: 'writing-mode:vertical-rl',
    body: `<main>${words(`c11b-edge-${index}`, 4200)}</main>`
  })));
  const result = await page.evaluate(async ({ archive, foliateViewUrl }) => {
    type Renderer = HTMLElement & {
      page: number;
      pages: number;
      primaryIndex: number;
      containerPosition: number;
      snap: (vx: number, vy: number, dx: number, dy: number, dt: number) => void;
      next: () => Promise<unknown>;
      goTo: (target: { index: number; anchor?: number }) => Promise<unknown>;
      sections: Array<{ load: () => Promise<unknown> }>;
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
    const book = await makeBook(new File([new Uint8Array(archive)], 'c11b-edges.epub', { type: 'application/epub+zip' }));
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const waitFor = async (predicate: () => boolean, message: string, describe?: () => string) => {
      const deadline = performance.now() + 5_000;
      while (!predicate()) {
        if (performance.now() > deadline) throw new Error(`timed out: ${message}${describe ? `: ${describe()}` : ''}`);
        await frame();
      }
    };
    const open = async (sourceBook: unknown, preload: boolean, duration: number) => {
      const fills = new WeakMap<NativeView, Promise<unknown>>();
      let fillCount = 0;
      let latestFill: Promise<unknown> | undefined;
      const view = document.createElement('foliate-view') as NativeView;
      Object.assign(view.style, { position: 'fixed', inset: '0', width: '760px', height: '540px' });
      view.perfTracker = { time: (name, operation) => {
        const value = operation();
        if (name === 'renderer:display:fillVisibleArea') {
          latestFill = Promise.resolve(value);
          fills.set(view, latestFill);
          fillCount += 1;
        }
        return value;
      } };
      document.body.append(view);
      await view.open(sourceBook);
      const renderer = view.renderer;
      if (!renderer) throw new Error('expected edge renderer');
      if (!preload) renderer.setAttribute('no-preload', '');
      renderer.setAttribute('animated', '');
      renderer.setAttribute('animation-duration', String(duration));
      await view.init({ showTextStart: true });
      const fill = fills.get(view);
      if (!fill) throw new Error('expected real fill for edge renderer');
      await fill;
      const container = renderer.shadowRoot?.querySelector<HTMLElement>('#container');
      if (!container) throw new Error('expected edge container');
      await Promise.all(renderer.getContents().map(({ doc }) => doc?.fonts.ready));
      await waitFor(() => getComputedStyle(container).opacity === '1', 'initial reader reveal');
      await frame();
      await frame();
      return {
        view, renderer, container,
        fillCount: () => fillCount,
        waitForFill: async (before: number) => {
          await waitFor(() => fillCount > before, 'native display fill');
          await latestFill;
        }
      };
    };
    const first = await open(book, true, 800);
    const secondBook = await makeBook(new File([new Uint8Array(archive)], 'c11b-independent-instance.epub', { type: 'application/epub+zip' }));
    const second = await open(secondBook, false, 0);
    const pageTurnAnimations = (container: HTMLElement) => container.getAnimations({ subtree: true }).filter((animation) => {
      const effect = animation.effect as KeyframeEffect | null;
      const target = effect?.target;
      const frames = effect?.getKeyframes() ?? [];
      return target instanceof HTMLElement && target.parentElement === container &&
        frames.some(({ transform }) => typeof transform === 'string' && transform.includes('translateX'));
    });
    const snapshot = (renderer: Renderer, container: HTMLElement) => ({
      page: renderer.page,
      position: renderer.containerPosition,
      opacity: getComputedStyle(container).opacity,
      rect: (() => {
        const { left, top, width, height } = container.getBoundingClientRect();
        return { left, top, width, height };
      })(),
      animations: pageTurnAnimations(container).length
    });
    const secondInitial = snapshot(second.renderer, second.container);
    await frame();
    await frame();
    const firstStart = first.renderer.page;
    const secondAfterTwoFrames = snapshot(second.renderer, second.container);
    const secondStart = secondAfterTwoFrames.page;
    const secondInitiallyStable = JSON.stringify(secondInitial) === JSON.stringify(secondAfterTwoFrames) &&
      secondAfterTwoFrames.opacity === '1' && secondAfterTwoFrames.animations === 0;
    const preloadIncludesAdjacent = first.renderer.getContents().some(({ index }) => index === 1);
    first.renderer.snap(0.7, 0, 400, 0, 120);
    await frame();
    const startSentinelSettles = first.renderer.page === firstStart;
    const firstTurn = first.renderer.next();
    await waitFor(() => pageTurnAnimations(first.container).length > 0, 'first instance animation');
    const secondDuringFirstTurn = snapshot(second.renderer, second.container);
    const secondStaysStill = JSON.stringify(secondDuringFirstTurn) === JSON.stringify(secondAfterTwoFrames);
    first.renderer.snap(0, 0, 0, 0, 1);
    await Promise.race([
      Promise.resolve(firstTurn),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('first instance did not settle')), 5_000))
    ]);
    const secondFillBeforeEnd = second.fillCount();
    let resolveEndStabilized!: () => void;
    const endStabilized = new Promise<void>((resolve) => { resolveEndStabilized = resolve; });
    const onEndStabilized = () => resolveEndStabilized();
    second.renderer.addEventListener('stabilized', onEndStabilized);
    let endTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await second.view.goToFraction(1);
      await second.waitForFill(secondFillBeforeEnd);
      await Promise.race([
        endStabilized,
        new Promise<never>((_, reject) => { endTimeout = setTimeout(() => reject(new Error('end goToFraction did not stabilize')), 5_000); })
      ]);
    } finally {
      if (endTimeout) clearTimeout(endTimeout);
      second.renderer.removeEventListener('stabilized', onEndStabilized);
    }
    const lastPage = second.renderer.page;
    await Promise.resolve(second.renderer.snap(-0.7, 0, -400, 0, 120));
    await frame();
    const endSentinelSettles = second.renderer.page === lastPage;
    const blockingBook = await makeBook(new File([new Uint8Array(archive)], 'c11b-held-fill.epub', { type: 'application/epub+zip' }));
    const held = await open(blockingBook, false, 800);
    await held.renderer.goTo({ index: 1, anchor: 1 });
    const section = held.renderer.sections[2];
    if (!section) throw new Error('expected next section to hold real preload');
    const originalLoad = section.load.bind(section);
    let releaseFill: (() => void) | undefined;
    const fillGate = new Promise<void>((resolve) => { releaseFill = resolve; });
    let forwardedLoad = false;
    let forwardedPromise: Promise<unknown> | undefined;
    section.load = async () => {
      forwardedLoad = true;
      forwardedPromise = (async () => {
        await fillGate;
        return originalLoad();
      })();
      return forwardedPromise;
    };
    held.renderer.removeAttribute('no-preload');
    await held.renderer.goTo({ index: 1, anchor: 1 });
    await waitFor(() => forwardedLoad, 'forwarded held preload', () => JSON.stringify({
      primaryIndex: held.renderer.primaryIndex,
      contents: held.renderer.getContents().map(({ index }) => index),
      position: held.renderer.containerPosition
    }));
    const heldContainer = held.renderer.shadowRoot?.querySelector<HTMLElement>('#container');
    if (!heldContainer) throw new Error('expected held-fill container');
    let heldRelocates = 0;
    let heldFocusins = 0;
    held.renderer.addEventListener('relocate', () => { heldRelocates += 1; });
    held.renderer.addEventListener('focusin', () => { heldFocusins += 1; }, true);
    const heldTurnAnimations = () => pageTurnAnimations(heldContainer);
    // The last rendered page is blank padding, not a destination to position on.
    if (held.renderer.page !== held.renderer.pages - 2)
      throw new Error(`expected final text page before held fill: ${held.renderer.page}/${held.renderer.pages}`);
    const heldPage = held.renderer.page;
    let waitingTurnSettled = false;
    let waitingTurnResult: unknown;
    const waitingTurn = held.renderer.next().then((value) => {
      waitingTurnSettled = true;
      waitingTurnResult = value;
      return value;
    });
    await frame();
    await frame();
    await waitFor(() => !waitingTurnSettled && held.renderer.page === heldPage &&
      heldTurnAnimations().length === 0, 'held fill wait before cancellation', () => JSON.stringify({
        pageBeforeTurn: heldPage,
        pageAfterWait: held.renderer.page,
        pages: held.renderer.pages,
        position: held.renderer.containerPosition,
        settled: waitingTurnSettled,
        animations: heldTurnAnimations().length,
        primaryIndex: held.renderer.primaryIndex,
        contents: held.renderer.getContents().map(({ index }) => index)
      }));
    const waitsForHeldFillBeforeCancel = !waitingTurnSettled && held.renderer.page === heldPage &&
      heldTurnAnimations().length === 0;
    if (!waitsForHeldFillBeforeCancel) {
      throw new Error(`turn did not reach held fill wait: ${JSON.stringify({
        pageBeforeTurn: heldPage,
        pageAfterWait: held.renderer.page,
        pages: held.renderer.pages,
        position: held.renderer.containerPosition,
        settled: waitingTurnSettled,
        animations: heldTurnAnimations().length,
        primaryIndex: held.renderer.primaryIndex,
        contents: held.renderer.getContents().map(({ index }) => index)
      })}`);
    }
    const replacement = held.renderer.goTo({ index: 0, anchor: 0 });
    let heldTimeout: ReturnType<typeof setTimeout> | undefined;
    let settledBeforeRelease = false;
    try {
      settledBeforeRelease = await Promise.race([
        Promise.all([waitingTurn, replacement]).then(() => true),
        new Promise<boolean>((resolve) => { heldTimeout = setTimeout(() => resolve(false), 2_000); })
      ]);
    } finally {
      if (heldTimeout) clearTimeout(heldTimeout);
    }
    await Promise.all(held.renderer.getContents().map(({ doc }) => doc?.fonts.ready));
    await waitFor(() => getComputedStyle(heldContainer).opacity === '1', 'replacement reader reveal');
    await frame();
    await frame();
    const readHeldTail = () => ({
      page: held.renderer.page,
      position: held.renderer.containerPosition,
      opacity: getComputedStyle(heldContainer).opacity,
      relocates: heldRelocates,
      focusins: heldFocusins,
      focus: held.renderer.getContents().find(({ index }) => index === held.renderer.primaryIndex)?.doc?.activeElement?.id ?? ''
    });
    const heldTailSnapshot = JSON.stringify(readHeldTail());
    releaseFill?.();
    await fillGate;
    if (forwardedPromise) await forwardedPromise;
    await frame();
    await frame();
    const heldTailAfterRelease = readHeldTail();
    const heldTailUnchanged = heldTailSnapshot === JSON.stringify(heldTailAfterRelease);
    const heldFillCancellationSettles = waitsForHeldFillBeforeCancel && settledBeforeRelease &&
      waitingTurnSettled && waitingTurnResult === false && held.renderer.primaryIndex === 0 && heldTailUnchanged;
    if (!heldFillCancellationSettles || !secondInitiallyStable || !secondStaysStill) {
      throw new Error(`reader isolation changed: ${JSON.stringify({
        secondInitial, secondAfterTwoFrames, secondDuringFirstTurn,
        waitsForHeldFillBeforeCancel, settledBeforeRelease, waitingTurnResult,
        heldTailBeforeRelease: JSON.parse(heldTailSnapshot), heldTailAfterRelease
      })}`);
    }
    first.view.close();
    first.view.remove();
    second.view.close();
    second.view.remove();
    held.view.close();
    held.view.remove();
    return {
      preloadIncludesAdjacent, startSentinelSettles, secondInitiallyStable, secondStaysStill,
      endSentinelSettles, heldFillCancellationSettles
    };
  }, { archive, foliateViewUrl });

  expect(result).toEqual({
    preloadIncludesAdjacent: true,
    startSentinelSettles: true,
    secondInitiallyStable: true,
    secondStaysStill: true,
    endSentinelSettles: true,
    heldFillCancellationSettles: true
  });
});

test('C11B keeps cancellation local to an instance and clears a replaced reader host', async ({ page }) => {
  test.setTimeout(90_000);
  const verticalUrl = '/samples/c11b-replaced-vertical.epub';
  const teardownVerticalUrl = '/samples/c11b-teardown-vertical.epub';
  const horizontalUrl = '/samples/c11b-replaced-horizontal.epub';
  const vertical = await buildEpub(page, [{
    id: 'vertical', href: 'vertical.xhtml', bodyStyle: 'writing-mode:vertical-rl', body: `<main>${words('c11b-host-vertical', 6800)}</main>`
  }]);
  const horizontal = await buildEpub(page, [{
    id: 'horizontal', href: 'horizontal.xhtml', body: `<main>${words('c11b-host-horizontal', 400)}</main>`
  }]);
  await page.route(`**${verticalUrl}`, (route) => route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(vertical) }));
  await page.route(`**${teardownVerticalUrl}`, (route) => route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(vertical) }));
  await page.route(`**${horizontalUrl}`, (route) => route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(horizontal) }));
  await page.evaluate(async ({ verticalUrl, readerFoliateUrl, svelteNavigationUrl }) => {
    type Tracker = { time: <T>(name: string, operation: () => T, detail?: unknown) => T };
    type NativeView = HTMLElement & { open: (book: unknown) => Promise<void>; perfTracker?: Tracker; renderer?: object };
    const { ensureFoliateViewDefinition } = await import(/* @vite-ignore */ readerFoliateUrl);
    await ensureFoliateViewDefinition();
    const View = customElements.get('foliate-view') as { prototype: NativeView } | undefined;
    if (!View) throw new Error('expected production foliate definition before host open');
    const nativeOpen = View.prototype.open;
    const fills = new WeakMap<object, { open: number; fill: Promise<unknown> }>();
    let openCount = 0;
    View.prototype.open = async function (book) {
      const open = ++openCount;
      const previous = this.perfTracker;
      this.perfTracker = { time: (name, operation, detail) => {
        const value = previous ? previous.time(name, operation, detail) : operation();
        if (name === 'renderer:display:fillVisibleArea' && this.renderer)
          fills.set(this.renderer, { open, fill: Promise.resolve(value) });
        return value;
      } };
      await nativeOpen.call(this, book);
    };
    (window as Window & { __C11B_WAIT_FOR_HOST_FILL__?: (minimumOpen?: number) => Promise<{ open: number }> }).__C11B_WAIT_FOR_HOST_FILL__ = async (minimumOpen = 1) => {
      const deadline = performance.now() + 5_000;
      while (true) {
        const view = document.querySelector('foliate-view') as NativeView | null;
        const record = view?.renderer && fills.get(view.renderer);
        if (record && record.open >= minimumOpen) {
          await record.fill;
          // Native fill precedes the host's openStatus completion. A following
          // source request must not race the host's existing loading admission.
          if (document.querySelector('.paper-header small')?.textContent === '书籍已打开')
            return { open: record.open };
        }
        if (performance.now() > deadline)
          throw new Error(`expected host fill for open ${minimumOpen}, saw ${record?.open ?? 0}`);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
    };
    (window as Window & { __C11B_HOST_OPEN_COUNT__?: () => number }).__C11B_HOST_OPEN_COUNT__ = () => openCount;
    const { goto } = await import(/* @vite-ignore */ svelteNavigationUrl);
    await goto(`/reader?${new URLSearchParams({ source: 'asset', url: verticalUrl, label: 'C11B vertical' })}`, { keepFocus: true, noScroll: true });
  }, { verticalUrl, readerFoliateUrl, svelteNavigationUrl });
  const stage = page.getByRole('main', { name: 'reader stage' });
  await expect(stage).toContainText('书籍已打开', { timeout: 15_000 });
  await page.evaluate(async () => {
    const wait = (window as Window & { __C11B_WAIT_FOR_HOST_FILL__?: (minimumOpen?: number) => Promise<unknown> }).__C11B_WAIT_FOR_HOST_FILL__;
    if (!wait) throw new Error('expected installed host fill waiter');
    await wait();
  });
  const result = await page.evaluate(async ({ horizontalUrl, teardownVerticalUrl, svelteNavigationUrl }) => {
    type Renderer = HTMLElement & {
      next: () => Promise<unknown>;
      page: number;
      containerPosition: number;
      primaryIndex: number;
      getContents: () => Array<{ doc?: Document }>;
    };
    type NativeView = HTMLElement & { renderer?: Renderer };
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const oldView = document.querySelector('foliate-view') as NativeView | null;
    const oldRenderer = oldView?.renderer;
    if (!oldRenderer) throw new Error('expected vertical host renderer');
    oldRenderer.setAttribute('animated', '');
    oldRenderer.setAttribute('animation-duration', '800');
    const oldContainer = oldRenderer.shadowRoot?.querySelector<HTMLElement>('#container');
    if (!oldContainer) throw new Error('expected vertical host container');
    const turnAnimations = (container: HTMLElement) => container.getAnimations({ subtree: true }).filter((animation) => {
      const effect = animation.effect as KeyframeEffect | null;
      const target = effect?.target;
      const frames = effect?.getKeyframes() ?? [];
      return target instanceof HTMLElement && target.parentElement === container &&
        frames.some(({ transform }) => typeof transform === 'string' && transform.includes('translateX'));
    });
    const turn = oldRenderer.next();
    for (let index = 0; index < 120 && turnAnimations(oldContainer).length === 0; index += 1) await frame();
    if (turnAnimations(oldContainer).length === 0) throw new Error('expected host animation before replacement');
    const { goto } = await import(/* @vite-ignore */ svelteNavigationUrl);
    const waitForFill = (window as Window & { __C11B_WAIT_FOR_HOST_FILL__?: (minimumOpen?: number) => Promise<unknown> }).__C11B_WAIT_FOR_HOST_FILL__;
    const hostOpenCount = (window as Window & { __C11B_HOST_OPEN_COUNT__?: () => number }).__C11B_HOST_OPEN_COUNT__;
    if (!waitForFill || !hostOpenCount) throw new Error('expected renderer-keyed host fill tracking');
    const horizontalOpen = hostOpenCount() + 1;
    await goto(`/reader?${new URLSearchParams({ source: 'asset', url: horizontalUrl, label: 'C11B horizontal' })}`, { keepFocus: true, noScroll: true });
    await waitForFill(horizontalOpen);
    let turnTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.resolve(turn),
        new Promise<never>((_, reject) => { turnTimeout = setTimeout(() => reject(new Error('host replacement left turn pending')), 5_000); })
      ]);
    } finally {
      if (turnTimeout) clearTimeout(turnTimeout);
    }
    for (let index = 0; index < 120; index += 1) {
      const candidate = document.querySelector('foliate-view') as NativeView | null;
      if (candidate?.renderer && candidate.renderer !== oldRenderer) break;
      await frame();
    }
    const replacement = document.querySelector('foliate-view') as NativeView | null;
    const replacementContainer = replacement?.renderer?.shadowRoot?.querySelector<HTMLElement>('#container');
    const replacementLoadedHorizontal = replacement?.renderer?.getContents().some(({ doc }) =>
      doc?.body.textContent?.includes('c11b-host-horizontal-0')) ?? false;
    const teardownOpen = hostOpenCount() + 1;
    await goto(`/reader?${new URLSearchParams({ source: 'asset', url: teardownVerticalUrl, label: 'C11B vertical teardown' })}`, { keepFocus: true, noScroll: true });
    await waitForFill(teardownOpen);
    const teardownRenderer = (document.querySelector('foliate-view') as NativeView | null)?.renderer;
    if (!teardownRenderer) throw new Error('expected vertical renderer before route teardown');
    teardownRenderer.setAttribute('animated', '');
    teardownRenderer.setAttribute('animation-duration', '800');
    const teardownContainer = teardownRenderer.shadowRoot?.querySelector<HTMLElement>('#container');
    if (!teardownContainer) throw new Error('expected vertical container before route teardown');
    const teardownTurn = teardownRenderer.next();
    for (let index = 0; index < 120 && turnAnimations(teardownContainer).length === 0; index += 1) await frame();
    const teardownWasActive = teardownContainer.classList.contains('vertical') &&
      turnAnimations(teardownContainer).length > 0;
    if (!teardownWasActive) {
      const rect = teardownContainer.getBoundingClientRect();
      throw new Error(`vertical route teardown did not start animation: ${JSON.stringify({
        page: teardownRenderer.page,
        position: teardownRenderer.containerPosition,
        primaryIndex: teardownRenderer.primaryIndex,
        animations: turnAnimations(teardownContainer).length,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        contents: teardownRenderer.getContents().map(({ doc }) => doc?.body.textContent?.slice(0, 32) ?? null)
      })}`);
    }
    await goto('/library', { keepFocus: true, noScroll: true });
    let teardownTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.resolve(teardownTurn),
        new Promise<never>((_, reject) => { teardownTimeout = setTimeout(() => reject(new Error('route teardown left turn pending')), 5_000); })
      ]);
    } finally {
      if (teardownTimeout) clearTimeout(teardownTimeout);
    }
    for (let index = 0; index < 120 && document.querySelector('foliate-view'); index += 1) await frame();
    return {
      oldDetached: !oldRenderer.isConnected,
      oldAnimationsCleared: turnAnimations(oldContainer).length === 0,
      replacementExists: !!replacementContainer,
      replacementIsHorizontal: !replacementContainer?.classList.contains('vertical'),
      replacementLoadedHorizontal,
      teardownWasActive,
      teardownCleared: !teardownRenderer.isConnected && turnAnimations(teardownContainer).length === 0 && !document.querySelector('foliate-view')
    };
  }, { horizontalUrl, teardownVerticalUrl, svelteNavigationUrl });
  expect(result).toEqual({
    oldDetached: true,
    oldAnimationsCleared: true,
    replacementExists: true,
    replacementIsHorizontal: true,
    replacementLoadedHorizontal: true,
    teardownWasActive: true,
    teardownCleared: true
  });
});

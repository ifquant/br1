import { expect, test } from '@playwright/test';
import path from 'node:path';

const foliateRoot = path.resolve(process.cwd(), '../foliate-js');
const zipWriterUrl = `/@fs/${foliateRoot}/node_modules/@zip.js/zip.js/index.js`;
const br1Root = process.cwd();
const readerStageUrl = `/@fs/${br1Root}/src/lib/components/reader/ReaderStage.svelte`;
const readerTtsUrl = `/@fs/${br1Root}/src/lib/reader/tts.ts`;
const svelteLegacyClientUrl = '/node_modules/.vite/deps/svelte_legacy.js';
const svelteNavigationUrl = `/@fs/${br1Root}/node_modules/@sveltejs/kit/src/runtime/app/navigation.js`;

type EpubChapter = {
  id: string;
  href: string;
  body: string;
};

const isolateNumericContext = (body: string) => `<div><div><div>${body}</div></div></div>`;

const buildEpub = async (page: import('@playwright/test').Page, chapters: EpubChapter[]) =>
  page.evaluate(
    async ({ zipWriterUrl, chapters }) => {
      const { BlobWriter, TextReader, ZipWriter } = await import(/* @vite-ignore */ zipWriterUrl);
      const xhtml = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>S2-R04C3</title></head><body>${body}</body></html>`;
      const writer = new ZipWriter(new BlobWriter());
      await writer.add('mimetype', new TextReader('application/epub+zip'), { level: 0 });
      await writer.add(
        'META-INF/container.xml',
        new TextReader(`<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`)
      );
      await writer.add(
        'OPS/content.opf',
        new TextReader(`<?xml version="1.0"?><package version="3.0" unique-identifier="id" xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">s2-r04c3</dc:identifier><dc:title>S2-R04C3 Footnotes</dc:title><dc:language>en</dc:language></metadata><manifest>${chapters.map(({ id, href }) => `<item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${chapters.map(({ id }) => `<itemref idref="${id}"/>`).join('')}</spine></package>`)
      );
      for (const chapter of chapters) await writer.add(`OPS/${chapter.href}`, new TextReader(xhtml(chapter.body)));
      return Array.from(new Uint8Array(await (await writer.close()).arrayBuffer()));
    },
    { zipWriterUrl, chapters }
  );

const openEpub = async (
  page: import('@playwright/test').Page,
  name: string,
  body: string,
  extraChapters: EpubChapter[] = []
) => {
  await page.goto('/library');
  const assetUrl = `/samples/s2-r04c3-${name}.epub`;
  const archive = await buildEpub(page, [
    { id: 'chapter', href: 'chapter.xhtml', body },
    ...extraChapters
  ]);
  await page.route(`**${assetUrl}`, (route) =>
    route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(archive) })
  );
  await page.goto(
    `/reader?${new URLSearchParams({ source: 'asset', url: assetUrl, label: `S2-R04C3 ${name}` }).toString()}`
  );
  await expect(page.frameLocator('iframe').first().locator('body')).toBeVisible({ timeout: 15000 });
  return page.frameLocator('iframe').first();
};

const closeFootnote = async (page: import('@playwright/test').Page) => {
  await page.getByRole('dialog', { name: '脚注预览' }).getByRole('button', { name: '关闭脚注' }).click();
  await expect(page.getByRole('dialog', { name: '脚注预览' })).toHaveCount(0);
};

const expectJumpCueAt = async (
  page: import('@playwright/test').Page,
  target: import('@playwright/test').Locator
) => {
  const cue = page.locator('[data-reader-jump-cue]');
  await expect(target).toBeInViewport();
  await expect(cue).toHaveCount(1, { timeout: 3000 });
  await expect.poll(async () => {
    const cueRects = await cue.evaluate((element) => {
      const toRect = (node: Element) => {
        const { left, top, right, bottom, width, height } = node.getBoundingClientRect();
        return { left, top, right, bottom, width, height };
      };
      return { group: toRect(element), children: Array.from(element.children).map(toRect) };
    });
    const targetBox = await target.evaluate((element) => {
      const frame = element.ownerDocument.defaultView?.frameElement;
      if (!frame || frame.tagName.toLowerCase() !== 'iframe') return null;
      const targetRect = element.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      const scaleX = frame.clientWidth ? frameRect.width / frame.clientWidth : 1;
      const scaleY = frame.clientHeight ? frameRect.height / frame.clientHeight : 1;
      return {
        left: frameRect.left + targetRect.left * scaleX,
        top: frameRect.top + targetRect.top * scaleY,
        right: frameRect.left + targetRect.right * scaleX,
        bottom: frameRect.top + targetRect.bottom * scaleY
      };
    });
    if (!targetBox || !cueRects.group.width || !cueRects.group.height) return false;
    // EPUB coordinates are local to an iframe; the cue is in the reader overlay.
    return cueRects.children.some(({ left, top, right, bottom, width, height }) =>
      width > 0 &&
      height > 0 &&
      right > targetBox.left &&
      left < targetBox.right &&
      bottom > targetBox.top &&
      top < targetBox.bottom
    );
  }, { timeout: 3000 }).toBe(true);
};

const expectJumpCueToExpire = async (page: import('@playwright/test').Page) => {
  await expect.poll(() => page.locator('[data-reader-jump-cue]').count(), { timeout: 6000 }).toBe(0);
};

const captureNativeRelocateDetail = async (page: import('@playwright/test').Page) => {
  await page.evaluate(() => {
    type NativeRelocateDetail = { index: number; range: { getClientRects?: () => DOMRectList }; fraction?: number; size?: number };
    type C7Window = Window & { __BR1_C7_RELOCATE__?: { dispatch: (reason: 'anchor' | 'scroll') => void } };
    const renderer = (document.querySelector('foliate-view') as (HTMLElement & { renderer?: EventTarget }) | null)?.renderer;
    if (!renderer) throw new Error('expected the live reader renderer');
    let detail: NativeRelocateDetail | null = null;
    renderer.addEventListener('relocate', (event) => {
      const candidate = (event as CustomEvent<NativeRelocateDetail>).detail;
      if (typeof candidate?.index === 'number' && typeof candidate.range?.getClientRects === 'function') detail = candidate;
    });
    (window as C7Window).__BR1_C7_RELOCATE__ = {
      dispatch: (reason) => {
        if (!detail) throw new Error('expected a native renderer relocate detail');
        renderer.dispatchEvent(new CustomEvent('relocate', { detail: { ...detail, reason } }));
      }
    };
  });
};

const dispatchCapturedNativeRelocate = async (
  page: import('@playwright/test').Page,
  reason: 'anchor' | 'scroll'
) => {
  await page.evaluate((relocateReason) => {
    type C7Window = Window & { __BR1_C7_RELOCATE__?: { dispatch: (reason: 'anchor' | 'scroll') => void } };
    const relocate = (window as C7Window).__BR1_C7_RELOCATE__;
    if (!relocate) throw new Error('expected a captured renderer relocate detail');
    relocate.dispatch(relocateReason);
  }, reason);
};

test('opens href-less Duokan and Zhangyue markers by their first available plaintext metadata', async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __BR1_FOOTNOTE_ALT_XSS__?: number }).__BR1_FOOTNOTE_ALT_XSS__ = 0;
  });
  const frame = await openEpub(
    page,
    'vendor-markers',
    `<p><a id="vendor-wr" class="duokan-footnote" data-wr-footernote="WR exact plaintext" zy-footnote="ZY ignored"><img alt="child ignored"/>*</a></p>
     <p><span id="vendor-zy" class="zhangyue-footnote" zy-footnote="ZY exact plaintext"><img alt="child ignored"/>*</span></p>
     <p><a id="vendor-child" class="duokan-footnote"><sup id="vendor-child-sup"><img alt="Child exact plaintext"/>*</sup></a></p>
     <p><span id="vendor-marker" class="zhangyue-footnote" alt="Marker exact plaintext">*</span></p>
     <p><a id="vendor-malicious" class="duokan-footnote"><img alt="&lt;img id=&apos;injected-alt&apos; src=&apos;x&apos; onerror=&apos;window.parent.__BR1_FOOTNOTE_ALT_XSS__=1&apos;&gt;"/>*</a></p>
     <p><a id="unrecognized-marker"><img alt="unrecognized marker image"/>*</a></p>
     <p><img id="ordinary-image" alt="ordinary image" src="missing-image.png"/></p>`
  );
  const dialog = page.getByRole('dialog', { name: '脚注预览' });

  for (const [id, label] of [
    ['vendor-wr', 'WR exact plaintext'],
    ['vendor-zy', 'ZY exact plaintext'],
    ['vendor-child', 'Child exact plaintext'],
    ['vendor-marker', 'Marker exact plaintext']
  ]) {
    await frame.locator(id === 'vendor-child' ? '#vendor-child-sup' : `#${id}`).click();
    await expect(dialog.locator('.footnote-body')).toHaveText(label);
    await closeFootnote(page);
  }

  await frame.locator('#vendor-malicious').click();
  await expect(dialog.locator('.footnote-body')).toHaveText(
    "<img id='injected-alt' src='x' onerror='window.parent.__BR1_FOOTNOTE_ALT_XSS__=1'>"
  );
  await expect(dialog.locator('#injected-alt')).toHaveCount(0);
  await expect.poll(() =>
    page.evaluate(() => (window as Window & { __BR1_FOOTNOTE_ALT_XSS__?: number }).__BR1_FOOTNOTE_ALT_XSS__ ?? 0)
  ).toBe(0);
  await closeFootnote(page);

  await frame.locator('#unrecognized-marker').click();
  await expect(dialog).toHaveCount(0);
  await frame.locator('#ordinary-image').click({ force: true });
  await expect(dialog).toHaveCount(0);
});

test('keeps explicit noterefs and only validated short markers as previews', async ({ page }) => {
  const frame = await openEpub(
    page,
    'validated-markers',
    `${isolateNumericContext(`<p><a id="explicit-note" href="#explicit-target" epub:type="noteref">[1]</a></p><aside id="explicit-target">Explicit noteref preview</aside>`)}
     ${isolateNumericContext(`<p><a id="aside-marker" href="#aside-target">1</a></p><aside id="aside-target"><span>One</span><span>Two</span><span>Three</span><span>Small aside preview</span></aside>`)}
     ${isolateNumericContext(`<p><a id="li-marker" href="#li-target">a1</a></p><ol><li id="li-target"><span>One</span><span>Two</span><span>Three</span><span>Small list item preview</span></li></ol>`)}
     ${isolateNumericContext(`<p><a id="dt-marker" href="#dt-target">[1</a></p><dl><dt id="dt-target"><span>One</span><span>Two</span><span>Three</span><span>Definition preview</span></dt></dl>`)}
     ${isolateNumericContext(`<p><a id="ancestor-li-marker" href="#ancestor-li-target">1</a></p><ol><li><span id="ancestor-li-target">Ancestor list item preview</span><span>Two</span><span>Three</span><span>Four</span></li></ol>`)}
     ${isolateNumericContext(`<p><a id="note-marker" href="#class-target">a1</a></p><div id="class-target" class="note"><span>One</span><span>Two</span><span>Three</span><span>Note class preview</span></div>`)}
     ${isolateNumericContext(`<p><a id="paragraph-marker" href="#paragraph-target">[1</a></p><p id="paragraph-target"><span><a href="#paragraph-marker">back</a> Link-bearing paragraph preview</span></p> Trailing generic preview text <p><a href="#paragraph-boundary">next linked block</a></p>`)}
     ${isolateNumericContext(`<p><a id="paragraph-end-marker" href="#paragraph-end-target">a1</a></p><p id="paragraph-end-target"><span><a href="#paragraph-end-marker">back</a> Terminal generic preview</span></p> Trailing terminal generic text`)}`
  );
  const dialog = page.getByRole('dialog', { name: '脚注预览' });

  for (const [id, preview] of [
    ['explicit-note', 'Explicit noteref preview'],
    ['aside-marker', 'Small aside preview'],
    ['li-marker', 'Small list item preview'],
    ['dt-marker', 'Definition preview'],
    ['ancestor-li-marker', 'Ancestor list item preview'],
    ['note-marker', 'Note class preview']
  ]) {
    await frame.locator(`#${id}`).click();
    await expect(dialog).toContainText(preview);
    await closeFootnote(page);
  }

  await frame.locator('#paragraph-marker').click();
  await expect(dialog).toContainText('Link-bearing paragraph preview');
  await expect(dialog).toContainText('Trailing generic preview text');
  await closeFootnote(page);

  await frame.locator('#paragraph-end-marker').click();
  await expect(dialog).toContainText('Terminal generic preview');
  await expect(dialog).toContainText('Trailing terminal generic text');
  await closeFootnote(page);
});

test('leaves unvalidated short markers on ordinary navigation without an empty popup', async ({ page }) => {
  const filler = Array.from({ length: 80 }, (_, index) => `<p>ordinary navigation filler ${index}</p>`).join('');
  const frame = await openEpub(
    page,
    'rejected-markers',
    `<p><a id="plain-marker" href="#plain-target">1</a></p>${filler}
     <p id="plain-target">Plain paragraph without backlink</p>
     <p><a id="crowded-marker" href="#crowded-target">a1</a></p>${filler}
     <div id="crowded-target"><a href="#one">1</a><a href="#two">2</a><a href="#three">3</a><a href="#four">4</a> Too many child links</div>
     ${isolateNumericContext('<p><a id="missing-marker" href="#missing-target">1</a></p>')}`
  );
  const dialog = page.getByRole('dialog', { name: '脚注预览' });

  const plainTarget = frame.locator('#plain-target');
  const crowdedTarget = frame.locator('#crowded-target');
  await expect(plainTarget).not.toBeInViewport();
  await frame.locator('#plain-marker').click();
  await expect(plainTarget).toBeInViewport();
  await expect(dialog).toHaveCount(0);

  await frame.locator('#crowded-marker').click();
  await expect(crowdedTarget).toBeInViewport();
  await expect(dialog).toHaveCount(0);

  await page.evaluate(() => {
    type FootnoteFallbackWindow = Window & { __BR1_FOOTNOTE_FALLBACKS__?: string[] };
    const view = document.querySelector('foliate-view') as (HTMLElement & {
      goTo?: (target: unknown) => Promise<unknown>;
    }) | null;
    if (!view?.goTo) throw new Error('expected the live reader goTo API');
    const goTo = view.goTo.bind(view);
    const targets: string[] = [];
    view.goTo = async (target) => {
      targets.push(String(target));
      return goTo(target);
    };
    (window as FootnoteFallbackWindow).__BR1_FOOTNOTE_FALLBACKS__ = targets;
  });
  await frame.locator('#missing-marker').click();
  await expect.poll(() =>
    page.evaluate(() =>
      (window as Window & { __BR1_FOOTNOTE_FALLBACKS__?: string[] }).__BR1_FOOTNOTE_FALLBACKS__ ?? []
    )
  ).toContainEqual(expect.stringMatching(/#missing-target$/));
  await expect(dialog).toHaveCount(0);
});

test('rejects chapter-like numeric link lists but keeps small sets and explicit noterefs', async ({ page }) => {
  const filler = Array.from({ length: 80 }, (_, index) => `<p>numeric navigation filler ${index}</p>`).join('');
  const frame = await openEpub(
    page,
    'numeric-lists',
    `<ol id="chapter-list"><li><a id="chapter-one" href="#chapter-target-one">1</a></li><li><a href="#chapter-target-two">2</a></li><li><a href="#chapter-target-three">3</a></li><li><a href="#chapter-target-four">4</a></li></ol>${filler}
     <aside id="chapter-target-one">Chapter navigation target</aside><aside id="chapter-target-two">Two</aside><aside id="chapter-target-three">Three</aside><aside id="chapter-target-four">Four</aside>
     <div><div><div><p><a id="two-marker-one" href="#two-target-one">1</a> <a id="two-marker-two" href="#two-target-two">2</a></p></div></div></div>
     <aside id="two-target-one">First of two marker previews</aside><aside id="two-target-two">Second of two marker previews</aside>
     <ol><li><a id="explicit-in-list" href="#explicit-list-target" epub:type="noteref">3</a></li><li><a href="#other-one">4</a></li><li><a href="#other-two">5</a></li><li><a href="#other-three">6</a></li></ol>
     <div id="explicit-list-target"><span>One</span><span>Two</span><span>Three</span><span>Explicit list preview</span></div><aside id="other-one">Other one</aside><aside id="other-two">Other two</aside><aside id="other-three">Other three</aside>`
  );
  const dialog = page.getByRole('dialog', { name: '脚注预览' });

  const chapterTarget = frame.locator('#chapter-target-one');
  await expect(chapterTarget).not.toBeInViewport();
  await frame.locator('#chapter-one').click();
  await expect(chapterTarget).toBeInViewport();
  await expect(dialog).toHaveCount(0);

  for (const [id, preview] of [
    ['two-marker-one', 'First of two marker previews'],
    ['two-marker-two', 'Second of two marker previews'],
    ['explicit-in-list', 'Explicit list preview']
  ]) {
    await frame.locator(`#${id}`).click();
    await expect(dialog).toContainText(preview);
    await closeFootnote(page);
  }
});

test('extracts a cross-chapter noteref from its resolved destination instead of a colliding current ID', async ({ page }) => {
  const frame = await openEpub(
    page,
    'cross-chapter',
    `<p><a id="cross-note" href="chapter-two.xhtml#shared-target" epub:type="noteref">[1]</a></p>
     <aside id="shared-target">Current chapter collision</aside>`,
    [
      {
        id: 'chapter-two',
        href: 'chapter-two.xhtml',
        body: '<aside id="shared-target">Cross chapter destination preview</aside>'
      }
    ]
  );
  const dialog = page.getByRole('dialog', { name: '脚注预览' });

  await frame.locator('#cross-note').click();
  await expect(dialog).toContainText('Cross chapter destination preview');
  await expect(dialog).not.toContainText('Current chapter collision');
});

test('does not let delayed footnote extraction survive a newer click or control navigation', async ({ page }) => {
  const preloadBlocker = Array.from(
    { length: 80 },
    (_, index) => `<p>Preload blocker paragraph ${index}</p>`
  ).join('');
  const frame = await openEpub(
    page,
    'cross-chapter-stale',
    `<p><a id="delayed-cross-note" href="chapter-two.xhtml#shared-target" epub:type="noteref">[1]</a></p>
     <p><a id="delayed-numeric-note" href="chapter-two.xhtml#numeric-target">1</a></p>
     <p><a id="fresh-local-note" href="#fresh-local-target" epub:type="noteref">[2]</a></p>
     <aside id="fresh-local-target">Fresh local preview</aside>
     <aside id="shared-target">Current chapter collision</aside>${preloadBlocker}`,
    [
      {
        id: 'middle-one',
        href: 'middle-one.xhtml',
        body: `<p>Middle section one</p>${preloadBlocker}`
      },
      {
        id: 'middle-two',
        href: 'middle-two.xhtml',
        body: '<p>Middle section two</p>'
      },
      {
        id: 'middle-three',
        href: 'middle-three.xhtml',
        body: '<p>Middle section three</p>'
      },
      {
        id: 'middle-four',
        href: 'middle-four.xhtml',
        body: '<p>Middle section four</p>'
      },
      {
        id: 'middle-five',
        href: 'middle-five.xhtml',
        body: '<p>Middle section five</p>'
      },
      {
        id: 'chapter-two',
        href: 'chapter-two.xhtml',
        body: '<aside id="shared-target">Delayed cross chapter preview</aside><div id="numeric-target">Delayed numeric fallback target</div>'
      }
    ]
  );
  await page.evaluate(() => {
    type Section = { createDocument?: () => Promise<Document> };
    type Renderer = { getContents?: () => Array<{ index?: number }> };
    type PendingSectionState = { entered: boolean; completed: boolean; release: (() => void) | null };
    type FootnoteTestWindow = Window & {
      __BR1_FOOTNOTE_SECTION__?: {
        release: (index: number) => void;
        status: (index: number) => 'waiting' | 'entered' | 'completed';
        releaseNext: () => void;
        nextStatus: () => 'waiting' | 'entered' | 'completed';
        goToTargets: () => string[];
      };
    };
    const view = document.querySelector('foliate-view') as (HTMLElement & {
      book?: { sections?: Section[] };
      renderer?: Renderer;
      next?: () => Promise<unknown>;
      goTo?: (target: unknown) => Promise<unknown>;
    }) | null;
    const sections = view?.book?.sections ?? [];
    const destinationIndex = sections.length - 1;
    if (destinationIndex !== 6) throw new Error('expected the seventh EPUB section as the delayed destination');
    if (view?.renderer?.getContents?.().some(({ index }) => index === destinationIndex)) {
      throw new Error('expected the non-adjacent destination section to be unloaded');
    }
    const section = sections[destinationIndex];
    if (!section?.createDocument) throw new Error('expected the destination EPUB section');
    if (!view?.next || !view.goTo) throw new Error('expected the live reader navigation API');
    const createDocument = section.createDocument.bind(section);
    const originalNext = view.next.bind(view);
    const originalGoTo = view.goTo.bind(view);
    const states: PendingSectionState[] = [
      { entered: false, completed: false, release: null },
      { entered: false, completed: false, release: null },
      { entered: false, completed: false, release: null }
    ];
    let calls = 0;
    section.createDocument = async () => {
      const state = states[calls++];
      if (!state) return createDocument();
      state.entered = true;
      await new Promise<void>((resolve) => {
        state.release = resolve;
      });
      const document = await createDocument();
      state.completed = true;
      return document;
    };
    let nextEntered = false;
    let nextCompleted = false;
    let releaseNext: (() => void) | null = null;
    const pendingNext = new Promise<void>((resolve) => {
      releaseNext = resolve;
    });
    view.next = async () => {
      nextEntered = true;
      await pendingNext;
      const result = await originalNext();
      nextCompleted = true;
      return result;
    };
    const goToTargets: string[] = [];
    view.goTo = async (target) => {
      goToTargets.push(String(target));
      return originalGoTo(target);
    };
    (window as FootnoteTestWindow).__BR1_FOOTNOTE_SECTION__ = {
      release: (index) => states[index]?.release?.(),
      status: (index) => {
        const state = states[index];
        return state?.completed ? 'completed' : state?.entered ? 'entered' : 'waiting';
      },
      releaseNext: () => releaseNext?.(),
      nextStatus: () => (nextCompleted ? 'completed' : nextEntered ? 'entered' : 'waiting'),
      goToTargets: () => [...goToTargets]
    };
  });
  const dialog = page.getByRole('dialog', { name: '脚注预览' });
  const sectionStatus = (index: number) =>
    page.evaluate(
      (stateIndex) =>
        (window as Window & {
          __BR1_FOOTNOTE_SECTION__?: { status: (index: number) => 'waiting' | 'entered' | 'completed' };
        }).__BR1_FOOTNOTE_SECTION__?.status(stateIndex),
      index
    );
  const releaseSection = (index: number) =>
    page.evaluate(
      (stateIndex) =>
        (window as Window & { __BR1_FOOTNOTE_SECTION__?: { release: (index: number) => void } })
          .__BR1_FOOTNOTE_SECTION__?.release(stateIndex),
      index
    );
  const nextStatus = () =>
    page.evaluate(() =>
      (window as Window & {
        __BR1_FOOTNOTE_SECTION__?: { nextStatus: () => 'waiting' | 'entered' | 'completed' };
      }).__BR1_FOOTNOTE_SECTION__?.nextStatus()
    );
  const releaseNext = () =>
    page.evaluate(() =>
      (window as Window & { __BR1_FOOTNOTE_SECTION__?: { releaseNext: () => void } })
        .__BR1_FOOTNOTE_SECTION__?.releaseNext()
    );
  const goToTargets = () =>
    page.evaluate(() =>
      (window as Window & { __BR1_FOOTNOTE_SECTION__?: { goToTargets: () => string[] } })
        .__BR1_FOOTNOTE_SECTION__?.goToTargets() ?? []
    );

  await frame.locator('#delayed-cross-note').click();
  await expect.poll(() => sectionStatus(0)).toBe('entered');
  await expect(dialog).toHaveCount(0);
  await frame.locator('#fresh-local-note').click();
  await expect(dialog).toContainText('Fresh local preview');
  await releaseSection(0);
  await expect.poll(() => sectionStatus(0)).toBe('completed');
  await expect(dialog).toContainText('Fresh local preview');
  await expect(dialog).not.toContainText('Delayed cross chapter preview');
  await closeFootnote(page);

  await frame.locator('#delayed-cross-note').click();
  await expect.poll(() => sectionStatus(1)).toBe('entered');
  await frame.locator('#fresh-local-note').click();
  await expect(dialog).toContainText('Fresh local preview');
  await closeFootnote(page);
  await releaseSection(1);
  await expect.poll(() => sectionStatus(1)).toBe('completed');
  await expect(dialog).toHaveCount(0);

  await frame.locator('#delayed-numeric-note').click();
  await expect.poll(() => sectionStatus(2)).toBe('entered');
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: '下一页', exact: true }).first().click();
  await expect.poll(nextStatus).toBe('entered');
  await releaseSection(2);
  await expect.poll(() => sectionStatus(2)).toBe('completed');
  await expect(dialog).toHaveCount(0);
  await expect.poll(goToTargets).toEqual([]);
  await releaseNext();
  await expect.poll(nextStatus).toBe('completed');
});

test('keeps same- and cross-chapter explicit footnote previews independent from authored backgrounds and layout', async ({ page }) => {
  const image = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  const hostileNote = (id: string, imageId = '') =>
    `<aside id="${id}" epub:type="footnote" class="hostile-footnote" style="background-image: url('${image}'); width: 1200px; height: 900px; border: 37px solid rgb(255, 0, 0)"><p class="hostile-copy" style="display: block; width: 1100px">C4 native <em class="hostile-emphasis" style="font-size: 96px">emphasis</em><img${imageId ? ` id="${imageId}"` : ''} class="hostile-image" style="width: 800px; height: 700px" src="${image}" alt="" /></p></aside>`;
  const plainNote = (id: string) =>
    `<aside id="${id}" epub:type="footnote"><p>C4 native <em>emphasis</em></p></aside>`;

  for (const [viewportName, viewport] of [
    ['desktop', { width: 1280, height: 720 }],
    ['narrow', { width: 640, height: 720 }]
  ] as const) {
    await page.setViewportSize(viewport);
    const frame = await openEpub(
      page,
      `c4-authored-layout-${viewportName}`,
      `<p><a id="styled-note-ref" href="#styled-note" epub:type="noteref">[1]</a></p>
       <p><a id="plain-note-ref" href="#plain-note" epub:type="noteref">[1]</a></p>
       <p><a id="cross-styled-note-ref" href="notes.xhtml#cross-styled-note" epub:type="noteref">[1]</a></p>
       <p><a id="cross-plain-note-ref" href="notes.xhtml#cross-plain-note" epub:type="noteref">[1]</a></p>
       ${hostileNote('styled-note', 'styled-note-image')}
       ${plainNote('plain-note')}`,
      [
        {
          id: 'notes',
          href: 'notes.xhtml',
          body: `${hostileNote('cross-styled-note')}${plainNote('cross-plain-note')}`
        }
      ]
    );
    const dialog = page.getByRole('dialog', { name: '脚注预览' });
    const styledTarget = frame.locator('#styled-note');
    await expect.poll(() =>
      frame.locator('#styled-note-image').evaluate((element) => (element as HTMLImageElement).naturalWidth)
    ).toBe(1);
    const sourceBefore = await styledTarget.evaluate((target) => ({
      html: target.outerHTML,
      className: target.getAttribute('class'),
      style: target.getAttribute('style'),
      imageCount: target.querySelectorAll('img').length,
      backgroundImage: target.ownerDocument.defaultView?.getComputedStyle(target).backgroundImage,
      width: target.ownerDocument.defaultView?.getComputedStyle(target).width,
      height: target.ownerDocument.defaultView?.getComputedStyle(target).height,
      borderTopWidth: target.ownerDocument.defaultView?.getComputedStyle(target).borderTopWidth
    }));

    expect(sourceBefore.className).toBe('hostile-footnote');
    expect(sourceBefore.style).toContain('background-image');
    expect(sourceBefore.imageCount).toBe(1);
    expect(sourceBefore.backgroundImage).not.toBe('none');
    expect(sourceBefore.width).toBe('1200px');
    expect(sourceBefore.height).toBe('900px');
    expect(sourceBefore.borderTopWidth).toBe('37px');

    const openPreview = async (referenceId: string) => {
      await frame.locator(`#${referenceId}`).click();
      await expect(dialog).toBeVisible();
      const body = dialog.locator('.footnote-body');
      await expect(body).toHaveText('C4 native emphasis');
      await expect(body.locator('em')).toHaveText('emphasis');
      await expect(body.locator('img')).toHaveCount(0);
      const preview = await body.evaluate((element) => ({
        html: element.innerHTML,
        attributes: Array.from(element.querySelectorAll('*')).flatMap((node) => node.getAttributeNames()),
        backgroundImage: getComputedStyle(element).backgroundImage
      }));
      const box = await dialog.boundingBox();
      if (!box) throw new Error('expected the native footnote popup geometry');
      const stage = await dialog.evaluate((element) => {
        const stage = element.closest('.reader-stage');
        if (!stage) throw new Error('expected the native footnote popup stage');
        const { x, y, width, height } = stage.getBoundingClientRect();
        return { x, y, width, height };
      });
      expect(preview.attributes).toEqual([]);
      expect(preview.backgroundImage).toBe('none');
      // The reader page itself can scroll; C4 bounds the excerpt to its stage,
      // not the whole reader chrome to a short browser viewport.
      expect(box.width).toBeLessThanOrEqual(stage.width);
      expect(box.height).toBeLessThanOrEqual(300);
      expect(box.height).toBeLessThanOrEqual(stage.height);
      expect(box.x).toBeGreaterThanOrEqual(stage.x - 1);
      expect(box.y).toBeGreaterThanOrEqual(stage.y - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(stage.x + stage.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(stage.y + stage.height + 1);
      await closeFootnote(page);
      return { preview, box };
    };
    const sameChapterStyled = await openPreview('styled-note-ref');
    expect(await styledTarget.evaluate((target) => target.outerHTML)).toBe(sourceBefore.html);
    const sameChapterPlain = await openPreview('plain-note-ref');
    const crossChapterStyled = await openPreview('cross-styled-note-ref');
    const crossChapterPlain = await openPreview('cross-plain-note-ref');

    for (const [styled, plain] of [
      [sameChapterStyled, sameChapterPlain],
      [crossChapterStyled, crossChapterPlain]
    ]) {
      expect(plain.preview.html).toBe(styled.preview.html);
      expect(Math.abs(plain.box.width - styled.box.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(plain.box.height - styled.box.height)).toBeLessThanOrEqual(1);
    }
    expect(crossChapterStyled.preview.html).toBe(sameChapterStyled.preview.html);
  }
});

test('keeps long plaintext and rich footnotes readable in the native scrollable popup', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const vendorAlt = Array.from(
    { length: 44 },
    (_, index) => `Vendor plaintext segment ${index + 1}.`
  ).concat('Vendor plaintext last words remain readable.').join(' ');
  const richParagraphs = Array.from(
    { length: 24 },
    (_, index) => `<p>Rich note body paragraph ${index + 1} stays readable.</p>`
  ).join('');
  const frame = await openEpub(
    page,
    'long-scrollable-notes',
    `<p><a id="long-vendor-note" class="duokan-footnote"><img alt="${vendorAlt}"/>*</a></p>
     <p><a id="rich-note-ref" href="#rich-note" epub:type="noteref">[1]</a></p>
     <aside id="rich-note" epub:type="footnote"><p>Rich note opening <em>emphasis</em>.</p>${richParagraphs}<p>Rich note last words remain readable.</p></aside>`
  );
  const dialog = page.getByRole('dialog', { name: '脚注预览' });
  const body = dialog.locator('.footnote-body');

  await frame.locator('#long-vendor-note').click();
  await expect(body).toHaveText(vendorAlt);
  const vendorMetrics = await body.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
      maxHeight: Number.parseFloat(style.maxHeight),
      overflowY: style.overflowY
    };
  });
  expect(vendorMetrics.clientHeight).toBeGreaterThan(88);
  expect(vendorMetrics.maxHeight).toBeGreaterThan(88);
  expect(vendorMetrics.scrollHeight).toBeGreaterThan(vendorMetrics.clientHeight);
  expect(vendorMetrics.scrollTop).toBe(0);
  expect(vendorMetrics.overflowY).toMatch(/auto|scroll/);
  await body.hover();
  await page.mouse.wheel(0, 1000);
  await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect.poll(() =>
    body.evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop)
  ).toBeLessThanOrEqual(1);
  await expect(body.getByText('Vendor plaintext last words remain readable.', { exact: false })).toBeInViewport();

  // A new reference replaces an already-open preview; it does not require an
  // intervening close or let the prior plaintext request keep ownership.
  await frame.locator('#rich-note-ref').click();
  await expect(body.locator('em')).toHaveText('emphasis');
  await expect(body).toContainText('Rich note last words remain readable.');
  const metrics = await body.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
      maxHeight: Number.parseFloat(style.maxHeight),
      overflowY: style.overflowY
    };
  });
  expect(metrics.clientHeight).toBeGreaterThan(88);
  expect(metrics.maxHeight).toBeGreaterThan(88);
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  expect(metrics.scrollTop).toBe(0);
  expect(metrics.overflowY).toMatch(/auto|scroll/);

  await body.hover();
  await page.mouse.wheel(0, 1000);
  await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect.poll(() =>
    body.evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop)
  ).toBeLessThanOrEqual(1);
  await expect(body.getByText('Rich note last words remain readable.')).toBeInViewport();
  await closeFootnote(page);

  await frame.locator('#long-vendor-note').click();
  await expect(body).toHaveText(vendorAlt);
  await closeFootnote(page);
});

test('offers an explicit empty image note a jump fallback while a checked numeric link navigates', async ({ page }) => {
  const image = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  const filler = Array.from({ length: 80 }, (_, index) => `<p>Image target filler ${index}</p>`).join('');
  const frame = await openEpub(
    page,
    'empty-image-noteref',
    `<p><a id="empty-image-ref" href="#image-destination" epub:type="noteref">[1]</a></p>${filler}
     <aside id="image-destination" epub:type="footnote"><style id="source-note-style">.STYLE_TEXT_MUST_NOT_LEAK { color: red; }</style><script id="trusted-book-script">window.__BR1_UNTRUSTED_BOOK_SCRIPT__ = true;</script><p><span><img id="empty-image" src="${image}"/></span></p></aside>`
  );
  const dialog = page.getByRole('dialog', { name: '脚注预览' });
  const sourceTarget = frame.locator('#image-destination');
  const imageTarget = frame.locator('#empty-image');

  await expect(frame.locator('#source-note-style')).toHaveCount(1);
  await expect(frame.locator('#trusted-book-script')).toHaveCount(0);
  await expect(imageTarget).not.toHaveAttribute('alt');
  await expect.poll(() => imageTarget.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(1);
  await expect(imageTarget).not.toBeInViewport();
  const sourceBefore = await sourceTarget.evaluate((element) => element.outerHTML);

  await frame.locator('#empty-image-ref').click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.footnote-body')).toHaveCount(0);
  await expect(dialog).toContainText('无法预览，可跳转到正文位置');
  await expect(dialog).not.toContainText('STYLE_TEXT_MUST_NOT_LEAK');
  expect(await sourceTarget.evaluate((element) => element.outerHTML)).toBe(sourceBefore);
  await dialog.getByRole('button', { name: '跳转到正文位置' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(imageTarget).toBeInViewport();

  const numericFrame = await openEpub(
    page,
    'empty-image-numeric',
    `${isolateNumericContext('<p><a id="empty-image-numeric-ref" href="#numeric-destination">1</a></p>')}${filler}
     <aside id="numeric-destination"><p><span><img id="numeric-empty-image" src="${image}"/></span></p></aside>`
  );
  const numericImageTarget = numericFrame.locator('#numeric-empty-image');
  await expect(numericImageTarget).not.toBeInViewport();
  await numericFrame.locator('#empty-image-numeric-ref').click();
  await expect(numericImageTarget).toBeInViewport();
  await expect(dialog).toHaveCount(0);
});

test('flashes a temporary cue after ordinary, rejected numeric, and empty-preview fallback navigation without touching annotations or EPUB DOM', async ({ page }) => {
  const image = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  const filler = Array.from({ length: 80 }, (_, index) => `<p>C6 filler ${index}</p>`).join('');
  const frame = await openEpub(
    page,
    'c6-local-navigation',
    `<p><a id="story-link" href="#story-target">Read the destination</a></p>
     <p><a id="digit-link" href="#digit-target">1</a></p>
     <p><a id="picture-link" href="#image-target" epub:type="noteref">[2]</a></p>
     ${filler}<p id="story-target">Ordinary descriptive destination</p>
     ${filler}<p id="digit-target">Rejected numeric plain paragraph destination</p>
     ${filler}<aside id="image-target" epub:type="footnote"><p><img id="image-target-content" src="${image}" style="width: 64px; height: 64px"/></p></aside>`
  );
  const dialog = page.getByRole('dialog', { name: '脚注预览' });
  const cue = page.locator('[data-reader-jump-cue]');

  await page.evaluate(() => {
    type C6AnnotationWindow = Window & { __BR1_C6_ANNOTATION_EVENTS__?: string[] };
    const view = document.querySelector('foliate-view');
    if (!view) throw new Error('expected the live reader view');
    const events: string[] = [];
    for (const type of ['draw-annotation', 'show-annotation']) {
      view.addEventListener(type, () => events.push(type));
    }
    (window as C6AnnotationWindow).__BR1_C6_ANNOTATION_EVENTS__ = events;
  });
  await frame.locator('body').evaluate((body) => {
    type C6MutationWindow = Window & {
      __BR1_C6_NATIVE_MUTATIONS__?: { observer: MutationObserver; records: string[]; baseline: string | null };
    };
    const records: string[] = [];
    const observer = new MutationObserver((mutations) => {
      records.push(...mutations.map((mutation) => mutation.type));
    });
    observer.observe(body, { attributes: true, childList: true, characterData: true, subtree: true });
    (body.ownerDocument.defaultView as C6MutationWindow).__BR1_C6_NATIVE_MUTATIONS__ = {
      observer,
      records,
      baseline: null
    };
  });
  await page.evaluate(() => {
    type Content = { index?: number; doc?: Document };
    type C6MutationWindow = Window & {
      __BR1_C6_NATIVE_MUTATIONS__?: { observer: MutationObserver; records: string[]; baseline: string | null };
    };
    type C6NavigationWindow = Window & { __BR1_C6_LOCAL_GOTO__?: { calls: () => string[] } };
    const view = document.querySelector('foliate-view') as (HTMLElement & {
      goTo?: (target: unknown) => Promise<unknown>;
      renderer?: { getContents?: () => Content[] };
    }) | null;
    if (!view?.goTo) throw new Error('expected the live reader goTo API');
    const originalGoTo = view.goTo.bind(view);
    const calls: string[] = [];
    view.goTo = async (target) => {
      const resolved = await originalGoTo(target);
      calls.push(String(target));
      const index =
        typeof resolved === 'object' && resolved && 'index' in resolved
          ? (resolved as { index?: unknown }).index
          : undefined;
      const body =
        typeof index === 'number'
          ? view.renderer?.getContents?.().find((content) => content.index === index)?.doc?.body
          : null;
      const state = body
        ? (body.ownerDocument.defaultView as C6MutationWindow).__BR1_C6_NATIVE_MUTATIONS__
        : null;
      if (state) {
        state.records.length = 0;
        state.observer.takeRecords();
        state.baseline = body!.outerHTML;
      }
      return resolved;
    };
    (window as C6NavigationWindow).__BR1_C6_LOCAL_GOTO__ = { calls: () => [...calls] };
  });
  const expectSourceMatchesNavigationBaseline = async () => {
    const state = await frame.locator('body').evaluate((body) => {
      type C6MutationWindow = Window & {
        __BR1_C6_NATIVE_MUTATIONS__?: { observer: MutationObserver; records: string[]; baseline: string | null };
      };
      const state = (body.ownerDocument.defaultView as C6MutationWindow).__BR1_C6_NATIVE_MUTATIONS__;
      if (!state) return null;
      state.records.push(...state.observer.takeRecords().map((mutation) => mutation.type));
      return { baseline: state.baseline, current: body.outerHTML, records: state.records };
    });
    expect(state).not.toBeNull();
    expect(state?.baseline).not.toBeNull();
    expect(state?.current).toBe(state?.baseline);
    expect(state?.records).toEqual([]);
  };
  const goToCalls = () =>
    page.evaluate(() =>
      (window as Window & { __BR1_C6_LOCAL_GOTO__?: { calls: () => string[] } }).__BR1_C6_LOCAL_GOTO__?.calls() ?? []
    );

  const storyTarget = frame.locator('#story-target');
  await expect(storyTarget).not.toBeInViewport();
  await frame.locator('#story-link').click();
  await expectJumpCueAt(page, storyTarget);
  expect(await goToCalls()).toHaveLength(1);
  await expectSourceMatchesNavigationBaseline();
  await expectJumpCueToExpire(page);
  await expectSourceMatchesNavigationBaseline();

  const digitTarget = frame.locator('#digit-target');
  await expect(digitTarget).not.toBeInViewport();
  await frame.locator('#digit-link').click();
  await expect(dialog).toHaveCount(0);
  await expectJumpCueAt(page, digitTarget);
  expect(await goToCalls()).toHaveLength(2);
  await expectSourceMatchesNavigationBaseline();

  const imageTarget = frame.locator('#image-target');
  await expect.poll(() =>
    frame.locator('#image-target-content').evaluate((element) => (element as HTMLImageElement).naturalWidth)
  ).toBe(1);
  await expect(imageTarget).not.toBeInViewport();
  await frame.locator('#picture-link').click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.footnote-body')).toHaveCount(0);
  await expect(cue).toHaveCount(0);
  await dialog.getByRole('button', { name: '跳转到正文位置' }).click();
  await expect(dialog).toHaveCount(0);
  await expectJumpCueAt(page, frame.locator('#image-target-content'));
  expect(await goToCalls()).toHaveLength(3);
  await expectSourceMatchesNavigationBaseline();
  await expectJumpCueToExpire(page);
  await expectSourceMatchesNavigationBaseline();

  expect(await page.evaluate(() => (window as Window & { __BR1_C6_ANNOTATION_EVENTS__?: string[] }).__BR1_C6_ANNOTATION_EVENTS__)).toEqual([]);
});

test('places a cross-chapter duplicate-ID cue in the loaded destination section', async ({ page }) => {
  const filler = Array.from({ length: 80 }, (_, index) => `<p>Cross C6 filler ${index}</p>`).join('');
  const frame = await openEpub(
    page,
    'c6-cross-chapter',
    `<p><a id="cross-link" href="chapter-two.xhtml#shared-target">Open chapter two destination</a></p>${filler}
     <p id="shared-target">Current chapter duplicate destination</p>`,
    [
      {
        id: 'chapter-two',
        href: 'chapter-two.xhtml',
        body: `<p id="shared-target">Cross chapter loaded destination</p>${filler}`
      }
    ]
  );
  await frame.locator('#cross-link').click();

  const findDestinationFrame = async () => {
    for (const candidate of page.frames()) {
      const target = candidate.locator('#shared-target');
      if (
        (await target.count()) === 1 &&
        (await target.textContent())?.trim() === 'Cross chapter loaded destination'
      ) {
        return candidate;
      }
    }
    return null;
  };
  await expect.poll(async () => !!(await findDestinationFrame())).toBe(true);
  const destinationFrame = await findDestinationFrame();
  if (!destinationFrame) throw new Error('expected the cross-chapter destination frame');
  const destination = destinationFrame.locator('#shared-target');
  await expectJumpCueAt(page, destination);
  await expectJumpCueToExpire(page);
  await expect.poll(() =>
    page.evaluate(() => {
      const view = document.querySelector('foliate-view') as (HTMLElement & {
        renderer?: { getContents?: () => Array<{ index?: number; doc?: Document }> };
      }) | null;
      return view?.renderer?.getContents?.().find(({ doc }) =>
        doc?.querySelector('#shared-target')?.textContent?.trim() === 'Cross chapter loaded destination'
      )?.index;
    })
  ).toBe(1);
});

test('does not paint a stale cue when a control navigation supersedes a returned goTo', async ({ page }) => {
  const filler = Array.from({ length: 80 }, (_, index) => `<p>Stale C6 filler ${index}</p>`).join('');
  const frame = await openEpub(
    page,
    'c6-stale-navigation',
    `<p><a id="held-link" href="#held-target">Open held destination</a></p>${filler}
     <p id="held-target">Held native destination</p>`
  );
  const target = frame.locator('#held-target');
  await page.evaluate(() => {
    type C6StaleWindow = Window & {
      __BR1_C6_STALE__?: {
        navigated: () => boolean;
        goToCalls: () => number;
        nextCalls: () => number;
        release: () => void;
        returned: () => boolean;
      };
    };
    const view = document.querySelector('foliate-view') as (HTMLElement & {
      goTo?: (target: unknown) => Promise<unknown>;
      next?: () => Promise<unknown>;
    }) | null;
    if (!view?.goTo || !view.next) throw new Error('expected the live reader navigation API');
    const originalGoTo = view.goTo.bind(view);
    const originalNext = view.next.bind(view);
    let firstReturn = true;
    let didNavigate = false;
    let didReturn = false;
    let goToCalls = 0;
    let nextCalls = 0;
    let release: (() => void) | null = null;
    const heldReturn = new Promise<void>((resolve) => {
      release = resolve;
    });
    view.goTo = async (target) => {
      goToCalls += 1;
      const result = await originalGoTo(target);
      if (firstReturn) {
        firstReturn = false;
        didNavigate = true;
        await heldReturn;
        didReturn = true;
      }
      return result;
    };
    view.next = async () => {
      nextCalls += 1;
      return originalNext();
    };
    (window as C6StaleWindow).__BR1_C6_STALE__ = {
      navigated: () => didNavigate,
      goToCalls: () => goToCalls,
      nextCalls: () => nextCalls,
      release: () => release?.(),
      returned: () => didReturn
    };
  });

  await expect(target).not.toBeInViewport();
  await frame.locator('#held-link').click();
  await expect.poll(() =>
    page.evaluate(() => (window as Window & { __BR1_C6_STALE__?: { navigated: () => boolean } }).__BR1_C6_STALE__?.navigated())
  ).toBe(true);
  await expect(target).toBeInViewport();
  await expect.poll(() =>
    page.evaluate(() => (window as Window & { __BR1_C6_STALE__?: { goToCalls: () => number } }).__BR1_C6_STALE__?.goToCalls())
  ).toBe(1);
  await expect(page.locator('[data-reader-jump-cue]')).toHaveCount(0);

  await page.getByRole('button', { name: '下一页', exact: true }).first().click();
  await expect.poll(() =>
    page.evaluate(() => (window as Window & { __BR1_C6_STALE__?: { nextCalls: () => number } }).__BR1_C6_STALE__?.nextCalls())
  ).toBe(1);
  await page.evaluate(() => (window as Window & { __BR1_C6_STALE__?: { release: () => void } }).__BR1_C6_STALE__?.release());
  await expect.poll(() =>
    page.evaluate(() => (window as Window & { __BR1_C6_STALE__?: { returned: () => boolean } }).__BR1_C6_STALE__?.returned())
  ).toBe(true);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  await expect(page.locator('[data-reader-jump-cue]')).toHaveCount(0);
});

test('applies C7 known-hidden policy while preserving unknown footnote fallbacks', async ({ page }) => {
  const filler = Array.from({ length: 80 }, (_, index) => `<p>C7 target filler ${index}</p>`).join('');
  const frame = await openEpub(
    page,
    'c7-rendered-local-targets',
    `<style>
       .c7-display-none, .c7-hidden-ancestor { display: none; }
       .c7-inherited-hidden { visibility: hidden; }
       .c7-display-contents { display: contents; }
     </style>
     <p><a id="visible-ref" href="#visible-target" epub:type="noteref">[1]</a></p>
     <p><a id="display-none-ref" href="#display-none-target" epub:type="noteref">[2]</a></p>
     <p><a id="hidden-ancestor-ref" href="#hidden-ancestor-target" epub:type="noteref">[3]</a></p>
     <p><a id="inherited-hidden-ref" href="#inherited-hidden-target" epub:type="noteref">[4]</a></p>
     <p><a id="missing-ref" href="#missing-target" epub:type="noteref">[5]</a></p>
     <p><a id="error-ref" href="#error-target" epub:type="noteref">[6]</a></p>
     <p><a id="contents-ref" href="#contents-target" epub:type="noteref">[7]</a></p>
     <p><a id="empty-inline-ref" href="#empty-inline-target" epub:type="noteref">[8]</a></p>
     <p><a id="empty-hidden-ref" href="#empty-hidden-target" epub:type="noteref">[9]</a></p>
     <p><a id="href-less-marker" class="duokan-footnote" data-wr-footernote="Href-less metadata preview">*</a></p>
     ${filler}
     <aside id="visible-target" epub:type="footnote"><p>Visible local preview</p></aside>
     <aside id="display-none-target" class="c7-display-none" epub:type="footnote"><p>Display none preview remains readable</p></aside>
     <section id="hidden-ancestor" class="c7-hidden-ancestor"><aside id="hidden-ancestor-target" epub:type="footnote"><p>Hidden ancestor preview remains readable</p></aside></section>
     <section class="c7-inherited-hidden"><aside id="inherited-hidden-target" epub:type="footnote"><p>Inherited visibility preview remains readable</p></aside></section>
     <aside id="contents-target" class="c7-display-contents" epub:type="footnote"><p id="contents-copy">Display contents preview</p></aside>
     <aside epub:type="footnote"><a id="empty-inline-target"></a><p>Empty inline anchor preview</p></aside>
     <aside id="empty-hidden-target" class="c7-display-none" epub:type="footnote"><p><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt=""/></p></aside>`
  );
  const dialog = page.getByRole('dialog', { name: '脚注预览' });
  const jump = dialog.getByRole('button', { name: '跳转到正文位置' });

  await page.evaluate(() => {
    type C7Window = Window & { __BR1_C7_GOTO__?: { calls: () => string[] } };
    const view = document.querySelector('foliate-view') as (HTMLElement & {
      goTo?: (target: unknown) => Promise<unknown>;
      book?: { resolveHref?: (href: string) => unknown };
    }) | null;
    if (!view?.goTo || !view.book?.resolveHref) throw new Error('expected the live reader footnote APIs');
    const goTo = view.goTo.bind(view);
    const resolveHref = view.book.resolveHref.bind(view.book);
    const calls: string[] = [];
    view.goTo = async (target) => {
      calls.push(String(target));
      return goTo(target);
    };
    view.book.resolveHref = (href) => {
      const resolved = resolveHref(href);
      if (!href.endsWith('#error-target') || !resolved || typeof resolved !== 'object') return resolved;
      return { ...resolved, anchor: () => { throw new Error('C7 expected anchor failure'); } };
    };
    (window as C7Window).__BR1_C7_GOTO__ = { calls: () => [...calls] };
  });
  const goToCalls = () =>
    page.evaluate(() =>
      (window as Window & { __BR1_C7_GOTO__?: { calls: () => string[] } }).__BR1_C7_GOTO__?.calls() ?? []
    );

  const visibleTarget = frame.locator('#visible-target');
  await expect(visibleTarget).not.toBeInViewport();
  await expect.poll(() => visibleTarget.evaluate((element) => getComputedStyle(element).visibility)).toBe('visible');
  await frame.locator('#visible-ref').click();
  await expect(dialog).toContainText('Visible local preview');
  await expect(jump).toBeVisible();
  expect(await goToCalls()).toEqual([]);
  await closeFootnote(page);
  const sourceBefore = await frame.locator('body').evaluate((body) => body.outerHTML);

  for (const [referenceId, targetId, preview, expected, hiddenAncestorId] of [
    ['display-none-ref', 'display-none-target', 'Display none preview remains readable', { display: 'none', hasPositiveRect: false }, ''],
    ['hidden-ancestor-ref', 'hidden-ancestor-target', 'Hidden ancestor preview remains readable', { hasPositiveRect: false }, 'hidden-ancestor'],
    ['inherited-hidden-ref', 'inherited-hidden-target', 'Inherited visibility preview remains readable', { visibility: 'hidden' }, ''],
    ['contents-ref', 'contents-target', 'Display contents preview', { display: 'contents', visibility: 'visible', hasPositiveRect: false }, ''],
    ['empty-inline-ref', 'empty-inline-target', 'Empty inline anchor preview', { visibility: 'visible', hasPositiveRect: false }, '']
  ] as const) {
    await frame.locator(`#${referenceId}`).click();
    await expect(dialog).toContainText(preview);
    const computed = await frame.locator(`#${targetId}`).evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        display: style.display,
        visibility: style.visibility,
        hasPositiveRect: Array.from(element.getClientRects()).some(({ width, height }) => width > 0 && height > 0)
      };
    });
    expect(computed).toMatchObject(expected);
    if (hiddenAncestorId) {
      expect(await frame.locator(`#${hiddenAncestorId}`).evaluate((element) => getComputedStyle(element).display)).toBe('none');
    }
    await expect(jump).toHaveCount(hiddenAncestorId || referenceId === 'display-none-ref' || referenceId === 'inherited-hidden-ref' ? 0 : 1);
    expect(await goToCalls()).toEqual([]);
    await closeFootnote(page);
    if (hiddenAncestorId || referenceId === 'display-none-ref' || referenceId === 'inherited-hidden-ref') {
      expect(await frame.locator('body').evaluate((body) => body.outerHTML)).toBe(sourceBefore);
    }
  }

  // The missing anchor has no resolved node to inspect, so it remains an
  // UNKNOWN target and preserves Foliate's existing jump fallback.
  await frame.locator('#missing-ref').click();
  await expect(dialog).toBeVisible();
  await expect(jump).toBeVisible();
  expect(await goToCalls()).toEqual([]);
  await closeFootnote(page);

  await frame.locator('#error-ref').click();
  await expect(dialog).toBeVisible();
  await expect(jump).toBeVisible();
  expect(await goToCalls()).toEqual([]);
  await closeFootnote(page);

  await frame.locator('#href-less-marker').click();
  await expect(dialog).toContainText('Href-less metadata preview');
  await expect(jump).toHaveCount(0);
  expect(await goToCalls()).toEqual([]);
  await closeFootnote(page);

  await frame.locator('#empty-hidden-ref').click();
  await expect(dialog.locator('.footnote-body')).toHaveCount(0);
  await expect(dialog.locator('.footnote-fallback')).toHaveText('无法预览');
  await expect(jump).toHaveCount(0);
  expect(await goToCalls()).toEqual([]);

  await frame.locator('#visible-ref').click();
  await expect(jump).toBeVisible();
  await jump.click();
  await expect(dialog).toHaveCount(0);
  await expectJumpCueAt(page, visibleTarget);
  expect(await goToCalls()).toHaveLength(1);
});

test('keeps an unloaded cross-chapter footnote target as an unknown jump fallback', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  const filler = Array.from({ length: 80 }, (_, index) => `<p>C7 unloaded filler ${index}</p>`).join('');
  const frame = await openEpub(
    page,
    'c7-unloaded-cross-chapter',
    `<style>.c7-current-collision { display: none; }</style>
     <p><a id="unloaded-ref" href="chapter-two.xhtml#shared-target" epub:type="noteref">[1]</a></p>
     <aside id="shared-target" class="c7-current-collision">Current chapter collision</aside>`,
    [
      { id: 'middle-one', href: 'middle-one.xhtml', body: filler },
      { id: 'middle-two', href: 'middle-two.xhtml', body: filler },
      { id: 'middle-three', href: 'middle-three.xhtml', body: filler },
      { id: 'middle-four', href: 'middle-four.xhtml', body: filler },
      { id: 'middle-five', href: 'middle-five.xhtml', body: filler },
      {
        id: 'chapter-two',
        href: 'chapter-two.xhtml',
        body: `<aside id="shared-target">Unloaded cross chapter destination preview</aside>
               <p><a id="scroll-link" href="#scroll-target">Follow the destination</a></p>
               <p id="scroll-target">Destination scroll cue target</p>`
      }
    ]
  );
  const dialog = page.getByRole('dialog', { name: '脚注预览' });
  const jump = dialog.getByRole('button', { name: '跳转到正文位置' });
  const isDestinationLoaded = () =>
    page.evaluate(() => {
      const view = document.querySelector('foliate-view') as (HTMLElement & {
        renderer?: { getContents?: () => Array<{ index?: number }> };
      }) | null;
      return view?.renderer?.getContents?.().some(({ index }) => index === 6) ?? false;
    });

  await page.evaluate(() => {
    type C7Window = Window & { __BR1_C7_UNLOADED_GOTO__?: { calls: () => string[] } };
    const view = document.querySelector('foliate-view') as (HTMLElement & {
      goTo?: (target: unknown) => Promise<unknown>;
    }) | null;
    if (!view?.goTo) throw new Error('expected the live reader goTo API');
    const goTo = view.goTo.bind(view);
    const calls: string[] = [];
    view.goTo = async (target) => {
      calls.push(String(target));
      return goTo(target);
    };
    (window as C7Window).__BR1_C7_UNLOADED_GOTO__ = { calls: () => [...calls] };
  });
  const goToCalls = () =>
    page.evaluate(() =>
      (window as Window & { __BR1_C7_UNLOADED_GOTO__?: { calls: () => string[] } })
        .__BR1_C7_UNLOADED_GOTO__?.calls() ?? []
    );

  expect(await isDestinationLoaded()).toBe(false);
  expect(await frame.locator('#shared-target').evaluate((element) => getComputedStyle(element).display)).toBe('none');
  await frame.locator('#unloaded-ref').click();
  await expect(dialog).toContainText('Unloaded cross chapter destination preview');
  await expect(dialog).not.toContainText('Current chapter collision');
  await expect(jump).toBeVisible();
  expect(await goToCalls()).toEqual([]);
  expect(await isDestinationLoaded()).toBe(false);
  await captureNativeRelocateDetail(page);
  await jump.click();
  await expect(dialog).toHaveCount(0);
  expect(await goToCalls()).toHaveLength(1);

  const findDestinationFrame = async () => {
    for (const candidate of page.frames()) {
      const destination = candidate.locator('#shared-target');
      if (
        (await destination.count()) === 1 &&
        (await destination.textContent())?.trim() === 'Unloaded cross chapter destination preview'
      ) {
        return candidate;
      }
    }
    return null;
  };
  await expect.poll(async () => !!(await findDestinationFrame())).toBe(true);
  const destinationFrame = await findDestinationFrame();
  if (!destinationFrame) throw new Error('expected the unloaded cross-chapter destination frame');
  await expectJumpCueAt(page, destinationFrame.locator('#shared-target'));
  const cue = page.locator('[data-reader-jump-cue]');

  await page.evaluate(() => {
    type C7Window = Window & { __BR1_C7_ANCHOR_FIRED__?: boolean };
    setTimeout(() => {
      (window as C7Window).__BR1_C7_ANCHOR_FIRED__ = true;
    }, 1000);
  });
  await expect.poll(() =>
    page.evaluate(() => (window as Window & { __BR1_C7_ANCHOR_FIRED__?: boolean }).__BR1_C7_ANCHOR_FIRED__ ?? false)
  ).toBe(true);
  await dispatchCapturedNativeRelocate(page, 'anchor');
  await expect(cue).toHaveCount(1);
  await expect.poll(() => cue.count(), { timeout: 3200 }).toBe(0);
  await expectJumpCueToExpire(page);
  await dispatchCapturedNativeRelocate(page, 'anchor');
  await expect(cue).toHaveCount(0);

  const scrollTarget = destinationFrame.locator('#scroll-target');
  await destinationFrame.locator('#scroll-link').click();
  await expectJumpCueAt(page, scrollTarget);
  await dispatchCapturedNativeRelocate(page, 'scroll');
  await expect(cue).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('does not revive a C7 cue after a real iframe selection', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  const filler = Array.from({ length: 80 }, (_, index) => `<p>C7 selection filler ${index}</p>`).join('');
  const frame = await openEpub(
    page,
    'c7-selection-cue',
    `<p><a id="selection-ref" href="#selection-target" epub:type="noteref">[1]</a></p>${filler}
     <aside id="selection-target" epub:type="footnote"><p id="selection-copy">C7 selected destination text</p></aside>`
  );
  const dialog = page.getByRole('dialog', { name: '脚注预览' });
  const cue = page.locator('[data-reader-jump-cue]');

  await frame.locator('#selection-ref').click();
  await expect(dialog.getByRole('button', { name: '跳转到正文位置' })).toBeVisible();
  await captureNativeRelocateDetail(page);
  await dialog.getByRole('button', { name: '跳转到正文位置' }).click();
  await expect(dialog).toHaveCount(0);
  await expectJumpCueAt(page, frame.locator('#selection-target'));

  await frame.locator('#selection-copy').evaluate((element) => {
    const selection = element.ownerDocument.defaultView?.getSelection();
    if (!selection) throw new Error('expected the iframe selection API');
    const range = element.ownerDocument.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    element.ownerDocument.dispatchEvent(new Event('selectionchange'));
  });
  await expect(cue).toHaveCount(0);
  await dispatchCapturedNativeRelocate(page, 'anchor');
  await expect(cue).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('does not paint a C7 cue after layout invalidates a held jump', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  await page.setViewportSize({ width: 1280, height: 720 });
  const filler = Array.from({ length: 80 }, (_, index) => `<p>C7 layout filler ${index}</p>`).join('');
  const frame = await openEpub(
    page,
    'c7-layout-held-jump',
    `<p><a id="held-ref" href="#held-target" epub:type="noteref">[1]</a></p>${filler}
     <aside id="held-target" epub:type="footnote">C7 held layout destination</aside>`
  );
  const dialog = page.getByRole('dialog', { name: '脚注预览' });
  const target = frame.locator('#held-target');

  await page.evaluate(() => {
    type C7Window = Window & {
      __BR1_C7_LAYOUT_HELD__?: { entered: () => boolean; release: () => void; returned: () => boolean };
    };
    const view = document.querySelector('foliate-view') as (HTMLElement & {
      goTo?: (target: unknown) => Promise<unknown>;
    }) | null;
    if (!view?.goTo) throw new Error('expected the live reader goTo API');
    const goTo = view.goTo.bind(view);
    let entered = false;
    let returned = false;
    let release: (() => void) | null = null;
    const heldReturn = new Promise<void>((resolve) => {
      release = resolve;
    });
    view.goTo = async (target) => {
      const result = await goTo(target);
      entered = true;
      await heldReturn;
      returned = true;
      return result;
    };
    (window as C7Window).__BR1_C7_LAYOUT_HELD__ = {
      entered: () => entered,
      release: () => release?.(),
      returned: () => returned
    };
  });

  await frame.locator('#held-ref').click();
  await dialog.getByRole('button', { name: '跳转到正文位置' }).click();
  await expect.poll(() =>
    page.evaluate(() => (window as Window & { __BR1_C7_LAYOUT_HELD__?: { entered: () => boolean } }).__BR1_C7_LAYOUT_HELD__?.entered())
  ).toBe(true);
  await expect(target).toBeInViewport();
  await page.setViewportSize({ width: 1120, height: 720 });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.evaluate(() =>
    (window as Window & { __BR1_C7_LAYOUT_HELD__?: { release: () => void } }).__BR1_C7_LAYOUT_HELD__?.release()
  );
  await expect.poll(() =>
    page.evaluate(() => (window as Window & { __BR1_C7_LAYOUT_HELD__?: { returned: () => boolean } }).__BR1_C7_LAYOUT_HELD__?.returned())
  ).toBe(true);
  await expect(page.locator('[data-reader-jump-cue]')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

type C8BSelection = { index: number; cfi: string; text: string };

type C8BStageHarness = {
  eventDetails: () => Array<C8BSelection | null>;
  clearEvents: () => void;
  setControlRequest: (request: { type: string; nonce: number; url?: string; label?: string }) => void;
  destroy: () => void;
};

const mountC8BStage = async (
  page: import('@playwright/test').Page,
  assetUrl: string,
  label: string
) => {
  await page.goto('/library');
  await page.evaluate(async ({ assetUrl, label, readerStageUrl, readerTtsUrl, svelteLegacyClientUrl }) => {
    const [{ default: ReaderStage }, { createClassComponent }, { createEmptyReaderTtsSessionState }] = await Promise.all([
      import(/* @vite-ignore */ readerStageUrl),
      import(/* @vite-ignore */ svelteLegacyClientUrl),
      import(/* @vite-ignore */ readerTtsUrl)
    ]);
    type C8BWindow = Window & { __BR1_C8B_STAGE__?: C8BStageHarness };
    const target = document.createElement('div');
    target.dataset.c8bStage = 'true';
    document.body.append(target);
    const events: Array<C8BSelection | null> = [];
    const stage = createClassComponent({
      component: ReaderStage,
      target,
      props: {
        controlRequest: { type: 'asset', nonce: 1, url: assetUrl, label },
        ttsSession: createEmptyReaderTtsSessionState()
      }
    });
    stage.$on('footnoteselectionchange', (event: CustomEvent<C8BSelection | null>) => {
      events.push(event.detail);
    });
    (window as C8BWindow).__BR1_C8B_STAGE__ = {
      eventDetails: () => events.map((detail) => detail && { index: detail.index, cfi: detail.cfi, text: detail.text }),
      clearEvents: () => { events.length = 0; },
      setControlRequest: (request) => stage.$set({ controlRequest: request }),
      destroy: () => stage.$destroy()
    };
  }, { assetUrl, label, readerStageUrl, readerTtsUrl, svelteLegacyClientUrl });
  await expect(page.frameLocator('[data-c8b-stage] iframe').first().locator('body')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('[data-c8b-stage]').getByText('书籍已打开')).toBeVisible();
  return page.frameLocator('[data-c8b-stage] iframe').first();
};

const waitForC8BCurrentRenderer = async (page: import('@playwright/test').Page, expectedText: string) => {
  await expect.poll(() => page.evaluate((expectedText) => {
    type Renderer = HTMLElement & { getContents?: () => Array<{ doc?: Document }> };
    type View = HTMLElement & { renderer?: Renderer };
    const view = document.querySelector('[data-c8b-stage] foliate-view') as View | null;
    const renderer = view?.renderer;
    if (!view || !renderer || !['foliate-paginator', 'foliate-fxl'].includes(renderer.localName)) return false;
    const roots = [view, view.shadowRoot, renderer.shadowRoot].filter(Boolean) as Array<Element | ShadowRoot>;
    const rendererNodes = new Set(roots.flatMap((root) =>
      [...root.querySelectorAll<HTMLElement>('foliate-paginator, foliate-fxl')]
    ));
    const renderedText = (renderer.getContents?.() ?? []).map(({ doc }) => doc?.body.textContent ?? '').join('\n');
    return rendererNodes.size === 1 && rendererNodes.has(renderer) && renderer.isConnected && renderedText.includes(expectedText);
  }, expectedText)).toBe(true);
  await expect(page.locator('[data-c8b-stage]').getByText('书籍已打开')).toBeVisible();
};

const c8bConnectedFoliateRendererCount = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const view = document.querySelector('[data-c8b-stage] foliate-view') as HTMLElement | null;
    if (!view) return 0;
    const roots = [view, view.shadowRoot].filter(Boolean) as Array<Element | ShadowRoot>;
    return new Set(roots.flatMap((root) => [...root.querySelectorAll('foliate-paginator, foliate-fxl')]))
      .size;
  });

const setC8BControlRequest = (
  page: import('@playwright/test').Page,
  request: { type: string; nonce: number; url?: string; label?: string }
) =>
  page.evaluate((nextRequest) =>
    (window as Window & { __BR1_C8B_STAGE__?: C8BStageHarness }).__BR1_C8B_STAGE__?.setControlRequest(nextRequest),
  request);

const selectText = async (element: import('@playwright/test').Locator) => {
  await element.evaluate((element) => {
    const selection = element.ownerDocument.getSelection();
    if (!selection) throw new Error('expected the popup document selection API');
    const range = element.ownerDocument.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    element.ownerDocument.dispatchEvent(new Event('selectionchange'));
  });
};

const selectPopupText = (page: import('@playwright/test').Page, selector: string, index = 0) =>
  selectText(page.locator(`[data-c8b-stage] .footnote-body ${selector}`).nth(index));

const c8bEvents = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    (window as Window & { __BR1_C8B_STAGE__?: C8BStageHarness }).__BR1_C8B_STAGE__?.eventDetails() ?? []
  );

const c8bAcceptedEvents = (page: import('@playwright/test').Page) =>
  c8bEvents(page).then((events) => events.filter((event): event is C8BSelection => event !== null));

const clearC8BEvents = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    (window as Window & { __BR1_C8B_STAGE__?: C8BStageHarness }).__BR1_C8B_STAGE__?.clearEvents()
  );

const releaseC8BValidation = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    (window as Window & {
      __BR1_C8B_NATIVE__?: { release: () => void };
    }).__BR1_C8B_NATIVE__?.release()
  );

const stopHoldingNewC8BReads = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    (window as Window & {
      __BR1_C8B_NATIVE__?: { stopHoldingNewReads: () => void };
    }).__BR1_C8B_NATIVE__?.stopHoldingNewReads()
  );

const restoreC8BBook = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    (window as Window & {
      __BR1_C8B_NATIVE__?: { restoreBook: () => void };
    }).__BR1_C8B_NATIVE__?.restoreBook()
  );

const prepareC8BNativeValidation = async (
  page: import('@playwright/test').Page,
  invalidResolution: 'section' | 'boundary' | 'book-microtask' | null = null
) => {
  await page.evaluate(async (invalidResolution) => {
    type C8BLocation = { index: number; anchor: (doc: Document) => unknown };
    type C8BSection = { createDocument?: () => Promise<Document> };
    type C8BView = HTMLElement & {
      book?: { sections?: C8BSection[]; resolveHref?: (href: string) => Promise<C8BLocation | null> | C8BLocation | null };
      renderer?: { getContents?: () => Array<{ index?: number; doc?: Document }> };
      getCFI?: (index: number, range?: Range) => string;
      resolveCFI?: (cfi: string) => C8BLocation | null;
    };
    type C8BWindow = Window & {
      __BR1_C8B_NATIVE__?: {
        release: () => void;
        stopHoldingNewReads: () => void;
        restoreBook: () => void;
        validationEntered: () => boolean;
        validationCompleted: () => boolean;
        bookMicrotaskChanged: () => boolean;
        bookMicrotaskRestored: () => boolean;
        getCFICalls: () => Array<{ index: number; text: string; startNodeId: string }>;
        resolveCalls: () => Array<{ cfi: string; index: number | null }>;
      };
    };
    const view = document.querySelector('[data-c8b-stage] foliate-view') as C8BView | null;
    if (!view?.book?.sections || !view.getCFI || !view.resolveCFI) throw new Error('expected the live Foliate CFI API');
    const destinationIndex = view.book.sections.length - 1;
    const destination = view.book.sections[destinationIndex];
    const current = view.renderer?.getContents?.().find(({ index }) => index === 0)?.doc;
    const wrongTarget = current?.querySelector('#wrong-section');
    if (!destination?.createDocument || !current || !wrongTarget) throw new Error('expected real source and destination sections');
    const getCFI = view.getCFI.bind(view);
    const resolveCFI = view.resolveCFI.bind(view);
    const wrongSectionRange = current.createRange();
    wrongSectionRange.selectNodeContents(wrongTarget);
    // This is a genuine Foliate locator for a different section, never a fabricated CFI.
    const wrongSectionCFI = getCFI(0, wrongSectionRange);
    const pristineForBoundary = await destination.createDocument();
    const wrongBoundaryTarget = pristineForBoundary.querySelector('#wrong-boundary');
    const wrongBoundaryRange = pristineForBoundary.createRange();
    if (wrongBoundaryTarget) wrongBoundaryRange.selectNodeContents(wrongBoundaryTarget);
    const wrongBoundaryCFI = wrongBoundaryTarget ? getCFI(destinationIndex, wrongBoundaryRange) : '';
    const createDocument = destination.createDocument.bind(destination);
    let validationEntered = false;
    let validationCompleted = false;
    let release: (() => void) | null = null;
    let pending = 0;
    let holdNewReads = true;
    let bookMicrotaskChanged = false;
    let bookMicrotaskRestored = false;
    let bookMicrotaskScheduled = false;
    let restoreBook: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const getCFICalls: Array<{ index: number; text: string; startNodeId: string }> = [];
    const resolveCalls: Array<{ cfi: string; index: number | null }> = [];
    destination.createDocument = async () => {
      // Keep every validation read from the old browser Selection together,
      // but allow a later popup extraction to establish its replacement root.
      if (!holdNewReads) return createDocument();
      validationEntered = true;
      pending += 1;
      try {
        await gate;
        return await createDocument();
      } finally {
        pending -= 1;
        if (pending === 0) validationCompleted = true;
      }
    };
    view.getCFI = (index, range) => {
      const startElement = range?.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : range?.startContainer as Element | undefined;
      getCFICalls.push({ index, text: range?.toString() ?? '', startNodeId: startElement?.id ?? '' });
      return getCFI(index, range);
    };
    view.resolveCFI = (cfi) => {
      const nativeCFI = invalidResolution === 'section'
        ? wrongSectionCFI
        : invalidResolution === 'boundary' && wrongBoundaryCFI
          ? wrongBoundaryCFI
          : cfi;
      const resolved = resolveCFI(nativeCFI);
      resolveCalls.push({ cfi, index: resolved?.index ?? null });
      if (invalidResolution === 'book-microtask' && !bookMicrotaskScheduled) {
        bookMicrotaskScheduled = true;
        const originalBook = view.book;
        // The real resolver has finished its synchronous currentness checks.
        // Keep Stage's await continuation on a genuine stale book until this
        // test has observed its rejection; restoration is explicit below.
        queueMicrotask(() => {
          bookMicrotaskChanged = true;
          view.book = undefined;
          restoreBook = () => {
            view.book = originalBook;
            bookMicrotaskRestored = true;
          };
        });
      }
      return resolved;
    };
    (window as C8BWindow).__BR1_C8B_NATIVE__ = {
      release: () => release?.(),
      stopHoldingNewReads: () => { holdNewReads = false; },
      restoreBook: () => restoreBook?.(),
      validationEntered: () => validationEntered,
      validationCompleted: () => validationCompleted,
      bookMicrotaskChanged: () => bookMicrotaskChanged,
      bookMicrotaskRestored: () => bookMicrotaskRestored,
      getCFICalls: () => [...getCFICalls],
      resolveCalls: () => [...resolveCalls]
    };
  }, invalidResolution);
};

const c8bValidationEntered = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    (window as Window & { __BR1_C8B_NATIVE__?: { validationEntered: () => boolean } })
      .__BR1_C8B_NATIVE__?.validationEntered() ?? false
  );

const waitForC8BValidationCompletion = async (page: import('@playwright/test').Page) => {
  await releaseC8BValidation(page);
  await expect.poll(() =>
    page.evaluate(() =>
      (window as Window & { __BR1_C8B_NATIVE__?: { validationCompleted: () => boolean } })
        .__BR1_C8B_NATIVE__?.validationCompleted() ?? false
    )
  ).toBe(true);
  await page.evaluate(() => new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  ));
};

test('C8B forwards a real popup Selection through the scoped Stage event after a pristine duplicate-node CFI round trip', async ({ page }) => {
  const assetUrl = '/samples/c8b-duplicate-round-trip.epub';
  await page.goto('/library');
  const archive = await buildEpub(page, [
    {
      id: 'chapter-one',
      href: 'chapter-one.xhtml',
      body: '<p id="wrong-section">duplicate selection text</p><a id="cross-ref" href="chapter-two.xhtml#raw-note" epub:type="noteref">[1]</a>'
    },
    {
      id: 'chapter-two',
      href: 'chapter-two.xhtml',
      body: '<aside id="raw-note"><p><span id="first-duplicate">duplicate selection text</span><span id="second-duplicate">duplicate selection text</span></p></aside>'
    }
  ]);
  await page.route(`**${assetUrl}`, (route) => route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(archive) }));
  const frame = await mountC8BStage(page, assetUrl, 'C8B duplicate round trip');
  await frame.locator('#cross-ref').click();
  await expect(page.locator('[data-c8b-stage] [role="dialog"]')).toBeVisible();
  await prepareC8BNativeValidation(page);
  await clearC8BEvents(page);

  await selectPopupText(page, 'span', 1);
  await expect.poll(() => c8bValidationEntered(page)).toBe(true);
  await waitForC8BValidationCompletion(page);
  await expect.poll(() => c8bAcceptedEvents(page)).toEqual(expect.arrayContaining([
    expect.objectContaining({ index: 1, text: 'duplicate selection text', cfi: expect.stringMatching(/^epubcfi\(/) })
  ]));
  const proof = await page.evaluate(() => {
    const native = (window as Window & {
      __BR1_C8B_NATIVE__?: {
        getCFICalls: () => Array<{ index: number; text: string; startNodeId: string }>;
        resolveCalls: () => Array<{ cfi: string; index: number | null }>;
      };
    }).__BR1_C8B_NATIVE__;
    return { getCFI: native?.getCFICalls() ?? [], resolve: native?.resolveCalls() ?? [] };
  });
  expect(proof.getCFI).toEqual(expect.arrayContaining([
    { index: 1, text: 'duplicate selection text', startNodeId: 'second-duplicate' }
  ]));
  expect(proof.resolve).toEqual(expect.arrayContaining([expect.objectContaining({ index: 1 })]));
  await expect(page.getByRole('toolbar', { name: '选中文本操作' })).toHaveCount(0);
});

test('C8B sends an actual reader-route popup Selection through Foliate CFI serialization and pristine resolution', async ({ page }) => {
  const frame = await openEpub(
    page,
    'c8b-live-route',
    '<p id="wrong-section">route collision</p><a id="cross-ref" href="chapter-two.xhtml#raw-note" epub:type="noteref">[1]</a>',
    [{
      id: 'chapter-two',
      href: 'chapter-two.xhtml',
      body: '<aside id="raw-note"><p><span id="first-source">route duplicate</span><span id="second-source">route duplicate</span></p></aside>'
    }]
  );
  const dialog = page.getByRole('dialog', { name: '脚注预览' });
  await frame.locator('#cross-ref').click();
  await expect(dialog).toBeVisible();
  await page.evaluate(() => {
    type Location = { index: number; anchor: (doc: Document) => unknown };
    type View = HTMLElement & {
      getCFI?: (index: number, range?: Range) => string;
      resolveCFI?: (cfi: string) => Location | null;
    };
    const view = document.querySelector('foliate-view') as View | null;
    if (!view?.getCFI || !view.resolveCFI) throw new Error('expected the live Foliate CFI methods');
    const getCFI = view.getCFI.bind(view);
    const resolveCFI = view.resolveCFI.bind(view);
    const calls: Array<{ index: number; text: string; startNodeId: string; resolvedIndex: number | null }> = [];
    view.getCFI = (index, range) => {
      const start = range?.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : range?.startContainer as Element | undefined;
      const cfi = getCFI(index, range);
      calls.push({ index, text: range?.toString() ?? '', startNodeId: start?.id ?? '', resolvedIndex: null });
      return cfi;
    };
    view.resolveCFI = (cfi) => {
      const resolved = resolveCFI(cfi);
      calls[calls.length - 1]!.resolvedIndex = resolved?.index ?? null;
      return resolved;
    };
    (window as Window & { __BR1_C8B_ROUTE__?: () => typeof calls }).__BR1_C8B_ROUTE__ = () => [...calls];
  });
  await selectText(dialog.locator('.footnote-body span').nth(1));
  await expect.poll(() =>
    page.evaluate(() => (window as Window & { __BR1_C8B_ROUTE__?: () => Array<unknown> }).__BR1_C8B_ROUTE__?.() ?? [])
  ).toEqual(expect.arrayContaining([{
    index: 1,
    text: 'route duplicate',
    startNodeId: 'second-source',
    resolvedIndex: 1
  }]));
  await expect(page.getByRole('toolbar', { name: '选中文本操作' })).toHaveCount(0);
});

test('C8B rejects a native locator resolved to the wrong section', async ({ page }) => {
  const assetUrl = '/samples/c8b-wrong-section.epub';
  await page.goto('/library');
  const archive = await buildEpub(page, [
    {
      id: 'chapter-one',
      href: 'chapter-one.xhtml',
      body: '<p id="wrong-section">duplicate selection text</p><a id="cross-ref" href="chapter-two.xhtml#raw-note" epub:type="noteref">[1]</a>'
    },
    {
      id: 'chapter-two',
      href: 'chapter-two.xhtml',
      body: '<aside id="raw-note"><p id="selected">duplicate selection text</p></aside>'
    }
  ]);
  await page.route(`**${assetUrl}`, (route) => route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(archive) }));
  const frame = await mountC8BStage(page, assetUrl, 'C8B wrong section');
  await frame.locator('#cross-ref').click();
  await expect(page.locator('[data-c8b-stage] [role="dialog"]')).toBeVisible();
  await prepareC8BNativeValidation(page, 'section');
  await clearC8BEvents(page);

  await selectPopupText(page, 'p');
  await expect.poll(() => c8bValidationEntered(page)).toBe(true);
  await waitForC8BValidationCompletion(page);
  await expect.poll(() => c8bAcceptedEvents(page)).toEqual([]);
});

test('C8B rejects a genuine resolver result when the book changes before Stage publishes it', async ({ page }) => {
  const assetUrl = '/samples/c8b-post-resolver-book-change.epub';
  await page.goto('/library');
  const archive = await buildEpub(page, [
    {
      id: 'chapter-one',
      href: 'chapter-one.xhtml',
      body: '<p id="wrong-section">post resolver source</p><a id="cross-ref" href="chapter-two.xhtml#raw-note" epub:type="noteref">[1]</a>'
    },
    {
      id: 'chapter-two',
      href: 'chapter-two.xhtml',
      body: '<aside id="raw-note"><p>post resolver source</p></aside>'
    }
  ]);
  await page.route(`**${assetUrl}`, (route) => route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(archive) }));
  const frame = await mountC8BStage(page, assetUrl, 'C8B post resolver book change');
  await frame.locator('#cross-ref').click();
  await expect(page.locator('[data-c8b-stage] [role="dialog"]')).toBeVisible();
  await prepareC8BNativeValidation(page, 'book-microtask');
  await clearC8BEvents(page);

  await selectPopupText(page, 'p');
  await expect.poll(() => c8bValidationEntered(page)).toBe(true);
  await waitForC8BValidationCompletion(page);
  await expect.poll(() => c8bAcceptedEvents(page)).toEqual([]);
  const transientBookState = await page.evaluate(() => {
    const native = (window as Window & {
      __BR1_C8B_NATIVE__?: { bookMicrotaskChanged: () => boolean; bookMicrotaskRestored: () => boolean };
    }).__BR1_C8B_NATIVE__;
    return { changed: native?.bookMicrotaskChanged() ?? false, restored: native?.bookMicrotaskRestored() ?? false };
  });
  expect(transientBookState).toEqual({ changed: true, restored: false });
  await restoreC8BBook(page);
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __BR1_C8B_NATIVE__?: { bookMicrotaskRestored: () => boolean } })
      .__BR1_C8B_NATIVE__?.bookMicrotaskRestored() ?? false
  )).toBe(true);
});

test('C8B rejects a genuine same-section locator with different source boundaries', async ({ page }) => {
  const assetUrl = '/samples/c8b-wrong-boundary.epub';
  await page.goto('/library');
  const archive = await buildEpub(page, [
    {
      id: 'chapter-one',
      href: 'chapter-one.xhtml',
      body: '<p id="wrong-section">wrong section</p><a id="cross-ref" href="chapter-three.xhtml#raw-note" epub:type="noteref">[1]</a>'
    },
    { id: 'middle', href: 'middle.xhtml', body: '<p>middle chapter</p>' },
    {
      id: 'chapter-three',
      href: 'chapter-three.xhtml',
      body: '<aside id="raw-note"><p>same boundary text</p><p id="wrong-boundary">same boundary text</p></aside>'
    }
  ]);
  await page.route(`**${assetUrl}`, (route) => route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(archive) }));
  const frame = await mountC8BStage(page, assetUrl, 'C8B wrong boundary');
  await frame.locator('#cross-ref').click();
  await expect(page.locator('[data-c8b-stage] [role="dialog"]')).toBeVisible();
  await prepareC8BNativeValidation(page, 'boundary');
  await clearC8BEvents(page);
  await selectPopupText(page, 'p');
  await expect.poll(() => c8bValidationEntered(page)).toBe(true);
  await waitForC8BValidationCompletion(page);
  await expect.poll(() => c8bAcceptedEvents(page)).toEqual([]);
});

test('C8B ignores held pristine reads after close, same-text replacement, navigation, and book replacement', async ({ page }) => {
  // This case deliberately completes six independent reader lifecycle changes.
  test.setTimeout(60_000);
  const firstUrl = '/samples/c8b-stale-first.epub';
  const secondUrl = '/samples/c8b-stale-second.epub';
  await page.goto('/library');
  const firstArchive = await buildEpub(page, [
    {
      id: 'chapter-one',
      href: 'chapter-one.xhtml',
      body: '<p id="wrong-section">wrong section</p><a id="note-a" href="chapter-two.xhtml#note-a" epub:type="noteref">[1]</a><a id="note-b" href="chapter-two.xhtml#note-b" epub:type="noteref">[2]</a>'
    },
    { id: 'middle', href: 'middle.xhtml', body: '<p>middle chapter</p>' },
    {
      id: 'chapter-two',
      href: 'chapter-two.xhtml',
      body: '<aside id="note-a"><p id="same-a">same payload text</p></aside><aside id="note-b"><p id="same-b">same payload text</p></aside>'
    }
  ]);
  const secondArchive = await buildEpub(page, [
    { id: 'replacement', href: 'replacement.xhtml', body: '<p>replacement book</p>' }
  ]);
  await page.route(`**${firstUrl}`, (route) => route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(firstArchive) }));
  await page.route(`**${secondUrl}`, (route) => route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(secondArchive) }));
  const frame = await mountC8BStage(page, firstUrl, 'C8B stale first');
  const dialog = page.locator('[data-c8b-stage] [role="dialog"]');

  const beginHeldSelection = async (reference: string, popupIndex = 0) => {
    await frame.locator(reference).click();
    await expect(dialog).toBeVisible();
    const popupText = page.locator('[data-c8b-stage] .footnote-body p').nth(popupIndex);
    await expect(popupText).toBeVisible();
    // Foliate may finish loading a prefetched section after the dialog shell
    // appears. Require the native popup body to remain present before holding.
    await page.evaluate(() => new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    ));
    await expect(popupText).toBeVisible();
    await prepareC8BNativeValidation(page);
    await clearC8BEvents(page);
    await selectText(popupText);
    await expect.poll(() => c8bValidationEntered(page)).toBe(true);
    await page.evaluate(() => new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    ));
    await stopHoldingNewC8BReads(page);
  };

  // Changing the browser Selection before the held read returns must invalidate
  // the earlier snapshot without relying on the popup close path.
  await beginHeldSelection('#note-a');
  await page.locator('[data-c8b-stage] .footnote-body p').evaluate((element) => {
    element.ownerDocument.getSelection()?.removeAllRanges();
    element.ownerDocument.dispatchEvent(new Event('selectionchange'));
  });
  await waitForC8BValidationCompletion(page);
  await expect.poll(() => c8bAcceptedEvents(page)).toEqual([]);
  await dialog.getByRole('button', { name: '关闭脚注' }).click();

  await beginHeldSelection('#note-a');
  await dialog.getByRole('button', { name: '关闭脚注' }).click();
  await waitForC8BValidationCompletion(page);
  await expect.poll(() => c8bAcceptedEvents(page)).toEqual([]);

  await beginHeldSelection('#note-a');
  await frame.locator('#note-b').click();
  await expect(dialog).toContainText('[2]');
  await expect(dialog).toContainText('same payload text');
  await waitForC8BValidationCompletion(page);
  await expect.poll(() => c8bAcceptedEvents(page)).toEqual([]);

  await dialog.getByRole('button', { name: '关闭脚注' }).click();
  await beginHeldSelection('#note-a');
  await setC8BControlRequest(page, { type: 'next', nonce: 2 });
  await waitForC8BValidationCompletion(page);
  await expect.poll(() => c8bAcceptedEvents(page)).toEqual([]);

  await setC8BControlRequest(page, { type: 'asset', nonce: 3, url: firstUrl, label: 'C8B stale first' });
  await waitForC8BCurrentRenderer(page, 'wrong section');
  await expect(frame.locator('#note-a')).toBeVisible();
  await beginHeldSelection('#note-a');
  const oldSourceFrame = await page.locator('[data-c8b-stage] foliate-view iframe').first().elementHandle();
  if (!oldSourceFrame) throw new Error('expected the old current source iframe');
  await setC8BControlRequest(page, { type: 'asset', nonce: 4, url: secondUrl, label: 'C8B stale second' });
  await waitForC8BCurrentRenderer(page, 'replacement book');
  await waitForC8BValidationCompletion(page);
  await expect.poll(() => c8bAcceptedEvents(page)).toEqual([]);
  expect(await oldSourceFrame.evaluate((frame) => frame.isConnected)).toBe(false);

  await setC8BControlRequest(page, { type: 'asset', nonce: 5, url: firstUrl, label: 'C8B stale first' });
  await waitForC8BCurrentRenderer(page, 'wrong section');
  await expect(frame.locator('#note-a')).toBeVisible();
  await beginHeldSelection('#note-a');
  await page.evaluate(() =>
    (window as Window & { __BR1_C8B_STAGE__?: C8BStageHarness }).__BR1_C8B_STAGE__?.destroy()
  );
  await waitForC8BValidationCompletion(page);
  await expect.poll(() => c8bAcceptedEvents(page)).toEqual([]);
  await expect(page.locator('[data-c8b-stage] foliate-view')).toHaveCount(0);
});

test('C8B retires the native EPUB renderer before a TXT switch and rejects its held selection', async ({ page }) => {
  const epubUrl = '/samples/c8b-unload-held.epub';
  const textUrl = '/samples/c8b-unload-held.txt';
  await page.goto('/library');
  const archive = await buildEpub(page, [
    {
      id: 'chapter-one',
      href: 'chapter-one.xhtml',
      body: '<p id="wrong-section">unload source</p><a id="cross-ref" href="chapter-two.xhtml#raw-note" epub:type="noteref">[1]</a>'
    },
    { id: 'chapter-two', href: 'chapter-two.xhtml', body: '<aside id="raw-note"><p>unload source</p></aside>' }
  ]);
  await page.route(`**${epubUrl}`, (route) => route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(archive) }));
  await page.route(`**${textUrl}`, (route) => route.fulfill({ contentType: 'text/plain', body: 'C8B TXT replacement' }));
  const frame = await mountC8BStage(page, epubUrl, 'C8B unload held');
  await waitForC8BCurrentRenderer(page, 'unload source');
  const oldSourceFrame = await page.locator('[data-c8b-stage] foliate-view iframe').first().elementHandle();
  if (!oldSourceFrame) throw new Error('expected the current EPUB source iframe');
  await frame.locator('#cross-ref').click();
  await expect(page.locator('[data-c8b-stage] [role="dialog"]')).toBeVisible();
  await prepareC8BNativeValidation(page);
  await clearC8BEvents(page);
  await selectPopupText(page, 'p');
  await expect.poll(() => c8bValidationEntered(page)).toBe(true);

  await setC8BControlRequest(page, { type: 'asset', nonce: 2, url: textUrl, label: 'C8B TXT replacement' });
  await waitForC8BValidationCompletion(page);
  await expect.poll(() => c8bAcceptedEvents(page)).toEqual([]);
  await expect.poll(() => c8bConnectedFoliateRendererCount(page)).toBe(0);
  expect(await oldSourceFrame.evaluate((frame) => frame.isConnected)).toBe(false);
});

test('C8B keeps synthetic alt/data popup selections unanchored', async ({ page }) => {
  const assetUrl = '/samples/c8b-synthetic.epub';
  await page.goto('/library');
  const archive = await buildEpub(page, [
    {
      id: 'chapter',
      href: 'chapter.xhtml',
      body: '<p><span id="synthetic" class="zhangyue-footnote" data-wr-footernote="synthetic popup text">*</span></p>'
    }
  ]);
  await page.route(`**${assetUrl}`, (route) => route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(archive) }));
  const frame = await mountC8BStage(page, assetUrl, 'C8B synthetic');
  await frame.locator('#synthetic').click();
  await expect(page.locator('[data-c8b-stage] [role="dialog"]')).toContainText('synthetic popup text');
  await clearC8BEvents(page);

  await selectPopupText(page, 'p');
  await expect.poll(() => c8bAcceptedEvents(page)).toEqual([]);
});

type C8CNativeCall = { command: string; args: Record<string, unknown> | undefined };

const c8cPageErrors = new WeakMap<import('@playwright/test').Page, Error[]>();

test.afterEach(({ page }) => {
  const errors = c8cPageErrors.get(page);
  if (errors) expect(errors).toEqual([]);
});

const installC8CDesktop = async (page: import('@playwright/test').Page) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  c8cPageErrors.set(page, pageErrors);
  await page.addInitScript(() => {
    type NativeCall = { command: string; args: Record<string, unknown> | undefined };
    type TauriInternals = {
      invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
      metadata: { currentWindow: { label: string }; currentWebview: { label: string } };
      transformCallback: (callback: (...args: unknown[]) => void, once?: boolean) => number;
      unregisterCallback: (id: number) => void;
    };
    type EventPluginInternals = { unregisterListener: (event: string, eventId: number) => void };
    type NativeState = {
      calls: NativeCall[];
      notes: () => Array<{ bookKey: string; notes: unknown[] }>;
      setPrompts: (values: Array<string | null>) => void;
      failNextSave: () => void;
    };
    const notes = new Map<string, unknown[]>(JSON.parse(sessionStorage.getItem('br1.c8c.notes') ?? '[]'));
    const calls: NativeCall[] = [];
    let prompts: Array<string | null> = [];
    let failNextSave = false;
    let nextCallbackId = 0;
    let nextEventId = 0;
    const callbacks = new Map<number, (...args: unknown[]) => void>();
    const eventListeners = new Map<string, Set<number>>();
    window.prompt = () => prompts.shift() ?? null;
    (window as Window & { __TAURI_EVENT_PLUGIN_INTERNALS__?: EventPluginInternals }).__TAURI_EVENT_PLUGIN_INTERNALS__ = {
      unregisterListener: (event, eventId) => eventListeners.get(event)?.delete(eventId)
    };
    (window as Window & { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main' } },
      transformCallback: (callback, once = false) => {
        const id = ++nextCallbackId;
        callbacks.set(id, (...args) => {
          callback(...args);
          if (once) callbacks.delete(id);
        });
        return id;
      },
      unregisterCallback: (id) => { callbacks.delete(id); },
      invoke: async (command, args) => {
        calls.push({ command, args });
        if (command === 'load_library_books' || command === 'load_reader_bookmarks') return [];
        if (command === 'detect_readest_library') return { available: false, count: 0, importableCount: 0, missingFileCount: 0 };
        if (command === 'plugin:event|listen') {
          const event = String(args?.event);
          const eventId = ++nextEventId;
          let listeners = eventListeners.get(event);
          if (!listeners) {
            listeners = new Set();
            eventListeners.set(event, listeners);
          }
          listeners.add(eventId);
          return eventId;
        }
        if (command === 'plugin:event|unlisten') return;
        if (command === 'load_reader_notes') return notes.get(String(args?.bookKey)) ?? [];
        if (command === 'save_reader_notes') {
          if (failNextSave) {
            failNextSave = false;
            throw new Error('C8C native note save failed');
          }
          notes.set(String(args?.bookKey), structuredClone((args?.notes as unknown[]) ?? []));
          sessionStorage.setItem('br1.c8c.notes', JSON.stringify([...notes.entries()]));
          return;
        }
        if (command === 'get_reader_translation_provider_statuses') {
          return ['deepl', 'yandex'].map((provider) => ({ provider, status: 'configured', configured: true, label: 'configured', updatedAt: 1 }));
        }
        if (command === 'lookup_reader_assistance' || command === 'translate_reader_assistance') {
          return {
            status: 'ready',
            result: { id: `c8c-${command}`, provider: command.includes('lookup') ? args?.provider : args?.provider, title: 'C8C', body: 'completed', createdAt: 1 }
          };
        }
        throw new Error(`unexpected C8C native command: ${command}`);
      }
    };
    (window as Window & { __BR1_C8C_NATIVE__?: NativeState }).__BR1_C8C_NATIVE__ = {
      calls,
      notes: () => [...notes.entries()].map(([bookKey, saved]) => ({ bookKey, notes: structuredClone(saved) })),
      setPrompts: (values) => { prompts = [...values]; },
      failNextSave: () => { failNextSave = true; }
    };
  });
};

const c8cNative = <T>(page: import('@playwright/test').Page, read: () => T) =>
  page.evaluate(read);

const c8cPersistedHistoryFor = (page: import('@playwright/test').Page, term: string) =>
  page.evaluate((term) =>
    Object.entries(localStorage)
      .filter(([key]) => key.startsWith('br1.reader.assistance.history:'))
      .flatMap(([, value]) => JSON.parse(value) as Array<{ request?: { term?: string; text?: string } }>)
      .filter(({ request }) => request?.term === term || request?.text === term),
  term);

const navigateC8C = (page: import('@playwright/test').Page, href: string) =>
  page.evaluate(async ({ href, svelteNavigationUrl }) => {
    const { goto } = await import(/* @vite-ignore */ svelteNavigationUrl);
    await goto(href, { keepFocus: true, noScroll: true });
  }, { href, svelteNavigationUrl });

const waitForC8CReaderReady = async (page: import('@playwright/test').Page, chapterProgress: string) => {
  const stage = page.getByRole('main', { name: 'reader stage' });
  await expect(stage).toContainText('S2-R04C3 Footnotes', { timeout: 15000 });
  await expect(stage).toContainText(chapterProgress, { timeout: 15000 });
};

const selectC8CPopupTextByMouse = async (page: import('@playwright/test').Page) => {
  const target = page.getByRole('dialog', { name: '脚注预览' }).locator('.footnote-body p');
  const actions = page.getByRole('toolbar', { name: '脚注选区操作' });
  await expect(actions.getByRole('button', { name: '复制' })).toBeDisabled();
  const box = await target.evaluate((element) => {
    const range = element.ownerDocument.createRange();
    range.selectNodeContents(element);
    const { left, right, top, bottom, width, height } = range.getBoundingClientRect();
    return width > 2 && height > 0 ? { left, right, top, bottom } : null;
  });
  if (!box) throw new Error('expected a visible footnote text glyph rectangle for a browser mouse selection');
  await page.mouse.move(box.left + 1, (box.top + box.bottom) / 2);
  await page.mouse.down();
  await page.mouse.move(box.right - 1, (box.top + box.bottom) / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => target.evaluate((element) => {
    const selection = element.ownerDocument.getSelection();
    const range = selection?.rangeCount === 1 ? selection.getRangeAt(0) : null;
    return !!range && !range.collapsed && element.contains(range.startContainer) &&
      element.contains(range.endContainer) && selection?.toString().trim() === 'anchored popup selection';
  })).toBe(true);
  await expect(actions.getByRole('button', { name: '复制' })).toBeEnabled();
};

const selectC8CPopupText = async (page: import('@playwright/test').Page) => {
  await selectText(page.getByRole('dialog', { name: '脚注预览' }).locator('.footnote-body p'));
  await expect(page.getByRole('toolbar', { name: '脚注选区操作' }).getByRole('button', { name: '复制' })).toBeEnabled();
};

const holdNextC8CPristineRead = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    type Section = { createDocument?: () => Promise<Document> };
    type View = HTMLElement & { book?: { sections?: Section[] } };
    type Held = { entered: () => boolean; completed: () => boolean; release: () => void };
    const view = document.querySelector('foliate-view') as View | null;
    const section = view?.book?.sections?.[1];
    const createDocument = section?.createDocument?.bind(section);
    if (!section || !createDocument) throw new Error('expected the real destination section createDocument API');
    let entered = false;
    let completed = false;
    let release: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    section.createDocument = async () => {
      entered = true;
      await gate;
      try {
        return await createDocument();
      } finally {
        completed = true;
      }
    };
    (window as Window & { __BR1_C8C_HELD__?: Held }).__BR1_C8C_HELD__ = {
      entered: () => entered,
      completed: () => completed,
      release: () => release?.()
    };
  });

const releaseC8CHeldRead = async (page: import('@playwright/test').Page) => {
  await page.evaluate(() =>
    (window as Window & { __BR1_C8C_HELD__?: { release: () => void } }).__BR1_C8C_HELD__?.release()
  );
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __BR1_C8C_HELD__?: { completed: () => boolean } }).__BR1_C8C_HELD__?.completed() ?? false
  )).toBe(true);
};

test('C8C persists anchored popup highlights and distinct notes without replacing the body selection', async ({ page }) => {
  await installC8CDesktop(page);
  const frame = await openEpub(
    page,
    'c8c-anchored-actions',
    '<p id="body-source">body selection must remain unrelated</p><p><a id="ref" href="chapter-two.xhtml#note" epub:type="noteref">[1]</a></p>',
    [{ id: 'notes', href: 'chapter-two.xhtml', body: '<aside id="note"><p>anchored popup selection</p></aside>' }]
  );
  await waitForC8CReaderReady(page, '第 1 / 2 节');
  await page.evaluate(() => {
    type Location = { index: number };
    type View = HTMLElement & {
      getCFI?: (index: number, range?: Range) => string;
      resolveCFI?: (cfi: string) => Location | null;
    };
    const view = document.querySelector('foliate-view') as View | null;
    if (!view?.getCFI || !view.resolveCFI) throw new Error('expected the live Foliate CFI methods');
    const getCFI = view.getCFI.bind(view);
    const resolveCFI = view.resolveCFI.bind(view);
    const calls: Array<{ cfi: string; index: number; text: string; resolvedIndex: number | null }> = [];
    view.getCFI = (index, range) => {
      const cfi = getCFI(index, range);
      calls.push({ cfi, index, text: range?.toString() ?? '', resolvedIndex: null });
      return cfi;
    };
    view.resolveCFI = (cfi) => {
      const resolved = resolveCFI(cfi);
      const call = calls.findLast(({ cfi: recorded }) => recorded === cfi);
      if (call) call.resolvedIndex = resolved?.index ?? null;
      return resolved;
    };
    (window as Window & { __BR1_C8C_LOCATORS__?: () => typeof calls }).__BR1_C8C_LOCATORS__ = () => [...calls];
  });
  const dialog = page.getByRole('dialog', { name: '脚注预览' });
  await frame.locator('#body-source').evaluate((element) => {
    const range = element.ownerDocument.createRange();
    range.selectNodeContents(element);
    element.ownerDocument.getSelection()?.removeAllRanges();
    element.ownerDocument.getSelection()?.addRange(range);
    element.ownerDocument.dispatchEvent(new Event('selectionchange'));
  });
  await frame.locator('#ref').click();
  await expect(dialog).toBeVisible();
  const beforeSelection = await dialog.locator('.footnote-body').boundingBox();
  await selectC8CPopupTextByMouse(page);
  expect(await dialog.locator('.footnote-body').boundingBox()).toEqual(beforeSelection);

  const actions = page.getByRole('toolbar', { name: '脚注选区操作' });
  await expect(page.getByRole('toolbar', { name: '选中文本操作' })).toHaveCount(0);
  await expect(actions.getByRole('button', { name: '朗读' })).toBeDisabled();
  await actions.getByRole('button', { name: '高亮' }).click();
  await expect(dialog.getByRole('status')).toHaveText('高亮已更新');
  expect(await dialog.locator('.footnote-body').boundingBox()).toEqual(beforeSelection);
  await actions.getByRole('button', { name: '高亮' }).click();
  await expect(dialog.getByRole('status')).toHaveText('高亮已更新');

  await c8cNative(page, () =>
    (window as Window & { __BR1_C8C_NATIVE__?: { setPrompts: (values: Array<string | null>) => void } })
      .__BR1_C8C_NATIVE__?.setPrompts([null, 'first note', 'second note'])
  );
  await actions.getByRole('button', { name: '笔记' }).click();
  await expect(dialog.getByRole('status')).toHaveCount(0);
  await actions.getByRole('button', { name: '笔记' }).click();
  await expect(dialog.getByRole('status')).toHaveText('笔记已保存');
  await actions.getByRole('button', { name: '笔记' }).click();
  await expect(dialog.getByRole('status')).toHaveText('笔记已保存');

  const beforeReopen = await c8cNative(page, () => {
    const state = (window as Window & {
      __BR1_C8C_NATIVE__?: { notes: () => Array<{ bookKey: string; notes: Array<{ id: string; kind: string; cfi: string; text: string; note: string }> }> };
    }).__BR1_C8C_NATIVE__;
    return state?.notes() ?? [];
  });
  if (beforeReopen.length !== 1) throw new Error(`expected one persisted C8C book record, received ${beforeReopen.length}`);
  const savedRecord = beforeReopen[0];
  if (!savedRecord) throw new Error('expected the persisted C8C book record');
  const savedNotes = savedRecord.notes;
  expect(savedNotes).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: 'note', text: 'anchored popup selection', note: 'first note', cfi: expect.stringMatching(/^epubcfi\(/) }),
    expect.objectContaining({ kind: 'note', text: 'anchored popup selection', note: 'second note', cfi: expect.stringMatching(/^epubcfi\(/) })
  ]));
  expect(savedNotes).toHaveLength(2);
  expect(new Set(savedNotes.map((note) => note.cfi)).size).toBe(1);
  expect(new Set(savedNotes.map((note) => note.id)).size).toBe(2);
  const savedCfis = [...new Set(savedNotes.map((note) => note.cfi))];
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __BR1_C8C_LOCATORS__?: () => Array<unknown> }).__BR1_C8C_LOCATORS__?.() ?? []
  )).toEqual(expect.arrayContaining(savedCfis.map((cfi) =>
    expect.objectContaining({ cfi, index: 1, text: 'anchored popup selection', resolvedIndex: 1 })
  )));
  await dialog.getByRole('button', { name: '关闭脚注' }).click();
  await expect(page.getByRole('toolbar', { name: '选中文本操作' }).filter({ hasText: 'anchored popup selection' })).toHaveCount(0);

  await page.evaluate(() => {
    const copied: string[] = [];
    const shared: string[] = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => copied.push(text) } });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async ({ text }: { text: string }) => shared.push(text) });
    (window as Window & { __BR1_C8C_SOURCE_TOOLS__?: { copied: string[]; shared: string[] } }).__BR1_C8C_SOURCE_TOOLS__ = { copied, shared };
  });
  for (const action of ['复制', '分享', '书内搜索', '词典', '百科', '翻译'] as const) {
    await frame.locator('#ref').click();
    await selectC8CPopupText(page);
    await page.getByRole('toolbar', { name: '脚注选区操作' }).getByRole('button', { name: action }).click();
    if (action === '书内搜索') await expect(page.getByPlaceholder('搜索正文内容')).toHaveValue('anchored popup selection');
    if (action === '词典' || action === '百科' || action === '翻译') {
      await expect(page.getByRole('tab', { name: action === '翻译' ? '翻译模式' : 'AI 助手' })).toBeVisible();
      await expect.poll(() => page.evaluate((action) => {
        const entry = Object.entries(localStorage).find(([key]) => key.startsWith('br1.reader.assistance.history:'));
        const history = entry ? JSON.parse(entry[1]) as Array<{ request?: { provider?: string; kind?: string; text?: string; term?: string } }> : [];
        return history.some(({ request }) => request?.kind === (action === '翻译' ? 'translation' : 'lookup') &&
          (action === '翻译' ? request?.text : request?.provider) === (action === '翻译' ? 'anchored popup selection' : action === '词典' ? 'dictionary' : 'wikipedia'));
      }, action)).toBe(true);
    }
  }
  await expect.poll(() => page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) => key.startsWith('br1.reader.assistance.history:'));
    return entry ? JSON.parse(entry[1]) : [];
  })).toEqual(expect.arrayContaining([
    expect.objectContaining({ request: expect.objectContaining({ kind: 'lookup', provider: 'dictionary', term: 'anchored popup selection', cfi: expect.stringMatching(/^epubcfi\(/), chapterLabel: 'S2-R04C3' }) }),
    expect.objectContaining({ request: expect.objectContaining({ kind: 'lookup', provider: 'wikipedia', term: 'anchored popup selection', cfi: expect.stringMatching(/^epubcfi\(/), chapterLabel: 'S2-R04C3' }) }),
    expect.objectContaining({ request: expect.objectContaining({ kind: 'translation', text: 'anchored popup selection', cfi: expect.stringMatching(/^epubcfi\(/), chapterLabel: 'S2-R04C3' }) })
  ]));
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __BR1_C8C_SOURCE_TOOLS__?: { copied: string[]; shared: string[] } }).__BR1_C8C_SOURCE_TOOLS__
  )).toEqual({ copied: ['anchored popup selection'], shared: ['anchored popup selection'] });

  await page.reload();
  await expect(page.frameLocator('iframe').first().locator('body')).toBeVisible({ timeout: 15000 });
  await waitForC8CReaderReady(page, '第 1 / 2 节');
  await expect.poll(() => c8cNative(page, () =>
    (window as Window & { __BR1_C8C_NATIVE__?: { calls: C8CNativeCall[] } }).__BR1_C8C_NATIVE__?.calls
      .filter(({ command }) => command === 'load_reader_notes').length ?? 0
  )).toBeGreaterThan(0);
  expect(await c8cNative(page, () => {
    const state = (window as Window & { __BR1_C8C_NATIVE__?: { notes: () => Array<{ bookKey: string; notes: unknown[] }> } }).__BR1_C8C_NATIVE__;
    return state?.notes() ?? [];
  })).toEqual(beforeReopen);
  await page.getByLabel('阅读侧栏标签').getByRole('tab', { name: '笔记' }).click();
  await expect(page.getByRole('region', { name: '笔记面板' })).toContainText('anchored popup selection');
});

test('C8C keeps synthetic popup tools unanchored, reports native failures, and persists explicit offline provenance', async ({ page }) => {
  await installC8CDesktop(page);
  const frame = await openEpub(
    page,
    'c8c-synthetic-tools',
    '<p><span id="synthetic" class="zhangyue-footnote" data-wr-footernote="synthetic popup text">*</span></p>'
  );
  await waitForC8CReaderReady(page, '第 1 / 1 节');
  await page.evaluate(() => {
    const copied: string[] = [];
    const shared: string[] = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => copied.push(text) } });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async ({ text }: { text: string }) => shared.push(text) });
    (window as Window & { __BR1_C8C_TOOLS__?: { copied: string[]; shared: string[] } }).__BR1_C8C_TOOLS__ = { copied, shared };
  });
  await frame.locator('#synthetic').click();
  await selectC8CPopupText(page);
  const actions = page.getByRole('toolbar', { name: '脚注选区操作' });
  await expect(actions.getByRole('button', { name: '高亮' })).toBeDisabled();
  await expect(actions.getByRole('button', { name: '笔记' })).toBeDisabled();
  await expect(actions.getByRole('button', { name: '朗读' })).toBeDisabled();
  await expect(page.getByRole('toolbar', { name: '选中文本操作' })).toHaveCount(0);
  await actions.getByRole('button', { name: '复制' }).focus();
  await page.keyboard.press('Enter');
  await actions.getByRole('button', { name: '分享' }).click();
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __BR1_C8C_TOOLS__?: { copied: string[]; shared: string[] } }).__BR1_C8C_TOOLS__
  )).toEqual({ copied: ['synthetic popup text'], shared: ['synthetic popup text'] });

  await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
  await actions.getByRole('button', { name: '分享' }).click();
  await expect(page.getByRole('dialog', { name: '脚注预览' }).getByRole('status')).toHaveText('已复制分享文本');
  expect(await page.evaluate(() =>
    (window as Window & { __BR1_C8C_TOOLS__?: { copied: string[] } }).__BR1_C8C_TOOLS__?.copied
  )).toEqual(['synthetic popup text', 'synthetic popup text']);

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('clipboard denied'); } } });
  });
  await actions.getByRole('button', { name: '复制' }).click();
  await expect(page.getByRole('alert')).toHaveText('clipboard denied');

  for (const action of ['书内搜索', '词典', '百科', '翻译'] as const) {
    await frame.locator('#synthetic').click();
    await selectC8CPopupText(page);
    await page.getByRole('toolbar', { name: '脚注选区操作' }).getByRole('button', { name: action }).click();
    if (action === '书内搜索') await expect(page.getByPlaceholder('搜索正文内容')).toHaveValue('synthetic popup text');
    if (action !== '书内搜索') {
      await expect.poll(() => page.evaluate((action) => {
        const entry = Object.entries(localStorage).find(([key]) => key.startsWith('br1.reader.assistance.history:'));
        const history = entry ? JSON.parse(entry[1]) as Array<{ request?: { provider?: string; kind?: string; text?: string; term?: string } }> : [];
        return history.some(({ request }) => request?.kind === (action === '翻译' ? 'translation' : 'lookup') &&
          (action === '翻译' ? request?.text : request?.provider) === (action === '翻译' ? 'synthetic popup text' : action === '词典' ? 'dictionary' : 'wikipedia'));
      }, action)).toBe(true);
    }
  }
  await expect.poll(() => page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) => key.startsWith('br1.reader.assistance.history:'));
    return entry ? JSON.parse(entry[1]) : [];
  })).toEqual(expect.arrayContaining([
    expect.objectContaining({ request: expect.objectContaining({ kind: 'lookup', provider: 'dictionary', term: 'synthetic popup text', chapterLabel: '脚注' }) }),
    expect.objectContaining({ request: expect.objectContaining({ kind: 'lookup', provider: 'wikipedia', term: 'synthetic popup text', chapterLabel: '脚注' }) }),
    expect.objectContaining({ request: expect.objectContaining({ kind: 'translation', text: 'synthetic popup text', chapterLabel: '脚注' }) })
  ]));
  const syntheticCfiFields = await page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) => key.startsWith('br1.reader.assistance.history:'));
    const history = entry ? JSON.parse(entry[1]) as Array<{ request?: { term?: string; text?: string } }> : [];
    return history
      .filter(({ request }) => request?.term === 'synthetic popup text' || request?.text === 'synthetic popup text')
      .map(({ request }) => Object.hasOwn(request ?? {}, 'cfi'));
  });
  expect(syntheticCfiFields).toEqual([false, false, false]);
});

test('C8C refuses wrong-source and post-click stale writes only after their real pristine reads settle', async ({ page }) => {
  await installC8CDesktop(page);
  const frame = await openEpub(
    page,
    'c8c-write-admission',
    '<p id="wrong-source">wrong source</p><p><a id="ref" href="chapter-two.xhtml#note" epub:type="noteref">[1]</a></p><p><a id="replacement" href="chapter-two.xhtml#replacement-note" epub:type="noteref">[2]</a></p>',
    [{ id: 'notes', href: 'chapter-two.xhtml', body: '<aside id="note"><p>write admission text</p></aside><aside id="replacement-note"><p>replacement text</p></aside>' }]
  );
  await waitForC8CReaderReady(page, '第 1 / 2 节');
  const dialog = page.getByRole('dialog', { name: '脚注预览' });
  await frame.locator('#ref').click();
  await expect(dialog).toBeVisible();
  await page.evaluate(() => {
    type View = HTMLElement & { getCFI?: (index: number, range?: Range) => string; resolveCFI?: (cfi: string) => unknown; renderer?: { getContents?: () => Array<{ index?: number; doc?: Document }> } };
    const view = document.querySelector('foliate-view') as View | null;
    const wrong = view?.renderer?.getContents?.().find(({ index }) => index === 0)?.doc?.querySelector('#wrong-source');
    if (!view?.getCFI || !view.resolveCFI || !wrong) throw new Error('expected a real current-section CFI source');
    const range = wrong.ownerDocument.createRange();
    range.selectNodeContents(wrong);
    const wrongCfi = view.getCFI(0, range);
    const resolveCFI = view.resolveCFI.bind(view);
    view.resolveCFI = () => resolveCFI(wrongCfi);
    (window as Window & { __BR1_C8C_RESTORE_CFI__?: () => void }).__BR1_C8C_RESTORE_CFI__ = () => {
      view.resolveCFI = resolveCFI;
    };
  });
  await selectC8CPopupText(page);
  await expect(page.getByRole('toolbar', { name: '脚注选区操作' }).getByRole('button', { name: '高亮' })).toBeDisabled();
  expect(await c8cNative(page, () =>
    (window as Window & { __BR1_C8C_NATIVE__?: { calls: C8CNativeCall[] } }).__BR1_C8C_NATIVE__?.calls
      .filter(({ command }) => command === 'save_reader_notes') ?? []
  )).toEqual([]);

  await page.evaluate(() =>
    (window as Window & { __BR1_C8C_RESTORE_CFI__?: () => void }).__BR1_C8C_RESTORE_CFI__?.()
  );

  await frame.locator('#ref').click();
  await selectC8CPopupText(page);
  await expect(page.getByRole('toolbar', { name: '脚注选区操作' }).getByRole('button', { name: '高亮' })).toBeEnabled();
  await holdNextC8CPristineRead(page);
  await page.getByRole('toolbar', { name: '脚注选区操作' }).getByRole('button', { name: '高亮' }).click();
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __BR1_C8C_HELD__?: { entered: () => boolean } }).__BR1_C8C_HELD__?.entered() ?? false
  )).toBe(true);
  await dialog.getByRole('button', { name: '关闭脚注' }).click();
  await releaseC8CHeldRead(page);
  expect(await c8cNative(page, () =>
    (window as Window & { __BR1_C8C_NATIVE__?: { calls: C8CNativeCall[] } }).__BR1_C8C_NATIVE__?.calls
      .filter(({ command }) => command === 'save_reader_notes') ?? []
  )).toEqual([]);

  await frame.locator('#ref').click();
  await selectC8CPopupText(page);
  await holdNextC8CPristineRead(page);
  await page.getByRole('toolbar', { name: '脚注选区操作' }).getByRole('button', { name: '高亮' }).click();
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __BR1_C8C_HELD__?: { entered: () => boolean } }).__BR1_C8C_HELD__?.entered() ?? false
  )).toBe(true);
  await frame.locator('#replacement').click();
  await expect(dialog).toContainText('replacement text');
  await releaseC8CHeldRead(page);
  expect(await c8cNative(page, () =>
    (window as Window & { __BR1_C8C_NATIVE__?: { calls: C8CNativeCall[] } }).__BR1_C8C_NATIVE__?.calls
      .filter(({ command }) => command === 'save_reader_notes') ?? []
  )).toEqual([]);
});

test('C8C drops a held desktop assistance completion after its popup closes', async ({ page }) => {
  await installC8CDesktop(page);
  const frame = await openEpub(
    page,
    'c8c-held-assistance',
    '<p><a id="ref" href="#note" epub:type="noteref">[1]</a></p><aside id="note"><p>held assistance text</p></aside>'
  );
  await waitForC8CReaderReady(page, '第 1 / 1 节');
  await page.evaluate(() => {
    type Internals = { invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown> };
    const internals = (window as Window & { __TAURI_INTERNALS__?: Internals }).__TAURI_INTERNALS__;
    if (!internals) throw new Error('expected the browser Tauri bridge');
    const invoke = internals.invoke.bind(internals);
    let entered = false;
    let completed = false;
    let release: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    internals.invoke = async (command, args) => {
      if (command === 'lookup_reader_assistance') {
        entered = true;
        await gate;
      }
      try {
        return await invoke(command, args);
      } finally {
        if (command === 'lookup_reader_assistance') completed = true;
      }
    };
    (window as Window & { __BR1_C8C_HELD_ASSISTANCE__?: { entered: () => boolean; completed: () => boolean; release: () => void } }).__BR1_C8C_HELD_ASSISTANCE__ = {
      entered: () => entered,
      completed: () => completed,
      release: () => release?.()
    };
  });
  await frame.locator('#ref').click();
  await selectC8CPopupText(page);
  const dialog = page.getByRole('dialog', { name: '脚注预览' });
  await page.getByRole('toolbar', { name: '脚注选区操作' }).getByRole('button', { name: '词典' }).click();
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __BR1_C8C_HELD_ASSISTANCE__?: { entered: () => boolean } }).__BR1_C8C_HELD_ASSISTANCE__?.entered() ?? false
  )).toBe(true);
  await expect.poll(() => c8cPersistedHistoryFor(page, 'held assistance text')).toEqual([]);
  await dialog.getByRole('button', { name: '关闭脚注' }).click();
  await page.evaluate(() =>
    (window as Window & { __BR1_C8C_HELD_ASSISTANCE__?: { release: () => void } }).__BR1_C8C_HELD_ASSISTANCE__?.release()
  );
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __BR1_C8C_HELD_ASSISTANCE__?: { completed: () => boolean } }).__BR1_C8C_HELD_ASSISTANCE__?.completed() ?? false
  )).toBe(true);
  await expect.poll(() => c8cPersistedHistoryFor(page, 'held assistance text')).toEqual([]);
  await expect(page.getByRole('tab', { name: 'AI 助手' })).toHaveCount(0);
});

test('C8C never persists a held scoped result after A to B to A route churn', async ({ page }) => {
  test.setTimeout(60_000);
  await installC8CDesktop(page);
  const firstUrl = '/samples/c8c-assistance-a.epub';
  const secondUrl = '/samples/c8c-assistance-b.epub';
  await page.goto('/library');
  const [firstArchive, secondArchive] = await Promise.all([
    buildEpub(page, [{ id: 'a', href: 'a.xhtml', body: '<p><a id="ref" href="#note" epub:type="noteref">[1]</a></p><aside id="note"><p>A held assistance</p></aside>' }]),
    buildEpub(page, [{ id: 'b', href: 'b.xhtml', body: '<p>B replacement book</p>' }])
  ]);
  await page.route(`**${firstUrl}`, (route) => route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(firstArchive) }));
  await page.route(`**${secondUrl}`, (route) => route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from(secondArchive) }));
  const readerHref = (url: string, label: string) =>
    `/reader?${new URLSearchParams({ source: 'asset', url, label }).toString()}`;
  await page.goto(readerHref(firstUrl, 'C8C assistance A'));
  await waitForC8CReaderReady(page, '第 1 / 1 节');
  await expect(page.frameLocator('iframe').first().locator('#ref')).toBeVisible({ timeout: 15000 });
  await page.evaluate(() => {
    type Internals = { invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown> };
    const internals = (window as Window & { __TAURI_INTERNALS__?: Internals }).__TAURI_INTERNALS__;
    if (!internals) throw new Error('expected the browser Tauri bridge');
    const invoke = internals.invoke.bind(internals);
    let entered = false;
    let completed = false;
    let release: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    internals.invoke = async (command, args) => {
      if (command === 'lookup_reader_assistance') {
        entered = true;
        await gate;
      }
      try {
        return await invoke(command, args);
      } finally {
        if (command === 'lookup_reader_assistance') completed = true;
      }
    };
    (window as Window & { __BR1_C8C_CROSS_BOOK__?: { entered: () => boolean; completed: () => boolean; release: () => void } }).__BR1_C8C_CROSS_BOOK__ = {
      entered: () => entered,
      completed: () => completed,
      release: () => release?.()
    };
  });
  await page.frameLocator('iframe').first().locator('#ref').click();
  await selectC8CPopupText(page);
  await page.getByRole('toolbar', { name: '脚注选区操作' }).getByRole('button', { name: '词典' }).click();
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __BR1_C8C_CROSS_BOOK__?: { entered: () => boolean } }).__BR1_C8C_CROSS_BOOK__?.entered() ?? false
  )).toBe(true);
  await expect.poll(() => c8cPersistedHistoryFor(page, 'A held assistance')).toEqual([]);

  await navigateC8C(page, readerHref(secondUrl, 'C8C assistance B'));
  await waitForC8CReaderReady(page, '第 1 / 1 节');
  await expect(page.frameLocator('iframe').first().locator('body')).toContainText('B replacement book', { timeout: 15000 });
  await expect.poll(() => c8cPersistedHistoryFor(page, 'A held assistance')).toEqual([]);
  await navigateC8C(page, readerHref(firstUrl, 'C8C assistance A'));
  await waitForC8CReaderReady(page, '第 1 / 1 节');
  await expect(page.frameLocator('iframe').first().locator('#ref')).toBeVisible({ timeout: 15000 });
  await page.evaluate(() =>
    (window as Window & { __BR1_C8C_CROSS_BOOK__?: { release: () => void } }).__BR1_C8C_CROSS_BOOK__?.release()
  );
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __BR1_C8C_CROSS_BOOK__?: { completed: () => boolean } }).__BR1_C8C_CROSS_BOOK__?.completed() ?? false
  )).toBe(true);
  await expect.poll(() => c8cPersistedHistoryFor(page, 'A held assistance')).toEqual([]);
});

test('C8C shows the actual native note-save failure in the popup action feedback', async ({ page }) => {
  await installC8CDesktop(page);
  const frame = await openEpub(
    page,
    'c8c-save-failure',
    '<p><a id="ref" href="#note" epub:type="noteref">[1]</a></p><aside id="note"><p>save failure text</p></aside>'
  );
  await waitForC8CReaderReady(page, '第 1 / 1 节');
  await page.evaluate(() =>
    (window as Window & { __BR1_C8C_NATIVE__?: { failNextSave: () => void } }).__BR1_C8C_NATIVE__?.failNextSave()
  );
  await frame.locator('#ref').click();
  await selectC8CPopupText(page);
  await page.getByRole('toolbar', { name: '脚注选区操作' }).getByRole('button', { name: '高亮' }).click();
  await expect(page.getByRole('dialog', { name: '脚注预览' }).getByRole('alert'))
    .toHaveText('C8C native note save failed');
});

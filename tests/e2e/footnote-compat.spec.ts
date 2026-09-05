import { expect, test } from '@playwright/test';
import path from 'node:path';

const foliateRoot = path.resolve(process.cwd(), '../foliate-js');
const zipWriterUrl = `/@fs/${foliateRoot}/node_modules/@zip.js/zip.js/index.js`;

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
  await frame.locator('#delayed-numeric-note').click();
  await expect.poll(() => sectionStatus(1)).toBe('entered');
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: '下一页', exact: true }).first().click();
  await expect.poll(nextStatus).toBe('entered');
  await releaseSection(1);
  await expect.poll(() => sectionStatus(1)).toBe('completed');
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

import { expect, test } from '@playwright/test';
import path from 'node:path';

const foliateRoot = path.resolve(process.cwd(), '../foliate-js');
const zipWriterUrl = `/@fs/${foliateRoot}/node_modules/@zip.js/zip.js/index.js`;
const readerUrl = '/src/lib/reader/foliate.ts';

const chapterBody = `
  <p id="before">before sibling</p>
  <p id="cfi-host">prefix <warichu data-c13a="custom">same</warichu><span data-c13a="first-neighbor">same</span><span data-c13a="second-neighbor">same</span> suffix</p>
  <p id="class-host"><span class="warichu" data-c13a="class-marker">class annotation</span><span class="warichuu" data-c13a="legacy-class-marker">legacy class annotation</span></p>
  <aside id="annotation" epub:type="annotation"><warichu data-c13a="annotation-custom">annotation custom</warichu><span class="warichu" data-c13a="annotation-class">annotation class</span></aside>
  <p id="after">after sibling</p>`;

const buildEpub = (page: import('@playwright/test').Page) =>
  page.evaluate(async ({ zipWriterUrl, chapterBody }) => {
    const { BlobWriter, TextReader, ZipWriter } = await import(/* @vite-ignore */ zipWriterUrl);
    const writer = new ZipWriter(new BlobWriter());
    await writer.add('mimetype', new TextReader('application/epub+zip'), { level: 0 });
    await writer.add(
      'META-INF/container.xml',
      new TextReader('<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
    );
    await writer.add(
      'OPS/content.opf',
      new TextReader('<?xml version="1.0"?><package version="3.0" unique-identifier="id" xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">c13a</dc:identifier><dc:title>C13A warichu evidence</dc:title><dc:language>ja</dc:language></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>')
    );
    await writer.add(
      'OPS/chapter.xhtml',
      new TextReader(`<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>C13A</title></head><body>${chapterBody}</body></html>`)
    );
    return Array.from(new Uint8Array(await (await writer.close()).arrayBuffer()));
  }, { zipWriterUrl, chapterBody });

test('C13A records the current shared sanitizer contract without evaluating authored payloads', async ({ page }) => {
  await page.goto('/library');

  const result = await page.evaluate(async ({ readerUrl }) => {
    const reader = await import(/* @vite-ignore */ readerUrl);
    const source = `<!doctype html><html><body><p id="source"><warichu id="custom" class="warichu author-marker" data-c13a="custom" onclick="window.__C13A__=true">割<b>注&#x20000;</b></warichu><span id="class-marker" class="warichu" data-c13a="class">class</span><span id="legacy-class-marker" class="warichuu" data-c13a="legacy-class">legacy class</span><span id="ordinary" class="ordinary">ordinary</span></p><a id="unsafe-link" href="javascript:window.__C13A__=true">unsafe</a><script>window.__C13A__=true</script></body></html>`;
    const transformTypes = ['text/html', 'application/xhtml+xml'] as const;
    const transform = async (type: (typeof transformTypes)[number]) => {
      const transformTarget = new EventTarget();
      reader.installReaderBookTransformGuards({ transformTarget });
      const detail = { data: source, type, name: `c13a.${type === 'text/html' ? 'html' : 'xhtml'}` };
      transformTarget.dispatchEvent(new CustomEvent('data', { detail }));
      const serialized = String(await detail.data);
      const document = new DOMParser().parseFromString(serialized, type);
      return {
        type,
        customTag: document.querySelector('warichu') !== null,
        customId: document.querySelector('#custom') !== null,
        nestedText: document.querySelector('#source')?.textContent,
        classMarker: document.querySelector('#class-marker')?.getAttribute('class'),
        legacyClassMarker: document.querySelector('#legacy-class-marker')?.getAttribute('class'),
        ordinary: document.querySelector('#ordinary')?.textContent,
        unsafeHref: document.querySelector('#unsafe-link')?.getAttribute('href') ?? null,
        executableMarkup: /<script|onclick=|javascript:/i.test(serialized)
      };
    };
    const svgSource = '<svg xmlns="http://www.w3.org/2000/svg" onload="window.__C13A__=true"><text id="svg-text">svg text</text><circle cx="5" cy="5" r="4"/><script>window.__C13A__=true</script></svg>';
    const svgTarget = new EventTarget();
    reader.installReaderBookTransformGuards({ transformTarget: svgTarget });
    const svgDetail = { data: svgSource, type: 'image/svg+xml', name: 'c13a.svg' };
    svgTarget.dispatchEvent(new CustomEvent('data', { detail: svgDetail }));
    const svg = String(await svgDetail.data);
    const svgDocument = new DOMParser().parseFromString(svg, 'image/svg+xml');
    return {
      resources: await Promise.all(transformTypes.map(transform)),
      svg: {
        root: svgDocument.documentElement.localName,
        text: svgDocument.querySelector('#svg-text')?.textContent,
        circle: svgDocument.querySelector('circle') !== null,
        executableMarkup: /<script|onload=|javascript:/i.test(svg)
      }
    };
  }, { readerUrl });

  for (const resource of result.resources) {
    expect(resource).toMatchObject({
      customTag: false,
      customId: false,
      nestedText: '割注𠀀classlegacy classordinary',
      classMarker: 'warichu',
      legacyClassMarker: 'warichuu',
      ordinary: 'ordinary',
      unsafeHref: null,
      executableMarkup: false
    });
  }
  expect(result.svg).toEqual({
    root: 'svg',
    text: 'svg text',
    circle: true,
    executableMarkup: false
  });
});

test('C13A records the current pristine/rendered divergence and legacy CFI migration witness', async ({ page }) => {
  await page.goto('/library');
  const archive = await buildEpub(page);

  const result = await page.evaluate(async ({ archive, readerUrl }) => {
    const { ensureFoliateViewDefinition, loadReaderBookDocument } = await import(/* @vite-ignore */ readerUrl);
    type NativeView = HTMLElement & {
      open: (book: unknown) => Promise<void>;
      close: () => void;
      getCFI: (index: number, range: Range) => string;
      resolveCFI: (cfi: string) => { anchor: (document: Document) => Range | null } | null;
    };
    const source = new File([new Uint8Array(archive)], 'c13a-warichu.epub', { type: 'application/epub+zip' });
    const before = new Uint8Array(await source.arrayBuffer());
    const book = await loadReaderBookDocument(source);
    let view: NativeView | undefined;
    try {
      const section = book.sections?.[0] as { createDocument?: () => Promise<Document>; load?: () => Promise<string> } | undefined;
      if (!section?.createDocument || !section.load) throw new Error('expected one EPUB section with source and rendered loaders');
      const pristine = await section.createDocument();
      const resource = await section.load();
      const rendered = new DOMParser().parseFromString(await (await fetch(resource)).text(), 'application/xhtml+xml');
      // This candidate begins with the real sanitized tree. It only restores
      // inert marker wrappers, so locator differences cannot come from source
      // whitespace, head markup, resource URLs, or loader behavior.
      const legacyControl = rendered.cloneNode(true) as Document;
      const retainedCandidate = rendered.cloneNode(true) as Document;
      const retainMarker = (selector: string, prefix: string, marker: string) => {
        const host = retainedCandidate.querySelector(selector);
        const original = host?.firstChild;
        if (!host || !(original instanceof Text) || !original.data.startsWith(prefix)) {
          throw new Error(`expected sanitized ${selector} text for retained candidate`);
        }
        const markerText = original.splitText(prefix.length);
        const warichu = retainedCandidate.createElementNS('http://www.w3.org/1999/xhtml', 'warichu');
        warichu.setAttribute('data-c13a', marker);
        host.insertBefore(warichu, markerText);
        warichu.append(markerText);
      };
      retainMarker('#cfi-host', 'prefix ', 'custom');
      retainMarker('#annotation', '', 'annotation-custom');
      const candidateWithoutMarkers = retainedCandidate.cloneNode(true) as Document;
      for (const marker of candidateWithoutMarkers.querySelectorAll('warichu')) {
        marker.replaceWith(...Array.from(marker.childNodes));
      }
      const serializeBody = (document: Document) => {
        const body = document.querySelector('body');
        if (!body) throw new Error('expected XHTML body for candidate comparison');
        return new XMLSerializer().serializeToString(body);
      };
      const after = new Uint8Array(await source.arrayBuffer());
      const text = (document: Document, selector: string) => {
        const node = document.querySelector(selector)?.firstChild;
        if (!(node instanceof Text)) throw new Error(`expected text node for ${selector}`);
        return node;
      };
      const describe = (range: Range | null) => {
        if (!range) return null;
        const endpoint = (node: Node, offset: number) => {
          const parent = node.parentElement;
          return { tag: parent?.localName ?? null, marker: parent?.getAttribute('data-c13a') ?? null, offset };
        };
        return {
          text: range.toString(),
          start: endpoint(range.startContainer, range.startOffset),
          end: endpoint(range.endContainer, range.endOffset)
        };
      };
      const resolve = (anchor: (document: Document) => Range | null, document: Document) => {
        try {
          const range = anchor(document);
          return range ? { status: 'resolved' as const, range: describe(range) } : { status: 'null' as const };
        } catch {
          return { status: 'error' as const };
        }
      };
      const host = rendered.querySelector('#cfi-host');
      const oldCustomText = host?.firstChild;
      if (!(oldCustomText instanceof Text) || !oldCustomText.data.startsWith('prefix ')) {
        throw new Error('expected current unwrapped custom-tag text in the rendered document');
      }
      const firstNeighbor = text(rendered, '[data-c13a="first-neighbor"]');
      const secondNeighbor = text(rendered, '[data-c13a="second-neighbor"]');
      const classMarker = text(rendered, '[data-c13a="class-marker"]');
      const customStart = 'prefix '.length;
      const cases: Record<string, Range> = {};
      const inside = rendered.createRange();
      inside.setStart(oldCustomText, customStart);
      inside.setEnd(oldCustomText, oldCustomText.length);
      cases.inside = inside;
      const cross = rendered.createRange();
      cross.setStart(oldCustomText, customStart + 1);
      cross.setEnd(firstNeighbor, firstNeighbor.length);
      cases.cross = cross;
      const following = rendered.createRange();
      following.selectNodeContents(secondNeighbor);
      cases.following = following;
      const classMarkerRange = rendered.createRange();
      classMarkerRange.selectNodeContents(classMarker);
      cases.classMarker = classMarkerRange;
      await ensureFoliateViewDefinition();
      view = document.createElement('foliate-view') as NativeView;
      document.body.append(view);
      await view.open(book);
      const records = Object.fromEntries(Object.entries(cases).map(([name, range]) => {
        const cfi = view!.getCFI(0, range);
        const location = view!.resolveCFI(cfi);
        if (!location) throw new Error(`expected native CFI location for ${name}`);
        return [name, {
          cfi,
          legacy: describe(range),
          legacyRoundTrip: resolve(location.anchor, legacyControl),
          retainedCandidate: resolve(location.anchor, retainedCandidate)
        }];
      }));
      return {
        inputBytesUnchanged: before.length === after.length && before.every((byte, index) => byte === after[index]),
        pristine: {
          customTags: pristine.querySelectorAll('warichu').length,
          annotationCustom: pristine.querySelector('#annotation warichu') !== null,
          classMarkers: Array.from(pristine.querySelectorAll('[data-c13a$="class-marker"], [data-c13a="annotation-class"]')).map((node) => node.getAttribute('class'))
        },
        rendered: {
          customTags: rendered.querySelectorAll('warichu').length,
          annotationCustom: rendered.querySelector('#annotation warichu') !== null,
          classMarkers: Array.from(rendered.querySelectorAll('[data-c13a$="class-marker"], [data-c13a="annotation-class"]')).map((node) => node.getAttribute('class'))
        },
        retainedCandidate: {
          customTags: retainedCandidate.querySelectorAll('warichu').length,
          classMarkers: Array.from(retainedCandidate.querySelectorAll('[data-c13a$="class-marker"], [data-c13a="annotation-class"]')).map((node) => node.getAttribute('class'))
        },
        candidateOnlyRetainsMarkers:
          serializeBody(candidateWithoutMarkers) === serializeBody(rendered),
        records
      };
    } finally {
      view?.close();
      view?.remove();
      await book.destroy?.();
    }
  }, { archive, readerUrl });

  expect(result.inputBytesUnchanged).toBe(true);
  expect(result.pristine).toEqual({
    customTags: 2,
    annotationCustom: true,
    classMarkers: ['warichu', 'warichuu', 'warichu']
  });
  expect(result.rendered).toEqual({
    customTags: 0,
    annotationCustom: false,
    classMarkers: ['warichu', 'warichuu', 'warichu']
  });
  expect(result.retainedCandidate).toEqual({
    customTags: 2,
    classMarkers: ['warichu', 'warichuu', 'warichu']
  });
  expect(result.candidateOnlyRetainsMarkers).toBe(true);
  for (const record of Object.values(result.records)) {
    expect(record.legacyRoundTrip).toEqual({ status: 'resolved', range: record.legacy });
  }
  expect(result.records.inside).toMatchObject({
    cfi: expect.stringMatching(/^epubcfi\(/),
    legacy: { text: 'same', start: { tag: 'p', marker: null, offset: 'prefix '.length } },
    retainedCandidate: { status: 'null' }
  });
  expect(result.records.cross.legacy?.text).toBe('amesame');
  expect(result.records.cross.retainedCandidate).toEqual({ status: 'null' });
  expect(result.records.following).toMatchObject({
    legacy: { text: 'same', start: { tag: 'span', marker: 'second-neighbor', offset: 0 } },
    retainedCandidate: {
      status: 'resolved',
      range: { text: 'same', start: { tag: 'span', marker: 'first-neighbor', offset: 0 } }
    }
  });
  expect(result.records.classMarker).toMatchObject({
    legacy: { text: 'class annotation', start: { tag: 'span', marker: 'class-marker', offset: 0 } },
    retainedCandidate: {
      status: 'resolved',
      range: { text: 'class annotation', start: { tag: 'span', marker: 'class-marker', offset: 0 } }
    }
  });
});

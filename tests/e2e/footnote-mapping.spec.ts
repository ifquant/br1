import { expect, test } from '@playwright/test';

const footnoteExcerptUrl = '/src/lib/reader/footnoteExcerpt.ts';

test('maps repeated preview text to its original node in each chapter without text search', async ({ page }) => {
  await page.goto('/library');

  const result = await page.evaluate(async (moduleUrl) => {
    const { createFootnoteExcerpt } = await import(/* @vite-ignore */ moduleUrl);
    const chapter = (title: string) => {
      const doc = document.implementation.createHTMLDocument(title);
      doc.body.innerHTML = '<aside><p>same <span id="first">repeat</span> same <span id="second">repeat</span></p></aside>';
      return doc;
    };
    const mapSecondRepeat = (doc: Document) => {
      const target = doc.querySelector('#second')!;
      const before = doc.body.innerHTML;
      const excerpt = createFootnoteExcerpt(target);
      const preview = doc.createElement('div');
      preview.innerHTML = excerpt.excerptHtml;
      const selected = preview.querySelectorAll('span').item(1)!.firstChild!;
      const selection = doc.createRange();
      selection.setStart(selected, 0);
      selection.setEnd(selected, selected.textContent!.length);
      const mapped = excerpt.resolveRange(preview, selection);
      return {
        html: excerpt.excerptHtml,
        sourceUnchanged: doc.body.innerHTML === before,
        mapsSecondNode: mapped?.startContainer === target.firstChild && mapped.endContainer === target.firstChild,
        offsets: mapped ? [mapped.startOffset, mapped.endOffset] : null
      };
    };

    return [mapSecondRepeat(chapter('one')), mapSecondRepeat(chapter('two'))];
  }, footnoteExcerptUrl);

  expect(result).toEqual([
    expect.objectContaining({ sourceUnchanged: true, mapsSecondNode: true, offsets: [0, 6] }),
    expect.objectContaining({ sourceUnchanged: true, mapsSecondNode: true, offsets: [0, 6] })
  ]);
  expect(result[0].html).toBe(result[1].html);
});

test('preserves raw entity, astral UTF-16, whitespace, and element-boundary offsets', async ({ page }) => {
  await page.goto('/library');

  const result = await page.evaluate(async (moduleUrl) => {
    const { createFootnoteExcerpt } = await import(/* @vite-ignore */ moduleUrl);
    const doc = document.implementation.createHTMLDocument('utf16');
    doc.body.innerHTML = '<div id="note"> \n<p>\u00a0 A&amp;B 😀<em>tail</em> \u00a0</p> \n</div>';
    const target = doc.querySelector('#note')!;
    const source = target.querySelector('p')!;
    const sourceText = source.firstChild!;
    const excerpt = createFootnoteExcerpt(doc.querySelector('#note'));
    const preview = doc.createElement('div');
    preview.innerHTML = excerpt.excerptHtml;
    const previewParagraph = preview.querySelector('p')!;
    const previewText = previewParagraph.firstChild!;
    const select = (start: Node, startOffset: number, end: Node, endOffset: number) => {
      const range = doc.createRange();
      range.setStart(start, startOffset);
      range.setEnd(end, endOffset);
      return excerpt.resolveRange(preview, range);
    };
    const entity = select(previewText, 3, previewText, 4);
    const astralHalf = select(previewText, 6, previewText, 7);
    const element = select(previewParagraph, 0, previewParagraph, 1);
    return {
      htmlHasNoTopLevelWhitespace: excerpt.excerptHtml === excerpt.excerptHtml.trim(),
      innerWhitespace: previewText.textContent,
      normalizedText: excerpt.excerptText,
      entity: entity && [entity.startContainer === sourceText, entity.startOffset, entity.endOffset],
      astralHalf: astralHalf && [astralHalf.startContainer === sourceText, astralHalf.startOffset, astralHalf.endOffset],
      element: element && [element.startContainer === sourceText, element.startOffset, element.endContainer === sourceText, element.endOffset]
    };
  }, footnoteExcerptUrl);

  expect(result).toEqual({
    htmlHasNoTopLevelWhitespace: true,
    innerWhitespace: '\u00a0 A&B 😀',
    normalizedText: 'A&B 😀tail',
    entity: [true, 3, 4],
    astralHalf: [true, 6, 7],
    element: [true, 0, true, 8]
  });
});

test('maps retained text through removed and unwrapped markup, but rejects a bridged source gap', async ({ page }) => {
  await page.goto('/library');

  const result = await page.evaluate(async (moduleUrl) => {
    const { createFootnoteExcerpt } = await import(/* @vite-ignore */ moduleUrl);
    const doc = document.implementation.createHTMLDocument('sanitized');
    doc.body.innerHTML = '<aside><p id="note">keep <a id="link">link <span id="inner">inner</span></a><script>bridge</script><style>also-removed</style> after</p></aside>';
    const source = doc.querySelector('#note')!;
    const linkText = doc.querySelector('#link')!.firstChild!;
    const innerText = doc.querySelector('#inner')!.firstChild!;
    const excerpt = createFootnoteExcerpt(source);
    const preview = doc.createElement('div');
    preview.innerHTML = excerpt.excerptHtml;
    const paragraph = preview.querySelector('p')!;
    const link = paragraph.firstChild!;
    const inner = paragraph.querySelector('span')!.firstChild!;
    const select = (start: Node, startOffset: number, end: Node, endOffset: number) => {
      const range = doc.createRange();
      range.setStart(start, startOffset);
      range.setEnd(end, endOffset);
      return excerpt.resolveRange(preview, range);
    };
    // Re-parsing the sanitized HTML merges the text on either side of the
    // unwrapped anchor. The preview selection still starts at raw offset 5.
    const mappedLink = select(link, 5, link, 9);
    const mappedInner = select(inner, 0, inner, 5);
    const bridge = select(paragraph, 0, paragraph, paragraph.childNodes.length);
    return {
      html: excerpt.excerptHtml,
      link: mappedLink && [mappedLink.startContainer === linkText, mappedLink.startOffset, mappedLink.endOffset],
      inner: mappedInner && [mappedInner.startContainer === innerText, mappedInner.startOffset, mappedInner.endOffset],
      bridgeIsNull: bridge === null
    };
  }, footnoteExcerptUrl);

  expect(result.html).not.toMatch(/<(a|script|style)\b/i);
  expect(result).toMatchObject({ link: [true, 0, 4], inner: [true, 0, 5], bridgeIsNull: true });
});

test('maps checked dt/dd and generic trailing source ranges', async ({ page }) => {
  await page.goto('/library');

  const result = await page.evaluate(async (moduleUrl) => {
    const { createFootnoteExcerpt } = await import(/* @vite-ignore */ moduleUrl);
    const doc = document.implementation.createHTMLDocument('checked');
    doc.body.innerHTML = '<dl><dt><a id="reference">1</a> term</dt><dd id="definition">definition</dd><dd>more</dd></dl><div><p><a id="back">back</a> generic note</p> trailing generic <p><a>stop</a></p></div>';
    const previewFor = (excerpt: ReturnType<typeof createFootnoteExcerpt>) => {
      const preview = doc.createElement('div');
      preview.innerHTML = excerpt.excerptHtml;
      return preview;
    };
    const map = (excerpt: ReturnType<typeof createFootnoteExcerpt>, preview: Element, node: Node, start: number, end: number) => {
      const range = doc.createRange();
      range.setStart(node, start);
      range.setEnd(node, end);
      return excerpt.resolveRange(preview, range);
    };
    const definition = doc.querySelector('#definition')!.firstChild!;
    const checkedExcerpt = createFootnoteExcerpt(doc.querySelector('#reference'), true);
    const checkedPreview = previewFor(checkedExcerpt);
    const checked = map(checkedExcerpt, checkedPreview, checkedPreview.firstChild!, 6, 16);
    const trailingSource = doc.querySelector('#back')!.parentElement!.nextSibling!;
    const genericExcerpt = createFootnoteExcerpt(doc.querySelector('#back'), true);
    const genericPreview = previewFor(genericExcerpt);
    const generic = map(genericExcerpt, genericPreview, genericPreview.lastChild!, 0, 17);
    return {
      checked: checked && [checked.startContainer === definition, checked.startOffset, checked.endOffset],
      generic: generic && [generic.startContainer === trailingSource, generic.startOffset, generic.endOffset]
    };
  }, footnoteExcerptUrl);

  expect(result).toEqual({ checked: [true, 0, 10], generic: [true, 0, 17] });
});

test('rejects changed or invalid provenance inputs while preserving iframe and XML sources', async ({ page }) => {
  await page.goto('/library');

  const result = await page.evaluate(async (moduleUrl) => {
    const { createFootnoteExcerpt } = await import(/* @vite-ignore */ moduleUrl);
    const mapOnlyText = (doc: Document, target: Element) => {
      const excerpt = createFootnoteExcerpt(target);
      const preview = doc.createElement('div');
      preview.innerHTML = excerpt.excerptHtml;
      const textNode = preview.querySelector('p')!.firstChild!;
      const range = doc.createRange();
      range.selectNodeContents(textNode);
      return { excerpt, preview, range };
    };
    const source = document.implementation.createHTMLDocument('mutable');
    source.body.innerHTML = '<p id="note">source</p><p id="outside">outside</p>';
    const target = source.querySelector('#note')!;
    const before = source.body.innerHTML;
    const mapped = mapOnlyText(source, target);
    const sourceUnchangedAtCreation = source.body.innerHTML === before;
    const collapsed = source.createRange();
    collapsed.setStart(mapped.preview.querySelector('p')!.firstChild!, 0);
    collapsed.collapse(true);
    const outside = source.createRange();
    outside.selectNodeContents(source.querySelector('#outside')!);
    const wrongTextRoot = source.createElement('div');
    wrongTextRoot.innerHTML = '<p>wrong</p>';
    const wrongTextSelection = source.createRange();
    wrongTextSelection.selectNodeContents(wrongTextRoot.querySelector('p')!.firstChild!);
    target.textContent = 'changed source';

    const frame = document.createElement('iframe');
    document.body.append(frame);
    const iframeDocument = frame.contentDocument!;
    iframeDocument.body.innerHTML = '<p id="note">iframe</p>';
    const iframeTarget = iframeDocument.querySelector('#note')!;
    const iframeBefore = iframeDocument.body.innerHTML;
    const iframeMapped = mapOnlyText(iframeDocument, iframeTarget).excerpt;
    const iframePreview = iframeDocument.createElement('div');
    iframePreview.innerHTML = iframeMapped.excerptHtml;
    const iframeRange = iframeDocument.createRange();
    iframeRange.selectNodeContents(iframePreview.querySelector('p')!.firstChild!);
    const iframeSource = iframeMapped.resolveRange(iframePreview, iframeRange);

    const xml = new DOMParser().parseFromString('<root><p id="note">xml</p></root>', 'application/xml');
    const xmlTarget = xml.querySelector('#note')!;
    const xmlBefore = new XMLSerializer().serializeToString(xml);
    const xmlMapped = mapOnlyText(xml, xmlTarget).excerpt;
    const xmlPreview = xml.createElement('preview');
    xmlPreview.innerHTML = xmlMapped.excerptHtml;
    const xmlRange = xml.createRange();
    xmlRange.selectNodeContents(xmlPreview.firstChild!.firstChild!);
    const xmlSource = xmlMapped.resolveRange(xmlPreview, xmlRange);

    const cdata = new DOMParser().parseFromString('<root><p id="note"><![CDATA[same]]>same</p></root>', 'application/xml');
    const cdataTarget = cdata.querySelector('#note')!;
    const cdataBefore = new XMLSerializer().serializeToString(cdata);
    const cdataExcerpt = createFootnoteExcerpt(cdataTarget);
    const cdataPreview = cdata.createElement('preview');
    cdataPreview.innerHTML = cdataExcerpt.excerptHtml;
    const cdataRange = cdata.createRange();
    cdataRange.selectNodeContents(cdataPreview.querySelector('p')!.firstChild!);
    const cdataSource = cdataExcerpt.resolveRange(cdataPreview, cdataRange);

    const noTarget = createFootnoteExcerpt(null);
    const empty = source.createElement('p');
    const emptyExcerpt = createFootnoteExcerpt(empty);
    const synthetic = source.createElement('p');
    synthetic.textContent = 'synthetic';
    const syntheticExcerpt = createFootnoteExcerpt(synthetic);
    const syntheticPreview = source.createElement('div');
    syntheticPreview.innerHTML = syntheticExcerpt.excerptHtml;
    const syntheticRange = source.createRange();
    syntheticRange.selectNodeContents(syntheticPreview);

    const invalidatedBy = (mutate: (doc: Document, target: Element) => void) => {
      const doc = document.implementation.createHTMLDocument('source-guard');
      doc.body.innerHTML = '<p id="note"><span id="first">same</span><span id="second">same</span></p>';
      const guardedTarget = doc.querySelector('#note')!;
      const guarded = createFootnoteExcerpt(guardedTarget);
      const preview = doc.createElement('div');
      preview.innerHTML = guarded.excerptHtml;
      const range = doc.createRange();
      range.selectNodeContents(preview.querySelector('p')!);
      mutate(doc, guardedTarget);
      return guarded.resolveRange(preview, range) === null;
    };
    return {
      sourceUnchangedAtCreation,
      changedSource: mapped.excerpt.resolveRange(mapped.preview, mapped.range) === null,
      wrongTextRoot: mapped.excerpt.resolveRange(wrongTextRoot, wrongTextSelection) === null,
      collapsed: mapped.excerpt.resolveRange(mapped.preview, collapsed) === null,
      outside: mapped.excerpt.resolveRange(mapped.preview, outside) === null,
      iframe: iframeSource?.startContainer === iframeTarget.firstChild && iframeDocument.body.innerHTML === iframeBefore,
      xml: xmlSource?.startContainer === xmlTarget.firstChild && new XMLSerializer().serializeToString(xml) === xmlBefore,
      cdata: cdataExcerpt.excerptHtml === '<p><![CDATA[same]]>same</p>' && cdataExcerpt.excerptText === 'samesame' && cdataPreview.textContent === 'samesame' &&
        cdataSource === null && new XMLSerializer().serializeToString(cdata) === cdataBefore,
      nullTarget: noTarget.excerptHtml === '' && noTarget.resolveRange(source.createElement('div'), source.createRange()) === null,
      emptyTarget: emptyExcerpt.excerptHtml === '' && emptyExcerpt.resolveRange(source.createElement('div'), source.createRange()) === null,
      synthetic: syntheticExcerpt.resolveRange(syntheticPreview, syntheticRange) === null,
      movedSource: invalidatedBy((doc) => doc.body.append(doc.querySelector('#first')!)),
      reorderedSource: invalidatedBy((doc, target) => target.append(doc.querySelector('#first')!))
    };
  }, footnoteExcerptUrl);

  expect(result).toEqual({
    sourceUnchangedAtCreation: true,
    changedSource: true,
    wrongTextRoot: true,
    collapsed: true,
    outside: true,
    iframe: true,
    xml: true,
    cdata: true,
    nullTarget: true,
    emptyTarget: true,
    movedSource: true,
    reorderedSource: true,
    synthetic: true
  });
});

test('reverse maps source annotations through raw UTF-16 provenance and clips only the visible excerpt', async ({ page }) => {
  await page.goto('/library');

  const result = await page.evaluate(async (moduleUrl) => {
    const { createFootnoteExcerpt } = await import(/* @vite-ignore */ moduleUrl);
    const doc = document.implementation.createHTMLDocument('reverse');
    doc.body.innerHTML = '<p id="before">before</p><div id="note"> \n<p id="source">A😀<em>tail</em></p> \n</div><p id="after">after</p>';
    const target = doc.querySelector('#note')!;
    const source = doc.querySelector('#source')!;
    const sourceText = source.firstChild!;
    const tail = source.querySelector('em')!.firstChild!;
    const excerpt = createFootnoteExcerpt(target);
    const preview = doc.createElement('div');
    preview.innerHTML = excerpt.excerptHtml;
    preview.prepend(doc.createComment('svelte-start'));
    preview.append(doc.createComment('svelte-end'));
    const map = (range: Range) => {
      const mapped = excerpt.resolvePreviewRange(preview, range);
      const forward = mapped && excerpt.resolveRange(preview, mapped.range);
      return mapped && {
        text: mapped.range.toString(),
        clipped: mapped.clipped,
        forward: forward && [
          forward.startContainer === sourceText || forward.startContainer === tail,
          forward.toString()
        ]
      };
    };
    const full = doc.createRange();
    full.setStart(source, 0);
    full.setEnd(source, source.childNodes.length);
    const crossNode = doc.createRange();
    crossNode.setStart(sourceText, 1);
    crossNode.setEnd(tail, 2);
    const trimmed = doc.createRange();
    trimmed.selectNodeContents(target);
    const left = doc.createRange();
    left.setStart(doc.querySelector('#before')!.firstChild!, 2);
    left.setEnd(sourceText, sourceText.textContent!.length);
    const right = doc.createRange();
    right.setStart(tail, 0);
    right.setEnd(doc.querySelector('#after')!.firstChild!, 2);
    const both = doc.createRange();
    both.setStart(doc.querySelector('#before')!.firstChild!, 2);
    both.setEnd(doc.querySelector('#after')!.firstChild!, 2);
    return {
      full: map(full),
      crossNode: map(crossNode),
      trimmed: map(trimmed),
      left: map(left),
      right: map(right),
      both: map(both)
    };
  }, footnoteExcerptUrl);

  expect(result).toEqual({
    full: { text: 'A😀tail', clipped: false, forward: [true, 'A😀tail'] },
    crossNode: { text: '😀ta', clipped: false, forward: [true, '😀ta'] },
    trimmed: { text: 'A😀tail', clipped: true, forward: [true, 'A😀tail'] },
    left: { text: 'A😀', clipped: true, forward: [true, 'A😀'] },
    right: { text: 'tail', clipped: true, forward: [true, 'tail'] },
    both: { text: 'A😀tail', clipped: true, forward: [true, 'A😀tail'] }
  });
});

test('reverse mapper rejects equal-text ambiguity, gaps, mutations, CDATA, and foreign source ranges', async ({ page }) => {
  await page.goto('/library');

  const result = await page.evaluate(async (moduleUrl) => {
    const { createFootnoteExcerpt } = await import(/* @vite-ignore */ moduleUrl);
    const previewFor = (doc: Document, excerpt: ReturnType<typeof createFootnoteExcerpt>) => {
      const preview = doc.createElement('div');
      preview.innerHTML = excerpt.excerptHtml;
      return preview;
    };
    const doc = document.implementation.createHTMLDocument('identity');
    doc.body.innerHTML = '<p id="first">repeat</p><p id="second">repeat</p><p id="outside">outside</p>';
    const second = doc.querySelector('#second')!;
    const excerpt = createFootnoteExcerpt(second);
    const preview = previewFor(doc, excerpt);
    const firstRange = doc.createRange();
    firstRange.selectNodeContents(doc.querySelector('#first')!);
    const secondRange = doc.createRange();
    secondRange.selectNodeContents(second);
    const exactRange = doc.createRange();
    exactRange.selectNode(second);
    const touchingRange = doc.createRange();
    touchingRange.setStart(doc.body, 0);
    touchingRange.setEnd(doc.body, 1);
    const outsideRange = doc.createRange();
    outsideRange.selectNodeContents(doc.querySelector('#outside')!);
    const mappedSecond = excerpt.resolvePreviewRange(preview, secondRange);
    const foreign = document.implementation.createHTMLDocument('foreign');
    foreign.body.innerHTML = '<p>repeat</p>';
    const foreignRange = foreign.createRange();
    foreignRange.selectNodeContents(foreign.body.firstChild!);

    const gapDoc = document.implementation.createHTMLDocument('gap');
    gapDoc.body.innerHTML = '<p id="note">keep<script>removed</script><style>also-removed</style>after</p>';
    const gapTarget = gapDoc.querySelector('#note')!;
    const gapExcerpt = createFootnoteExcerpt(gapTarget);
    const gapRange = gapDoc.createRange();
    gapRange.selectNodeContents(gapTarget);
    const leadingGapDoc = document.implementation.createHTMLDocument('leading-gap');
    leadingGapDoc.body.innerHTML = '<p id="note"><script>removed</script>keep</p>';
    const leadingGapTarget = leadingGapDoc.querySelector('#note')!;
    const leadingGapExcerpt = createFootnoteExcerpt(leadingGapTarget);
    const leadingGapRange = leadingGapDoc.createRange();
    leadingGapRange.selectNodeContents(leadingGapTarget);
    const trailingGapDoc = document.implementation.createHTMLDocument('trailing-gap');
    trailingGapDoc.body.innerHTML = '<p id="note">keep<style>removed</style></p>';
    const trailingGapTarget = trailingGapDoc.querySelector('#note')!;
    const trailingGapExcerpt = createFootnoteExcerpt(trailingGapTarget);
    const trailingGapRange = trailingGapDoc.createRange();
    trailingGapRange.selectNodeContents(trailingGapTarget);

    const sourceMutation = document.implementation.createHTMLDocument('source-mutation');
    sourceMutation.body.innerHTML = '<p id="note">source</p>';
    const sourceTarget = sourceMutation.querySelector('#note')!;
    const sourceExcerpt = createFootnoteExcerpt(sourceTarget);
    const sourcePreview = previewFor(sourceMutation, sourceExcerpt);
    const sourceRange = sourceMutation.createRange();
    sourceRange.selectNodeContents(sourceTarget);
    sourceTarget.textContent = 'changed';

    const previewMutation = document.implementation.createHTMLDocument('preview-mutation');
    previewMutation.body.innerHTML = '<p id="note">source</p>';
    const previewTarget = previewMutation.querySelector('#note')!;
    const previewExcerpt = createFootnoteExcerpt(previewTarget);
    const changedPreview = previewFor(previewMutation, previewExcerpt);
    changedPreview.innerHTML = '<p><span>source</span></p>';
    const previewRange = previewMutation.createRange();
    previewRange.selectNodeContents(previewTarget);

    const cdata = new DOMParser().parseFromString('<root><p id="note"><![CDATA[same]]>same</p></root>', 'application/xml');
    const cdataTarget = cdata.querySelector('#note')!;
    const cdataExcerpt = createFootnoteExcerpt(cdataTarget);
    const cdataPreview = previewFor(cdata, cdataExcerpt);
    const cdataRange = cdata.createRange();
    cdataRange.selectNodeContents(cdataTarget);
    return {
      exactDuplicateIdentity: !!mappedSecond && mappedSecond.range.toString() === 'repeat' &&
        excerpt.resolveRange(preview, mappedSecond.range)?.startContainer === second.firstChild,
      exactRange: excerpt.resolvePreviewRange(preview, exactRange)?.range.toString() === 'repeat',
      otherDuplicateIsDisjoint: excerpt.resolvePreviewRange(preview, firstRange) === null,
      touchingIsDisjoint: excerpt.resolvePreviewRange(preview, touchingRange) === null,
      disjoint: excerpt.resolvePreviewRange(preview, outsideRange) === null,
      removedGap: gapExcerpt.resolvePreviewRange(previewFor(gapDoc, gapExcerpt), gapRange) === null,
      leadingRemovedGap: leadingGapExcerpt.resolvePreviewRange(previewFor(leadingGapDoc, leadingGapExcerpt), leadingGapRange) === null,
      trailingRemovedGap: trailingGapExcerpt.resolvePreviewRange(previewFor(trailingGapDoc, trailingGapExcerpt), trailingGapRange) === null,
      changedSource: sourceExcerpt.resolvePreviewRange(sourcePreview, sourceRange) === null,
      changedPreview: previewExcerpt.resolvePreviewRange(changedPreview, previewRange) === null,
      cdata: cdataExcerpt.resolvePreviewRange(cdataPreview, cdataRange) === null,
      wrongOwner: excerpt.resolvePreviewRange(preview, foreignRange) === null
    };
  }, footnoteExcerptUrl);

  expect(result).toEqual({
    exactDuplicateIdentity: true,
    exactRange: true,
    otherDuplicateIsDisjoint: true,
    touchingIsDisjoint: true,
    disjoint: true,
    removedGap: true,
    leadingRemovedGap: true,
    trailingRemovedGap: true,
    changedSource: true,
    changedPreview: true,
    cdata: true,
    wrongOwner: true
  });
});

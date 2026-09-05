// Own the native excerpt and its source correspondence together. Sanitization
// can remove text, so a later selection must never locate its source by search.
import type { ReaderNote, ReaderSelectionState } from './types';

export type ReaderFootnoteAction = 'highlight' | 'note' | 'copy' | 'search' |
  'dictionary' | 'wikipedia' | 'translate' | 'share';

/** A live popup selection, not a replacement for the route's body selection. */
export type ReaderFootnoteSelection = {
  text: string;
  source: ReaderSelectionState | null;
  isCurrent: () => boolean;
  validate: () => Promise<ReaderSelectionState | null>;
};

export type ReaderFootnoteAnnotation = {
  note: ReaderNote;
  range: Range;
  clipped: boolean;
};

export type ReaderFootnoteRecordAction = 'edit' | 'delete';

/** Ephemeral popup payload. Neither DOM correspondence nor callbacks are saved. */
export type ReaderFootnoteRequest = {
  label: string;
  href: string;
  excerptHtml: string;
  excerptText: string;
  fallbackNavigationTarget: string;
  resolveSelection?: (root: Element, range: Range) => Promise<ReaderSelectionState | null>;
  resolveAnnotations?: (root: Element, notes: ReaderNote[]) => Promise<ReaderFootnoteAnnotation[]>;
  isCurrent?: () => boolean;
  dismiss?: () => void;
};

export type FootnoteExcerpt = {
  excerptHtml: string;
  excerptText: string;
  resolveRange: (previewRoot: Element, selection: Range) => Range | null;
  resolvePreviewRange: (previewRoot: Element, sourceRange: Range) => { range: Range; clipped: boolean } | null;
};

const emptyExcerpt = (): FootnoteExcerpt => ({
  excerptHtml: '', excerptText: '', resolveRange: () => null, resolvePreviewRange: () => null
});

const allowedTags = new Set([
  'p', 'ol', 'ul', 'li', 'blockquote', 'em', 'strong', 'b', 'i',
  'code', 'sup', 'sub', 'span', 'br'
]);

const textNodes = (root: Node): Text[] => {
  if (root.nodeType === 3) return [root as Text];
  const doc = root.nodeType === 9 ? root as Document : root.ownerDocument!;
  const walker = doc.createTreeWalker(root, 4);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) nodes.push(node as Text);
  return nodes;
};

const hasCdata = (root: Node): boolean => {
  const doc = root.nodeType === 9 ? root as Document : root.ownerDocument;
  return !!doc?.createTreeWalker(root, 8).nextNode();
};

const nodeBelongsTo = (doc: Document, node: Node) =>
  node === doc || node.ownerDocument === doc;

const overlaps = (first: Range, second: Range) =>
  first.compareBoundaryPoints(Range.END_TO_START, second) < 0 &&
  first.compareBoundaryPoints(Range.START_TO_END, second) > 0;

const pointAt = (root: Element, offset: number, end: boolean): [Text, number] | null => {
  let cursor = 0;
  for (const node of textNodes(root)) {
    const next = cursor + node.length;
    if (offset < next || (end && offset === next)) return [node, offset - cursor];
    cursor = next;
  }
  return null;
};

const comparableHtml = (root: Element): string => {
  // Pristine EPUBs are XML, loaded frames and the popup are HTML. Compare the
  // same HTML serialization, excluding namespace declarations and UI comments.
  const clone = root.ownerDocument.implementation.createHTMLDocument().importNode(root, true);
  for (const element of clone.querySelectorAll('[xmlns]')) element.removeAttribute('xmlns');
  const walker = clone.ownerDocument.createTreeWalker(clone, 128);
  const comments: Comment[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) comments.push(node as Comment);
  comments.forEach((comment) => comment.remove());
  return clone.innerHTML;
};

const excerptRange = (target: Element, checked: boolean): Range | null => {
  const doc = target.ownerDocument;
  const range = doc.createRange();
  if (!checked) {
    range.selectNode(target.closest('aside, li, p, section, div') || target);
    return range;
  }
  const inline = 'a, span, sup, sub, em, strong, i, b, small, big';
  let element = target;
  while (element.matches(inline) && element.parentElement) element = element.parentElement;
  if (element === doc.body) {
    const sibling = target.nextElementSibling;
    if (!sibling || sibling.matches(inline)) return null;
    element = sibling;
  }
  // Keep the C3 extraction boundary: only the generic backlink branch has a
  // three-child limit. Return the source Range before any cloning loses identity.
  const enclosingNote = element.closest('li') || element.closest('.note');
  if (element.matches('li, aside')) {
    range.selectNodeContents(element);
  } else if (element.matches('dt')) {
    range.setStartBefore(element);
    let last = element;
    while (last.nextElementSibling?.matches('dd')) last = last.nextElementSibling;
    range.setEndAfter(last);
  } else if (enclosingNote) {
    range.selectNodeContents(enclosingNote);
  } else if (element.querySelector('a') && element.children.length <= 3) {
    range.setStartBefore(element);
    let next = element.nextElementSibling;
    while (next && !next.querySelector('a')) next = next.nextElementSibling;
    if (next) range.setEndBefore(next);
    else range.setEndAfter(element.parentNode!.lastChild!);
  } else return null;
  return range;
};

/** Build the existing inert preview, retaining exact source Text identities.
 * This maps DOM ranges only; callers must separately validate book/section/CFI
 * identity before offering any anchored write operation. */
export const createFootnoteExcerpt = (target: Element | null, checked = false): FootnoteExcerpt => {
  if (!target || !target.ownerDocument.documentElement?.contains(target)) return emptyExcerpt();
  const range = excerptRange(target, checked);
  if (!range) return emptyExcerpt();
  const doc = target.ownerDocument;
  const preview = doc.createElement('div');
  preview.append(range.cloneContents());

  // ponytail: scan the common-ancestor subtree once per excerpt; prune disjoint
  // branches if profiling large chapters shows this scan dominates popup latency.
  const source = textNodes(range.commonAncestorContainer)
    .filter((node) => node === range.startContainer || node === range.endContainer || range.intersectsNode(node))
    .map((node) => ({
      node,
      offset: node === range.startContainer ? range.startOffset : 0,
      end: node === range.endContainer ? range.endOffset : node.length,
      data: node.data
    }));
  const cloned = textNodes(preview);
  const provenance = new WeakMap<Text, (typeof source)[number]>();
  // cloneContents preserves text-node order, including partial boundary nodes.
  // Fail mapping closed if that contract cannot be demonstrated for this input.
  // CDATA contributes to Range/textContent offsets but is not a Text segment.
  // Keep its excerpt visible, but reject mapping rather than shift node identity.
  const canMap = !doc.createTreeWalker(preview, 8).nextNode() &&
    source.length === cloned.length && cloned.every((node, index) =>
    node.data === source[index].data.slice(source[index].offset, source[index].end)
  );
  if (canMap) cloned.forEach((node, index) => provenance.set(node, source[index]));

  for (const node of Array.from(preview.querySelectorAll('*'))) {
    const tag = node.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style') node.remove();
    else if (!allowedTags.has(tag)) node.replaceWith(...Array.from(node.childNodes));
    else for (const name of node.getAttributeNames()) node.removeAttribute(name);
  }
  const rawHtml = preview.innerHTML;
  const excerptHtml = rawHtml.trim();
  const comparableExcerptHtml = comparableHtml(preview).trim();
  // Preserve the existing HTML trim exactly. Only literal top-level whitespace
  // removed from serialization shifts text offsets; encoded entities do not.
  const leadingTrim = rawHtml.length - rawHtml.trimStart().length;
  const trailingTrim = rawHtml.length - rawHtml.trimEnd().length;
  const rawText = preview.textContent || '';
  const text = rawText.slice(leadingTrim, rawText.length - trailingTrim);
  const excerptText = text.replace(/\s+/g, ' ').trim();
  if (!excerptText) return emptyExcerpt();
  let cursor = 0;
  const segments = textNodes(preview).map((node) => {
    const start = cursor;
    cursor += node.length;
    return { start: start - leadingTrim, end: cursor - leadingTrim, source: provenance.get(node) };
  });

  const sourceIsInvalid = () => segments.some(({ source }, index) => !source || source.node.data !== source.data ||
    source.node.ownerDocument !== doc || !doc.documentElement?.contains(source.node) ||
    !range.isPointInRange(source.node, source.offset) || !range.isPointInRange(source.node, source.end) ||
    (index > 0 && !(segments[index - 1].source!.node.compareDocumentPosition(source.node) & 4)));
  const resolveRange = (previewRoot: Element, selection: Range) => {
    if (!canMap || selection.collapsed || previewRoot.textContent !== text ||
      !previewRoot.contains(selection.startContainer) || !previewRoot.contains(selection.endContainer) || sourceIsInvalid()) return null;
    const prefix = previewRoot.ownerDocument.createRange();
    prefix.selectNodeContents(previewRoot);
    prefix.setEnd(selection.startContainer, selection.startOffset);
    const start = prefix.toString().length;
    prefix.setEnd(selection.endContainer, selection.endOffset);
    const end = prefix.toString().length;
    const first = segments.find((segment) => start >= segment.start && start < segment.end);
    const last = segments.find((segment) => end > segment.start && end <= segment.end);
    if (!first?.source || !last?.source || start >= end) return null;
    const mapped = doc.createRange();
    mapped.setStart(first.source.node, first.source.offset + start - first.start);
    mapped.setEnd(last.source.node, last.source.offset + end - last.start);
    // Removed script/style text can create a gap between surviving nodes.
    // Never bridge that gap and pretend the resulting source text was selected.
    return mapped.toString() === selection.toString() ? mapped : null;
  };
  const resolvePreviewRange = (previewRoot: Element, sourceRange: Range) => {
    if (!canMap || sourceRange.collapsed || !nodeBelongsTo(doc, sourceRange.startContainer) ||
      !nodeBelongsTo(doc, sourceRange.endContainer) || !doc.documentElement?.contains(sourceRange.startContainer) ||
      !doc.documentElement.contains(sourceRange.endContainer) || previewRoot.textContent !== text ||
      comparableHtml(previewRoot) !== comparableExcerptHtml || hasCdata(previewRoot) || sourceIsInvalid()) return null;
    if (!overlaps(sourceRange, range)) return null;

    let clipped = sourceRange.compareBoundaryPoints(Range.START_TO_START, range) < 0 ||
      sourceRange.compareBoundaryPoints(Range.END_TO_END, range) > 0;
    const intersection = doc.createRange();
    if (sourceRange.compareBoundaryPoints(Range.START_TO_START, range) < 0) {
      intersection.setStart(range.startContainer, range.startOffset);
    } else {
      intersection.setStart(sourceRange.startContainer, sourceRange.startOffset);
    }
    if (sourceRange.compareBoundaryPoints(Range.END_TO_END, range) > 0) {
      intersection.setEnd(range.endContainer, range.endOffset);
    } else {
      intersection.setEnd(sourceRange.endContainer, sourceRange.endOffset);
    }

    // Native Range comparisons choose the actual intersection. Text segments
    // then normalize element endpoints without inventing text-position rules.
    const intersected = source.map((source) => {
      const { node } = source;
      const nodeRange = doc.createRange();
      nodeRange.selectNodeContents(node);
      if (!overlaps(intersection, nodeRange)) return null;
      return {
        source,
        start: intersection.startContainer === node ? Math.max(intersection.startOffset, source.offset) : source.offset,
        end: intersection.endContainer === node ? Math.min(intersection.endOffset, source.end) : source.end
      };
    }).filter((segment): segment is { source: (typeof source)[number]; start: number; end: number } =>
      !!segment && segment.start < segment.end);
    const rawFirst = intersected[0];
    const rawLast = intersected[intersected.length - 1];
    if (!rawFirst || !rawLast) return null;
    // Sanitization gaps are not excerpt boundaries. A stored range touching
    // removed script/style text cannot be represented without lying about it.
    if (intersected.some(({ source }) => !segments.some((segment) => segment.source === source))) return null;
    const mappedSegments = intersected.map((segment) => {
      const preview = segments.find((candidate) => candidate.source === segment.source);
      if (!preview) return null;
      const start = Math.max(segment.start, segment.source.offset - preview.start);
      const end = Math.min(segment.end, segment.source.offset + text.length - preview.start);
      return start < end ? { ...segment, preview, start, end } : null;
    }).filter((segment): segment is { source: (typeof source)[number]; start: number; end: number; preview: (typeof segments)[number] } =>
      !!segment);
    // Top-level serialization trim can hide source whitespace. It is another
    // excerpt boundary: map the visible intersection and mark it clipped.
    const first = mappedSegments[0];
    const last = mappedSegments[mappedSegments.length - 1];
    if (!first || !last) return null;
    clipped ||= first.source !== rawFirst.source || first.start !== rawFirst.start ||
      last.source !== rawLast.source || last.end !== rawLast.end;
    const previewStart = first.preview.start + first.start - first.source.offset;
    const previewEnd = last.preview.start + last.end - last.source.offset;
    if (previewStart < 0 || previewEnd > text.length || previewStart >= previewEnd) return null;
    const previewStartPoint = pointAt(previewRoot, previewStart, false);
    const previewEndPoint = pointAt(previewRoot, previewEnd, true);
    if (!previewStartPoint || !previewEndPoint) return null;
    const mappedPreview = previewRoot.ownerDocument.createRange();
    mappedPreview.setStart(...previewStartPoint);
    mappedPreview.setEnd(...previewEndPoint);

    const canonical = doc.createRange();
    canonical.setStart(first.source.node, first.start);
    canonical.setEnd(last.source.node, last.end);
    const forward = resolveRange(previewRoot, mappedPreview);
    if (!forward || forward.startContainer !== canonical.startContainer || forward.startOffset !== canonical.startOffset ||
      forward.endContainer !== canonical.endContainer || forward.endOffset !== canonical.endOffset ||
      forward.toString() !== canonical.toString() || mappedPreview.toString() !== canonical.toString()) return null;
    return { range: mappedPreview, clipped };
  };

  return { excerptHtml, excerptText, resolveRange, resolvePreviewRange };
};

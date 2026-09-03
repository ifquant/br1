export type ReaderPoint = { x: number; y: number };
export type DocPosition = { node: Node; offset: number };
export type SectionDoc = { doc: Document; index: number };
export type SectionAnchor = SectionDoc & { pos: DocPosition };
export type CrossDocSegment = SectionDoc & { start: DocPosition; end: DocPosition };
export type SectionContent = { doc?: Document | null; index?: number };

const frameOf = (doc: Document) =>
  (doc.defaultView?.frameElement as HTMLIFrameElement | null | undefined) ?? null;

export const findContentAtPoint = (
  contents: SectionContent[],
  point: ReaderPoint
): SectionDoc | null => {
  for (const { doc, index } of contents) {
    if (!doc || index == null) continue;
    const rect = frameOf(doc)?.getBoundingClientRect();
    if (
      rect &&
      rect.width > 0 &&
      rect.height > 0 &&
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom
    ) {
      return { doc, index };
    }
  }
  return null;
};

export const toDocPoint = (doc: Document, point: ReaderPoint): ReaderPoint | null => {
  const frame = frameOf(doc);
  const rect = frame?.getBoundingClientRect();
  if (!frame || !rect || rect.width === 0 || rect.height === 0) return null;
  return {
    x: (point.x - rect.left) * (frame.clientWidth ? frame.clientWidth / rect.width : 1),
    y: (point.y - rect.top) * (frame.clientHeight ? frame.clientHeight / rect.height : 1)
  };
};

export const getCaretPosition = (doc: Document, x: number, y: number): DocPosition | null => {
  const caretDocument = doc as Document & {
    caretPositionFromPoint?: (
      left: number,
      top: number
    ) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (left: number, top: number) => Range | null;
  };
  if (caretDocument.caretPositionFromPoint) {
    const position = caretDocument.caretPositionFromPoint(x, y);
    if (position) return { node: position.offsetNode, offset: position.offset };
  }
  const range = caretDocument.caretRangeFromPoint?.(x, y);
  return range ? { node: range.startContainer, offset: range.startOffset } : null;
};

export const isTextAtPoint = (doc: Document, x: number, y: number) => {
  const position = getCaretPosition(doc, x, y);
  if (!position || position.node.nodeType !== Node.TEXT_NODE) return false;
  const text = position.node as Text;
  if (!text.length) return false;
  const offset = Math.min(position.offset, text.length - 1);
  const range = doc.createRange();
  range.setStart(text, offset);
  range.setEnd(text, offset + 1);
  return Array.from(range.getClientRects()).some(
    (rect) =>
      x >= rect.left - 12 &&
      x <= rect.right + 12 &&
      y >= rect.top - 12 &&
      y <= rect.bottom + 12
  );
};

export const getDocTextBounds = (doc: Document) => {
  if (!doc.body) return null;
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
  });
  const first = walker.nextNode() as Text | null;
  if (!first) return null;
  let last = first;
  let next: Node | null;
  while ((next = walker.nextNode())) last = next as Text;
  return {
    start: { node: first, offset: 0 },
    end: { node: last, offset: last.length }
  };
};

export const getCaretPositionInText = (doc: Document, x: number, y: number) => {
  const bounds = getDocTextBounds(doc);
  if (!bounds) return null;
  const probe = doc.createRange();
  let top = Infinity;
  let bottom = -Infinity;
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
  });
  let node: Node | null;
  while ((node = walker.nextNode())) {
    probe.selectNodeContents(node);
    const rect = probe.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    top = Math.min(top, rect.top);
    bottom = Math.max(bottom, rect.bottom);
  }
  if (y < top) return bounds.start;
  if (y > bottom) return bounds.end;
  return getCaretPosition(doc, x, y);
};

export const rangeFromPositions = (
  doc: Document,
  start: DocPosition,
  end: DocPosition
): Range | null => {
  const range = doc.createRange();
  try {
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
  } catch {
    return null;
  }
  return range.collapsed ? null : range;
};

export const buildCrossDocSegments = (
  anchor: SectionAnchor,
  target: SectionAnchor,
  contents: SectionContent[]
): CrossDocSegment[] => {
  if (anchor.doc === target.doc || anchor.index === target.index) return [];
  const [first, last] = anchor.index < target.index ? [anchor, target] : [target, anchor];
  const loadedIndexes = new Set(
    contents.flatMap(({ doc, index }) => (doc && index != null ? [index] : []))
  );
  for (let index = first.index; index <= last.index; index += 1) {
    if (!loadedIndexes.has(index)) return [];
  }
  const segments: CrossDocSegment[] = [];
  const push = (doc: Document, index: number, start: DocPosition, end: DocPosition) => {
    if (rangeFromPositions(doc, start, end)) segments.push({ doc, index, start, end });
  };
  const firstBounds = getDocTextBounds(first.doc);
  if (firstBounds) push(first.doc, first.index, first.pos, firstBounds.end);
  for (const { doc, index } of contents) {
    if (!doc || index == null || index <= first.index || index >= last.index) continue;
    const bounds = getDocTextBounds(doc);
    if (bounds) push(doc, index, bounds.start, bounds.end);
  }
  const lastBounds = getDocTextBounds(last.doc);
  if (lastBounds) push(last.doc, last.index, lastBounds.start, last.pos);
  return segments.sort((left, right) => left.index - right.index);
};

export const applyCrossDocSegments = (
  segments: CrossDocSegment[],
  contents: SectionContent[],
  anchor?: SectionAnchor | null
) => {
  const selectedDocs = new Set(segments.map((segment) => segment.doc));
  for (const { doc } of contents) {
    if (doc && !selectedDocs.has(doc)) doc.getSelection()?.removeAllRanges();
  }
  for (const { doc, start, end } of segments) {
    const selection = doc.getSelection();
    if (!selection) continue;
    const anchoredAtEnd =
      anchor?.doc === doc && anchor.pos.node === end.node && anchor.pos.offset === end.offset;
    if (anchoredAtEnd) {
      selection.setBaseAndExtent(end.node, end.offset, start.node, start.offset);
    } else {
      selection.setBaseAndExtent(start.node, start.offset, end.node, end.offset);
    }
  }
};

export const setNativeDragFrozen = (doc: Document, frozen: boolean) => {
  const root = doc.documentElement;
  const layer = doc.querySelector<HTMLElement>('.textLayer') ?? doc.body;
  if (!root || !layer) return;
  root.style.userSelect = frozen ? 'none' : '';
  root.style.webkitUserSelect = frozen ? 'none' : '';
  layer.style.userSelect = frozen ? 'text' : '';
  layer.style.webkitUserSelect = frozen ? 'text' : '';
};

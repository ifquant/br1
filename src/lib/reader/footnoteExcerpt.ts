// Own the native excerpt and its source correspondence together. Sanitization
// can remove text, so a later selection must never locate its source by search.
export type FootnoteExcerpt = {
  excerptHtml: string;
  excerptText: string;
  resolveRange: (previewRoot: Element, selection: Range) => Range | null;
};

const emptyExcerpt = (): FootnoteExcerpt => ({
  excerptHtml: '', excerptText: '', resolveRange: () => null
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

  return {
    excerptHtml,
    excerptText,
    resolveRange: (previewRoot, selection) => {
      if (!canMap || selection.collapsed || previewRoot.textContent !== text ||
        !previewRoot.contains(selection.startContainer) || !previewRoot.contains(selection.endContainer)) return null;
      if (segments.some(({ source }, index) => !source || source.node.data !== source.data ||
        source.node.ownerDocument !== doc || !doc.documentElement?.contains(source.node) ||
        !range.isPointInRange(source.node, source.offset) || !range.isPointInRange(source.node, source.end) ||
        (index > 0 && !(segments[index - 1].source!.node.compareDocumentPosition(source.node) & 4)))) return null;
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
    }
  };
};

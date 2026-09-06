const rubySelector = 'rt, rp';

export const READER_RUBY_TEXT_CSS = `
  rt {
    user-select: none;
    -webkit-user-select: none;
  }

  rp {
    display: none !important;
  }
`;

/** Native Range text, except ruby annotations never become reader action text. */
export const getReaderSelectionText = (range: Range) => {
  const root = range.commonAncestorContainer;
  const element = root.nodeType === 1 ? root as Element : root.parentElement;
  // cloneContents omits the common ancestor itself, but keeps partially selected
  // descendants. Handle annotation-only ranges before filtering the inert clone.
  if (element?.closest(rubySelector)) return '';
  const clone = range.cloneContents();
  const annotations = clone.querySelectorAll(rubySelector);
  if (!annotations.length) return range.toString();
  for (const annotation of annotations) annotation.remove();
  return clone.textContent ?? '';
};

const selectionTouchesEditableContent = (node: Node) => {
  for (let element = node.nodeType === 1 ? node as Element : node.parentElement;
    element; element = element.parentElement) {
    if (element.matches('input, textarea, [contenteditable]:not([contenteditable="false"])')) return true;
  }
  return false;
};

/** Replace native copy only for a wholly owned ruby selection with real clipboard data. */
export const copyReaderRubySelection = (event: ClipboardEvent, root: Element) => {
  const selection = root.ownerDocument.getSelection();
  const range = selection?.rangeCount === 1 && !selection.isCollapsed ? selection.getRangeAt(0) : null;
  const target = event.target;
  const targetIsEditable = typeof target === 'object' && target !== null && 'nodeType' in target &&
    selectionTouchesEditableContent(target as Node);
  if (!event.clipboardData || !range || !root.contains(range.startContainer) || !root.contains(range.endContainer) ||
    targetIsEditable || selectionTouchesEditableContent(range.startContainer) ||
    selectionTouchesEditableContent(range.endContainer)) return false;
  const rawText = range.toString();
  const text = getReaderSelectionText(range);
  if (text === rawText) return false;
  event.clipboardData.setData('text/plain', text);
  event.preventDefault();
  return true;
};

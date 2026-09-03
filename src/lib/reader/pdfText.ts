/** Reassembles paragraphs from the visual lines in a pdf.js text layer. */

export type PdfLineBreak = 'paragraph' | 'space' | 'join' | 'dehyphenate';

export type PdfLine = {
  text: string;
  left: number;
  right: number;
  top: number;
  em: number;
  firstWordWidth: number;
};

const PARAGRAPH_GAP_RATIO = 1.3;
const FONT_SIZE_TOLERANCE = 0.2;
const COLUMN_TOLERANCE_EM = 4;
const WORD_SPACE_EM = 0.3;
const HYPHEN_AT_END = /[-\u2010\u00AD]\s*$/u;
const SOFT_HYPHEN_AT_END = /\u00AD\s*$/u;
const NO_SPACE_SCRIPT =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u3000-\u303F\uFF00-\uFFEF]/u;

const isMeasured = (line: PdfLine) => line.em > 0 && line.right > line.left;

const medianPitch = (lines: PdfLine[]) => {
  const steps: number[] = [];
  for (let index = 0; index + 1 < lines.length; index += 1) {
    const current = lines[index];
    const next = lines[index + 1];
    if (!current || !next || !isMeasured(current) || !isMeasured(next)) continue;
    const step = next.top - current.top;
    if (step > 0.5 * Math.max(current.em, next.em)) steps.push(step);
  }
  if (!steps.length) return null;
  steps.sort((left, right) => left - right);
  return steps[Math.floor((steps.length - 1) / 2)] ?? null;
};

const columnEdges = (line: PdfLine, lines: PdfLine[], em: number) => {
  const group = lines.filter(
    (candidate) =>
      isMeasured(candidate) &&
      Math.abs(candidate.left - line.left) <= COLUMN_TOLERANCE_EM * em &&
      Math.abs(candidate.em - line.em) <= FONT_SIZE_TOLERANCE * em
  );
  const rights = group.map((candidate) => candidate.right).sort((left, right) => left - right);
  const right = rights[Math.ceil(0.85 * rights.length) - 1] ?? line.right;
  const bins = new Map<number, number[]>();
  for (const candidate of group) {
    const key = Math.round(candidate.left / em);
    bins.set(key, [...(bins.get(key) ?? []), candidate.left]);
  }
  let best = [line.left];
  let bestKey = -Infinity;
  for (const [key, lefts] of bins) {
    if (lefts.length > best.length || (lefts.length === best.length && key > bestKey)) {
      best = lefts;
      bestKey = key;
    }
  }
  return {
    left: best.reduce((sum, left) => sum + left, 0) / best.length,
    right
  };
};

const joinKind = (leftText: string, rightText: string): PdfLineBreak => {
  const left = leftText.trimEnd();
  const right = rightText.trimStart();
  if (SOFT_HYPHEN_AT_END.test(left)) return 'dehyphenate';
  if (HYPHEN_AT_END.test(left)) return /^\p{Ll}/u.test(right) ? 'dehyphenate' : 'join';
  if (left !== leftText || right !== rightText) return 'join';
  const last = [...left].at(-1) ?? '';
  const first = [...right][0] ?? '';
  if (NO_SPACE_SCRIPT.test(last) || NO_SPACE_SCRIPT.test(first)) return 'join';
  return 'space';
};

const classifyBreak = (
  current: PdfLine,
  next: PdfLine,
  lines: PdfLine[],
  pitch: number | null
): PdfLineBreak => {
  if (!isMeasured(current) || !isMeasured(next)) return 'paragraph';
  const em = Math.max(current.em, next.em);
  const step = next.top - current.top;
  if (Math.abs(step) < 0.5 * em && next.left >= current.right - 0.5 * em) {
    return joinKind(current.text, next.text);
  }
  if (step > PARAGRAPH_GAP_RATIO * (pitch ?? 1.2 * em)) return 'paragraph';
  if (Math.abs(current.em - next.em) > FONT_SIZE_TOLERANCE * em) return 'paragraph';
  if (
    Math.abs(current.left - next.left) > em &&
    Math.abs(current.left + current.right - next.left - next.right) < 0.5 * em
  ) {
    return 'paragraph';
  }
  const column = columnEdges(current, lines, em);
  const indent = next.left - column.left;
  if (indent > em && indent < COLUMN_TOLERANCE_EM * em && current.left - column.left < em) {
    return 'paragraph';
  }
  if (column.right - current.right > next.firstWordWidth + WORD_SPACE_EM * em) {
    return 'paragraph';
  }
  return joinKind(current.text, next.text);
};

export const classifyPdfLineBreaks = (lines: PdfLine[]): PdfLineBreak[] => {
  const pitch = medianPitch(lines);
  return lines.slice(0, -1).map((line, index) =>
    classifyBreak(line, lines[index + 1]!, lines, pitch)
  );
};

type TextLayerRow = { spans: Element[]; br: Element | null };

const splitRows = (textLayer: Element) => {
  const rows: TextLayerRow[] = [];
  let row: TextLayerRow = { spans: [], br: null };
  for (const child of Array.from(textLayer.children)) {
    if (child.tagName === 'BR') {
      row.br = child;
      rows.push(row);
      row = { spans: [], br: null };
    } else {
      row.spans.push(child);
    }
  }
  if (row.spans.length) rows.push(row);
  return rows;
};

const measureRow = ({ spans }: TextLayerRow): PdfLine => {
  const line: PdfLine = {
    text: '',
    left: Infinity,
    right: -Infinity,
    top: 0,
    em: 0,
    firstWordWidth: 0
  };
  let dominantLength = 0;
  for (const span of spans) {
    const text = span.textContent ?? '';
    line.text += text;
    const trimmed = text.trim();
    if (!trimmed) continue;
    const rect = span.getBoundingClientRect();
    line.left = Math.min(line.left, rect.left);
    line.right = Math.max(line.right, rect.right);
    if (trimmed.length > dominantLength) {
      dominantLength = trimmed.length;
      line.top = rect.top;
      line.em = rect.height;
    }
    if (!line.firstWordWidth) {
      const word = trimmed.split(/\s+/)[0] ?? '';
      line.firstWordWidth = (rect.width * word.length) / trimmed.length;
    }
  }
  return line;
};

const sliceText = (element: Element, range: Range) => {
  let text = '';
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE || !range.intersectsNode(node)) continue;
    const data = (node as Text).data;
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : data.length;
    text += data.slice(start, end);
  }
  return text;
};

export const getPdfTextLayer = (range: Range): Element | null => {
  const node = range.commonAncestorContainer;
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return element?.closest('.textLayer') ?? null;
};

export const getPdfTextFromRange = (range: Range, textLayer: Element): string => {
  const rows = splitRows(textLayer);
  const breaks = classifyPdfLineBreaks(rows.map(measureRow));
  let text = '';
  let pending = '';
  rows.forEach((row, index) => {
    for (const span of row.spans) {
      if (!range.intersectsNode(span)) continue;
      const piece = sliceText(span, range);
      if (!piece) continue;
      if (text) text += pending;
      pending = '';
      text += piece;
    }
    if (!row.br || !range.intersectsNode(row.br)) return;
    const kind = breaks[index] ?? 'paragraph';
    if (kind === 'dehyphenate') {
      text = text.replace(HYPHEN_AT_END, '');
      pending = '';
    } else {
      pending = kind === 'paragraph' ? '\n' : kind === 'space' ? ' ' : '';
    }
  });
  return text;
};

export const getPdfSelectionText = (range: Range) => {
  const textLayer = getPdfTextLayer(range);
  return textLayer ? getPdfTextFromRange(range, textLayer) : range.toString();
};

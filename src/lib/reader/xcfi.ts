/**
 * Converter between EPUB CFI and CREngine XPointer.
 * This is the minimal reader-side substrate required for KOReader parity work.
 */

// Ownership: this helper module defines one reader-domain contract that multiple
// UI surfaces depend on. Keep low-level normalization and invariants here so UI
// code can stay focused on reading semantics rather than format/runtime quirks.

import { parse, fake, collapse, fromRange, toRange, toElement } from 'foliate-js/epubcfi.js';
import type { ReaderBookDocument } from './foliate';

export type ReaderXPointer = {
  xpointer: string;
  pos0?: string;
  pos1?: string;
};

export class XCFI {
  private document: Document;
  private spineItemIndex: number;

  constructor(htmlDocument: Document, spineIndex = 0) {
    this.document = htmlDocument;
    this.spineItemIndex = spineIndex;
  }

  static extractSpineIndex(cfiOrXPath: string): number {
    try {
      if (cfiOrXPath.startsWith('epubcfi(')) {
        const collapsed = collapse(parse(cfiOrXPath));
        const spineStep = collapsed[0]?.[1]?.index;
        if (spineStep === undefined) {
          throw new Error('Cannot extract spine index from CFI');
        }
        return Math.floor((spineStep - 2) / 2);
      }

      if (cfiOrXPath.startsWith('/body/DocFragment[')) {
        const match = cfiOrXPath.match(/DocFragment\[(\d+)\]/);
        if (match) {
          return parseInt(match[1]!, 10) - 1;
        }
        throw new Error('Cannot extract spine index from XPath');
      }

      throw new Error('Unsupported format for spine index extraction');
    } catch (error) {
      throw new Error(`Cannot extract spine index from CFI/XPointer: ${cfiOrXPath} - ${error}`);
    }
  }

  xPointerToCFI(startXPointer: string, endXPointer?: string): string {
    try {
      if (endXPointer) {
        return this.convertRangeXPointerToCFI(startXPointer, endXPointer);
      }

      return this.convertPointXPointerToCFI(startXPointer);
    } catch (error) {
      throw new Error(`Failed to convert XPointer ${startXPointer}: ${error}`);
    }
  }

  cfiToXPointer(cfi: string): ReaderXPointer {
    try {
      const parts = parse(cfi);
      if (parts.parent) {
        const index = fake.toIndex(parts.parent.shift());
        if (index !== this.spineItemIndex) {
          throw new Error(
            `CFI spine index ${index} does not match converter spine index ${this.spineItemIndex}`
          );
        }
        const range = toRange(this.document, parts);
        const startXPointer = this.rangePointToXPointer(range.startContainer, range.startOffset);
        const endXPointer = this.rangePointToXPointer(range.endContainer, range.endOffset);

        return {
          xpointer: startXPointer,
          pos0: startXPointer,
          pos1: endXPointer
        };
      }

      const collapsed = collapse(parts);
      const index = fake.toIndex(parts.shift());
      if (index !== this.spineItemIndex) {
        throw new Error(
          `CFI spine index ${index} does not match converter spine index ${this.spineItemIndex}`
        );
      }
      const element = toElement(this.document, parts[0]) as Element;
      if (!element) {
        throw new Error(`Element not found for CFI: ${cfi}`);
      }
      const lastPart =
        collapsed[collapsed.length - 1]?.[collapsed[collapsed.length - 1].length - 1];
      const textOffset = lastPart?.offset;

      const xpointer =
        textOffset !== undefined
          ? this.handleTextOffset(element, textOffset)
          : this.buildXPointerPath(element);

      return { xpointer };
    } catch (error) {
      throw new Error(`Failed to convert CFI ${cfi}: ${error}`);
    }
  }

  validateCFI(cfi: string): boolean {
    try {
      parse(cfi);
      this.cfiToXPointer(cfi);
      return true;
    } catch {
      return false;
    }
  }

  validateXPointer(xpointer: string, pos1?: string): boolean {
    try {
      this.xPointerToCFI(xpointer, pos1);
      return true;
    } catch {
      return false;
    }
  }

  private convertPointXPointerToCFI(xpointer: string): string {
    const { element, textOffset } = this.parseXPointer(xpointer);

    const range = this.document.createRange();
    if (textOffset !== undefined) {
      const textNode = this.findTextNodeAtOffset(element, textOffset);
      if (textNode) {
        range.setStart(textNode.node, textNode.offset);
        range.setEnd(textNode.node, textNode.offset);
      } else {
        range.setStart(element, 0);
        range.setEnd(element, 0);
      }
    } else {
      range.setStart(element, 0);
      range.setEnd(element, 0);
    }

    const cfi = fromRange(range);
    return this.adjustSpineIndex(cfi);
  }

  private convertRangeXPointerToCFI(startXPointer: string, endXPointer: string): string {
    const startInfo = this.parseXPointer(startXPointer);
    const endInfo = this.parseXPointer(endXPointer);

    const range = this.document.createRange();
    if (startInfo.textOffset !== undefined) {
      const startTextNode = this.findTextNodeAtOffset(startInfo.element, startInfo.textOffset);
      if (startTextNode) {
        range.setStart(startTextNode.node, startTextNode.offset);
      } else {
        range.setStart(startInfo.element, 0);
      }
    } else {
      range.setStart(startInfo.element, 0);
    }

    if (endInfo.textOffset !== undefined) {
      const endTextNode = this.findTextNodeAtOffset(endInfo.element, endInfo.textOffset);
      if (endTextNode) {
        range.setEnd(endTextNode.node, endTextNode.offset);
      } else {
        range.setEnd(endInfo.element, 0);
      }
    } else {
      range.setEnd(endInfo.element, 0);
    }

    const cfi = fromRange(range);
    return this.adjustSpineIndex(cfi);
  }

  private parseXPointer(xpointer: string): { element: Element; textOffset?: number } {
    const indexedTextMatch = xpointer.match(/\/text\(\)\[(\d+)\]\.(\d+)$/);
    if (indexedTextMatch) {
      const textNodeIndex = parseInt(indexedTextMatch[1]!, 10);
      const offsetInNode = parseInt(indexedTextMatch[2]!, 10);
      const elementPath = xpointer.replace(/\/text\(\)\[\d+\]\.\d+$/, '');
      const element = this.resolveXPointerPath(elementPath);
      if (!element) {
        throw new Error(`Cannot resolve XPointer path: ${elementPath}`);
      }
      const textOffset = this.resolveIndexedTextNode(element, textNodeIndex, offsetInNode);
      return { element, textOffset };
    }

    const textOffsetMatch = xpointer.match(/\/text\(\)\.(\d+)$/);
    const textOffset = textOffsetMatch ? parseInt(textOffsetMatch[1]!, 10) : undefined;
    const elementPath =
      textOffset !== undefined ? xpointer.replace(/\/text\(\)\.\d+$/, '') : xpointer;

    const element = this.resolveXPointerPath(elementPath);
    if (!element) {
      throw new Error(`Cannot resolve XPointer path: ${elementPath}`);
    }

    return { element, textOffset };
  }

  private resolveIndexedTextNode(
    element: Element,
    textNodeIndex: number,
    offsetInNode: number
  ): number {
    let directTextCount = 0;
    let cumulativeOffset = 0;

    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        directTextCount += 1;
        if (directTextCount === textNodeIndex) {
          return cumulativeOffset + offsetInNode;
        }
        cumulativeOffset += (child.textContent || '').length;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        cumulativeOffset += (child.textContent || '').length;
      }
    }

    throw new Error(
      `Text node index ${textNodeIndex} out of bounds (found ${directTextCount} direct text nodes)`
    );
  }

  private resolveXPointerPath(path: string): Element | null {
    // Boundary: KOReader paths are rooted at CREngine's DocFragment/body shape.
    // Reject anything else here so later conversions do not silently point at the
    // wrong spine item or a DOM node outside the rendered chapter.
    const pathMatch = path.match(/^\/body\/DocFragment\[\d+\]\/body(.*)$/);
    if (!pathMatch) {
      throw new Error(`Invalid XPointer format: ${path}`);
    }

    const elementPath = pathMatch[1]!;
    let current: Element = this.document.body;

    if (!elementPath || elementPath === '') {
      return current;
    }

    const segments = elementPath.split('/').filter(Boolean);
    for (const segment of segments) {
      const segmentWithIndexMatch = segment.match(/^(\w+)\[(\d+)\]$/);
      const segmentWithoutIndexMatch = segment.match(/^(\w+)$/);

      let tagName: string;
      let index: number;

      if (segmentWithIndexMatch) {
        const [, tag, indexStr] = segmentWithIndexMatch;
        tagName = tag!;
        index = Math.max(0, parseInt(indexStr!, 10) - 1);
      } else if (segmentWithoutIndexMatch) {
        const [, tag] = segmentWithoutIndexMatch;
        tagName = tag!;
        index = 0;
      } else {
        throw new Error(`Invalid XPointer segment: ${segment}`);
      }

      const children = Array.from(current.children).filter(
        (child) =>
          !XCFI.isCfiInert(child) && child.tagName.toLowerCase() === tagName.toLowerCase()
      );

      if (index >= children.length) {
        throw new Error(`Element index ${index} out of bounds for tag ${tagName}`);
      }

      current = children[index]!;
    }

    return current;
  }

  private findTextNodeAtOffset(
    element: Element,
    offset: number
  ): { node: Text; offset: number } | null {
    const textNodes: Text[] = [];
    this.collectTextNodes(element, textNodes);

    let currentOffset = 0;

    for (const textNode of textNodes) {
      const nodeText = textNode.textContent || '';
      const nodeLength = nodeText.length;

      if (currentOffset + nodeLength >= offset) {
        return {
          node: textNode,
          offset: offset - currentOffset
        };
      }

      currentOffset += nodeLength;
    }

    if (textNodes.length > 0) {
      const lastNode = textNodes[textNodes.length - 1]!;
      return {
        node: lastNode,
        offset: (lastNode.textContent || '').length
      };
    }

    return null;
  }

  private adjustSpineIndex(cfi: string): string {
    // Boundary: foliate-js emits CFIs relative to the chapter document. Reattach
    // the outer spine step here so persisted locators still identify the book-wide
    // position that KOReader metadata expects.
    const cfiMatch = cfi.match(/^epubcfi\((.+)\)$/);
    if (!cfiMatch) {
      throw new Error(`Invalid CFI format: ${cfi}`);
    }

    const innerCfi = cfiMatch[1]!;
    const spineStep = (this.spineItemIndex + 1) * 2;

    if (innerCfi.match(/^\/6\/\d+!/)) {
      const adjustedInner = innerCfi.replace(/^\/6\/\d+!/, `/6/${spineStep}!`);
      return `epubcfi(${adjustedInner})`;
    }

    const adjustedInner = `/6/${spineStep}!${innerCfi}`;
    return `epubcfi(${adjustedInner})`;
  }

  private rangePointToXPointer(container: Node, offset: number): string {
    if (container.nodeType === Node.TEXT_NODE) {
      const element = container.parentElement || this.document.documentElement;
      return this.handleTextOffsetInElement(element, container as Text, offset);
    }

    if (container.nodeType === Node.ELEMENT_NODE) {
      const element = container as Element;
      if (offset === 0) {
        if (element.childNodes.length > 0) {
          const firstChild = element.childNodes[0] as Element;
          if (firstChild.nodeType === Node.ELEMENT_NODE) {
            return this.buildXPointerPath(element.childNodes[0] as Element);
          }
        }
        return this.buildXPointerPath(element);
      }

      const childNodes = Array.from(element.childNodes);
      const targetChild = childNodes[offset - 1] || childNodes[childNodes.length - 1];

      if (targetChild?.nodeType === Node.ELEMENT_NODE) {
        return this.buildXPointerPath(targetChild as Element);
      }

      if (targetChild?.nodeType === Node.TEXT_NODE) {
        return this.handleTextOffsetInElement(
          element,
          targetChild as Text,
          (targetChild as Text).textContent?.length || 0
        );
      }

      return this.buildXPointerPath(element);
    }

    return this.buildXPointerPath(this.document.documentElement);
  }

  private static isCfiInert(element: Element): boolean {
    return element.hasAttribute('cfi-inert');
  }

  private buildXPointerPath(targetElement: Element): string {
    const pathParts: string[] = [];
    let current: Element | null = targetElement;

    while (current && current !== this.document.documentElement) {
      const parent: Element | null = current.parentElement;
      if (!parent) break;

      const tagName = current.tagName.toLowerCase();
      let siblingIndex = 0;
      let totalSameTagSiblings = 0;
      for (const sibling of Array.from(parent.children) as Element[]) {
        if (XCFI.isCfiInert(sibling)) continue;
        if (sibling.tagName.toLowerCase() === tagName) {
          if (sibling === current) {
            siblingIndex = totalSameTagSiblings;
          }
          totalSameTagSiblings += 1;
        }
      }

      if (totalSameTagSiblings === 1) {
        pathParts.unshift(tagName);
      } else {
        pathParts.unshift(`${tagName}[${siblingIndex + 1}]`);
      }
      current = parent;
    }

    let xpointer = `/body/DocFragment[${this.spineItemIndex + 1}]`;
    if (pathParts.length > 0 && pathParts[0]!.startsWith('body')) {
      pathParts.shift();
    }
    xpointer += '/body';

    if (pathParts.length > 0) {
      xpointer += `/${pathParts.join('/')}`;
    }

    return xpointer;
  }

  private handleTextOffset(element: Element, cfiOffset: number): string {
    const textNodes: Text[] = [];
    this.collectTextNodes(element, textNodes);

    let totalChars = 0;
    let targetTextNode: Text | null = null;
    let offsetInNode = 0;

    for (const textNode of textNodes) {
      const nodeText = textNode.textContent || '';
      const nodeLength = nodeText.length;

      if (totalChars + nodeLength >= cfiOffset) {
        targetTextNode = textNode;
        offsetInNode = cfiOffset - totalChars;
        break;
      }

      totalChars += nodeLength;
    }

    if (!targetTextNode) {
      return this.buildXPointerPath(element);
    }

    const textParent = targetTextNode.parentElement || element;
    const basePath = this.buildXPointerPath(textParent);

    let directTextCount = 0;
    let directTextIndex = 0;
    for (const child of Array.from(textParent.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE && (child.textContent || '').length > 0) {
        directTextCount += 1;
        if (child === targetTextNode) {
          directTextIndex = directTextCount;
        }
      }
    }

    if (directTextCount <= 1) {
      return `${basePath}/text().${offsetInNode}`;
    }
    return `${basePath}/text()[${directTextIndex || 1}].${offsetInNode}`;
  }

  private handleTextOffsetInElement(element: Element, textNode: Text, offset: number): string {
    const textNodes: Text[] = [];
    this.collectTextNodes(element, textNodes);

    let cumulativeOffset = 0;
    for (const node of textNodes) {
      if (node === textNode) {
        cumulativeOffset += offset;
        break;
      }
      cumulativeOffset += (node.textContent || '').length;
    }

    return this.handleTextOffset(element, cumulativeOffset);
  }

  private collectTextNodes(element: Element, textNodes: Text[]): void {
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || '';
        if (text.length > 0) {
          textNodes.push(child as Text);
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        this.collectTextNodes(child as Element, textNodes);
      }
    }
  }
}

export const getCFIFromXPointer = async (
  xpointer: string,
  doc?: Document,
  index?: number,
  bookDoc?: ReaderBookDocument
) => {
  const xSpineIndex = XCFI.extractSpineIndex(xpointer);
  let converter: XCFI;
  if (index === xSpineIndex && doc) {
    converter = new XCFI(doc, index || 0);
  } else {
    const resolvedDoc = await bookDoc?.sections?.[xSpineIndex]?.createDocument?.();
    if (!resolvedDoc) throw new Error('Failed to load document for XPointer conversion.');
    converter = new XCFI(resolvedDoc, xSpineIndex || 0);
  }

  return converter.xPointerToCFI(xpointer);
};

export const getXPointerFromCFI = async (
  cfi: string,
  doc?: Document,
  index?: number,
  bookDoc?: ReaderBookDocument
): Promise<ReaderXPointer> => {
  const xSpineIndex = XCFI.extractSpineIndex(cfi);
  let converter: XCFI;
  if (index === xSpineIndex && doc) {
    converter = new XCFI(doc, index || 0);
  } else {
    const resolvedDoc = await bookDoc?.sections?.[xSpineIndex]?.createDocument?.();
    if (!resolvedDoc) throw new Error('Failed to load document for CFI conversion.');
    converter = new XCFI(resolvedDoc, xSpineIndex || 0);
  }

  return converter.cfiToXPointer(cfi);
};

export const isKoReaderXPointer = (value: string) => value.startsWith('/body/DocFragment[');

export const normalizeProgressXPointer = (xpointer: string): string => {
  let next = xpointer;
  const tailingTextOffset = /\/text\(\).*$/;
  if (next.match(tailingTextOffset)) {
    next = next.replace(tailingTextOffset, '');
  }
  const suffixNodeOffset = /\.\d+$/;
  if (next.match(suffixNodeOffset)) {
    next = next.replace(suffixNodeOffset, '');
  }
  return next;
};

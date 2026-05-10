// Ownership: this helper module defines one reader-domain contract that multiple
// UI surfaces depend on. Keep low-level normalization and invariants here so UI
// code can stay focused on reading semantics rather than format/runtime quirks.

export type ReaderCodeTokenKind =
  | 'comment'
  | 'keyword'
  | 'literal'
  | 'number'
  | 'operator'
  | 'property'
  | 'string';

export type ReaderCodeToken = {
  text: string;
  kind?: ReaderCodeTokenKind;
};

export type ReaderCodeLine = ReaderCodeToken[];

export type ReaderPlainTextBlock =
  | {
      kind: 'text';
      text: string;
    }
  | {
      kind: 'code';
      language: string;
      lines: ReaderCodeLine[];
      html: string;
    };

const CODE_FENCE_PATTERN = /^```([A-Za-z0-9_-]+)?\s*$/;
const KEYWORDS = new Set([
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'default',
  'else',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'if',
  'import',
  'in',
  'interface',
  'let',
  'new',
  'null',
  'return',
  'switch',
  'throw',
  'true',
  'try',
  'type',
  'undefined',
  'while'
]);

const isKeyword = (word: string, language: string) => {
  const normalizedLanguage = language.toLowerCase();
  if (KEYWORDS.has(word)) return true;
  if (normalizedLanguage === 'css') {
    return word === 'var' || word === 'important';
  }
  if (normalizedLanguage === 'html') {
    return word === 'doctype';
  }
  return false;
};

const pushToken = (tokens: ReaderCodeToken[], text: string, kind?: ReaderCodeTokenKind) => {
  if (!text) return;
  const previous = tokens[tokens.length - 1];
  if (previous && previous.kind === kind) {
    previous.text += text;
    return;
  }
  tokens.push(kind ? { text, kind } : { text });
};

const highlightLine = (line: string, language: string): ReaderCodeLine => {
  const tokens: ReaderCodeToken[] = [];
  let index = 0;

  while (index < line.length) {
    const rest = line.slice(index);
    const commentMatch = rest.match(/^(\/\/.*|#.*|<!--.*?-->|\/\*.*?\*\/)/);
    if (commentMatch?.[0]) {
      pushToken(tokens, commentMatch[0], 'comment');
      index += commentMatch[0].length;
      continue;
    }

    const stringMatch = rest.match(/^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/);
    if (stringMatch?.[0]) {
      pushToken(tokens, stringMatch[0], 'string');
      index += stringMatch[0].length;
      continue;
    }

    const numberMatch = rest.match(/^\b\d+(?:\.\d+)?\b/);
    if (numberMatch?.[0]) {
      pushToken(tokens, numberMatch[0], 'number');
      index += numberMatch[0].length;
      continue;
    }

    const wordMatch = rest.match(/^[A-Za-z_$][\w$-]*/);
    if (wordMatch?.[0]) {
      const word = wordMatch[0];
      if (isKeyword(word, language)) {
        pushToken(tokens, word, 'keyword');
      } else if (word === 'this' || word === 'super') {
        pushToken(tokens, word, 'literal');
      } else if (rest.slice(word.length).startsWith(':')) {
        pushToken(tokens, word, 'property');
      } else {
        pushToken(tokens, word);
      }
      index += word.length;
      continue;
    }

    const operatorMatch = rest.match(/^(=>|===|!==|==|!=|<=|>=|\+\+|--|&&|\|\||[{}()[\].,;:<>+\-*/%=!&|?])/);
    if (operatorMatch?.[0]) {
      pushToken(tokens, operatorMatch[0], 'operator');
      index += operatorMatch[0].length;
      continue;
    }

    pushToken(tokens, rest[0]);
    index += 1;
  }

  return tokens.length ? tokens : [{ text: '' }];
};

export const highlightReaderCode = (code: string, language = ''): ReaderCodeLine[] =>
  code.split(/\r?\n/).map((line) => highlightLine(line, language));

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export const renderReaderCodeHtml = (lines: ReaderCodeLine[]) =>
  lines
    .map((line) =>
      line
        .map((token) =>
          token.kind
            ? `<span class="reader-code-token reader-code-token-${token.kind}">${escapeHtml(token.text)}</span>`
            : escapeHtml(token.text)
        )
        .join('')
    )
    .join('\n');

export const renderPlainTextBlocksHtml = (blocks: ReaderPlainTextBlock[]) =>
  blocks
    .map((block) => {
      if (block.kind === 'text') {
        return `<pre>${escapeHtml(block.text)}</pre>`;
      }
      return `<pre class="reader-code-block plain-text-code-block" data-language="${escapeHtml(
        block.language || 'text'
      )}"><code class="reader-code-highlighted">${block.html}</code></pre>`;
    })
    .join('');

export const parsePlainTextCodeBlocks = (content: string): ReaderPlainTextBlock[] => {
  const lines = content.split(/\r?\n/);
  const blocks: ReaderPlainTextBlock[] = [];
  let textBuffer: string[] = [];
  let codeBuffer: string[] | null = null;
  let codeLanguage = '';

  const flushText = () => {
    if (textBuffer.length === 0) return;
    blocks.push({ kind: 'text', text: textBuffer.join('\n') });
    textBuffer = [];
  };

  for (const line of lines) {
    const fence = line.match(CODE_FENCE_PATTERN);
    if (fence) {
      // Boundary: fence handling decides whether plain text stays literal or
      // becomes syntax-highlighted HTML. Keep that split centralized here so
      // readers and exporters render the same block structure.
      if (codeBuffer) {
        const lines = highlightReaderCode(codeBuffer.join('\n'), codeLanguage);
        blocks.push({
          kind: 'code',
          language: codeLanguage,
          lines,
          html: renderReaderCodeHtml(lines)
        });
        codeBuffer = null;
        codeLanguage = '';
      } else {
        flushText();
        codeBuffer = [];
        codeLanguage = fence[1] ?? '';
      }
      continue;
    }

    if (codeBuffer) {
      codeBuffer.push(line);
    } else {
      textBuffer.push(line);
    }
  }

  if (codeBuffer) {
    const lines = highlightReaderCode(codeBuffer.join('\n'), codeLanguage);
    blocks.push({
      kind: 'code',
      language: codeLanguage,
      lines,
      html: renderReaderCodeHtml(lines)
    });
  }
  flushText();

  return blocks.length ? blocks : [{ kind: 'text', text: content }];
};

const getCodeLanguage = (element: Element) => {
  const className = element.getAttribute('class') ?? '';
  const languageClass = className.match(/(?:language|lang)-([A-Za-z0-9_-]+)/)?.[1];
  if (languageClass) return languageClass;
  return element.getAttribute('data-language') ?? '';
};

const renderHighlightedCodeElement = (doc: Document, element: HTMLElement, language: string) => {
  if (element.dataset.readerCodeHighlighted === 'true') return;
  if (element.querySelector('.reader-code-token')) {
    element.dataset.readerCodeHighlighted = 'true';
    return;
  }

  const lines = highlightReaderCode(element.textContent ?? '', language);
  element.textContent = '';
  element.dataset.readerCodeHighlighted = 'true';
  element.classList.add('reader-code-highlighted');

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) element.append(doc.createTextNode('\n'));
    for (const token of line) {
      if (!token.kind) {
        element.append(doc.createTextNode(token.text));
        continue;
      }

      const span = doc.createElement('span');
      span.className = `reader-code-token reader-code-token-${token.kind}`;
      span.textContent = token.text;
      element.append(span);
    }
  });
};

export const applyReaderCodeHighlightingToDocument = (doc: Document) => {
  // Refactor risk: some books wrap code in `pre > code`, others expose a bare
  // `pre`. Normalize that DOM shape here so UI callers do not need format-
  // specific branching when they rehydrate plain-text excerpts.
  const codeElements = Array.from(doc.querySelectorAll<HTMLElement>('pre code, pre'));
  for (const element of codeElements) {
    const target =
      element.tagName.toLowerCase() === 'pre'
        ? (element.querySelector(':scope > code') as HTMLElement | null) ?? element
        : element;
    const language = getCodeLanguage(target) || getCodeLanguage(element);
    renderHighlightedCodeElement(doc, target, language);
    target.closest('pre')?.classList.add('reader-code-block');
  }
};

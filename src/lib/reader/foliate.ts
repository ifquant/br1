import { getReaderThemePalette } from './settings';
import type { ReaderSettings } from './types';

export const FOLIATE_VIEW_TAG = 'foliate-view';

export interface FoliateViewElement extends HTMLElement {
  book?: ReaderBookDocument;
  lastLocation?: {
    location?: {
      current?: number;
      next?: number;
      total?: number;
    };
    current?: number;
    next?: number;
    total?: number;
    section?: {
      current?: number;
      total?: number;
    };
    fraction?: number;
    tocItem?: {
      label?: string;
      href?: string;
    };
    cfi?: string;
  };
  open(book: string | Blob | File | ReaderBookDocument): Promise<void>;
  init(options: { lastLocation?: string; showTextStart?: boolean }): Promise<void>;
  prev(): Promise<void>;
  next(): Promise<void>;
  goToFraction(fraction: number): Promise<void>;
  goTo(target: string): Promise<void>;
  getCFI(index: number, range?: Range): string;
  addAnnotation(annotation: Record<string, unknown>, remove?: boolean): Promise<unknown>;
  search(opts: {
    query: string;
    matchCase?: boolean;
    matchWholeWords?: boolean;
    matchDiacritics?: boolean;
    index?: number;
    results?: Array<
      | {
          cfi: string;
          excerpt: { pre: string; match: string; post: string };
        }
      | {
          index: number;
          subitems: Array<{
            cfi: string;
            excerpt: { pre: string; match: string; post: string };
          }>;
        }
    >;
  }): AsyncGenerator<
    | 'done'
    | { progress: number }
    | {
        index: number;
        label: string;
        subitems: Array<{
          cfi: string;
          excerpt: { pre: string; match: string; post: string };
        }>;
      }
    | {
        cfi: string;
        excerpt: { pre: string; match: string; post: string };
      }
  >;
  clearSearch(): void;
  renderer?: {
    setAttribute(name: string, value: string | number): void;
    removeAttribute(name: string): void;
    setStyles?(css: string): void;
    getContents?(): Array<{ doc: Document; index?: number; overlayer?: unknown }>;
  };
}

export interface ReaderBookDocument {
  metadata?: {
    title?: string | Record<string, string>;
    creator?: string | { name?: string } | Array<string | { name?: string }>;
    language?: string | string[];
  };
  toc?: unknown[];
  sections?: Array<{ createDocument?: () => Promise<Document> }>;
  rendition?: {
    layout?: 'pre-paginated' | 'reflowable';
  };
  dir?: string;
  transformTarget?: EventTarget;
}

const isRecord = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' && value !== null;

export const pickText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (isRecord(value)) {
    return value.zh ?? value['zh-CN'] ?? value.en ?? Object.values(value)[0] ?? '';
  }
  return '';
};

export const pickAuthor = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return pickAuthor(value[0]);
  if (typeof value === 'object' && value !== null) {
    if ('name' in value) {
      return pickText((value as { name?: unknown }).name);
    }

    const authorRecord = value as {
      firstName?: unknown;
      lastName?: unknown;
      familyName?: unknown;
      givenName?: unknown;
      'first-name'?: unknown;
      'last-name'?: unknown;
    };
    const firstName =
      pickText(authorRecord.firstName) ||
      pickText(authorRecord.givenName) ||
      pickText(authorRecord['first-name']);
    const lastName =
      pickText(authorRecord.lastName) ||
      pickText(authorRecord.familyName) ||
      pickText(authorRecord['last-name']);
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    if (fullName) return fullName;
  }
  return '';
};

export const flattenToc = (items: unknown, level = 0): Array<{ label: string; href: string; level: number }> => {
  if (!Array.isArray(items)) return [];

  return items.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const tocItem = item as { label?: unknown; href?: unknown; subitems?: unknown };
    const current =
      typeof tocItem.href === 'string' && tocItem.href
        ? [{ label: pickText(tocItem.label) || 'Untitled section', href: tocItem.href, level }]
        : [];
    return current.concat(flattenToc(tocItem.subitems, level + 1));
  });
};

let foliateViewModulePromise: Promise<unknown> | null = null;
const guardedTransformTargets = new WeakSet<EventTarget>();

export const ensureFoliateViewDefinition = async () => {
  if (customElements.get(FOLIATE_VIEW_TAG)) return;

  if (!foliateViewModulePromise) {
    foliateViewModulePromise = import('foliate-js/view.js');
  }

  await foliateViewModulePromise;
};

export const installReaderBookTransformGuards = (book: ReaderBookDocument | undefined | null) => {
  const target = book?.transformTarget;
  if (!target || guardedTransformTargets.has(target)) return;

  guardedTransformTargets.add(target);
  target.addEventListener('data', ((event: Event) => {
    const detail = (event as CustomEvent<{ data?: unknown; name?: string }>).detail;
    if (!detail) return;

    detail.data = Promise.resolve(detail.data).catch((error) => {
      console.error(new Error(`Failed to load ${detail.name ?? 'reader resource'}`, { cause: error }));
      return '';
    });
  }) as EventListener);
};

export const loadReaderBookDocument = async (
  source: Blob | File
): Promise<ReaderBookDocument> => {
  const module = (await import('foliate-js/view.js')) as {
    makeBook?: (file: Blob | File) => Promise<ReaderBookDocument>;
  };

  if (typeof module.makeBook !== 'function') {
    throw new Error('foliate-js/view.js does not expose makeBook()');
  }

  const book = await module.makeBook(source);
  installReaderBookTransformGuards(book);
  return book;
};

export const wrapFoliateViewElement = (originalView: FoliateViewElement): FoliateViewElement => {
  const originalAddAnnotation = originalView.addAnnotation.bind(originalView);
  originalView.addAnnotation = (annotation: Record<string, unknown>, remove = false) => {
    const value =
      typeof annotation.value === 'string'
        ? annotation.value
        : typeof annotation.cfi === 'string'
          ? annotation.cfi
          : '';
    return originalAddAnnotation(
      {
        value,
        ...annotation
      },
      remove
    );
  };
  return originalView;
};

const getReaderFontScale = (fontScale: ReaderSettings['fontScale']) => {
  if (fontScale === 'sm') return '18px';
  if (fontScale === 'lg') return '22px';
  return '20px';
};

const getReaderLineHeight = (lineHeight: ReaderSettings['lineHeight']) => {
  if (lineHeight === 'tight') return '1.62';
  if (lineHeight === 'relaxed') return '1.94';
  return '1.78';
};

export const getReaderViewStyles = (settings: ReaderSettings) => {
  const theme = getReaderThemePalette(settings.themePreset);
  const textFont = settings.fontFamily === 'sans' ? 'var(--sans-serif)' : 'var(--serif)';
  const lineHeight = getReaderLineHeight(settings.lineHeight);
  const fontSize = getReaderFontScale(settings.fontScale);

  return `
  html {
    --theme-bg-color: ${theme.surface};
    --theme-fg-color: ${theme.text};
    --theme-primary-color: ${theme.primary};
    --serif: "Source Serif 4", "Noto Serif SC", Georgia, serif;
    --sans-serif: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    --monospace: "IBM Plex Mono", "SFMono-Regular", monospace;
    --font-size: ${fontSize};
    --min-font-size: 16px;
    --font-weight: 400;
    --default-text-align: start;
    color-scheme: light;
    background-color: var(--theme-bg-color, transparent);
    hanging-punctuation: allow-end last;
    orphans: 2;
    widows: 2;
  }

  html,
  body {
    color: var(--theme-fg-color);
    font-size: var(--font-size) !important;
    font-weight: var(--font-weight);
    line-height: ${lineHeight};
    max-height: unset;
    text-align: var(--default-text-align);
    -webkit-text-size-adjust: none;
    text-size-adjust: none;
    -webkit-touch-callout: none;
    -webkit-user-select: text;
  }

  html {
    font-family: ${textFont};
  }

  body {
    margin: unset;
    padding: unset;
    overflow: unset;
    background: transparent;
    font-family: ${textFont};
  }

  p,
  blockquote,
  dd,
  li,
  div:not(:has(*:not(b, a, em, i, strong, u, span))) {
    line-height: ${lineHeight};
    hyphens: auto;
    -webkit-hyphens: auto;
  }

  p {
    margin-top: 0.9em;
    margin-bottom: 0.9em;
    text-indent: 2em;
  }

  p:has(> img:only-child),
  p:has(> span:only-child > img:only-child),
  p:has(> img:not(.has-text-siblings)),
  p:has(> a:first-child + img:last-child),
  li p,
  ol p,
  ul p,
  td p {
    text-indent: initial !important;
  }

  img,
  svg {
    max-width: 100%;
    height: auto;
    background-color: transparent !important;
  }

  pre,
  code,
  kbd {
    font-family: var(--monospace);
  }

  pre {
    white-space: pre-wrap !important;
  }

  a:any-link {
    color: var(--theme-primary-color);
    text-decoration: none;
  }
`;
};

export const createFoliateViewElement = () =>
  document.createElement(FOLIATE_VIEW_TAG) as FoliateViewElement;

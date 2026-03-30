export const FOLIATE_VIEW_TAG = 'foliate-view';

export interface FoliateViewElement extends HTMLElement {
  book?: {
    metadata?: {
      title?: string | Record<string, string>;
      creator?: string | { name?: string } | Array<string | { name?: string }>;
    };
    toc?: unknown[];
  };
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
  open(book: string | Blob | File): Promise<void>;
  init(options: { lastLocation?: string; showTextStart?: boolean }): Promise<void>;
  prev(): Promise<void>;
  next(): Promise<void>;
  goToFraction(fraction: number): Promise<void>;
  goTo(target: string): Promise<void>;
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
  if (typeof value === 'object' && value !== null && 'name' in value) {
    return pickText((value as { name?: unknown }).name);
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

export const ensureFoliateViewDefinition = async () => {
  if (customElements.get(FOLIATE_VIEW_TAG)) return;

  if (!foliateViewModulePromise) {
    foliateViewModulePromise = import('foliate-js/view.js');
  }

  await foliateViewModulePromise;
};

export const createFoliateViewElement = () =>
  document.createElement(FOLIATE_VIEW_TAG) as FoliateViewElement;

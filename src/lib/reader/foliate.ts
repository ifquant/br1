export const FOLIATE_VIEW_TAG = 'foliate-view';
export const SAMPLE_READER_BOOK_URL = '/samples/reader-step4.epub';

export interface FoliateViewElement extends HTMLElement {
  open(book: string | Blob | File): Promise<void>;
}

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

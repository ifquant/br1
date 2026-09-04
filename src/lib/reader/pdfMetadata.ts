// Ownership: normalize metadata exposed by the existing foliate/PDF.js reader.
// Import identity, persistence, and user-edit preservation belong to the library layer.
export type ReaderBookMetadata = {
  title?: unknown;
  author?: unknown;
  creator?: unknown;
  description?: unknown;
  language?: unknown;
  publisher?: unknown;
};

export type PdfFileMetadata = {
  title?: string;
  author?: string;
  description?: string;
  language?: string;
  publisher?: string;
};

type PdfMetadataBook = {
  metadata?: ReaderBookMetadata;
  destroy?: () => void | Promise<void>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const pickText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map(pickText).find((item) => item.trim()) ?? '';
  }
  if (isRecord(value)) {
    return (
      pickText(value.zh) ||
      pickText(value['zh-CN']) ||
      pickText(value.en) ||
      Object.values(value).map(pickText).find((item) => item.trim()) ||
      ''
    );
  }
  return '';
};

export const pickAuthor = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map(pickAuthor).find((item) => item.trim()) ?? '';
  }
  if (isRecord(value)) {
    if ('name' in value) return pickText(value.name);

    const firstName =
      pickText(value.firstName) || pickText(value.givenName) || pickText(value['first-name']);
    const lastName =
      pickText(value.lastName) || pickText(value.familyName) || pickText(value['last-name']);
    return [firstName, lastName].filter(Boolean).join(' ').trim();
  }
  return '';
};

const optionalField = (value: unknown) => pickText(value).trim() || undefined;

export const normalizePdfFileMetadata = (
  metadata: ReaderBookMetadata | undefined
): PdfFileMetadata => {
  const title = optionalField(metadata?.title);
  const author = pickAuthor(metadata?.author).trim() || pickAuthor(metadata?.creator).trim() || undefined;
  const description = optionalField(metadata?.description);
  const language = optionalField(metadata?.language);
  const publisher = optionalField(metadata?.publisher);

  return {
    ...(title ? { title } : {}),
    ...(author ? { author } : {}),
    ...(description ? { description } : {}),
    ...(language ? { language } : {}),
    ...(publisher ? { publisher } : {})
  };
};

export const extractPdfFileMetadata = async (
  source: Blob | File,
  { loadBook }: { loadBook?: (source: Blob | File) => Promise<PdfMetadataBook> } = {}
): Promise<PdfFileMetadata> => {
  const book = await (loadBook
    ? loadBook(source)
    : import('./foliate.js').then(({ loadReaderBookDocument }) => loadReaderBookDocument(source)));
  try {
    return normalizePdfFileMetadata(book.metadata);
  } finally {
    await book.destroy?.();
  }
};

// Ownership: prepare PDF metadata for one library import while preserving curated
// fields. Rust remains responsible for trusted paths, byte identity, and persistence.
export type LibraryMetadataOverride = {
  title?: string;
  author?: string;
  description?: string;
  language?: string;
  publisher?: string;
  sourceSha256?: string;
};

type PersistedPdfMetadata = {
  id: string;
  title: string;
  author: string;
  format: string;
  description?: string | null;
  language?: string | null;
  publisher?: string | null;
  filePath: string;
  sourcePath?: string | null;
};

const normalizedValue = (value: string | null | undefined) => value?.trim() || undefined;

const shouldRefreshField = (
  current: string | null | undefined,
  previous: string | undefined,
  placeholder?: string
) => {
  const normalizedCurrent = normalizedValue(current);
  return (
    !normalizedCurrent ||
    normalizedCurrent === normalizedValue(previous) ||
    normalizedCurrent === normalizedValue(placeholder)
  );
};

export const mergePdfMetadataOverride = ({
  persisted,
  previousFileMetadata,
  nextFileMetadata,
  sourceTitle
}: {
  persisted: PersistedPdfMetadata | null;
  previousFileMetadata: LibraryMetadataOverride | null;
  nextFileMetadata: LibraryMetadataOverride;
  sourceTitle?: string;
}): LibraryMetadataOverride => {
  if (!persisted) return { ...nextFileMetadata };

  if (!previousFileMetadata) {
    const title = shouldRefreshField(persisted.title, undefined, sourceTitle)
      ? normalizedValue(nextFileMetadata.title)
      : normalizedValue(persisted.title);
    const author = shouldRefreshField(persisted.author, undefined, 'Unknown author')
      ? normalizedValue(nextFileMetadata.author)
      : normalizedValue(persisted.author);
    const description = normalizedValue(persisted.description);
    const language = normalizedValue(persisted.language);
    const publisher = normalizedValue(persisted.publisher);
    return {
      ...(title ? { title } : {}),
      ...(author ? { author } : {}),
      ...(description ? { description } : {}),
      ...(language ? { language } : {}),
      ...(publisher ? { publisher } : {})
    };
  }

  const choose = (
    current: string | null | undefined,
    previous: string | undefined,
    next: string | undefined,
    placeholder?: string
  ) => shouldRefreshField(current, previous, placeholder)
    ? normalizedValue(next)
    : normalizedValue(current);
  const chooseOptional = (
    current: string | null | undefined,
    previous: string | undefined,
    next: string | undefined
  ) => normalizedValue(current) === normalizedValue(previous)
    ? normalizedValue(next)
    : normalizedValue(current);
  const title = choose(persisted.title, previousFileMetadata.title, nextFileMetadata.title, sourceTitle);
  const author = shouldRefreshField(persisted.author, previousFileMetadata.author, 'Unknown author')
    ? normalizedValue(nextFileMetadata.author)
    : normalizedValue(persisted.author);
  const description = chooseOptional(
    persisted.description,
    previousFileMetadata.description,
    nextFileMetadata.description
  );
  const language = chooseOptional(
    persisted.language,
    previousFileMetadata.language,
    nextFileMetadata.language
  );
  const publisher = chooseOptional(
    persisted.publisher,
    previousFileMetadata.publisher,
    nextFileMetadata.publisher
  );

  return {
    ...(title ? { title } : {}),
    ...(author ? { author } : {}),
    ...(description ? { description } : {}),
    ...(language ? { language } : {}),
    ...(publisher ? { publisher } : {})
  };
};

type PdfMetadataPreparationDeps = {
  readBookFile: (path: string, repairRecordId?: string) => Promise<Blob>;
  extractPdfMetadata: (file: Blob) => Promise<LibraryMetadataOverride>;
  hashBookFile?: (file: Blob) => Promise<string>;
};

const sha256BookFile = async (file: Blob) => {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const preparePdfMetadataOverrides = async (
  filePaths: string[],
  records: PersistedPdfMetadata[],
  { readBookFile, extractPdfMetadata, hashBookFile = sha256BookFile }: PdfMetadataPreparationDeps,
  repairRecordId?: string
): Promise<Array<LibraryMetadataOverride | null>> => {
  const overrides: Array<LibraryMetadataOverride | null> = [];
  for (const filePath of filePaths) {
    if (!filePath.toLowerCase().endsWith('.pdf')) {
      overrides.push(null);
      continue;
    }

    const persisted = records.find((record) =>
      record.format.trim().toUpperCase() === 'PDF' &&
      (repairRecordId ? record.id === repairRecordId : record.sourcePath === filePath)
    ) ?? null;
    try {
      // Parse and fingerprint one Blob so Rust can reject an override if the source
      // changes before the command reads the bytes it will actually store.
      const nextFile = await readBookFile(filePath, repairRecordId);
      const nextFileMetadata = await extractPdfMetadata(nextFile);
      const sourceSha256 = await hashBookFile(nextFile);
      let previousFileMetadata: LibraryMetadataOverride | null = null;
      if (persisted) {
        try {
          previousFileMetadata = await extractPdfMetadata(
            await readBookFile(persisted.filePath, repairRecordId)
          );
        } catch (error) {
          // Without the old bytes there is no provenance for curated fields.
          // Preserve them and only replace unmistakable placeholders below.
          console.warn(`Failed to read previous PDF metadata for ${persisted.filePath}`, error);
        }
      }
      overrides.push({
        ...mergePdfMetadataOverride({
          persisted,
          previousFileMetadata,
          nextFileMetadata,
          sourceTitle: filePath.split(/[\\/]/).at(-1)?.replace(/\.pdf$/i, '')
        }),
        sourceSha256
      });
    } catch (error) {
      // A malformed or encrypted PDF must still reach the existing Rust import fallback.
      console.warn(`Failed to prepare PDF metadata for ${filePath}`, error);
      overrides.push(null);
    }
  }
  return overrides;
};

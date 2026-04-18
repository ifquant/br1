export const SUPPORTED_READER_FILE_EXTENSIONS = [
  'epub',
  'pdf',
  'mobi',
  'azw3',
  'fb2',
  'cbz'
] as const;

export const PLANNED_READER_FILE_EXTENSIONS = ['txt'] as const;

export const READER_FILE_INPUT_ACCEPT = SUPPORTED_READER_FILE_EXTENSIONS.map(
  (extension) => `.${extension}`
).join(',');

const normalizeReaderFormatToken = (value: string) => value.trim().toLowerCase();

export const inferReaderFormatLabelFromName = (value: string) => {
  const match = value.toLowerCase().match(/\.([a-z0-9]+)(?:$|[?#])/i);
  return match?.[1]?.toUpperCase() ?? '';
};

export const getDesktopBookDialogExtensions = () => [...SUPPORTED_READER_FILE_EXTENSIONS];

export const isSupportedReaderFormatLabel = (label: string) =>
  SUPPORTED_READER_FILE_EXTENSIONS.includes(
    normalizeReaderFormatToken(label) as (typeof SUPPORTED_READER_FILE_EXTENSIONS)[number]
  );

export const isPlannedReaderFormatLabel = (label: string) =>
  PLANNED_READER_FILE_EXTENSIONS.includes(
    normalizeReaderFormatToken(label) as (typeof PLANNED_READER_FILE_EXTENSIONS)[number]
  );

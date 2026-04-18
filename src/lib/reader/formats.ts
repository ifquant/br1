export const SUPPORTED_READER_FILE_EXTENSIONS = [
  'epub',
  'pdf',
  'mobi',
  'azw3',
  'fb2',
  'cbz',
  'txt'
] as const;

export const PLANNED_READER_FILE_EXTENSIONS = [] as const;

export const READER_FILE_INPUT_ACCEPT = SUPPORTED_READER_FILE_EXTENSIONS.map(
  (extension) => `.${extension}`
).join(',');

const normalizeReaderFormatToken = (value: string) => value.trim().toLowerCase();

export const inferReaderFormatLabelFromName = (value: string) => {
  const match = value.toLowerCase().match(/\.([a-z0-9]+)(?:$|[?#])/i);
  return match?.[1]?.toUpperCase() ?? '';
};

export const getReaderFormatSupportStatus = (label: string) => {
  const normalized = normalizeReaderFormatToken(label);
  if (!normalized || normalized === 'book') return 'unknown';
  if (
    SUPPORTED_READER_FILE_EXTENSIONS.includes(
      normalized as (typeof SUPPORTED_READER_FILE_EXTENSIONS)[number]
    )
  ) {
    return 'supported';
  }
  if (
    PLANNED_READER_FILE_EXTENSIONS.includes(
      normalized as (typeof PLANNED_READER_FILE_EXTENSIONS)[number]
    )
  ) {
    return 'planned';
  }
  return 'unsupported';
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

export const supportsTextAnnotationsForFormat = (label: string) => {
  const normalized = normalizeReaderFormatToken(label);
  return normalized !== 'cbz';
};

export const getTextAnnotationSupportMessage = (label: string) => {
  const normalized = normalizeReaderFormatToken(label);
  if (normalized === 'cbz') {
    return '当前 CBZ 只支持阅读进度和书签，还不支持正文文本批注。';
  }
  return '先在正文里选中一段文本，再把它存成当前书的笔记。';
};

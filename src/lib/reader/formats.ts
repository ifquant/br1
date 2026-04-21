type ReaderFormatSupportStatus = 'supported' | 'planned' | 'unsupported';

type ReaderFormatCapability = {
  extension: string;
  supportStatus: ReaderFormatSupportStatus;
  packagedAssociated: boolean;
  textAnnotatable: boolean;
};

const READER_FORMAT_CAPABILITIES: readonly ReaderFormatCapability[] = [
  { extension: 'epub', supportStatus: 'supported', packagedAssociated: true, textAnnotatable: true },
  { extension: 'pdf', supportStatus: 'supported', packagedAssociated: true, textAnnotatable: true },
  { extension: 'mobi', supportStatus: 'supported', packagedAssociated: true, textAnnotatable: true },
  { extension: 'azw3', supportStatus: 'supported', packagedAssociated: true, textAnnotatable: true },
  { extension: 'fb2', supportStatus: 'supported', packagedAssociated: true, textAnnotatable: true },
  { extension: 'cbz', supportStatus: 'supported', packagedAssociated: true, textAnnotatable: false },
  { extension: 'txt', supportStatus: 'supported', packagedAssociated: true, textAnnotatable: true }
];

const getReaderFormatCapability = (label: string) => {
  const normalized = normalizeReaderFormatToken(label);
  if (!normalized || normalized === 'book') return null;

  return READER_FORMAT_CAPABILITIES.find(({ extension }) => extension === normalized) ?? null;
};

export const SUPPORTED_READER_FILE_EXTENSIONS = READER_FORMAT_CAPABILITIES.filter(
  ({ supportStatus }) => supportStatus === 'supported'
).map(({ extension }) => extension);

export const READER_FILE_INPUT_ACCEPT = SUPPORTED_READER_FILE_EXTENSIONS.map(
  (extension) => `.${extension}`
).join(',');

const normalizeReaderFormatToken = (value: string) => value.trim().toLowerCase();

export const inferReaderFormatLabelFromName = (value: string) => {
  const match = value.toLowerCase().match(/\.([a-z0-9]+)(?:$|[?#])/i);
  return match?.[1]?.toUpperCase() ?? '';
};

export const getReaderFormatSupportStatus = (label: string) => {
  const capability = getReaderFormatCapability(label);
  if (capability) return capability.supportStatus;
  const normalized = normalizeReaderFormatToken(label);
  if (!normalized || normalized === 'book') return 'unknown';
  return 'unsupported';
};

export const getDesktopBookDialogExtensions = () => [...SUPPORTED_READER_FILE_EXTENSIONS];

export const isSupportedReaderFormatLabel = (label: string) =>
  getReaderFormatSupportStatus(label) === 'supported';

export const isPlannedReaderFormatLabel = (label: string) =>
  getReaderFormatSupportStatus(label) === 'planned';

export const supportsTextAnnotationsForFormat = (label: string) => {
  return getReaderFormatCapability(label)?.textAnnotatable ?? true;
};

export const getTextAnnotationSupportMessage = (label: string) => {
  if (!supportsTextAnnotationsForFormat(label)) {
    return '当前 CBZ 只支持阅读进度和书签，还不支持正文文本批注。';
  }
  return '先在正文里选中一段文本，再把它存成当前书的笔记。';
};

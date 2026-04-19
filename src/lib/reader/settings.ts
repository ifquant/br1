import type {
  ReaderChromeMode,
  ReaderFlowMode,
  ReaderFontFamily,
  ReaderFontScale,
  ReaderLineHeight,
  ReaderPageMargins,
  ReaderSettings,
  ReaderThemePreset,
  ReaderViewWidthMode
} from './types';

const isFlowMode = (value: unknown): value is ReaderFlowMode =>
  value === 'paginated' || value === 'scrolled';
const isFontFamily = (value: unknown): value is ReaderFontFamily =>
  value === 'serif' || value === 'sans';
const isFontScale = (value: unknown): value is ReaderFontScale =>
  value === 'sm' || value === 'md' || value === 'lg';
const isLineHeight = (value: unknown): value is ReaderLineHeight =>
  value === 'tight' || value === 'standard' || value === 'relaxed';
const isPageMargins = (value: unknown): value is ReaderPageMargins =>
  value === 'narrow' || value === 'standard' || value === 'wide';
const isThemePreset = (value: unknown): value is ReaderThemePreset =>
  value === 'paper' || value === 'warm' || value === 'soft';
const isViewWidthMode = (value: unknown): value is ReaderViewWidthMode =>
  value === 'focus' || value === 'standard' || value === 'wide';
const isChromeMode = (value: unknown): value is ReaderChromeMode =>
  value === 'auto' || value === 'always';

export const READER_SETTINGS_STORAGE_KEY = 'br1.reader.settings';

export const createDefaultReaderSettings = (): ReaderSettings => ({
  flowMode: 'paginated',
  fontFamily: 'serif',
  fontScale: 'md',
  lineHeight: 'standard',
  pageMargins: 'standard',
  themePreset: 'paper',
  viewWidthMode: 'standard',
  chromeMode: 'auto'
});

export const normalizeReaderSettings = (value: unknown): ReaderSettings => {
  const defaults = createDefaultReaderSettings();
  if (typeof value !== 'object' || value === null) return defaults;
  const candidate = value as Partial<ReaderSettings>;
  return {
    flowMode: isFlowMode(candidate.flowMode) ? candidate.flowMode : defaults.flowMode,
    fontFamily: isFontFamily(candidate.fontFamily) ? candidate.fontFamily : defaults.fontFamily,
    fontScale: isFontScale(candidate.fontScale) ? candidate.fontScale : defaults.fontScale,
    lineHeight: isLineHeight(candidate.lineHeight) ? candidate.lineHeight : defaults.lineHeight,
    pageMargins: isPageMargins(candidate.pageMargins) ? candidate.pageMargins : defaults.pageMargins,
    themePreset: isThemePreset(candidate.themePreset) ? candidate.themePreset : defaults.themePreset,
    viewWidthMode: isViewWidthMode(candidate.viewWidthMode) ? candidate.viewWidthMode : defaults.viewWidthMode,
    chromeMode: isChromeMode(candidate.chromeMode) ? candidate.chromeMode : defaults.chromeMode
  };
};

export const loadReaderSettings = (storage: Storage | undefined): ReaderSettings => {
  if (!storage) return createDefaultReaderSettings();
  try {
    const raw = storage.getItem(READER_SETTINGS_STORAGE_KEY);
    if (!raw) return createDefaultReaderSettings();
    return normalizeReaderSettings(JSON.parse(raw));
  } catch (error) {
    console.warn('Failed to restore reader settings', error);
    return createDefaultReaderSettings();
  }
};

export const saveReaderSettings = (storage: Storage | undefined, settings: ReaderSettings) => {
  if (!storage) return;
  storage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

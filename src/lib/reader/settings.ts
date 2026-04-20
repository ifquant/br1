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

export type ReaderThemePalette = {
  background: string;
  surface: string;
  paper: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
};

export type ReaderShellPalette = {
  shellBackdrop: string;
  shellPanel: string;
  shellRaised: string;
  shellText: string;
  shellMuted: string;
  shellBorder: string;
  shellAccent: string;
  shellShadow: string;
};

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

export const getReaderThemePalette = (
  themePreset: ReaderSettings['themePreset']
): ReaderThemePalette => {
  if (themePreset === 'warm') {
    return {
      background: '#f0e4d0',
      surface: '#f4ead6',
      paper: 'rgba(255, 251, 243, 0.72)',
      text: '#34281e',
      muted: 'rgba(84, 62, 34, 0.62)',
      border: 'rgba(120, 84, 46, 0.12)',
      primary: '#9a6b36'
    };
  }

  if (themePreset === 'soft') {
    return {
      background: '#e2ebdf',
      surface: '#e7efe6',
      paper: 'rgba(248, 252, 247, 0.74)',
      text: '#283127',
      muted: 'rgba(55, 72, 54, 0.62)',
      border: 'rgba(86, 102, 78, 0.12)',
      primary: '#6b7b52'
    };
  }

  return {
    background: '#f7efe2',
    surface: '#fbf7ef',
    paper: 'rgba(255, 255, 255, 0.68)',
    text: '#2b221a',
    muted: 'rgba(71, 54, 31, 0.55)',
    border: 'rgba(84, 62, 34, 0.08)',
    primary: '#8c6a3b'
  };
};

export const getReaderShellPalette = (
  themePreset: ReaderSettings['themePreset']
): ReaderShellPalette => {
  if (themePreset === 'warm') {
    return {
      shellBackdrop: '#eadbc4',
      shellPanel: 'rgba(248, 239, 223, 0.9)',
      shellRaised: 'rgba(255, 249, 239, 0.96)',
      shellText: '#38291b',
      shellMuted: 'rgba(89, 65, 37, 0.72)',
      shellBorder: 'rgba(134, 94, 51, 0.18)',
      shellAccent: '#9a6b36',
      shellShadow: 'rgba(78, 51, 24, 0.12)'
    };
  }

  if (themePreset === 'soft') {
    return {
      shellBackdrop: '#d9e4d6',
      shellPanel: 'rgba(231, 239, 228, 0.9)',
      shellRaised: 'rgba(244, 248, 242, 0.96)',
      shellText: '#283127',
      shellMuted: 'rgba(67, 82, 62, 0.72)',
      shellBorder: 'rgba(93, 111, 84, 0.18)',
      shellAccent: '#6b7b52',
      shellShadow: 'rgba(40, 57, 38, 0.1)'
    };
  }

  return {
    shellBackdrop: '#f1e6d7',
    shellPanel: 'rgba(251, 245, 235, 0.9)',
    shellRaised: 'rgba(255, 252, 246, 0.96)',
    shellText: '#2f241a',
    shellMuted: 'rgba(78, 59, 35, 0.68)',
    shellBorder: 'rgba(102, 75, 43, 0.14)',
    shellAccent: '#8c6a3b',
    shellShadow: 'rgba(55, 39, 18, 0.1)'
  };
};

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

export const hydrateReaderSettings = (storage: Storage | undefined): ReaderSettings => {
  const settings = loadReaderSettings(storage);
  if (storage) {
    saveReaderSettings(storage, settings);
  }
  return settings;
};

export const saveReaderSettings = (storage: Storage | undefined, settings: ReaderSettings) => {
  if (!storage) return;
  storage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

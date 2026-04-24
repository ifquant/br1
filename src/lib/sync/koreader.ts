import type { PersistedLibraryBook } from '../services/libraryPersistence.js';
import type {
  ReaderBookmark,
  ReaderKoReaderAnnotationMetadata,
  ReaderKoReaderBookmarkMetadata,
  ReaderNote
} from '../reader/types.js';
import {
  createReaderBookmarksSyncRecord,
  createReaderNotesSyncRecord,
  createReadingStateSyncRecord
} from './model.js';
import type {
  ReaderBookmarksSyncRecord,
  ReaderNotesSyncRecord,
  ReadingStateSyncRecord
} from './types.js';

type SyncTimestampOptions = {
  fallbackUpdatedAt?: number;
};

export type KoReaderProgressValue = [number, number] | string | '';

export type KoReaderBookIdentity = {
  bookHash: string;
  metaHash: string;
};

export type KoReaderBookConfig = KoReaderBookIdentity & {
  progress: KoReaderProgressValue;
  xpointer: string;
  updatedAt: number;
};

export type KoReaderAnnotationStyle = 'highlight' | 'underline' | 'squiggly';

export type KoReaderAnnotation = KoReaderBookIdentity & {
  id: string;
  type: 'annotation' | 'bookmark';
  xpointer0: string;
  xpointer1?: string | null;
  text: string;
  note: string;
  page?: number | null;
  style?: KoReaderAnnotationStyle | null;
  color?: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
};

type KoReaderAnnotationMetadata = ReaderKoReaderAnnotationMetadata;
type KoReaderBookmarkMetadata = ReaderKoReaderBookmarkMetadata;
type KoReaderAdapterNote = ReaderNote;
type KoReaderAdapterBookmark = ReaderBookmark;

const PAGE_PROGRESS_PATTERN = /^\[(\d+),(\d+)\]$/;

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const hashIdentityPart = (value: string) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const deriveKoReaderBookIdentity = (book: {
  id: string;
  title: string;
  author: string;
  format: string;
  filePath: string;
  sourcePath?: string | null;
}): KoReaderBookIdentity => ({
  bookHash: hashIdentityPart(book.sourcePath || book.filePath || book.id),
  metaHash: hashIdentityPart(
    [book.title.trim(), book.author.trim(), book.format.trim(), book.sourcePath?.trim() || '']
      .join('|')
      .toLowerCase()
  )
});

export const normalizeKoReaderProgressValue = (value: KoReaderProgressValue) => {
  if (Array.isArray(value) && value.length === 2) {
    const [current, total] = value;
    if (
      typeof current === 'number' &&
      Number.isFinite(current) &&
      typeof total === 'number' &&
      Number.isFinite(total) &&
      total > 0
    ) {
      return `[${Math.max(0, Math.trunc(current))},${Math.max(1, Math.trunc(total))}]`;
    }
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return '';
};

export const parseKoReaderPageProgress = (value: KoReaderProgressValue) => {
  const normalized = normalizeKoReaderProgressValue(value);
  const match = normalized.match(PAGE_PROGRESS_PATTERN);
  if (!match) return null;

  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null;

  return {
    current,
    total
  };
};

const toBestEffortProgressFraction = (value: KoReaderProgressValue, fallback: number | null | undefined) => {
  const parsed = parseKoReaderPageProgress(value);
  if (parsed) {
    return parsed.total > 0 ? parsed.current / parsed.total : null;
  }
  return typeof fallback === 'number' && Number.isFinite(fallback) ? fallback : null;
};

export const createKoReaderReadingStateSyncRecord = (
  book: PersistedLibraryBook,
  config: KoReaderBookConfig,
  options: SyncTimestampOptions = {}
): ReadingStateSyncRecord => {
  const normalizedProgress = normalizeKoReaderProgressValue(config.progress);
  const progressLocation = config.xpointer.trim() || book.progressLocation || null;

  return createReadingStateSyncRecord(
    {
      ...book,
      progress: normalizedProgress || book.progress,
      progressFraction: toBestEffortProgressFraction(config.progress, book.progressFraction),
      progressLocation,
      lastOpenedAt: config.updatedAt
    },
    options
  );
};

export const restoreKoReaderBookConfigFromSync = (
  record: ReadingStateSyncRecord,
  identity: KoReaderBookIdentity
): KoReaderBookConfig => ({
  ...identity,
  progress: normalizeKoReaderProgressValue(record.payload.progress),
  xpointer: record.payload.progressLocation ?? '',
  updatedAt: record.payload.lastOpenedAt ?? record.updatedAt
});

const toKoReaderAdapterNote = (annotation: KoReaderAnnotation): KoReaderAdapterNote => ({
  id: annotation.id,
  kind: annotation.note.trim() ? 'note' : 'highlight',
  cfi: annotation.xpointer0,
  text: annotation.text,
  note: annotation.note,
  chapterLabel: annotation.text || 'KOReader annotation',
  chapterHref: '',
  createdAt: annotation.createdAt,
  koreader: {
    bookHash: annotation.bookHash,
    metaHash: annotation.metaHash,
    xpointer0: annotation.xpointer0,
    xpointer1: annotation.xpointer1 ?? null,
    page: annotation.page ?? null,
    style: annotation.style ?? 'highlight',
    color: annotation.color ?? 'yellow',
    updatedAt: annotation.updatedAt,
    deletedAt: annotation.deletedAt ?? null
  }
});

const toKoReaderAdapterBookmark = (annotation: KoReaderAnnotation): KoReaderAdapterBookmark => ({
  id: annotation.id,
  locator: annotation.xpointer0,
  targetHref: '',
  chapterLabel: annotation.text || 'KOReader bookmark',
  chapterHref: '',
  progressLabel: annotation.page ? `Page ${annotation.page}` : '',
  locationLabel: annotation.xpointer0,
  createdAt: annotation.createdAt,
  koreader: {
    bookHash: annotation.bookHash,
    metaHash: annotation.metaHash,
    xpointer0: annotation.xpointer0,
    xpointer1: null,
    page: annotation.page ?? null,
    style: null,
    color: null,
    text: annotation.text,
    note: annotation.note,
    updatedAt: annotation.updatedAt,
    deletedAt: annotation.deletedAt ?? null
  }
});

export const createKoReaderAnnotationSyncRecords = (
  bookKey: string,
  annotations: KoReaderAnnotation[],
  options: SyncTimestampOptions = {}
): {
  notesRecord: ReaderNotesSyncRecord;
  bookmarksRecord: ReaderBookmarksSyncRecord;
} => {
  const liveAnnotations = annotations.filter((annotation) => !annotation.deletedAt);
  const notes = liveAnnotations
    .filter((annotation) => annotation.type === 'annotation')
    .map((annotation) => toKoReaderAdapterNote(annotation));
  const bookmarks = liveAnnotations
    .filter((annotation) => annotation.type === 'bookmark')
    .map((annotation) => toKoReaderAdapterBookmark(annotation));

  return {
    notesRecord: createReaderNotesSyncRecord(bookKey, notes, options),
    bookmarksRecord: createReaderBookmarksSyncRecord(bookKey, bookmarks, options)
  };
};

export const restoreKoReaderAnnotationsFromSync = ({
  identity,
  notesRecord,
  bookmarksRecord
}: {
  identity: KoReaderBookIdentity;
  notesRecord?: ReaderNotesSyncRecord | null;
  bookmarksRecord?: ReaderBookmarksSyncRecord | null;
}): KoReaderAnnotation[] => {
  const notes = (notesRecord?.payload.notes ?? []).map((note) => {
    const typedNote = note as KoReaderAdapterNote;
    const metadata = typedNote.koreader;

    return {
      bookHash: metadata?.bookHash ?? identity.bookHash,
      metaHash: metadata?.metaHash ?? identity.metaHash,
      id: typedNote.id,
      type: 'annotation' as const,
      xpointer0: metadata?.xpointer0 ?? typedNote.cfi,
      xpointer1: metadata?.xpointer1 ?? null,
      text: typedNote.text,
      note: typedNote.note,
      page: metadata?.page ?? null,
      style: metadata?.style ?? 'highlight',
      color: metadata?.color ?? 'yellow',
      createdAt: typedNote.createdAt,
      updatedAt: metadata?.updatedAt ?? notesRecord?.updatedAt ?? typedNote.createdAt,
      deletedAt: metadata?.deletedAt ?? null
    };
  });

  const bookmarks = (bookmarksRecord?.payload.bookmarks ?? []).map((bookmark) => {
    const typedBookmark = bookmark as KoReaderAdapterBookmark;
    const metadata = typedBookmark.koreader;

    return {
      bookHash: metadata?.bookHash ?? identity.bookHash,
      metaHash: metadata?.metaHash ?? identity.metaHash,
      id: typedBookmark.id,
      type: 'bookmark' as const,
      xpointer0: metadata?.xpointer0 ?? typedBookmark.locator,
      xpointer1: null,
      text: metadata?.text ?? typedBookmark.chapterLabel,
      note: metadata?.note ?? '',
      page: metadata?.page ?? null,
      style: null,
      color: null,
      createdAt: typedBookmark.createdAt,
      updatedAt: metadata?.updatedAt ?? bookmarksRecord?.updatedAt ?? typedBookmark.createdAt,
      deletedAt: metadata?.deletedAt ?? null
    };
  });

  return [...notes, ...bookmarks]
    .map((entry) => cloneJson(entry))
    .sort((left, right) => left.updatedAt - right.updatedAt || left.createdAt - right.createdAt || left.id.localeCompare(right.id));
};

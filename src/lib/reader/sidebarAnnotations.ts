// Ownership: pure current-book annotation controller helpers for
// ReaderSidebar.svelte. Persistence, route tab ownership, and cross-book
// saved-selection import/export stay in the Svelte parent.

import type {
  ReaderBookmarksState,
  ReaderHighlightSelectionSet,
  ReaderHighlightsFilter,
  ReaderHighlightsSort,
  ReaderSidebarNotesState
} from './types';

export type ReaderSidebarNotesFilter = 'all' | 'chapter';
export type ReaderSidebarNotesKindFilter = 'all' | 'highlight' | 'note';
export type ReaderSidebarBookmarksFilter = 'all' | 'chapter';
export type ReaderSidebarBookmarksSort = 'recent' | 'chapter';

export type ReaderSidebarBookmark = ReaderBookmarksState['bookmarks'][number];
export type ReaderSidebarAnnotationNote = ReaderSidebarNotesState['notes'][number];

export type ReaderSidebarBookmarkGroup = {
  chapterHref: string;
  chapterLabel: string;
  bookmarks: ReaderSidebarBookmark[];
};

export type ReaderSidebarAnnotationGroup = {
  chapterHref: string;
  chapterLabel: string;
  notes: ReaderSidebarAnnotationNote[];
};

export type ReaderSidebarAnnotationDerivedState = {
  isCurrentLocationBookmarked: boolean;
  notesPanelSummary: string;
  bookmarksPanelSummary: string;
  highlightsPanelSummary: string;
  filteredBookmarks: ReaderSidebarBookmark[];
  sortedBookmarks: ReaderSidebarBookmark[];
  groupedBookmarks: ReaderSidebarBookmarkGroup[];
  collapsibleBookmarkGroupKeys: string[];
  areAllBookmarkGroupsExpanded: boolean;
  areAllBookmarkGroupsCollapsed: boolean;
  notesByScope: ReaderSidebarAnnotationNote[];
  allHighlights: ReaderSidebarAnnotationNote[];
  highlightsByScope: ReaderSidebarAnnotationNote[];
  sortedHighlights: ReaderSidebarAnnotationNote[];
  selectedVisibleHighlights: ReaderSidebarAnnotationNote[];
  areAllVisibleHighlightsSelected: boolean;
  filteredNotes: ReaderSidebarAnnotationNote[];
  groupedNotes: ReaderSidebarAnnotationGroup[];
  groupedHighlights: ReaderSidebarAnnotationGroup[];
  collapsibleNoteGroupKeys: string[];
  collapsibleHighlightGroupKeys: string[];
  areAllNoteGroupsExpanded: boolean;
  areAllNoteGroupsCollapsed: boolean;
  areAllHighlightGroupsExpanded: boolean;
  areAllHighlightGroupsCollapsed: boolean;
};

const UNKNOWN_CHAPTER_KEY = '__unknown__';
const UNKNOWN_CHAPTER_LABEL = '未命名章节';

const getKnownGroupKeys = (groups: Array<{ chapterHref: string }>) =>
  groups
    .map((group) => group.chapterHref)
    .filter((chapterHref) => chapterHref && chapterHref !== UNKNOWN_CHAPTER_KEY);

const areAllGroupsExpanded = (keys: string[], collapsedGroups: Set<string>) =>
  keys.length > 0 && keys.every((chapterHref) => !collapsedGroups.has(chapterHref));

const areAllGroupsCollapsed = (keys: string[], collapsedGroups: Set<string>) =>
  keys.length > 0 && keys.every((chapterHref) => collapsedGroups.has(chapterHref));

const groupBookmarksByChapter = (bookmarks: ReaderSidebarBookmark[]): ReaderSidebarBookmarkGroup[] =>
  bookmarks.reduce<ReaderSidebarBookmarkGroup[]>((groups, bookmark) => {
    const chapterHref = bookmark.chapterHref || UNKNOWN_CHAPTER_KEY;
    const chapterLabel = bookmark.chapterLabel || UNKNOWN_CHAPTER_LABEL;
    const existingGroup = groups.find((group) => group.chapterHref === chapterHref);
    if (existingGroup) {
      existingGroup.bookmarks.push(bookmark);
      return groups;
    }

    groups.push({
      chapterHref,
      chapterLabel,
      bookmarks: [bookmark]
    });
    return groups;
  }, []);

const groupNotesByChapter = (
  notes: ReaderSidebarAnnotationNote[]
): ReaderSidebarAnnotationGroup[] =>
  notes.reduce<ReaderSidebarAnnotationGroup[]>((groups, note) => {
    const chapterHref = note.chapterHref || UNKNOWN_CHAPTER_KEY;
    const chapterLabel = note.chapterLabel || UNKNOWN_CHAPTER_LABEL;
    const existingGroup = groups.find((group) => group.chapterHref === chapterHref);
    if (existingGroup) {
      existingGroup.notes.push(note);
      return groups;
    }

    groups.push({
      chapterHref,
      chapterLabel,
      notes: [note]
    });
    return groups;
  }, []);

export const deriveReaderSidebarAnnotationState = (input: {
  activeHref: string;
  supportsTextAnnotations: boolean;
  textAnnotationSupportMessage: string;
  notesState: ReaderSidebarNotesState;
  allHighlights: ReaderSidebarAnnotationNote[];
  bookmarksState: ReaderBookmarksState;
  notesFilter: ReaderSidebarNotesFilter;
  notesKindFilter: ReaderSidebarNotesKindFilter;
  highlightsFilter: ReaderHighlightsFilter;
  highlightsSort: ReaderHighlightsSort;
  bookmarksFilter: ReaderSidebarBookmarksFilter;
  bookmarksSort: ReaderSidebarBookmarksSort;
  selectedHighlightIds: Set<string>;
  savedHighlightSelections: ReaderHighlightSelectionSet[];
  collapsedBookmarkGroups: Set<string>;
  collapsedNoteGroups: Set<string>;
  collapsedHighlightGroups: Set<string>;
}): ReaderSidebarAnnotationDerivedState => {
  const isCurrentLocationBookmarked =
    !!input.bookmarksState.activeLocator &&
    input.bookmarksState.bookmarks.some(
      (bookmark) => bookmark.locator === input.bookmarksState.activeLocator
    );
  const notesPanelSummary = (() => {
    if (!input.supportsTextAnnotations) return input.textAnnotationSupportMessage;
    if (input.notesState.selection) return '已选中一段正文，可以直接记笔记或高亮。';
    if (input.notesState.notes.length) return '这里会一起显示当前书的笔记和高亮，可按章节或类型收窄。';
    return '先在正文里选中一段文本，再把它存成当前书的笔记或高亮。';
  })();
  const bookmarksPanelSummary = (() => {
    if (input.bookmarksState.bookmarks.length) {
      if (isCurrentLocationBookmarked) {
        return `已保存 ${input.bookmarksState.bookmarks.length} 个阅读位置，当前页已经在书签里。`;
      }
      return `已保存 ${input.bookmarksState.bookmarks.length} 个阅读位置，可把当前页和已存位置来回切换。`;
    }
    if (input.bookmarksState.activeLocator) {
      return '还没有保存的阅读位置，可以先把当前页存成书签。';
    }
    return '等正文定位稳定后，可以把当前页存成书签。';
  })();
  const highlightsPanelSummary = (() => {
    if (!input.supportsTextAnnotations) return input.textAnnotationSupportMessage;
    if (input.allHighlights.length) {
      if (input.savedHighlightSelections.length) {
        return `当前书已保存 ${input.allHighlights.length} 条高亮，跨书高亮选择集也会在这里继续管理。`;
      }
      return `当前书已保存 ${input.allHighlights.length} 条高亮，可继续筛选、选中或整理成跨书选择集。`;
    }
    if (input.savedHighlightSelections.length) {
      return '当前书还没有高亮，但已保存的跨书高亮选择集仍然可以在这里继续整理。';
    }
    return '先选中一段正文创建高亮；如果要跨书复用，再把当前选择存成选择集。';
  })();

  const filteredBookmarks =
    input.bookmarksFilter === 'chapter' && input.activeHref
      ? input.bookmarksState.bookmarks.filter((bookmark) => bookmark.chapterHref === input.activeHref)
      : input.bookmarksState.bookmarks;
  const sortedBookmarks =
    input.bookmarksSort === 'chapter'
      ? [...filteredBookmarks].sort((left, right) => {
          const chapterCompare = (left.chapterLabel || '').localeCompare(
            right.chapterLabel || '',
            'zh-CN'
          );
          if (chapterCompare !== 0) return chapterCompare;
          return right.createdAt - left.createdAt;
        })
      : filteredBookmarks;
  const groupedBookmarks = groupBookmarksByChapter(sortedBookmarks);
  const collapsibleBookmarkGroupKeys = getKnownGroupKeys(groupedBookmarks);

  const notesByScope =
    input.notesFilter === 'chapter' && input.activeHref
      ? input.notesState.notes.filter((note) => note.chapterHref === input.activeHref)
      : input.notesState.notes;
  const highlightsByScope =
    input.highlightsFilter === 'chapter' && input.activeHref
      ? input.allHighlights.filter((note) => note.chapterHref === input.activeHref)
      : input.highlightsFilter === 'selected'
        ? input.allHighlights.filter((note) => input.selectedHighlightIds.has(note.id))
        : input.allHighlights;
  const sortedHighlights =
    input.highlightsSort === 'oldest'
      ? [...highlightsByScope].sort((left, right) => left.createdAt - right.createdAt)
      : [...highlightsByScope].sort((left, right) => right.createdAt - left.createdAt);
  const selectedVisibleHighlights = sortedHighlights.filter((note) =>
    input.selectedHighlightIds.has(note.id)
  );
  const filteredNotes =
    input.notesKindFilter === 'highlight'
      ? notesByScope.filter((note) => note.kind === 'highlight')
      : input.notesKindFilter === 'note'
        ? notesByScope.filter((note) => note.kind !== 'highlight')
        : notesByScope;
  const groupedNotes = groupNotesByChapter(filteredNotes);
  const groupedHighlights = groupNotesByChapter(sortedHighlights);
  const collapsibleNoteGroupKeys = getKnownGroupKeys(groupedNotes);
  const collapsibleHighlightGroupKeys = getKnownGroupKeys(groupedHighlights);

  return {
    isCurrentLocationBookmarked,
    notesPanelSummary,
    bookmarksPanelSummary,
    highlightsPanelSummary,
    filteredBookmarks,
    sortedBookmarks,
    groupedBookmarks,
    collapsibleBookmarkGroupKeys,
    areAllBookmarkGroupsExpanded: areAllGroupsExpanded(
      collapsibleBookmarkGroupKeys,
      input.collapsedBookmarkGroups
    ),
    areAllBookmarkGroupsCollapsed: areAllGroupsCollapsed(
      collapsibleBookmarkGroupKeys,
      input.collapsedBookmarkGroups
    ),
    notesByScope,
    allHighlights: input.allHighlights,
    highlightsByScope,
    sortedHighlights,
    selectedVisibleHighlights,
    areAllVisibleHighlightsSelected:
      sortedHighlights.length > 0 && selectedVisibleHighlights.length === sortedHighlights.length,
    filteredNotes,
    groupedNotes,
    groupedHighlights,
    collapsibleNoteGroupKeys,
    collapsibleHighlightGroupKeys,
    areAllNoteGroupsExpanded: areAllGroupsExpanded(collapsibleNoteGroupKeys, input.collapsedNoteGroups),
    areAllNoteGroupsCollapsed: areAllGroupsCollapsed(collapsibleNoteGroupKeys, input.collapsedNoteGroups),
    areAllHighlightGroupsExpanded: areAllGroupsExpanded(
      collapsibleHighlightGroupKeys,
      input.collapsedHighlightGroups
    ),
    areAllHighlightGroupsCollapsed: areAllGroupsCollapsed(
      collapsibleHighlightGroupKeys,
      input.collapsedHighlightGroups
    )
  };
};

export const openReaderSidebarActiveAnnotationGroups = (input: {
  notesState: ReaderSidebarNotesState;
  bookmarksState: ReaderBookmarksState;
  allHighlights: ReaderSidebarAnnotationNote[];
  collapsedBookmarkGroups: Set<string>;
  collapsedNoteGroups: Set<string>;
  collapsedHighlightGroups: Set<string>;
}) => {
  const collapsedBookmarkGroups = new Set(input.collapsedBookmarkGroups);
  const collapsedNoteGroups = new Set(input.collapsedNoteGroups);
  const collapsedHighlightGroups = new Set(input.collapsedHighlightGroups);
  const activeBookmark = input.bookmarksState.bookmarks.find(
    (bookmark) => bookmark.locator === input.bookmarksState.activeLocator
  );
  const activeNote = input.notesState.notes.find((note) => note.cfi === input.notesState.activeCfi);
  const activeHighlight = input.allHighlights.find((note) => note.cfi === input.notesState.activeCfi);

  if (activeBookmark?.chapterHref) collapsedBookmarkGroups.delete(activeBookmark.chapterHref);
  if (activeNote?.chapterHref) collapsedNoteGroups.delete(activeNote.chapterHref);
  if (activeHighlight?.chapterHref) collapsedHighlightGroups.delete(activeHighlight.chapterHref);

  return {
    collapsedBookmarkGroups,
    collapsedNoteGroups,
    collapsedHighlightGroups
  };
};

export const pruneReaderSidebarHighlightSelectionState = (input: {
  allHighlights: ReaderSidebarAnnotationNote[];
  selectedHighlightIds: Set<string>;
  savedHighlightSelections: ReaderHighlightSelectionSet[];
}) => {
  if (input.allHighlights.length <= 0) {
    return {
      selectedHighlightIds: input.selectedHighlightIds,
      savedHighlightSelections: input.savedHighlightSelections
    };
  }

  // Highlights can disappear after deletion or book restoration. Keep selection
  // IDs and saved current-book sets from pointing at records the sidebar no
  // longer renders.
  const visibleHighlightIds = new Set(input.allHighlights.map((note) => note.id));
  return {
    selectedHighlightIds: new Set(
      Array.from(input.selectedHighlightIds).filter((id) => visibleHighlightIds.has(id))
    ),
    savedHighlightSelections: input.savedHighlightSelections
      .map((set) => ({
        ...set,
        selectedIds: set.selectedIds.filter((id) => visibleHighlightIds.has(id))
      }))
      .filter((set) => set.selectedIds.length > 0)
  };
};

export const dedupeReaderSidebarSavedHighlightSelections = (
  savedHighlightSelections: ReaderHighlightSelectionSet[]
) =>
  savedHighlightSelections.filter(
    (set, index, allSets) =>
      set.selectedIds.length > 0 && allSets.findIndex((candidate) => candidate.id === set.id) === index
  );

export const isReaderSidebarGroupCollapsed = (collapsedGroups: Set<string>, chapterHref: string) =>
  collapsedGroups.has(chapterHref);

export const toggleReaderSidebarGroupCollapsed = (
  collapsedGroups: Set<string>,
  chapterHref: string
) => {
  if (!chapterHref || chapterHref === UNKNOWN_CHAPTER_KEY) return collapsedGroups;
  const nextGroups = new Set(collapsedGroups);
  if (nextGroups.has(chapterHref)) {
    nextGroups.delete(chapterHref);
  } else {
    nextGroups.add(chapterHref);
  }
  return nextGroups;
};

export const expandReaderSidebarGroups = () => new Set<string>();

export const collapseReaderSidebarGroups = (collapsibleGroupKeys: string[]) =>
  new Set(collapsibleGroupKeys);

export const getReaderSidebarAnnotationKindLabel = (notes: ReaderSidebarAnnotationNote[]) => {
  const highlightCount = notes.filter((note) => note.kind === 'highlight').length;
  if (highlightCount === notes.length) return '高亮';
  if (highlightCount === 0) return '笔记';
  return '标注';
};

export const toggleReaderSidebarHighlightSelection = (
  selectedHighlightIds: Set<string>,
  id: string
) => {
  const nextSelection = new Set(selectedHighlightIds);
  if (nextSelection.has(id)) {
    nextSelection.delete(id);
  } else {
    nextSelection.add(id);
  }
  return nextSelection;
};

export const selectAllReaderSidebarHighlights = (highlights: ReaderSidebarAnnotationNote[]) =>
  new Set(highlights.map((note) => note.id));

export const clearReaderSidebarHighlightSelection = () => new Set<string>();

export const invertReaderSidebarHighlightSelection = (
  selectedHighlightIds: Set<string>,
  highlights: ReaderSidebarAnnotationNote[]
) => {
  const nextSelection = new Set(selectedHighlightIds);
  for (const note of highlights) {
    if (nextSelection.has(note.id)) {
      nextSelection.delete(note.id);
    } else {
      nextSelection.add(note.id);
    }
  }
  return nextSelection;
};

export const addReaderSidebarHighlightGroupSelection = (
  selectedHighlightIds: Set<string>,
  highlights: ReaderSidebarAnnotationNote[]
) => {
  const nextSelection = new Set(selectedHighlightIds);
  for (const note of highlights) {
    nextSelection.add(note.id);
  }
  return nextSelection;
};

export const removeReaderSidebarHighlightGroupSelection = (
  selectedHighlightIds: Set<string>,
  highlights: ReaderSidebarAnnotationNote[]
) => {
  const nextSelection = new Set(selectedHighlightIds);
  for (const note of highlights) {
    nextSelection.delete(note.id);
  }
  return nextSelection;
};

export const isReaderSidebarHighlightGroupFullySelected = (
  selectedHighlightIds: Set<string>,
  highlights: ReaderSidebarAnnotationNote[]
) => highlights.length > 0 && highlights.every((note) => selectedHighlightIds.has(note.id));

export const isReaderSidebarHighlightGroupPartiallySelected = (
  selectedHighlightIds: Set<string>,
  highlights: ReaderSidebarAnnotationNote[]
) => highlights.some((note) => selectedHighlightIds.has(note.id));

import { buildDesktopLibraryBrowseBodySurfaceModel, buildStarterLibraryBrowseBodySurfaceModel } from './body';
import { buildLibraryPageChromeModel } from './chrome';
import type { LibraryPageSurfaceModel } from './types';

type BuildDesktopLibraryPageSurfaceModelArgs = {
  chrome: Parameters<typeof buildLibraryPageChromeModel>[0];
  body: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0];
};

type BuildStarterLibraryPageSurfaceModelArgs = {
  chrome: Parameters<typeof buildLibraryPageChromeModel>[0];
  body: Parameters<typeof buildStarterLibraryBrowseBodySurfaceModel>[0];
};

type BuildLibraryPageSurfaceSetArgs = {
  chrome: Parameters<typeof buildLibraryPageChromeModel>[0];
  desktopBody: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0];
  starterBody: Parameters<typeof buildStarterLibraryBrowseBodySurfaceModel>[0];
  desktopLibraryMode: boolean;
};

export const createEmptyLibraryPageSurfaceModel = (
  supportsDesktopBookActions: boolean
): LibraryPageSurfaceModel => ({
  chrome: {
    header: {
      totalBooks: 0,
      query: '',
      viewMode: 'grid',
      sortBy: 'recent',
      groupBy: 'none',
      browseState: {
        groupBy: 'none',
        groupScope: '',
        trail: []
      },
      activeGroupVisibleCount: 0,
      activeFilter: 'all',
      statusOptionCounts: {
        all: 0,
        reading: 0,
        unstarted: 0,
        finished: 0
      },
      activeFormatFilter: 'all',
      formatOptions: [],
      formatOptionCounts: {},
      activeCollectionFilter: 'all',
      collectionOptions: [],
      collectionOptionCounts: {},
      activeTagFilter: 'all',
      tagOptions: [],
      tagOptionCounts: {},
      importDisabled: false,
      statusSummary: '',
      activeFilterDetail: '',
      activeFilterChips: [],
      filterSummary: '',
      formatSummary: '',
      collectionSummary: '',
      tagSummary: '',
      coverSummary: ''
    },
    notice: null,
    showReadestMigration: false,
    readestLibraryCount: 0,
    readestCompatibleCount: 0,
    migrationBusy: false
  },
  body: {
    body: {},
    groupedBrowseMode: false,
    browseState: {
      groupBy: 'none',
      groupScope: '',
      trail: []
    },
    browseBooks: [],
    viewMode: 'grid',
    shelfBooks: [],
    shelfSectionTitle: '书架'
  },
  supportsDesktopBookActions
});

export const buildDesktopLibraryPageSurfaceModel = ({
  chrome,
  body
}: BuildDesktopLibraryPageSurfaceModelArgs): LibraryPageSurfaceModel => ({
  chrome: buildLibraryPageChromeModel(chrome),
  body: buildDesktopLibraryBrowseBodySurfaceModel(body),
  supportsDesktopBookActions: true
});

export const buildStarterLibraryPageSurfaceModel = ({
  chrome,
  body
}: BuildStarterLibraryPageSurfaceModelArgs): LibraryPageSurfaceModel => ({
  chrome: buildLibraryPageChromeModel(chrome),
  body: buildStarterLibraryBrowseBodySurfaceModel(body),
  supportsDesktopBookActions: false
});

export const buildLibraryPageSurfaceSet = ({
  chrome,
  desktopBody,
  starterBody,
  desktopLibraryMode
}: BuildLibraryPageSurfaceSetArgs) => {
  const desktop = buildDesktopLibraryPageSurfaceModel({
    chrome,
    body: desktopBody
  });
  const starter = buildStarterLibraryPageSurfaceModel({
    chrome,
    body: starterBody
  });

  return {
    desktop,
    starter,
    active: desktopLibraryMode ? desktop : starter
  };
};

import { createEmptyReaderPreviewState, READER_EMPTY_TITLE, READER_NOT_OPENED_LOCATION_LABEL, READER_OPENING_LOCATION_LABEL } from './types';
import type { ReaderControlRequest, ReaderEngineMountState, ReaderPreviewState } from './types';
import type { ReaderRouteOpenState, ReaderRouteOpenTarget } from './route';

export type ReaderParallelPaneId = 'primary' | 'secondary';

export const READER_PARALLEL_PRIMARY_PANE_ID: ReaderParallelPaneId = 'primary';
export const READER_PARALLEL_SECONDARY_PANE_ID: ReaderParallelPaneId = 'secondary';

export type ReaderParallelPaneSourceState = {
  kind: 'route' | 'manual' | 'empty';
  sourceKey: string;
  bookKey: string;
  label: string;
};

export type ReaderParallelPaneProgressState = {
  label: string;
  fraction: number;
  location: string;
};

export type ReaderParallelPaneState = {
  id: ReaderParallelPaneId;
  source: ReaderParallelPaneSourceState;
  openTarget: ReaderRouteOpenTarget | null;
  controlRequest: ReaderControlRequest | null;
  preview: ReaderPreviewState;
  progress: ReaderParallelPaneProgressState;
  mountState: ReaderEngineMountState;
};

export type ReaderParallelSessionState = {
  activePaneId: ReaderParallelPaneId;
  panes: Record<ReaderParallelPaneId, ReaderParallelPaneState>;
};

const createReaderParallelPaneProgressState = (
  preview: ReaderPreviewState = createEmptyReaderPreviewState()
): ReaderParallelPaneProgressState => ({
  label: preview.progressLabel,
  fraction: preview.progressFraction,
  location: preview.progressLocation
});

const createReaderParallelPaneSourceState = (
  id: ReaderParallelPaneId,
  routeOpenState: ReaderRouteOpenState
): ReaderParallelPaneSourceState => {
  const target = routeOpenState.target;

  if (!target) {
    return {
      kind: 'empty',
      sourceKey: routeOpenState.autoOpenKey || routeOpenState.bookKey || '',
      bookKey: routeOpenState.bookKey || '',
      label: id === READER_PARALLEL_PRIMARY_PANE_ID ? '等待打开书籍' : '等待打开第二个书籍'
    };
  }

  return {
    kind: 'route',
    sourceKey: routeOpenState.autoOpenKey || target.bookKey,
    bookKey: routeOpenState.bookKey || target.bookKey,
    label: target.label
  };
};

const createEmptyReaderParallelPaneState = (
  id: ReaderParallelPaneId,
  source: ReaderParallelPaneSourceState
): ReaderParallelPaneState => ({
  id,
  source,
  openTarget: null,
  controlRequest: null,
  preview: createEmptyReaderPreviewState(),
  progress: createReaderParallelPaneProgressState(),
  mountState: 'idle'
});

const createReaderParallelPaneStateFromRoute = (
  id: ReaderParallelPaneId,
  routeOpenState: ReaderRouteOpenState
): ReaderParallelPaneState => {
  const source = createReaderParallelPaneSourceState(id, routeOpenState);
  const openTarget = routeOpenState.target;

  return {
    ...createEmptyReaderParallelPaneState(id, source),
    openTarget,
    mountState: openTarget ? 'loading' : 'idle'
  };
};

const updateReaderParallelPaneState = (
  session: ReaderParallelSessionState,
  paneId: ReaderParallelPaneId,
  updater: (pane: ReaderParallelPaneState) => ReaderParallelPaneState
): ReaderParallelSessionState => {
  const currentPane = session.panes[paneId];
  const nextPane = updater(currentPane);
  if (nextPane === currentPane) return session;

  return {
    ...session,
    panes: {
      ...session.panes,
      [paneId]: nextPane
    }
  };
};

const deriveReaderParallelPaneMountState = (
  preview: ReaderPreviewState
): ReaderEngineMountState => {
  if (preview.locationLabel === READER_OPENING_LOCATION_LABEL) return 'loading';
  if (preview.title === READER_EMPTY_TITLE && preview.locationLabel === READER_NOT_OPENED_LOCATION_LABEL) {
    return 'idle';
  }
  if (preview.title === READER_EMPTY_TITLE) return 'loading';
  return 'ready';
};

const isOpeningReaderControlRequest = (request: ReaderControlRequest | null) =>
  request?.type === 'asset' ||
  request?.type === 'library-file' ||
  request?.type === 'file';

const toOpenTargetFromControlRequest = (
  request: ReaderControlRequest,
  fallbackBookKey: string,
  fallbackLabel: string
): ReaderRouteOpenTarget | null => {
  if (request.type === 'asset') {
    return {
      kind: 'asset',
      label: request.label || fallbackLabel,
      url: request.url,
      bookKey: request.url || request.label || fallbackBookKey
    };
  }

  if (request.type === 'library-file') {
    return {
      kind: 'library-file',
      label: request.label || fallbackLabel,
      path: request.path,
      restoreFraction: request.restoreFraction,
      restoreLocation: request.restoreLocation,
      bookKey: request.path || request.label || fallbackBookKey
    };
  }

  return null;
};

export const createReaderParallelSessionFromRoute = (
  routeOpenState: ReaderRouteOpenState
): ReaderParallelSessionState => ({
  activePaneId: READER_PARALLEL_PRIMARY_PANE_ID,
  panes: {
    primary: createReaderParallelPaneStateFromRoute(READER_PARALLEL_PRIMARY_PANE_ID, routeOpenState),
    secondary: createEmptyReaderParallelPaneState(
      READER_PARALLEL_SECONDARY_PANE_ID,
      createReaderParallelPaneSourceState(READER_PARALLEL_SECONDARY_PANE_ID, {
        ...routeOpenState,
        autoOpenKey: '',
        target: null,
        bookKey: ''
      })
    )
  }
});

export const activateReaderParallelPane = (
  session: ReaderParallelSessionState,
  paneId: ReaderParallelPaneId
): ReaderParallelSessionState =>
  session.activePaneId === paneId
    ? session
    : {
        ...session,
        activePaneId: paneId
      };

export const updateReaderParallelPanePreview = (
  session: ReaderParallelSessionState,
  paneId: ReaderParallelPaneId,
  preview: ReaderPreviewState
): ReaderParallelSessionState =>
  updateReaderParallelPaneState(session, paneId, (pane) => {
    const nextProgress = createReaderParallelPaneProgressState(preview);
    const nextMountState = deriveReaderParallelPaneMountState(preview);

    if (
      pane.preview === preview &&
      pane.progress.label === nextProgress.label &&
      pane.progress.fraction === nextProgress.fraction &&
      pane.progress.location === nextProgress.location &&
      pane.mountState === nextMountState
    ) {
      return pane;
    }

    return {
      ...pane,
      preview,
      progress: nextProgress,
      mountState: nextMountState
    };
  });

export const updateReaderParallelPaneControlRequest = (
  session: ReaderParallelSessionState,
  paneId: ReaderParallelPaneId,
  controlRequest: ReaderControlRequest | null
): ReaderParallelSessionState =>
  updateReaderParallelPaneState(session, paneId, (pane) => {
    const nextOpenTarget =
      controlRequest && isOpeningReaderControlRequest(controlRequest)
        ? toOpenTargetFromControlRequest(controlRequest, pane.source.bookKey, pane.source.label)
        : pane.openTarget;
    const nextMountState = isOpeningReaderControlRequest(controlRequest) ? 'loading' : pane.mountState;

    if (
      pane.controlRequest === controlRequest &&
      pane.openTarget === nextOpenTarget &&
      pane.mountState === nextMountState
    ) {
      return pane;
    }

    return {
      ...pane,
      controlRequest,
      openTarget: nextOpenTarget,
      mountState: nextMountState
    };
  });

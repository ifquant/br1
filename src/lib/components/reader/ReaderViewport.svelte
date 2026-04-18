<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import {
    FOLIATE_VIEW_TAG,
    READER_ENGINE_HOST_ATTR,
    READER_ENGINE_STATUS_ATTR,
    createFoliateViewElement,
    ensureFoliateViewDefinition,
    flattenToc,
    getReaderFormatSupportStatus,
    getReaderViewStyles,
    inferReaderFormatLabelFromName,
    installReaderBookTransformGuards,
    loadReaderBookDocument,
    pickAuthor,
    pickText,
    wrapFoliateViewElement,
    type ReaderControlRequest,
    type ReaderBookDocument,
    type FoliateViewElement
  } from '$lib/reader';
  import { Overlayer } from 'foliate-js/overlayer.js';
  import type {
    ReaderNote,
    ReaderPreviewState,
    ReaderSearchConfig,
    ReaderSelectionState,
    ReaderSearchResult,
    ReaderSearchState,
    ReaderTocItem,
    ReaderViewWidthMode
  } from '$lib/reader';
  import {
    clearReaderSearchCache,
    loadLibraryBookFile,
    loadLibraryFileFingerprint,
    loadReaderSearchCache,
    saveReaderSearchCache
  } from '$lib/services';

  export let title = 'Reading Surface';
  export let controlRequest: ReaderControlRequest | null = null;
  export let hint = '中央阅读舞台保持安静，控制层只在边缘提供辅助。';
  export let isWindowMode = false;
  export let notes: ReaderNote[] = [];
  export let viewWidthMode: ReaderViewWidthMode = 'standard';

  const dispatch = createEventDispatcher<{
    notefocus: string;
    selectionchange: ReaderSelectionState | null;
    readerstate: ReaderPreviewState;
    tocchange: ReaderTocItem[];
    searchchange: ReaderSearchState;
    searchcachekeychange: string;
  }>();

  let hostElement: HTMLDivElement | null = null;
  let stageElement: HTMLDivElement | null = null;
  let adapterStatus: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  let openStatus: 'idle' | 'loading' | 'open' | 'error' = 'idle';
  let openSourceLabel = 'book';
  let openFailureSource = '';
  let openFailureMessage = '';
  let searchCacheBookKey = '';
  let foliateViewElement: FoliateViewElement | null = null;
  let handledControlNonce = 0;
  let lastSearchToken = 0;
  let searchCache = new Map<string, ReaderSearchResult[]>();
  let boundSelectionDocs = new WeakSet<Document>();
  let syncedNoteValues = new Set<string>();
  let stageResizeObserver: ResizeObserver | null = null;
  let currentFormatLabel = 'BOOK';
  let currentLayoutLabel = 'WAITING';
  let openEngineMode: 'foliate' | 'plain-text' = 'foliate';
  let plainTextContent = '';
  let plainTextTitle = '';
  let plainTextScroller: HTMLDivElement | null = null;

  type ResolvedReaderOpenSource = {
    source: string | File;
    sourceLabel: string;
    cacheBookKey: string;
    restoreFraction?: number;
    restoreLocation?: string;
  };

  const getFallbackReaderState = (
    overrides: Partial<ReaderPreviewState> = {}
  ): ReaderPreviewState => ({
    title: openSourceLabel || 'Bridge Reader',
    author: 'Reader workspace',
    chapterLabel: 'Waiting for book',
    chapterHref: '',
    progressLabel: '0%',
    progressFraction: 0,
    progressLocation: '',
    locationLabel: 'Not opened',
    formatLabel: currentFormatLabel,
    layoutLabel: currentLayoutLabel,
    ...overrides
  });

  const inferReaderFormatLabel = (source: string | File, sourceLabel: string) => {
    if (source instanceof File) {
      if (source.type === 'application/pdf') return 'PDF';
      return inferReaderFormatLabelFromName(source.name) || 'BOOK';
    }

    return (
      inferReaderFormatLabelFromName(source) ||
      inferReaderFormatLabelFromName(sourceLabel) ||
      'BOOK'
    );
  };

  const inferReaderLayoutLabel = (book: ReaderBookDocument | undefined, formatLabel: string) => {
    if (formatLabel === 'PDF' || book?.rendition?.layout === 'pre-paginated') {
      return 'FIXED';
    }
    return 'PAGINATED';
  };

  const formatReaderLocationLabel = (
    formatLabel: string,
    lastLocation:
      | {
          location?: {
            current?: number;
            total?: number;
          };
        }
      | null
      | undefined
  ) => {
    const current = lastLocation?.location?.current;
    const total = lastLocation?.location?.total;
    if (typeof current !== 'number' || typeof total !== 'number') return 'Opening book';
    if (formatLabel === 'PDF') {
      return `Page ${Math.max(1, current)} / ${Math.max(1, total)}`;
    }
    return `${current} / ${total}`;
  };

  const isPlainTextFormat = (formatLabel: string) => formatLabel === 'TXT';

  const getPlainTextLines = () => plainTextContent.split(/\r?\n/);

  const getPlainTextScrollFraction = () => {
    if (!plainTextScroller) return 0;
    const maxScroll = plainTextScroller.scrollHeight - plainTextScroller.clientHeight;
    if (maxScroll <= 0) return 0;
    return Math.max(0, Math.min(1, plainTextScroller.scrollTop / maxScroll));
  };

  const getPlainTextReaderState = (
    overrides: Partial<ReaderPreviewState> = {}
  ): ReaderPreviewState => {
    const fraction = getPlainTextScrollFraction();
    const lines = getPlainTextLines();
    const totalLines = Math.max(lines.length, 1);
    const currentLine = Math.min(
      totalLines,
      Math.max(1, Math.round(fraction * Math.max(totalLines - 1, 0)) + 1)
    );
    const progressPercent = formatReaderProgressPercent(fraction);

    return {
      ...getFallbackReaderState(),
      title: plainTextTitle || openSourceLabel || 'Plain text book',
      author: 'Plain text source',
      chapterLabel: 'Plain text',
      chapterHref: '',
      progressLabel: `${progressPercent}%`,
      progressFraction: fraction,
      progressLocation: `txt:${fraction.toFixed(6)}`,
      locationLabel: `Line ${currentLine} / ${totalLines}`,
      formatLabel: currentFormatLabel,
      layoutLabel: currentLayoutLabel,
      ...overrides
    };
  };

  const emitPlainTextReaderState = (partial?: Partial<ReaderPreviewState>) => {
    dispatch('readerstate', getPlainTextReaderState(partial));
  };

  const waitForReaderLayoutToSettle = async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  };

  const formatReaderProgressPercent = (fraction: number) => {
    if (fraction <= 0) return 0;
    return Math.max(1, Math.round(fraction * 100));
  };

  const normalizeReaderOpenFailureMessage = (
    error: unknown,
    formatLabel: string,
    sourceLabel: string
  ) => {
    const detail = error instanceof Error ? error.message : String(error);

    if (
      detail.includes('requires the Tauri desktop runtime') ||
      detail.includes('library-file reader sources require the Tauri desktop runtime')
    ) {
      return 'This book source can only be opened in the Tauri desktop app.';
    }

    if (detail.includes('PDF vendor assets are unavailable')) {
      return detail;
    }

    if (detail.includes('does not expose makeBook()') || detail.includes('makeBook')) {
      return `Failed to prepare ${formatLabel} book data before opening ${sourceLabel}.`;
    }

    if (detail.includes('support is planned but not implemented yet')) {
      return `${formatLabel} support is planned for br1 but not implemented yet: ${sourceLabel}.`;
    }

    if (detail.toLowerCase().includes('unsupported')) {
      return `Unsupported ${formatLabel} source: ${sourceLabel}.`;
    }

    return detail || `Unable to open ${sourceLabel}.`;
  };

  const getViewportStageSize = () => {
    const width = stageElement?.clientWidth || hostElement?.clientWidth || window.innerWidth;
    const height = stageElement?.clientHeight || hostElement?.clientHeight || window.innerHeight;
    return { width, height };
  };

  const getResponsiveMaxInlineSize = () => {
    const { width, height } = getViewportStageSize();
    const aspectRatio = width / Math.max(height, 1);
    const isUnfoldedWindow = aspectRatio < 1.3 && aspectRatio > 0.77 && width > 600;
    if (viewWidthMode === 'focus') {
      return isUnfoldedWindow ? 520 : 640;
    }
    if (viewWidthMode === 'wide') {
      return isUnfoldedWindow ? 660 : 840;
    }
    return isUnfoldedWindow ? 576 : 720;
  };

  const getResponsiveMaxColumnCount = () => {
    const { width } = getViewportStageSize();
    // Readest-style desktop reader windows keep reflowable books on a
    // single visible page instead of opening into a two-page spread.
    return isWindowMode ? 1 : width >= 1120 ? 2 : 1;
  };

  const getResponsiveHorizontalMargin = () => {
    if (!isWindowMode) return '34px';
    if (viewWidthMode === 'focus') return '48px';
    if (viewWidthMode === 'wide') return '18px';
    return '30px';
  };

  const NOTE_PREFIX = 'foliate-note:';

  const emitSelectionState = (detail: ReaderSelectionState | null) => {
    dispatch('selectionchange', detail);
  };

  const getSelectionState = (doc: Document, index: number): ReaderSelectionState | null => {
    if (!foliateViewElement) return null;
    const selection = doc.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
    const text = selection.toString().trim();
    if (!text) return null;
    const range = selection.getRangeAt(0).cloneRange();
    const cfi = foliateViewElement.getCFI(index, range);
    const chapterLabel = foliateViewElement.lastLocation?.tocItem?.label || '当前章节';
    const chapterHref = foliateViewElement.lastLocation?.tocItem?.href || '';
    return { cfi, text, chapterLabel, chapterHref };
  };

  const bindSelectionTracking = (doc: Document, index: number) => {
    if (boundSelectionDocs.has(doc)) return;
    boundSelectionDocs.add(doc);
    doc.addEventListener('selectionchange', () => {
      emitSelectionState(getSelectionState(doc, index));
    });
  };

  const emitReaderState = (partial?: Partial<ReaderPreviewState>) => {
    if (openEngineMode === 'plain-text' && openStatus === 'open') {
      emitPlainTextReaderState(partial);
      return;
    }

    const book = foliateViewElement?.book;
    const lastLocation = foliateViewElement?.lastLocation;
    if (!book || openStatus !== 'open') {
      dispatch('readerstate', getFallbackReaderState(partial));
      return;
    }
    const fraction = typeof lastLocation?.fraction === 'number' ? lastLocation.fraction : 0;
    const progressPercent = formatReaderProgressPercent(fraction);
    const sectionCurrent = lastLocation?.section?.current;
    const sectionTotal = lastLocation?.section?.total;
    const fallbackChapter =
      typeof sectionCurrent === 'number' && typeof sectionTotal === 'number'
        ? `Section ${sectionCurrent + 1} / ${sectionTotal}`
        : 'Waiting for location';

    dispatch('readerstate', {
      ...getFallbackReaderState(),
      title: pickText(book?.metadata?.title) || openSourceLabel || 'Bridge Reader',
      author: pickAuthor(book?.metadata?.creator) || 'Unknown author',
      chapterLabel: lastLocation?.tocItem?.label || fallbackChapter,
      chapterHref: lastLocation?.tocItem?.href || '',
      progressLabel: `${progressPercent}%`,
      progressFraction: fraction,
      progressLocation:
        typeof (lastLocation as { cfi?: unknown } | undefined)?.cfi === 'string'
          ? ((lastLocation as { cfi?: string }).cfi ?? '')
          : '',
      locationLabel: formatReaderLocationLabel(currentFormatLabel, lastLocation),
      formatLabel: currentFormatLabel,
      layoutLabel: currentLayoutLabel,
      ...partial
    });
  };

  const configureFoliatePreview = () => {
    const renderer = foliateViewElement?.renderer;
    if (!renderer) return;
    const maxInlineSize = getResponsiveMaxInlineSize();
    const maxColumnCount = getResponsiveMaxColumnCount();

    renderer.setStyles?.(getReaderViewStyles());
    renderer.setAttribute('flow', 'paginated');
    renderer.setAttribute('margin-top', isWindowMode ? '46px' : '36px');
    renderer.setAttribute('margin-right', getResponsiveHorizontalMargin());
    renderer.setAttribute('margin-bottom', isWindowMode ? '44px' : '36px');
    renderer.setAttribute('margin-left', getResponsiveHorizontalMargin());
    renderer.setAttribute('gap', '5%');
    renderer.setAttribute('max-inline-size', `${maxInlineSize}px`);
    renderer.setAttribute('max-block-size', isWindowMode ? '1440px' : '1180px');
    renderer.setAttribute('max-column-count', `${maxColumnCount}`);
  };

  const syncEngineModeVisibility = () => {
    if (!foliateViewElement) return;
    foliateViewElement.style.display = openEngineMode === 'plain-text' ? 'none' : '';
  };

  const loadPlainTextSource = async (source: string | File) => {
    if (source instanceof File) {
      return source.text();
    }

    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`failed to load TXT source (${response.status})`);
    }
    return response.text();
  };

  const applyPlainTextFraction = async (fraction?: number) => {
    await tick();
    if (!plainTextScroller || typeof fraction !== 'number' || Number.isNaN(fraction)) {
      return;
    }
    const maxScroll = plainTextScroller.scrollHeight - plainTextScroller.clientHeight;
    if (maxScroll <= 0) return;
    plainTextScroller.scrollTop = Math.max(0, Math.min(1, fraction)) * maxScroll;
  };

  const bindOpenRendererDocs = () => {
    const docs = foliateViewElement?.renderer?.getContents?.() ?? [];
    for (const { doc, index } of docs) {
      if (!(doc instanceof Document) || typeof index !== 'number') continue;
      bindSelectionTracking(doc, index);
    }
  };

  const resolveControlOpenSource = async (
    request: Extract<ReaderControlRequest, { type: 'asset' | 'library-file' | 'file' }>
  ): Promise<ResolvedReaderOpenSource> => {
    if (request.type === 'asset') {
      return {
        source: request.url,
        sourceLabel: request.label,
        cacheBookKey: request.url
      };
    }

    if (request.type === 'library-file') {
      const [fingerprint, file] = await Promise.all([
        loadLibraryFileFingerprint(request.path),
        loadLibraryBookFile(request.path)
      ]);

      return {
        source: file,
        sourceLabel: request.label || file.name,
        cacheBookKey: fingerprint,
        restoreFraction: request.restoreFraction,
        restoreLocation: request.restoreLocation
      };
    }

    return {
      source: request.file,
      sourceLabel: request.file.name,
      cacheBookKey: `${request.file.name}:${request.file.size}:${request.file.lastModified}`
    };
  };

  const openBook = async (
    source: string | File,
    sourceLabel: string,
    cacheBookKey: string,
    restoreFraction?: number,
    restoreLocation?: string
  ) => {
    if (!foliateViewElement || openStatus === 'loading') return;

    openStatus = 'loading';
    openSourceLabel = sourceLabel;
    openFailureSource = '';
    openFailureMessage = '';
    currentLayoutLabel = 'WAITING';
    searchCache = new Map();
    searchCacheBookKey = cacheBookKey;
    dispatch('searchcachekeychange', cacheBookKey);
    emitSearchState({ query: '', status: 'idle', results: [] });
    emitSelectionState(null);
    syncedNoteValues = new Set();
      emitReaderState({
        title: sourceLabel || 'Bridge Reader',
        author: 'Preparing book',
        chapterLabel: 'Opening book',
        locationLabel: 'Opening book'
      });

    try {
      currentFormatLabel = inferReaderFormatLabel(source, sourceLabel);
      const formatSupportStatus = getReaderFormatSupportStatus(currentFormatLabel);
      let openTarget: string | File | ReaderBookDocument = source;

      if (formatSupportStatus === 'unsupported') {
        throw new Error(`unsupported ${currentFormatLabel} format`);
      }

      if (formatSupportStatus === 'planned') {
        throw new Error(`${currentFormatLabel} support is planned but not implemented yet`);
      }

      if (isPlainTextFormat(currentFormatLabel)) {
        openEngineMode = 'plain-text';
        plainTextContent = await loadPlainTextSource(source);
        plainTextTitle = sourceLabel || 'Plain text book';
        currentLayoutLabel = 'SCROLL';
        syncEngineModeVisibility();
        openStatus = 'open';
        await applyPlainTextFraction(restoreFraction);
        dispatch('tocchange', []);
        emitSearchState({ query: '', status: 'idle', results: [], progress: 0 });
        emitPlainTextReaderState();
        return;
      }

      openEngineMode = 'foliate';
      plainTextContent = '';
      plainTextTitle = '';
      syncEngineModeVisibility();

      if (source instanceof File) {
        openTarget = await loadReaderBookDocument(source);
      }

      await foliateViewElement.open(openTarget);
      currentLayoutLabel = inferReaderLayoutLabel(foliateViewElement.book, currentFormatLabel);
      installReaderBookTransformGuards(foliateViewElement.book);
      configureFoliatePreview();
      await applyInitialNavigation(restoreFraction, restoreLocation);
      await waitForReaderLayoutToSettle();
      configureFoliatePreview();
      await waitForReaderLayoutToSettle();
      openStatus = 'open';
      bindOpenRendererDocs();
      dispatch('tocchange', flattenToc(foliateViewElement.book?.toc));
      emitReaderState();
    } catch (error) {
      console.error(`Failed to open reader source: ${sourceLabel}`, error);
      openStatus = 'error';
      openFailureSource = sourceLabel;
      openFailureMessage = normalizeReaderOpenFailureMessage(
        error,
        currentFormatLabel,
        sourceLabel || 'book'
      );
      emitReaderState({
        title: sourceLabel || 'Bridge Reader',
        author: 'Open failed',
        chapterLabel: 'Unable to open book',
        locationLabel: 'Open failed'
      });
    }
  };

  const applyInitialNavigation = async (
    restoreFraction?: number,
    restoreLocation?: string
  ) => {
    if (openEngineMode === 'plain-text') {
      let targetFraction = restoreFraction;
      if (
        typeof targetFraction !== 'number' &&
        restoreLocation &&
        restoreLocation.startsWith('txt:')
      ) {
        const parsed = Number(restoreLocation.slice(4));
        if (!Number.isNaN(parsed)) {
          targetFraction = parsed;
        }
      }

      await applyPlainTextFraction(targetFraction);
      return;
    }

    if (!foliateViewElement) return;

    const hasRestoreFraction = typeof restoreFraction === 'number' && restoreFraction > 0;
    const waitForNavigation = async (operation: Promise<unknown>, label: string) => {
      return Promise.race([
        operation,
        new Promise<never>((_, reject) => {
          window.setTimeout(() => {
            reject(new Error(`${label} timed out`));
          }, 5000);
        })
      ]);
    };

    if (restoreLocation) {
      try {
        await waitForNavigation(foliateViewElement.init({ lastLocation: restoreLocation }), 'restoreLocation');
        return;
      } catch (error) {
        console.warn('Failed to restore reader location, falling back to fraction navigation', error);
      }
    }

    if (hasRestoreFraction) {
      await waitForNavigation(foliateViewElement.goToFraction(restoreFraction), 'restoreFraction');
      return;
    }

    await waitForNavigation(foliateViewElement.init({ showTextStart: true }), 'showTextStart');
  };

  const emitSearchState = (partial: Partial<ReaderSearchState>) => {
    dispatch('searchchange', {
      query: '',
      status: 'idle',
      results: [],
      progress: 0,
      ...partial
    });
  };

  const getSearchCacheKey = (query: string, config: ReaderSearchConfig) =>
    JSON.stringify({
      query,
      scope: config.scope,
      matchCase: config.matchCase,
      matchWholeWords: config.matchWholeWords,
      matchDiacritics: config.matchDiacritics,
      section: config.scope === 'section' ? foliateViewElement?.lastLocation?.section?.current ?? null : null
    });

  const runSearch = async (query: string, config: ReaderSearchConfig) => {
    if (openEngineMode === 'plain-text') {
      const normalizedQuery = query.trim();
      if (!normalizedQuery) {
        emitSearchState({ query: '', status: 'idle', results: [], progress: 0 });
        return;
      }

      emitSearchState({
        query: normalizedQuery,
        status: 'error',
        results: [],
        progress: 0,
        error: 'Search is not available for TXT books yet.'
      });
      return;
    }

    if (!foliateViewElement) return;

    lastSearchToken += 1;
    const token = lastSearchToken;
    const normalizedQuery = query.trim();

    foliateViewElement.clearSearch();

    if (!normalizedQuery) {
      emitSearchState({ query: '', status: 'idle', results: [], progress: 0 });
      return;
    }

    const cacheKey = getSearchCacheKey(normalizedQuery, config);
    const cached = searchCache.get(cacheKey);
    if (cached) {
      emitSearchState({ query: normalizedQuery, status: 'done', results: cached, progress: 1 });
      return;
    }

    const diskCached = searchCacheBookKey
      ? await loadReaderSearchCache(searchCacheBookKey, cacheKey)
      : null;
    if (diskCached?.length) {
      searchCache.set(cacheKey, diskCached);
      emitSearchState({ query: normalizedQuery, status: 'done', results: diskCached, progress: 1 });
      return;
    }

    emitSearchState({ query: normalizedQuery, status: 'searching', results: [], progress: 0 });

    try {
      const results: ReaderSearchResult[] = [];
      for await (const result of foliateViewElement.search({
        query: normalizedQuery,
        index: config.scope === 'section' ? foliateViewElement.lastLocation?.section?.current : undefined,
        matchCase: config.matchCase,
        matchWholeWords: config.matchWholeWords,
        matchDiacritics: config.matchDiacritics
      })) {
        if (token !== lastSearchToken) return;
        if (result === 'done') {
          searchCache.set(cacheKey, [...results]);
          if (searchCacheBookKey && results.length) {
            await saveReaderSearchCache(searchCacheBookKey, cacheKey, results);
          }
          emitSearchState({ query: normalizedQuery, status: 'done', results, progress: 1 });
          return;
        }
        if ('progress' in result) {
          emitSearchState({
            query: normalizedQuery,
            status: 'searching',
            results: [...results],
            progress:
              typeof result.progress === 'number'
                ? Math.max(0, Math.min(1, result.progress > 1 ? result.progress / 100 : result.progress))
                : 0
          });
          continue;
        }
        if ('subitems' in result) {
          results.push(
            ...result.subitems.map((item) => ({
              cfi: item.cfi,
              label: result.label || 'Search result',
              excerpt: item.excerpt
            }))
          );
        } else if ('cfi' in result) {
          results.push({
            cfi: result.cfi,
            label: 'Search result',
            excerpt: result.excerpt
          });
        }
        emitSearchState({
          query: normalizedQuery,
          status: 'searching',
          results: [...results],
          progress: results.length > 0 ? undefined : 0
        });
      }
    } catch (error) {
      if (token !== lastSearchToken) return;
      emitSearchState({
        query: normalizedQuery,
        status: 'error',
        results: [],
        progress: 0,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const applyControlRequest = async () => {
    if (!controlRequest || handledControlNonce === controlRequest.nonce) return;
    if (!foliateViewElement) return;

    if (
      controlRequest.type !== 'file' &&
      controlRequest.type !== 'asset' &&
      controlRequest.type !== 'library-file' &&
      openStatus !== 'open'
    ) {
      return;
    }

    handledControlNonce = controlRequest.nonce;

    try {
      if (
        controlRequest.type === 'asset' ||
        controlRequest.type === 'library-file' ||
        controlRequest.type === 'file'
      ) {
        const resolvedSource = await resolveControlOpenSource(controlRequest);
        await openBook(
          resolvedSource.source,
          resolvedSource.sourceLabel,
          resolvedSource.cacheBookKey,
          resolvedSource.restoreFraction,
          resolvedSource.restoreLocation
        );
      } else if (openEngineMode === 'plain-text') {
        if (controlRequest.type === 'prev' && plainTextScroller) {
          plainTextScroller.scrollBy({ top: -plainTextScroller.clientHeight * 0.85, behavior: 'auto' });
          emitPlainTextReaderState();
        } else if (controlRequest.type === 'next' && plainTextScroller) {
          plainTextScroller.scrollBy({ top: plainTextScroller.clientHeight * 0.85, behavior: 'auto' });
          emitPlainTextReaderState();
        } else if (controlRequest.type === 'start' && plainTextScroller) {
          plainTextScroller.scrollTop = 0;
          emitPlainTextReaderState();
        } else if (controlRequest.type === 'fraction') {
          await applyPlainTextFraction(controlRequest.fraction);
          emitPlainTextReaderState();
        } else if (controlRequest.type === 'search') {
          await runSearch(controlRequest.query, controlRequest.config);
        }
      } else if (controlRequest.type === 'prev') {
        await foliateViewElement.prev();
      } else if (controlRequest.type === 'next') {
        await foliateViewElement.next();
      } else if (controlRequest.type === 'start') {
        await foliateViewElement.goToFraction(0);
      } else if (controlRequest.type === 'href') {
        await foliateViewElement.goTo(controlRequest.href);
      } else if (controlRequest.type === 'search') {
        await runSearch(controlRequest.query, controlRequest.config);
      } else if (controlRequest.type === 'clear-search-cache') {
        lastSearchToken += 1;
        searchCache = new Map();
        foliateViewElement.clearSearch();
        if (searchCacheBookKey) {
          await clearReaderSearchCache(searchCacheBookKey);
        }
        emitSearchState({ query: '', status: 'idle', results: [], progress: 0 });
      } else if (controlRequest.type === 'fraction') {
        await foliateViewElement.goToFraction(controlRequest.fraction);
      }
    } catch (error) {
      console.error(`Failed to handle reader control: ${controlRequest.type}`, error);
      openStatus = 'error';
      openFailureSource = controlRequest.type;
      openFailureMessage = normalizeReaderOpenFailureMessage(
        error,
        currentFormatLabel,
        openSourceLabel || controlRequest.type
      );
      emitReaderState({
        title: openSourceLabel || 'Bridge Reader',
        author: 'Open failed',
        chapterLabel: 'Unable to open book',
        locationLabel: 'Open failed'
      });
    }
  };

  $: {
    controlRequest?.nonce;
    foliateViewElement;
    openStatus;
    void applyControlRequest();
  }

  $: {
    viewWidthMode;
    isWindowMode;
    foliateViewElement;
    if (foliateViewElement && openStatus === 'open') {
      configureFoliatePreview();
    }
  }

  const syncNotesToView = async () => {
    if (openEngineMode === 'plain-text') return;
    if (!foliateViewElement || openStatus !== 'open') return;
    const nextValues = new Set(notes.map((note) => `${NOTE_PREFIX}${note.cfi}`));

    for (const value of syncedNoteValues) {
      if (!nextValues.has(value)) {
        await foliateViewElement.addAnnotation({ value }, true);
      }
    }

    for (const note of notes) {
      await foliateViewElement.addAnnotation({
        ...note,
        value: `${NOTE_PREFIX}${note.cfi}`
      });
    }

    syncedNoteValues = nextValues;
  };

  $: {
    notes;
    foliateViewElement;
    openStatus;
    void syncNotesToView();
  }

  onMount(() => {
    let cancelled = false;

    const setupFoliateHost = async () => {
      if (!hostElement || !stageElement) return;

      adapterStatus = 'loading';

      try {
        await ensureFoliateViewDefinition();
        if (cancelled || !hostElement || !stageElement) return;
        searchCache = new Map();

        const existingView = stageElement.querySelector(FOLIATE_VIEW_TAG);
        if (existingView instanceof HTMLElement) {
          foliateViewElement = existingView as FoliateViewElement;
        } else {
          const view = wrapFoliateViewElement(createFoliateViewElement());
          view.className = 'foliate-preview';
          view.addEventListener('load', () => emitReaderState());
          view.addEventListener('relocate', () => emitReaderState());
          view.addEventListener('draw-annotation', (event: Event) => {
            const detail = (event as CustomEvent<{
              draw: (func: typeof Overlayer.highlight, opts?: Record<string, unknown>) => void;
              annotation?: { value?: string };
            }>).detail;
            if (!detail?.annotation?.value?.startsWith(NOTE_PREFIX)) return;
            detail.draw(Overlayer.highlight, { color: 'rgba(190, 150, 78, 0.28)' });
          });
          view.addEventListener('show-annotation', (event: Event) => {
            const detail = (event as CustomEvent<{ value?: string }>).detail;
            if (!detail?.value?.startsWith(NOTE_PREFIX)) return;
            dispatch('notefocus', detail.value.slice(NOTE_PREFIX.length));
          });
          view.addEventListener('load', (event: Event) => {
            const detail = (event as CustomEvent<{ doc: Document; index: number }>).detail;
            if (detail?.doc) bindSelectionTracking(detail.doc, detail.index);
          });
          view.addEventListener('relocate', () => emitSelectionState(null));
          stageElement.append(view);
          foliateViewElement = view;
        }

        stageResizeObserver?.disconnect();
        stageResizeObserver =
          typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => {
                configureFoliatePreview();
              })
            : null;
        if (stageResizeObserver && stageElement) {
          stageResizeObserver.observe(stageElement);
        }
        syncEngineModeVisibility();
        configureFoliatePreview();

        adapterStatus = 'ready';
      } catch (error) {
        console.error('Failed to prepare foliate-view host', error);
        if (!cancelled) adapterStatus = 'error';
      }
    };

    setupFoliateHost();

    return () => {
      cancelled = true;
      stageResizeObserver?.disconnect();
      stageResizeObserver = null;
    };
  });
</script>

<section class:window-mode={isWindowMode} class="viewport-shell" aria-label="reader viewport shell">
  {#if !isWindowMode}
    <header class="viewport-head">
      <div>
        <span class="label">{title}</span>
        <p>{hint}</p>
      </div>
      <div class="head-statuses"></div>
    </header>
  {/if}

  <div class="viewport-frame">
    <div
      class:window-mode={isWindowMode}
      class="engine-host"
      bind:this={hostElement}
      data-role={READER_ENGINE_HOST_ATTR}
      data-engine-status={READER_ENGINE_STATUS_ATTR}
      aria-label="reader engine host placeholder"
    >
      {#if isWindowMode}
        <div class="engine-stage window-stage" bind:this={stageElement}>
          {#if openStatus === 'open' && openEngineMode === 'plain-text'}
            <div
              class="plain-text-surface"
              bind:this={plainTextScroller}
              on:scroll={() => emitPlainTextReaderState()}
              aria-label="plain text reading surface"
            >
              <article class="plain-text-paper">
                <pre>{plainTextContent}</pre>
              </article>
            </div>
          {/if}
          {#if openStatus !== 'open'}
            <div class="stage-overlay" aria-hidden="true">
              <div class="overlay-stack">
                <p class="stage-status" aria-live="polite">
                  {#if openStatus === 'loading'}
                    Opening {openSourceLabel}…
                  {:else if openStatus === 'error'}
                    Failed to open {openFailureSource || 'book'}.
                  {:else}
                    Open a book from the library to start reading.
                  {/if}
                </p>
                {#if openStatus === 'error'}
                  <p class="stage-error" aria-live="polite">
                    {#if openFailureMessage}
                      <span>{openFailureMessage}</span>
                    {/if}
                  </p>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <div class="engine-paper">
          <div class="paper-header">
            <span>{openStatus === 'open' ? openSourceLabel : 'Reading surface'}</span>
            <small>{openStatus === 'open' ? 'book opened' : 'waiting for book'}</small>
          </div>

          <div class="engine-stage" bind:this={stageElement}></div>
          {#if openStatus === 'open' && openEngineMode === 'plain-text'}
            <div
              class="plain-text-surface inline-surface"
              bind:this={plainTextScroller}
              on:scroll={() => emitPlainTextReaderState()}
              aria-label="plain text reading surface"
            >
              <article class="plain-text-paper">
                <pre>{plainTextContent}</pre>
              </article>
            </div>
          {/if}

          {#if openStatus !== 'open'}
            <div class="paper-copy" aria-hidden="true">
              {#if openStatus === 'error'}
                <p>Failed to open {openFailureSource || 'book'}.</p>
                {#if openFailureMessage}
                  <p class="stage-error" aria-live="polite">
                    <span>{openFailureMessage}</span>
                  </p>
                {/if}
              {:else}
                <p>先把阅读舞台压到足够安静，再去叠加目录、注释、TTS 和 bridge 等更复杂的能力。</p>
                <p>从书库中选择一本真实书籍，确认正文区域、翻页和导航已经落在真正的阅读表面里。</p>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  .viewport-shell {
    display: grid;
    gap: 10px;
    min-width: 0;
    width: 100%;
  }

  .viewport-shell.window-mode {
    min-height: 100%;
    gap: 0;
  }

  .viewport-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: start;
  }

  .head-statuses {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .label {
    display: block;
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .viewport-head p {
    margin: 4px 0 0;
    color: var(--text-secondary);
    line-height: 1.55;
    font-size: 13px;
  }

  .viewport-frame {
    display: grid;
    min-height: 0;
    height: 100%;
    width: 100%;
  }

  .engine-host {
    display: grid;
    min-height: 66vh;
    width: 100%;
    padding: clamp(14px, 2.6vw, 24px) clamp(8px, 1.8vw, 14px);
    border: 1px solid rgba(64, 47, 24, 0.05);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 97%, white 3%);
    outline: none;
  }

  .engine-host.window-mode {
    display: grid;
    min-height: 100%;
    height: 100%;
    min-width: 0;
    padding: 0;
    border: 0;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 98%, white 2%);
    overflow: hidden;
  }

  .engine-paper {
    display: grid;
    align-content: start;
    gap: 14px;
    width: min(100%, 790px);
    min-height: 100%;
    margin: 0 auto;
    padding: clamp(14px, 2.2vw, 18px) clamp(14px, 2.6vw, 24px);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0)),
      #f8f3e9;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.44) inset,
      0 16px 28px rgba(36, 25, 12, 0.06);
  }

  .paper-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    color: var(--text-muted);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .engine-stage {
    position: relative;
    min-height: min(66vh, 860px);
    background: rgba(255, 255, 255, 0.28);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.62),
      0 0 0 1px rgba(84, 62, 34, 0.04);
  }

  .viewport-shell.window-mode .engine-stage {
    display: grid;
    width: 100%;
    min-height: 100%;
    height: 100%;
    min-width: 0;
    background: transparent;
    box-shadow: none;
  }

  .plain-text-surface {
    position: absolute;
    inset: 0;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(128, 98, 56, 0.35) transparent;
    padding: 36px 22px 56px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0)),
      #fbf7ef;
  }

  .plain-text-surface.inline-surface {
    position: relative;
    min-height: min(66vh, 860px);
  }

  .plain-text-paper {
    width: min(100%, 840px);
    margin: 0 auto;
    padding: clamp(18px, 2.4vw, 28px);
    background: rgba(255, 255, 255, 0.66);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.72),
      0 0 0 1px rgba(84, 62, 34, 0.05);
  }

  .plain-text-paper pre {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-family: "Iowan Old Style", "Palatino Linotype", "Songti SC", serif;
    font-size: clamp(17px, 1.5vw, 20px);
    line-height: 1.9;
    color: color-mix(in srgb, #2c241c 88%, white 12%);
  }

  .window-stage {
    overflow: hidden;
  }

  .stage-overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
  }

  .overlay-stack {
    display: grid;
    gap: 10px;
    justify-items: center;
    max-width: min(520px, calc(100vw - 64px));
    padding: 0 20px;
  }

  .stage-status,
  .stage-error {
    pointer-events: auto;
  }

  .stage-status {
    margin: 0;
    padding: 10px 14px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 94%, white 6%);
    border: 1px solid rgba(64, 47, 24, 0.07);
    color: var(--text-secondary);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 11px;
    line-height: 1;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .stage-error {
    margin: 0;
    padding: 10px 14px;
    border-radius: 12px;
    background: color-mix(in srgb, #f7eee0 88%, white 12%);
    border: 1px solid rgba(140, 70, 42, 0.12);
    color: color-mix(in srgb, #523721 88%, white 12%);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 12px;
    line-height: 1.5;
    text-align: center;
    box-shadow: 0 10px 20px rgba(41, 28, 14, 0.06);
  }

  .stage-error span {
    display: block;
    margin-top: 4px;
    color: var(--text-secondary);
    text-transform: none;
    letter-spacing: 0;
  }

  :global(foliate-view.foliate-preview) {
    display: block;
    width: 100%;
    height: 100%;
    border: none;
  }

  .engine-stage :global(foliate-view.foliate-preview) {
    display: block;
    width: 100%;
    height: 100%;
    min-height: min(66vh, 860px);
    color: #2b221a;
    background: transparent;
  }

  .engine-stage :global(foliate-view.foliate-preview::part(filter)) {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0)),
      #fbf7ef;
  }

  .engine-stage :global(foliate-view.foliate-preview::part(head)),
  .engine-stage :global(foliate-view.foliate-preview::part(foot)) {
    color: rgba(71, 54, 31, 0.55);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .engine-stage :global(foliate-view.foliate-preview::part(head)) {
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(84, 62, 34, 0.08);
  }

  .engine-stage :global(foliate-view.foliate-preview::part(foot)) {
    padding-top: 6px;
    border-top: 1px solid rgba(84, 62, 34, 0.08);
  }

  .viewport-shell.window-mode .engine-stage :global(foliate-view.foliate-preview) {
    min-height: 100%;
    height: 100%;
    min-width: 0;
  }

  .viewport-shell.window-mode .engine-stage :global(foliate-view.foliate-preview::part(filter)) {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0)),
      #fbf7ef;
  }

  .viewport-shell.window-mode .engine-stage :global(foliate-view.foliate-preview::part(head)) {
    border-bottom: 0;
    padding-bottom: 0;
  }

  .viewport-shell.window-mode .engine-stage :global(foliate-view.foliate-preview::part(foot)) {
    border-top: 0;
    padding-top: 0;
  }

  .paper-copy {
    display: grid;
    gap: 12px;
    font-size: clamp(17px, 1.9vw, 20px);
    line-height: 1.88;
    color: color-mix(in srgb, #2c241c 88%, white 12%);
  }

  .paper-copy p {
    margin: 0;
  }
  @media (max-width: 760px) {
    .viewport-head,
    .paper-header {
      display: grid;
    }

    .engine-host {
      min-height: 58vh;
      padding-inline: 6px;
    }
  }
</style>

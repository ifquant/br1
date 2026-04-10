<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { page } from '$app/stores';
  import { ReaderSidebar, ReaderStage } from '$lib/components';
  import type {
    ReaderControlRequest,
    ReaderNote,
    ReaderSearchConfig,
    ReaderPreviewState,
    ReaderSearchResult,
    ReaderSelectionState,
    ReaderTocItem
  } from '$lib/reader';
  import { startCurrentWindowDrag, updateLibraryReadingState } from '$lib/services';
  import { canPersistReaderNotes, clearReaderSearchCache, loadReaderNotes, saveReaderNotes } from '$lib/services';

  let toc: ReaderTocItem[] = [];
  let activeHref = '';
  let controlRequest: ReaderControlRequest | null = null;
  let controlNonce = 0;
  let lastAutoKey = '';
  let sidebarVisible = true;
  let sidebarPinned = true;
  let sidebarWidth = 224;
  let sidebarTab: 'toc' | 'search' | 'notes' = 'toc';
  let sidebarSearchTerm = '';
  let sidebarSearchStatus: 'idle' | 'searching' | 'done' | 'error' = 'idle';
  let sidebarSearchResults: ReaderSearchResult[] = [];
  let sidebarSearchError = '';
  let sidebarSearchProgress = 0;
  let sidebarSearchHistory: string[] = [];
  let sidebarSearchConfig: ReaderSearchConfig = {
    scope: 'book',
    matchCase: false,
    matchWholeWords: false,
    matchDiacritics: false
  };
  let sidebarSearchCacheKey = '';
  let lastSearchHistoryKey = '';
  let canPersistSearchPrefs = false;
  let currentSearchLocation = '';
  let recentSearchResultCfi = '';
  let activeNoteCfi = '';
  let searchNotice: { kind: 'success' | 'error'; message: string } | null = null;
  let notesSelection: ReaderSelectionState | null = null;
  let notes: ReaderNote[] = [];
  let lastHydratedNotesKey = '';
  let notesLoadToken = 0;
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let searchNoticeTimer: ReturnType<typeof setTimeout> | null = null;

  $: source = $page.url.searchParams.get('source') ?? '';
  $: sourceUrl = $page.url.searchParams.get('url') ?? '';
  $: sourcePath = $page.url.searchParams.get('path') ?? '';
  $: sourceLabel = $page.url.searchParams.get('label') ?? '';
  $: sourceFraction = Number($page.url.searchParams.get('fraction') ?? '');
  $: sourceLocation = $page.url.searchParams.get('location') ?? '';
  $: isWindowMode = $page.url.searchParams.get('mode') === 'window';
  $: autoOpenPicker = source === 'picker';
  $: autoOpenAsset = source === 'asset' && !!sourceUrl;
  $: autoOpenLibraryFile = source === 'library-file' && !!sourcePath;
  $: notesStorageKey = `br1.reader.notes:${sourcePath || sourceUrl || sourceLabel || 'default'}`;

  $: autoOpenKey = autoOpenLibraryFile
    ? `${source}:${sourcePath}:${sourceLabel}:${sourceLocation}:${Number.isFinite(sourceFraction) ? sourceFraction : ''}`
    : autoOpenAsset
      ? `${source}:${sourceUrl}:${sourceLabel}`
      : source;

  $: if (autoOpenAsset && autoOpenKey !== lastAutoKey) {
    controlNonce += 1;
    controlRequest = {
      type: 'asset',
      nonce: controlNonce,
      url: sourceUrl,
      label: sourceLabel || 'imported book'
    };
    lastAutoKey = autoOpenKey;
  }

  $: if (autoOpenLibraryFile && autoOpenKey !== lastAutoKey) {
    controlNonce += 1;
    controlRequest = {
      type: 'library-file',
      nonce: controlNonce,
      path: sourcePath,
      label: sourceLabel || 'imported book',
      restoreFraction: Number.isFinite(sourceFraction) ? sourceFraction : undefined,
      restoreLocation: sourceLocation || undefined
    };
    lastAutoKey = autoOpenKey;
  }

  $: if (!autoOpenAsset && !autoOpenLibraryFile) {
    lastAutoKey = '';
  }

  const issueHrefControl = (href: string) => {
    controlNonce += 1;
    controlRequest = { type: 'href', href, nonce: controlNonce };
  };

  const toggleSidebar = () => {
    sidebarVisible = !sidebarVisible;
  };

  const toggleSidebarPin = () => {
    sidebarPinned = !sidebarPinned;
  };

  const openSidebarTab = (tab: 'toc' | 'search' | 'notes') => {
    sidebarTab = tab;
    sidebarVisible = true;
  };

  const getSearchHistoryKey = () => {
    const bookKey = sourcePath || sourceUrl || sourceLabel || 'default';
    return `br1.reader.search.history:${bookKey}`;
  };

  const loadSearchConfig = () => {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem('br1.reader.search.config');
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ReaderSearchConfig>;
      sidebarSearchConfig = {
        scope: parsed.scope === 'section' ? 'section' : 'book',
        matchCase: !!parsed.matchCase,
        matchWholeWords: !!parsed.matchWholeWords,
        matchDiacritics: !!parsed.matchDiacritics
      };
    } catch (error) {
      console.warn('Failed to restore reader search config', error);
    }
  };

  const loadSearchHistory = () => {
    if (typeof localStorage === 'undefined') return;
    const key = getSearchHistoryKey();
    if (key === lastSearchHistoryKey) return;
    try {
      const raw = localStorage.getItem(key);
      sidebarSearchHistory = raw ? (JSON.parse(raw) as string[]) : [];
      lastSearchHistoryKey = key;
    } catch (error) {
      console.warn('Failed to restore reader search history', error);
      sidebarSearchHistory = [];
      lastSearchHistoryKey = key;
    }
  };

  const issueSearchControl = (query: string) => {
    sidebarSearchTerm = query;
    recentSearchResultCfi = '';
    controlNonce += 1;
    controlRequest = { type: 'search', nonce: controlNonce, query, config: sidebarSearchConfig };
  };

  const issueSearchResultControl = (cfi: string) => {
    recentSearchResultCfi = cfi;
    controlNonce += 1;
    controlRequest = { type: 'href', href: cfi, nonce: controlNonce };
  };

  const showSearchNotice = (kind: 'success' | 'error', message: string) => {
    searchNotice = { kind, message };
    if (searchNoticeTimer) clearTimeout(searchNoticeTimer);
    searchNoticeTimer = setTimeout(() => {
      searchNotice = null;
    }, 2500);
  };

  const persistSidebarPrefs = () => {
    if (!isWindowMode || typeof localStorage === 'undefined') return;
    localStorage.setItem(
      'br1.reader.sidebar',
      JSON.stringify({ pinned: sidebarPinned, width: sidebarWidth })
    );
  };

  const loadNotes = () => {
    const token = ++notesLoadToken;
    const storageKey = notesStorageKey;
    const run = async () => {
      if (storageKey === lastHydratedNotesKey) return;
      try {
        if (canPersistReaderNotes()) {
          const persistedNotes = await loadReaderNotes(storageKey);
          if (persistedNotes.length > 0) {
            notes = persistedNotes;
          } else if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem(storageKey);
            const legacyNotes = raw ? (JSON.parse(raw) as ReaderNote[]) : [];
            notes = legacyNotes;
            if (legacyNotes.length > 0) {
              await saveReaderNotes(storageKey, legacyNotes);
              localStorage.removeItem(storageKey);
            }
          } else {
            notes = [];
          }
        } else if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(storageKey);
          notes = raw ? (JSON.parse(raw) as ReaderNote[]) : [];
        } else {
          notes = [];
        }
      } catch (error) {
        console.warn('Failed to restore reader notes', error);
        notes = [];
      }

      if (token !== notesLoadToken) return;
      lastHydratedNotesKey = storageKey;
    };

    void run();
  };

  const persistNotes = () => {
    lastHydratedNotesKey = notesStorageKey;
    if (canPersistReaderNotes()) {
      void saveReaderNotes(notesStorageKey, notes);
      return;
    }
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(notesStorageKey, JSON.stringify(notes));
  };

  const addNoteFromSelection = () => {
    if (!notesSelection) return;
    const draft = window.prompt('为当前选中的文本添加笔记：', '') ?? '';
    const selectedText = notesSelection.text.trim();
    if (!selectedText) return;

    const note: ReaderNote = {
      id: `${notesSelection.cfi}:${Date.now()}`,
      cfi: notesSelection.cfi,
      text: selectedText,
      note: draft.trim(),
      chapterLabel: notesSelection.chapterLabel,
      chapterHref: notesSelection.chapterHref,
      createdAt: Date.now()
    };

    notes = [note, ...notes.filter((item) => item.cfi !== note.cfi)];
    persistNotes();
    sidebarTab = 'notes';
    sidebarVisible = true;
  };

  const openNote = (cfi: string) => {
    activeNoteCfi = cfi;
    sidebarTab = 'notes';
    sidebarVisible = true;
    recentSearchResultCfi = '';
    issueHrefControl(cfi);
  };

  const editNote = (id: string) => {
    const target = notes.find((item) => item.id === id);
    if (!target) return;
    const nextValue = window.prompt('编辑这条笔记：', target.note) ?? target.note;
    notes = notes.map((item) =>
      item.id === id
        ? {
            ...item,
            note: nextValue.trim()
          }
        : item
    );
    persistNotes();
  };

  const deleteNote = (id: string) => {
    const target = notes.find((item) => item.id === id);
    if (!target) return;
    if (!window.confirm('删除这条笔记？')) return;
    notes = notes.filter((item) => item.id !== id);
    persistNotes();
  };

  const handleSidebarResizeStart = (event: MouseEvent) => {
    if (!isWindowMode || !sidebarPinned) return;
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = sidebarWidth;

    const handleMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      sidebarWidth = Math.max(208, Math.min(380, startWidth + delta));
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      persistSidebarPrefs();
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  onMount(() => {
    if (typeof localStorage === 'undefined') return;
    loadSearchConfig();
    loadSearchHistory();
    canPersistSearchPrefs = true;
    try {
      const raw = localStorage.getItem('br1.reader.sidebar');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { pinned?: boolean; width?: number };
      if (typeof parsed.pinned === 'boolean') sidebarPinned = parsed.pinned;
      if (typeof parsed.width === 'number') {
        sidebarWidth = Math.max(208, Math.min(380, parsed.width));
      }
    } catch (error) {
      console.warn('Failed to restore reader sidebar prefs', error);
    }
    loadNotes();
  });

  $: if (isWindowMode) {
    persistSidebarPrefs();
  }

  $: if (canPersistSearchPrefs && typeof localStorage !== 'undefined') {
    localStorage.setItem('br1.reader.search.config', JSON.stringify(sidebarSearchConfig));
  }

  $: if (canPersistSearchPrefs && typeof localStorage !== 'undefined') {
    localStorage.setItem(getSearchHistoryKey(), JSON.stringify(sidebarSearchHistory.slice(0, 10)));
  }

  $: loadSearchHistory();
  $: loadNotes();

  const queueLibraryReadingStatePersist = (preview: ReaderPreviewState) => {
    if (!autoOpenLibraryFile || !sourcePath) return;

    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      void updateLibraryReadingState({
        filePath: sourcePath,
        title: preview.title,
        author: preview.author,
        chapterLabel: preview.chapterLabel,
        progressLabel: preview.progressLabel,
        progressFraction: preview.progressFraction,
        progressLocation: preview.progressLocation
      });
    }, 500);
  };

  onDestroy(() => {
    if (persistTimer) clearTimeout(persistTimer);
    if (searchNoticeTimer) clearTimeout(searchNoticeTimer);
  });
</script>

<section class:window-mode={isWindowMode} class="reader-shell">
  {#if isWindowMode}
    <header
      class="window-chrome"
      role="banner"
      data-tauri-drag-region
      aria-label="reader window chrome"
    >
      <div
        role="presentation"
        class="window-drag-strip"
        data-tauri-drag-region
        on:mousedown={startCurrentWindowDrag}
      ></div>
      <div class="traffic-light-gutter" aria-hidden="true"></div>
    </header>
  {/if}

  <div
    class:window-mode={isWindowMode}
    class:sidebar-hidden={isWindowMode && !sidebarVisible}
    class:sidebar-overlay={isWindowMode && sidebarVisible && !sidebarPinned}
    class="workspace"
    style={isWindowMode && sidebarVisible && sidebarPinned ? `--reader-sidebar-width:${sidebarWidth}px;` : undefined}
  >
    {#if !isWindowMode || sidebarVisible}
      <ReaderSidebar
        {toc}
        {activeHref}
        {isWindowMode}
        isPinned={sidebarPinned}
        activeTab={sidebarTab}
        searchTerm={sidebarSearchTerm}
        searchStatus={sidebarSearchStatus}
        searchResults={sidebarSearchResults}
        searchError={sidebarSearchError}
        searchProgress={sidebarSearchProgress}
        searchHistory={sidebarSearchHistory}
        searchConfig={sidebarSearchConfig}
        searchCacheKey={sidebarSearchCacheKey}
        searchNotice={searchNotice}
        activeSearchResultCfi={currentSearchLocation}
        recentSearchResultCfi={recentSearchResultCfi}
        {activeNoteCfi}
        {notesSelection}
        {notes}
        onNavigate={issueHrefControl}
        onClose={isWindowMode ? toggleSidebar : null}
        onToggleSidebar={toggleSidebar}
        onTogglePin={isWindowMode ? toggleSidebarPin : null}
        onTabChange={openSidebarTab}
        onAddNote={addNoteFromSelection}
        onOpenNote={openNote}
        onEditNote={editNote}
        onDeleteNote={deleteNote}
        onSearch={issueSearchControl}
        onSearchResult={issueSearchResultControl}
        onSearchConfigChange={(config) => {
          sidebarSearchConfig = config;
          if (sidebarSearchTerm.trim()) issueSearchControl(sidebarSearchTerm);
        }}
        onSearchHistory={(query) => issueSearchControl(query)}
        onClearSearchHistory={() => {
          sidebarSearchHistory = [];
        }}
        onClearSearchCache={async () => {
          if (!sidebarSearchCacheKey) return;
          controlNonce += 1;
          controlRequest = { type: 'clear-search-cache', nonce: controlNonce };
          showSearchNotice('success', '已清空当前书的搜索缓存。');
        }}
      />
    {/if}
    {#if isWindowMode && sidebarVisible && sidebarPinned}
      <button
        type="button"
        class="sidebar-resize-handle"
        aria-label="Resize sidebar"
        on:mousedown={handleSidebarResizeStart}
      ></button>
    {/if}
    <ReaderStage
      {controlRequest}
      {autoOpenPicker}
      {isWindowMode}
      {sidebarVisible}
      {notes}
      activeSidebarTab={sidebarTab}
      on:togglesidebar={toggleSidebar}
      on:switchsidebartab={({ detail }: CustomEvent<'toc' | 'search' | 'notes'>) => {
        openSidebarTab(detail);
      }}
      on:controlrequest={({ detail }: CustomEvent<ReaderControlRequest>) => {
        controlRequest = detail;
      }}
      on:readerstate={({ detail }: CustomEvent<ReaderPreviewState>) => {
        activeHref = detail.chapterHref;
        currentSearchLocation = detail.progressLocation;
        queueLibraryReadingStatePersist(detail);
      }}
      on:notefocus={({ detail }: CustomEvent<string>) => {
        activeNoteCfi = detail;
        sidebarTab = 'notes';
        sidebarVisible = true;
      }}
      on:selectionchange={({ detail }: CustomEvent<ReaderSelectionState | null>) => {
        notesSelection = detail;
      }}
      on:searchchange={({ detail }) => {
        sidebarSearchTerm = detail.query;
        sidebarSearchStatus = detail.status;
        sidebarSearchResults = detail.results;
        sidebarSearchProgress = detail.progress ?? 0;
        sidebarSearchError = detail.error ?? '';
        if (detail.status === 'error') {
          showSearchNotice('error', detail.error ?? '正文搜索失败。');
        }
        if (detail.status === 'done' && detail.query.trim() && detail.results.length > 0) {
          sidebarSearchHistory = [
            detail.query,
            ...sidebarSearchHistory.filter((item) => item !== detail.query)
          ].slice(0, 10);
        }
        if (detail.status === 'idle') {
          recentSearchResultCfi = '';
        }
      }}
      on:searchcachekeychange={({ detail }) => {
        sidebarSearchCacheKey = detail;
      }}
      on:tocchange={({ detail }: CustomEvent<ReaderTocItem[]>) => {
        toc = detail;
      }}
    />

    {#if !isWindowMode}
      <aside class="bridge-placeholder" aria-label="bridge panel placeholder">
        <header class="bridge-head">
          <span class="label">Bridge</span>
          <button type="button" aria-label="bridge options">⋯</button>
        </header>

        <div class="bridge-card">
          <strong>解释这段</strong>
          <p>这里保留 `br1` 的桥梁层挂载位。先把它作为右侧 contextual surface 摆正，不提前接 AI 行为。</p>
        </div>

        <div class="bridge-card secondary">
          <strong>为什么重要</strong>
          <p>后续 bridge 可以从当前位置、章节关系和高亮沉淀里给出解释，而不是挤进正文主舞台。</p>
        </div>
      </aside>
    {/if}
  </div>
</section>

<style>
  .reader-shell {
    min-height: 100%;
    padding: 0;
    width: 100%;
  }

  .reader-shell.window-mode {
    min-height: 100vh;
    padding-top: 0;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-page) 95%, white 5%);
  }

  .window-chrome {
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr);
    align-items: start;
    position: relative;
    min-height: 26px;
    padding: 8px 18px 0;
    background: transparent;
    user-select: none;
    pointer-events: none;
  }

  .window-drag-strip {
    position: absolute;
    inset: 0;
  }

  .traffic-light-gutter {
    position: relative;
    z-index: 1;
    min-height: 20px;
  }

  .workspace {
    display: grid;
    grid-template-columns: 248px minmax(0, 1fr) 276px;
    gap: 14px;
    min-height: calc(100vh - 32px);
    width: 100%;
  }

  .workspace.window-mode {
    position: relative;
    gap: 0;
    min-height: calc(100vh - 26px);
    grid-template-columns: minmax(208px, var(--reader-sidebar-width, 224px)) minmax(0, 1fr);
  }

  .workspace.window-mode.sidebar-hidden {
    grid-template-columns: minmax(0, 1fr);
  }

  .workspace.window-mode.sidebar-overlay {
    grid-template-columns: minmax(0, 1fr);
  }

  .sidebar-resize-handle {
    width: 4px;
    cursor: col-resize;
    position: absolute;
    left: calc(var(--reader-sidebar-width, 224px) - 2px);
    top: 0;
    bottom: 0;
    z-index: 21;
    border: 0;
    padding: 0;
    background: transparent;
  }

  .sidebar-resize-handle::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 1px;
    width: 1px;
    background: rgba(64, 47, 24, 0.08);
  }

  .bridge-placeholder {
    display: grid;
    align-content: start;
    gap: 10px;
    padding: 12px;
    border: 1px solid rgba(64, 47, 24, 0.1);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 92%, white 8%);
  }

  .label {
    color: var(--text-muted);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .bridge-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
    padding: 2px 2px 8px;
  }

  .bridge-head button {
    width: 26px;
    height: 26px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    font: inherit;
  }

  .bridge-card {
    display: grid;
    gap: 6px;
    padding: 14px 14px 12px;
    border: 1px solid rgba(64, 47, 24, 0.08);
    background: color-mix(in srgb, var(--surface-reader) 76%, white 24%);
  }

  .bridge-card.secondary {
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
  }

  .bridge-card strong {
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 13px;
    line-height: 1.3;
  }

  .bridge-card p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.65;
    font-size: 13px;
  }

  @media (max-width: 1120px) {
    .workspace {
      grid-template-columns: 236px minmax(0, 1fr);
    }

    .workspace.window-mode {
      grid-template-columns: 208px minmax(0, 1fr);
    }

    .bridge-placeholder {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 960px) {
    .workspace {
      grid-template-columns: 1fr;
    }

    .window-chrome {
      grid-template-columns: 56px minmax(0, 1fr);
      padding-inline: 10px;
    }
  }
</style>

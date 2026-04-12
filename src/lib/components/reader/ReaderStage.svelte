<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import type {
    ReaderControlRequest,
    ReaderNote,
    ReaderPreviewState,
    ReaderViewWidthMode,
    SidebarTab,
    ReaderSearchState,
    ReaderSelectionState,
    ReaderTocItem
  } from '$lib/reader';
  import ReaderFooterBar from './ReaderFooterBar.svelte';
  import ReaderHeaderBar from './ReaderHeaderBar.svelte';
  import ReaderViewport from './ReaderViewport.svelte';
  const dispatch = createEventDispatcher<{
    controlrequest: ReaderControlRequest;
    gotolibrary: void;
    notefocus: string;
    selectionchange: ReaderSelectionState | null;
    readerstate: ReaderPreviewState;
    searchchange: ReaderSearchState;
    searchcachekeychange: string;
    tocchange: ReaderTocItem[];
    togglebookmark: void;
    togglesidebar: void;
    togglepin: void;
    switchsidebartab: SidebarTab;
  }>();

  export let controlRequest: ReaderControlRequest | null = null;
  export let autoOpenPicker = false;
  export let isWindowMode = false;
  export let sidebarVisible = true;
  export let activeSidebarTab: SidebarTab = 'toc';
  export let isCurrentLocationBookmarked = false;
  export let notes: ReaderNote[] = [];

  let readerPreview: ReaderPreviewState = {
    title: 'Bridge Reader',
    author: 'Open a book to start reading',
    chapterLabel: 'Waiting for book',
    chapterHref: '',
    progressLabel: '0%',
    locationLabel: 'Not opened',
    formatLabel: 'BOOK',
    layoutLabel: 'WAITING',
    progressFraction: 0,
    progressLocation: ''
  };
  let importInput: HTMLInputElement | null = null;
  let hasAttemptedAutoPicker = false;
  let chromeVisible = true;
  let chromeTimer: ReturnType<typeof setTimeout> | null = null;
  let viewWidthMode: ReaderViewWidthMode = 'standard';

  const readerViewWidthStorageKey = 'br1.reader.view.width';

  const triggerImportPicker = async () => {
    if (!importInput) return;
    await tick();
    if (typeof importInput.showPicker === 'function') {
      try {
        await importInput.showPicker();
        return;
      } catch (error) {
        console.warn('showPicker() failed, falling back to click()', error);
      }
    }
    importInput.click();
  };

  $: if (autoOpenPicker && !hasAttemptedAutoPicker) {
    hasAttemptedAutoPicker = true;
    void triggerImportPicker();
  }

  $: if (!autoOpenPicker) {
    hasAttemptedAutoPicker = false;
  }

  let controlNonce = 0;

  const issueFileControl = (file: File) => {
    controlNonce += 1;
    dispatch('controlrequest', {
      type: 'file',
      nonce: controlNonce,
      file
    });
  };

  const handleImportChange = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const [file] = input.files ?? [];
    if (!file) return;
    issueFileControl(file);
    input.value = '';
  };

  const toggleSidebar = () => {
    dispatch('togglesidebar');
  };

  const goToLibrary = () => {
    dispatch('gotolibrary');
  };

  const toggleBookmark = () => {
    dispatch('togglebookmark');
  };

  const togglePinned = () => {
    dispatch('togglepin');
  };

  const openSidebarTab = (tab: SidebarTab) => {
    dispatch('switchsidebartab', tab);
  };

  const setViewWidthMode = (mode: ReaderViewWidthMode) => {
    viewWidthMode = mode;
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(readerViewWidthStorageKey, mode);
  };

  const clearChromeTimer = () => {
    if (chromeTimer) clearTimeout(chromeTimer);
    chromeTimer = null;
  };

  const scheduleChromeHide = () => {
    if (!isWindowMode || sidebarVisible) return;
    clearChromeTimer();
    chromeTimer = setTimeout(() => {
      chromeVisible = false;
    }, 1200);
  };

  const showChrome = () => {
    chromeVisible = true;
    scheduleChromeHide();
  };

  const handleStagePointerMove = (event: MouseEvent) => {
    if (!isWindowMode) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const nearTop = offsetY <= 88;
    const nearBottom = rect.bottom - event.clientY <= 72;
    if (nearTop || nearBottom) {
      showChrome();
    }
  };

  const handleStageLeave = () => {
    scheduleChromeHide();
  };

  $: if (!isWindowMode) {
    chromeVisible = true;
    clearChromeTimer();
  }

  $: if (isWindowMode && sidebarVisible) {
    chromeVisible = true;
    clearChromeTimer();
  }

  $: if (typeof localStorage !== 'undefined' && viewWidthMode === 'standard') {
    const persistedMode = localStorage.getItem(readerViewWidthStorageKey);
    if (persistedMode === 'focus' || persistedMode === 'wide') {
      viewWidthMode = persistedMode;
    }
  }
</script>

<section
  class:window-mode={isWindowMode}
  class="reader-stage"
  role="main"
  aria-label="reader stage"
  on:mousemove={handleStagePointerMove}
  on:mouseleave={handleStageLeave}
  on:focusin={showChrome}
>
  <input
    bind:this={importInput}
    class="import-input"
    type="file"
    accept=".epub,.pdf,.mobi,.azw3,.fb2"
    on:change={handleImportChange}
  />

  <ReaderHeaderBar
    preview={readerPreview}
    {isWindowMode}
    {sidebarVisible}
    isVisible={chromeVisible}
    {activeSidebarTab}
    {isCurrentLocationBookmarked}
    {viewWidthMode}
    onGoToLibrary={goToLibrary}
    onToggleBookmark={toggleBookmark}
    onOpenPicker={triggerImportPicker}
    onToggleSidebar={toggleSidebar}
    onTogglePin={isWindowMode ? togglePinned : null}
    onOpenSidebarTab={openSidebarTab}
    onSetViewWidthMode={setViewWidthMode}
  />

  <article
    class:window-mode={isWindowMode}
    class:focus-width={viewWidthMode === 'focus'}
    class:wide-width={viewWidthMode === 'wide'}
    class="canvas"
  >
    <ReaderViewport
      title="Reading Surface"
      {controlRequest}
      hint="正文优先，控制层尽量退到边缘。"
      {isWindowMode}
      {notes}
      on:readerstate={({ detail }) => {
        readerPreview = detail;
        dispatch('readerstate', detail);
      }}
      on:notefocus={({ detail }) => {
        dispatch('notefocus', detail);
      }}
      on:selectionchange={({ detail }) => {
        dispatch('selectionchange', detail);
      }}
      on:tocchange={({ detail }) => {
        dispatch('tocchange', detail);
      }}
      on:searchchange={({ detail }) => {
        dispatch('searchchange', detail);
      }}
      on:searchcachekeychange={({ detail }) => {
        dispatch('searchcachekeychange', detail);
      }}
    />
  </article>

  <ReaderFooterBar
    preview={readerPreview}
    {isWindowMode}
    isVisible={chromeVisible}
    on:controlrequest={({ detail }: CustomEvent<ReaderControlRequest>) => {
      dispatch('controlrequest', detail);
    }}
  />
</section>

<style>
  .reader-stage {
    display: grid;
    gap: 12px;
    min-width: 0;
    width: 100%;
  }

  .reader-stage.window-mode {
    position: relative;
    gap: 0;
    min-height: calc(100vh - 26px);
    height: calc(100vh - 26px);
    overflow: hidden;
  }

  .import-input {
    display: none;
  }

  .canvas {
    display: grid;
    min-height: 0;
    width: 100%;
    padding: 8px 14px 0;
    border: 1px solid var(--border-light);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 94%, white 6%);
  }

  .canvas.window-mode {
    display: grid;
    min-height: calc(100vh - 26px);
    height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    width: min(100%, 1080px);
    margin-inline: auto;
  }

  .canvas.window-mode.focus-width {
    width: min(100%, 920px);
  }

  .canvas.window-mode.wide-width {
    width: min(100%, 1320px);
  }
</style>

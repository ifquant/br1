<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import type {
    ReaderAtmosphereMode,
    ReaderChromeMode,
    ReaderControlRequest,
    ReaderNote,
    ReaderPreviewState,
    ReaderViewWidthMode,
    SidebarTab,
    ReaderSearchState,
    ReaderSelectionState,
    ReaderTocItem
  } from '$lib/reader';
  import { READER_FILE_INPUT_ACCEPT } from '$lib/reader';
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
  let atmosphereMode: ReaderAtmosphereMode = 'paper';
  let chromeMode: ReaderChromeMode = 'auto';
  let viewWidthMode: ReaderViewWidthMode = 'standard';

  const readerAtmosphereModeStorageKey = 'br1.reader.view.atmosphere';
  const readerChromeModeStorageKey = 'br1.reader.chrome.mode';
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

  const setAtmosphereMode = (mode: ReaderAtmosphereMode) => {
    atmosphereMode = mode;
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(readerAtmosphereModeStorageKey, mode);
  };

  const setChromeMode = (mode: ReaderChromeMode) => {
    chromeMode = mode;
    chromeVisible = true;
    clearChromeTimer();
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(readerChromeModeStorageKey, mode);
    if (mode === 'auto') {
      scheduleChromeHide();
    }
  };

  const clearChromeTimer = () => {
    if (chromeTimer) clearTimeout(chromeTimer);
    chromeTimer = null;
  };

  const scheduleChromeHide = () => {
    if (!isWindowMode || sidebarVisible || chromeMode === 'always') return;
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

  $: if (isWindowMode && (sidebarVisible || chromeMode === 'always')) {
    chromeVisible = true;
    clearChromeTimer();
  }

  $: if (typeof localStorage !== 'undefined' && chromeMode === 'auto') {
    const persistedChromeMode = localStorage.getItem(readerChromeModeStorageKey);
    if (persistedChromeMode === 'always') {
      chromeMode = persistedChromeMode;
    }
  }

  $: if (typeof localStorage !== 'undefined' && atmosphereMode === 'paper') {
    const persistedAtmosphereMode = localStorage.getItem(readerAtmosphereModeStorageKey);
    if (persistedAtmosphereMode === 'warm' || persistedAtmosphereMode === 'soft') {
      atmosphereMode = persistedAtmosphereMode;
    }
  }

  $: if (typeof localStorage !== 'undefined' && viewWidthMode === 'standard') {
    const persistedMode = localStorage.getItem(readerViewWidthStorageKey);
    if (persistedMode === 'focus' || persistedMode === 'wide') {
      viewWidthMode = persistedMode;
    }
  }
</script>

<section
  class:paper-atmosphere={atmosphereMode === 'paper'}
  class:warm-atmosphere={atmosphereMode === 'warm'}
  class:soft-atmosphere={atmosphereMode === 'soft'}
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
    accept={READER_FILE_INPUT_ACCEPT}
    on:change={handleImportChange}
  />

  <ReaderHeaderBar
    preview={readerPreview}
    {isWindowMode}
    {sidebarVisible}
    isVisible={chromeVisible}
    {activeSidebarTab}
    {isCurrentLocationBookmarked}
    {atmosphereMode}
    {chromeMode}
    {viewWidthMode}
    onGoToLibrary={goToLibrary}
    onToggleBookmark={toggleBookmark}
    onOpenPicker={triggerImportPicker}
    onToggleSidebar={toggleSidebar}
    onTogglePin={isWindowMode ? togglePinned : null}
    onOpenSidebarTab={openSidebarTab}
    onSetAtmosphereMode={setAtmosphereMode}
    onSetChromeMode={setChromeMode}
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
      {viewWidthMode}
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
    {viewWidthMode}
    on:controlrequest={({ detail }: CustomEvent<ReaderControlRequest>) => {
      dispatch('controlrequest', detail);
    }}
  />
</section>

<style>
  .reader-stage {
    --reader-stage-fill:
      linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 94%, white 6%);
    display: grid;
    gap: 12px;
    min-width: 0;
    width: 100%;
  }

  .reader-stage.paper-atmosphere {
    --reader-stage-fill:
      linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 94%, white 6%);
  }

  .reader-stage.warm-atmosphere {
    --reader-stage-fill:
      linear-gradient(180deg, rgba(255, 248, 238, 0.18), rgba(255, 244, 229, 0)),
      color-mix(in srgb, #f4ead6 78%, white 22%);
  }

  .reader-stage.soft-atmosphere {
    --reader-stage-fill:
      linear-gradient(180deg, rgba(246, 247, 244, 0.22), rgba(236, 241, 236, 0)),
      color-mix(in srgb, #e5ece4 68%, white 32%);
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
    background: var(--reader-stage-fill);
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

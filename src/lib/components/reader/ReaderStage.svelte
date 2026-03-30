<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import type {
    ReaderControlRequest,
    ReaderNote,
    ReaderPreviewState,
    ReaderSearchState,
    ReaderSelectionState,
    ReaderTocItem
  } from '$lib/reader';
  import ReaderFooterBar from './ReaderFooterBar.svelte';
  import ReaderHeaderBar from './ReaderHeaderBar.svelte';
  import ReaderViewport from './ReaderViewport.svelte';
  const dispatch = createEventDispatcher<{
    controlrequest: ReaderControlRequest;
    notefocus: string;
    selectionchange: ReaderSelectionState | null;
    readerstate: ReaderPreviewState;
    searchchange: ReaderSearchState;
    searchcachekeychange: string;
    tocchange: ReaderTocItem[];
    togglesidebar: void;
    switchsidebartab: 'toc' | 'search' | 'notes';
  }>();

  export let controlRequest: ReaderControlRequest | null = null;
  export let autoOpenPicker = false;
  export let isWindowMode = false;
  export let sidebarVisible = true;
  export let activeSidebarTab: 'toc' | 'search' | 'notes' = 'toc';
  export let notes: ReaderNote[] = [];

  let readerPreview: ReaderPreviewState = {
    title: '政治秩序与政治衰败',
    author: 'Francis Fukuyama',
    chapterLabel: 'Waiting for sample',
    chapterHref: '',
    progressLabel: '0%',
    locationLabel: 'Not opened',
    progressFraction: 0,
    progressLocation: ''
  };
  let importInput: HTMLInputElement | null = null;
  let hasAttemptedAutoPicker = false;
  let chromeVisible = true;
  let chromeTimer: ReturnType<typeof setTimeout> | null = null;

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

  const openSidebarTab = (tab: 'toc' | 'search' | 'notes') => {
    dispatch('switchsidebartab', tab);
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
    onOpenPicker={triggerImportPicker}
    onToggleSidebar={toggleSidebar}
    onOpenSidebarTab={openSidebarTab}
  />

  <article class:window-mode={isWindowMode} class="canvas">
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
    border: 1px solid rgba(64, 47, 24, 0.08);
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
  }
</style>

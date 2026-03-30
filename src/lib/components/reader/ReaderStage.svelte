<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import type { ReaderControlRequest, ReaderPreviewState, ReaderTocItem } from '$lib/reader';
  import ReaderFooterBar from './ReaderFooterBar.svelte';
  import ReaderHeaderBar from './ReaderHeaderBar.svelte';
  import ReaderViewport from './ReaderViewport.svelte';
  const dispatch = createEventDispatcher<{
    controlrequest: ReaderControlRequest;
    readerstate: ReaderPreviewState;
    tocchange: ReaderTocItem[];
    togglesidebar: void;
  }>();

  export let controlRequest: ReaderControlRequest | null = null;
  export let autoOpenPicker = false;
  export let isWindowMode = false;
  export let sidebarVisible = true;

  let readerPreview: ReaderPreviewState = {
    title: '政治秩序与政治衰败',
    author: 'Francis Fukuyama',
    chapterLabel: 'Waiting for sample',
    chapterHref: '',
    progressLabel: '0%',
    locationLabel: 'Not opened',
    progressFraction: 0
  };
  let importInput: HTMLInputElement | null = null;
  let hasAttemptedAutoPicker = false;

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
</script>

<section class:window-mode={isWindowMode} class="reader-stage" role="main" aria-label="reader stage">
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
    onOpenPicker={triggerImportPicker}
    onToggleSidebar={toggleSidebar}
  />

  <article class:window-mode={isWindowMode} class="canvas">
    <ReaderViewport
      title="Reading Surface"
      {controlRequest}
      hint="正文优先，控制层尽量退到边缘。"
      {isWindowMode}
      on:readerstate={({ detail }) => {
        readerPreview = detail;
        dispatch('readerstate', detail);
      }}
      on:tocchange={({ detail }) => {
        dispatch('tocchange', detail);
      }}
    />
  </article>

  <ReaderFooterBar
    preview={readerPreview}
    {isWindowMode}
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
    min-height: calc(100vh - 26px);
    padding: 0;
    border: 0;
    background: transparent;
  }
</style>

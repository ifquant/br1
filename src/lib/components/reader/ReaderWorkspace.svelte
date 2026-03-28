<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import { createReaderMountBoundary } from '$lib/reader';
  import type { ReaderControlRequest, ReaderPreviewState, ReaderTocItem } from '$lib/reader';
  import ReaderViewport from './ReaderViewport.svelte';

  const mountBoundary = createReaderMountBoundary('idle');
  const dispatch = createEventDispatcher<{
    controlrequest: ReaderControlRequest;
    readerstate: ReaderPreviewState;
    tocchange: ReaderTocItem[];
  }>();

  export let controlRequest: ReaderControlRequest | null = null;
  export let autoOpenSample = false;
  export let autoOpenPicker = false;
  export let isWindowMode = false;
  let readerPreview: ReaderPreviewState = {
    title: '政治秩序与政治衰败',
    author: 'Francis Fukuyama',
    chapterLabel: 'Waiting for sample',
    chapterHref: '',
    progressLabel: '0%',
    locationLabel: 'Not opened',
    progressFraction: 0
  };
  let controlNonce = 0;
  let sliderValue = 0;
  let importInput: HTMLInputElement | null = null;
  let viewportControlRequest: ReaderControlRequest | null = null;
  let hasAttemptedAutoPicker = false;

  $: viewportControlRequest =
    autoOpenSample && !controlRequest ? { type: 'sample', nonce: -1 } : controlRequest;

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

  const issueControl = (type: 'prev' | 'next' | 'start') => {
    controlNonce += 1;
    dispatch('controlrequest', { type, nonce: controlNonce });
  };

  const issueFractionControl = (fraction: number) => {
    controlNonce += 1;
    dispatch('controlrequest', {
      type: 'fraction',
      nonce: controlNonce,
      fraction
    });
  };

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
</script>

<section class:window-mode={isWindowMode} class="reader-workspace">
  <header class:window-mode={isWindowMode} class="reader-head">
    <div class:window-mode={isWindowMode} class="head-meta" data-tauri-drag-region={isWindowMode ? true : undefined}>
      <div class="title-row">
        <strong>{readerPreview.title}</strong>
        <div class="subtitle-row">
          <small>{readerPreview.author}</small>
          <span>{readerPreview.chapterLabel}</span>
        </div>
      </div>
    </div>

    <div class="controls" aria-label="reader controls preview">
      <input
        bind:this={importInput}
        class="import-input"
        type="file"
        accept=".epub,.pdf,.mobi,.azw3,.fb2"
        on:change={handleImportChange}
      />
      <button type="button" aria-label="Open book" title="Open book" on:click={triggerImportPicker}>⌂</button>
      <button type="button" aria-label="Typography" title="Typography">Aa</button>
      <button type="button" aria-label="Text to speech" title="Text to speech">🔊</button>
      <button type="button" aria-label="More actions" title="More actions">⋯</button>
    </div>
  </header>

  <article class:window-mode={isWindowMode} class="canvas">
    <ReaderViewport
      title="Reader Engine Boundary"
      controlRequest={viewportControlRequest}
      hint="中央主舞台先对齐 Readest 的阅读画布比例和安静度；下一步再把真正的阅读引擎挂进来。"
      on:readerstate={({ detail }) => {
        readerPreview = detail;
        sliderValue = Math.round(detail.progressFraction * 100);
        dispatch('readerstate', detail);
      }}
      on:tocchange={({ detail }) => {
        dispatch('tocchange', detail);
      }}
    />
  </article>

  <footer class:window-mode={isWindowMode} class="footer-bar" aria-label="reader footer controls preview">
    <div class="footer-controls">
      <button type="button" aria-label="Previous page" title="Previous page" on:click={() => issueControl('prev')}>‹</button>
      <button type="button" aria-label="Go to start" title="Go to start" on:click={() => issueControl('start')}>·</button>
      <button type="button" aria-label="Next page" title="Next page" on:click={() => issueControl('next')}>›</button>
    </div>
    <label class="progress-strip" aria-label="reader progress preview">
      <input
        type="range"
        min="0"
        max="100"
        value={sliderValue}
        on:input={(event) => {
          sliderValue = Number((event.currentTarget as HTMLInputElement).value);
        }}
        on:change={() => issueFractionControl(sliderValue / 100)}
      />
      <span>{readerPreview.progressLabel}</span>
    </label>
    <div class="footer-meta">
      <span>{readerPreview.locationLabel}</span>
      <span>EPUB</span>
      <span>Serif</span>
    </div>
  </footer>
</section>

<style>
  .reader-workspace {
    display: grid;
    gap: 12px;
    min-width: 0;
  }

  .reader-workspace.window-mode {
    gap: 0;
  }

  .reader-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    padding: 0;
  }

  .reader-head.window-mode {
    min-height: 52px;
    padding: 0 22px 8px 18px;
    border-bottom: 1px solid rgba(64, 47, 24, 0.06);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-page) 97%, white 3%);
  }

  .head-meta {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .head-meta.window-mode {
    align-content: center;
    min-height: 100%;
    padding-left: 2px;
    cursor: grab;
  }

  .title-row {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .title-row strong,
  .title-row small,
  .subtitle-row span {
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title-row strong {
    font-size: 14px;
    line-height: 1.3;
  }

  .title-row small {
    color: var(--text-muted);
    font-size: 12px;
  }

  .subtitle-row {
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 0;
    color: var(--text-muted);
  }

  .subtitle-row span {
    min-width: 0;
    font-size: 12px;
    color: color-mix(in srgb, var(--text-secondary) 90%, white 10%);
  }

  .subtitle-row span::before {
    content: "•";
    margin-right: 8px;
    color: color-mix(in srgb, var(--text-muted) 70%, white 30%);
  }

  .controls {
    display: flex;
    gap: 4px;
    flex-wrap: nowrap;
    -webkit-app-region: no-drag;
  }

  .controls button {
    min-width: 30px;
    height: 30px;
    padding: 0 7px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 13px;
    line-height: 1;
  }

  .controls button:hover {
    background: color-mix(in srgb, var(--surface-panel) 86%, white 14%);
    color: var(--text-primary);
  }

  .import-input {
    display: none;
  }

  .canvas {
    display: grid;
    min-height: 0;
    padding: 8px 14px 0;
    border: 1px solid rgba(64, 47, 24, 0.08);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 94%, white 6%);
  }

  .canvas.window-mode {
    padding: 14px 18px 0;
    border: 0;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 96%, white 4%);
  }

  .footer-bar {
    display: flex;
    justify-content: space-between;
    gap: 10px 14px;
    flex-wrap: wrap;
    padding: 8px 12px 10px;
    border-top: 1px solid rgba(64, 47, 24, 0.08);
    background: color-mix(in srgb, var(--surface-panel) 96%, white 4%);
    color: var(--text-secondary);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 10px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .footer-bar.window-mode {
    padding: 6px 18px 10px;
    border-top-color: rgba(64, 47, 24, 0.06);
    background: color-mix(in srgb, var(--surface-page) 97%, white 3%);
  }

  .footer-controls {
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }

  .footer-controls button {
    width: 26px;
    height: 26px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    line-height: 1;
  }

  .footer-controls button:hover {
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    color: var(--text-primary);
  }

  .progress-strip {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    min-width: min(280px, 100%);
  }

  .progress-strip input {
    flex: 1;
    accent-color: #8c6a3b;
  }

  .progress-strip span {
    min-width: 32px;
    text-align: right;
  }

  .footer-meta {
    display: inline-flex;
    gap: 0;
    align-items: center;
    flex-wrap: wrap;
    color: var(--text-muted);
  }

  .footer-meta span + span {
    position: relative;
    padding-left: 9px;
    margin-left: 8px;
  }

  .footer-meta span + span::before {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    width: 3px;
    height: 3px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--text-muted) 70%, white 30%);
    transform: translateY(-50%);
  }

  @media (max-width: 900px) {
    .reader-head {
      display: grid;
      align-items: start;
    }
  }
</style>

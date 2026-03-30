<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import {
    FOLIATE_VIEW_TAG,
    READER_ENGINE_HOST_ATTR,
    READER_ENGINE_STATUS_ATTR,
    SAMPLE_READER_BOOK_URL,
    createFoliateViewElement,
    ensureFoliateViewDefinition,
    flattenToc,
    pickAuthor,
    pickText,
    type ReaderControlRequest,
    type FoliateViewElement
  } from '$lib/reader';
  import type { ReaderPreviewState, ReaderTocItem } from '$lib/reader';
  import { loadLibraryBookFile } from '$lib/services/libraryPersistence';

  export let title = 'Reading Surface';
  export let controlRequest: ReaderControlRequest | null = null;
  export let hint = '中央阅读舞台保持安静，控制层只在边缘提供辅助。';
  export let isWindowMode = false;

  const dispatch = createEventDispatcher<{
    readerstate: ReaderPreviewState;
    tocchange: ReaderTocItem[];
  }>();

  let hostElement: HTMLDivElement | null = null;
  let stageElement: HTMLDivElement | null = null;
  let adapterStatus: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  let sampleStatus: 'idle' | 'loading' | 'open' | 'error' = 'idle';
  let openSourceLabel = 'sample book';
  let foliateViewElement: FoliateViewElement | null = null;
  let handledControlNonce = 0;

  const emitReaderState = (partial?: Partial<ReaderPreviewState>) => {
    const book = foliateViewElement?.book;
    const lastLocation = foliateViewElement?.lastLocation;
    const fraction = typeof lastLocation?.fraction === 'number' ? lastLocation.fraction : 0;
    const progressPercent = Math.round(fraction * 100);
    const sectionCurrent = lastLocation?.section?.current;
    const sectionTotal = lastLocation?.section?.total;
    const fallbackChapter =
      typeof sectionCurrent === 'number' && typeof sectionTotal === 'number'
        ? `Section ${sectionCurrent + 1} / ${sectionTotal}`
        : 'Waiting for location';

    dispatch('readerstate', {
      title: pickText(book?.metadata?.title) || 'Reader sample',
      author: pickAuthor(book?.metadata?.creator) || 'Unknown author',
      chapterLabel: lastLocation?.tocItem?.label || fallbackChapter,
      chapterHref: lastLocation?.tocItem?.href || '',
      progressLabel: `${progressPercent}%`,
      progressFraction: fraction,
      locationLabel:
        typeof lastLocation?.current === 'number' && typeof lastLocation?.total === 'number'
          ? `${lastLocation.current} / ${lastLocation.total}`
          : 'Opening sample',
      ...partial
    });
  };

  const configureFoliatePreview = () => {
    const renderer = (foliateViewElement as (FoliateViewElement & { renderer?: HTMLElement }) | null)?.renderer;
    if (!renderer) return;

    renderer.setAttribute('flow', 'paginated');
    renderer.setAttribute('margin', isWindowMode ? '16' : '20');
    renderer.setAttribute('gap', '6%');
    renderer.setAttribute('max-inline-size', isWindowMode ? '860px' : '720px');
    renderer.setAttribute('max-block-size', '980px');
  };

  const openBook = async (source: string | File, sourceLabel: string) => {
    if (!foliateViewElement || sampleStatus === 'loading') return;

    sampleStatus = 'loading';
    openSourceLabel = sourceLabel;

    try {
      await foliateViewElement.open(source);
      configureFoliatePreview();
      sampleStatus = 'open';
      dispatch('tocchange', flattenToc(foliateViewElement.book?.toc));
      emitReaderState();
    } catch (error) {
      console.error(`Failed to open reader source: ${sourceLabel}`, error);
      sampleStatus = 'error';
    }
  };

  const loadSampleBook = async () => openBook(SAMPLE_READER_BOOK_URL, 'sample book');

  const applyControlRequest = async () => {
    if (!controlRequest || handledControlNonce === controlRequest.nonce) return;
    if (!foliateViewElement) return;

    if (
      controlRequest.type !== 'file' &&
      controlRequest.type !== 'sample' &&
      controlRequest.type !== 'asset' &&
      controlRequest.type !== 'library-file' &&
      sampleStatus !== 'open'
    ) {
      return;
    }

    handledControlNonce = controlRequest.nonce;

    try {
      if (controlRequest.type === 'sample') {
        await loadSampleBook();
      } else if (controlRequest.type === 'asset') {
        await openBook(controlRequest.url, controlRequest.label);
      } else if (controlRequest.type === 'library-file') {
        const file = await loadLibraryBookFile(controlRequest.path);
        await openBook(file, controlRequest.label || file.name);
      } else if (controlRequest.type === 'prev') {
        await foliateViewElement.prev();
      } else if (controlRequest.type === 'next') {
        await foliateViewElement.next();
      } else if (controlRequest.type === 'start') {
        await foliateViewElement.goToFraction(0);
      } else if (controlRequest.type === 'href') {
        await foliateViewElement.goTo(controlRequest.href);
      } else if (controlRequest.type === 'file') {
        await openBook(controlRequest.file, controlRequest.file.name);
      } else if (controlRequest.type === 'fraction') {
        await foliateViewElement.goToFraction(controlRequest.fraction);
      }
    } catch (error) {
      console.error(`Failed to handle reader control: ${controlRequest.type}`, error);
    }
  };

  $: {
    controlRequest?.nonce;
    foliateViewElement;
    sampleStatus;
    void applyControlRequest();
  }

  onMount(() => {
    let cancelled = false;

    const setupFoliateHost = async () => {
      if (!hostElement || !stageElement) return;

      adapterStatus = 'loading';

      try {
        await ensureFoliateViewDefinition();
        if (cancelled || !hostElement || !stageElement) return;

        const existingView = stageElement.querySelector(FOLIATE_VIEW_TAG);
        if (existingView instanceof HTMLElement) {
          foliateViewElement = existingView as FoliateViewElement;
        } else {
          const view = createFoliateViewElement();
          view.className = 'foliate-preview';
          view.addEventListener('load', () => emitReaderState());
          view.addEventListener('relocate', () => emitReaderState());
          stageElement.append(view);
          foliateViewElement = view;
        }

        adapterStatus = 'ready';
      } catch (error) {
        console.error('Failed to prepare foliate-view host', error);
        if (!cancelled) adapterStatus = 'error';
      }
    };

    setupFoliateHost();

    return () => {
      cancelled = true;
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
      <div class="head-statuses">
        <button
          type="button"
          class="sample-trigger"
          on:click={loadSampleBook}
          disabled={adapterStatus !== 'ready' || sampleStatus === 'loading'}
        >
          {sampleStatus === 'loading' ? 'Opening…' : 'Open sample'}
        </button>
      </div>
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
          {#if sampleStatus !== 'open'}
            <div class="stage-overlay" aria-hidden="true">
              <button
                type="button"
                class="sample-trigger inline"
                on:click={loadSampleBook}
                disabled={adapterStatus !== 'ready' || sampleStatus === 'loading'}
              >
                {sampleStatus === 'loading' ? 'Opening…' : 'Open sample'}
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <div class="engine-paper">
          <div class="paper-header">
            <span>{sampleStatus === 'open' ? openSourceLabel : 'Preview chapter'}</span>
            <small>{sampleStatus === 'open' ? 'reading preview' : 'ready to open'}</small>
          </div>

          <div class="engine-stage" bind:this={stageElement}></div>

          {#if sampleStatus !== 'open'}
            <div class="paper-copy" aria-hidden="true">
              <p>先把阅读舞台压到足够安静，再去叠加目录、注释、TTS 和 bridge 等更复杂的能力。</p>
              <p>现在可以先打开样例书或本地文件，确认正文区域、翻页和导航已经落在真正的阅读表面里。</p>
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

  .sample-trigger {
    padding: 6px 10px;
    border: 1px solid rgba(64, 47, 24, 0.07);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 94%, white 6%);
    color: var(--text-secondary);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 11px;
    line-height: 1;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .sample-trigger:disabled {
    opacity: 0.55;
  }

  .viewport-frame {
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
    display: block;
    min-height: calc(100vh - 26px);
    height: 100%;
    padding: 0;
    border: 0;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 98%, white 2%);
    overflow: hidden;
  }

  .engine-host :global(foliate-view.foliate-preview) {
    display: none;
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
    width: 100%;
    min-height: calc(100vh - 26px);
    height: 100%;
    background: transparent;
    box-shadow: none;
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

  .stage-overlay .sample-trigger {
    pointer-events: auto;
  }

  .engine-stage :global(foliate-view.foliate-preview) {
    display: block;
    width: 100%;
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
    min-height: calc(100vh - 26px);
    height: 100%;
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

  .sample-trigger.inline {
    padding-inline: 14px;
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

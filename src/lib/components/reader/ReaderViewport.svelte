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
    type FoliateViewElement,
    type ReaderEngineMountState
  } from '$lib/reader';
  import type { ReaderPreviewState, ReaderTocItem } from '$lib/reader';

  export let title = 'Foliate Mount Boundary';
  export let state: ReaderEngineMountState = 'idle';
  export let controlRequest: ReaderControlRequest | null = null;
  export let hint =
    '这里是后续阅读引擎接管的唯一宿主容器。toolbar、sidebar 和 bridge 都不应该直接侵入这个 DOM 边界。';

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
    renderer.setAttribute('margin', '20');
    renderer.setAttribute('gap', '6%');
    renderer.setAttribute('max-inline-size', '720px');
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
    if (!foliateViewElement || sampleStatus !== 'open') return;

    handledControlNonce = controlRequest.nonce;

    try {
      if (controlRequest.type === 'prev') {
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

  $: void applyControlRequest();

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

<section class="viewport-shell" aria-label="reader viewport shell">
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
        {sampleStatus === 'loading' ? 'Loading sample…' : 'Load sample'}
      </button>
      <span class="state" data-state={state}>{state}</span>
    </div>
  </header>

  <div class="viewport-frame">
    <div
      class="engine-host"
      bind:this={hostElement}
      data-role={READER_ENGINE_HOST_ATTR}
      data-engine-status={READER_ENGINE_STATUS_ATTR}
      aria-label="reader engine host placeholder"
    >
      <div class="engine-paper">
        <div class="paper-header">
          <span>{sampleStatus === 'open' ? openSourceLabel : 'Chapter 3'}</span>
          <small>
            {adapterStatus === 'ready' ? 'foliate-view ready' : `adapter ${adapterStatus}`}
            ·
            {sampleStatus === 'open' ? 'sample opened' : `sample ${sampleStatus}`}
          </small>
        </div>

        <div class="engine-stage" bind:this={stageElement}></div>

        {#if sampleStatus !== 'open'}
          <div class="paper-copy" aria-hidden="true">
          <p>当制度开始无法自我修复时，政治衰败并不是突然发生的，而是以缓慢、分层和难以立即察觉的方式积累出来。</p>
          <p>中央正文区必须先像真正的阅读画布，再去承接翻页、选区、注释、TTS 和 bridge 等更复杂的行为。</p>
          <p>这一块现在已经能显式调用 `view.open()` 载入样例书，下一步再接真实导入、目录和位置恢复。</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</section>

<style>
  .viewport-shell {
    display: grid;
    gap: 10px;
    min-width: 0;
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

  .state {
    padding: 6px 8px;
    border: 1px solid rgba(64, 47, 24, 0.08);
    background: color-mix(in srgb, var(--surface-panel) 92%, white 8%);
    color: var(--text-secondary);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.08em;
  }

  .state[data-state='idle'] {
    color: var(--text-primary);
  }

  .sample-trigger {
    padding: 7px 10px;
    border: 1px solid rgba(64, 47, 24, 0.08);
    background: color-mix(in srgb, var(--surface-panel) 90%, white 10%);
    color: var(--text-primary);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 12px;
    line-height: 1;
  }

  .sample-trigger:disabled {
    opacity: 0.55;
  }

  .viewport-frame {
    min-height: 0;
  }

  .engine-host {
    display: grid;
    min-height: 66vh;
    padding: clamp(16px, 3vw, 28px) clamp(10px, 2vw, 18px);
    border: 1px solid rgba(64, 47, 24, 0.06);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 98%, white 2%);
    outline: none;
  }

  .engine-host :global(foliate-view.foliate-preview) {
    display: none;
  }

  .engine-paper {
    display: grid;
    align-content: start;
    gap: 20px;
    width: min(100%, 820px);
    min-height: 100%;
    margin: 0 auto;
    padding: clamp(18px, 3vw, 24px) clamp(18px, 3vw, 30px);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0)),
      #f8f3e9;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.5) inset,
      0 20px 38px rgba(36, 25, 12, 0.08);
  }

  .paper-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    color: var(--text-muted);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .engine-stage {
    min-height: min(66vh, 860px);
    background: rgba(255, 255, 255, 0.36);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.7),
      0 0 0 1px rgba(84, 62, 34, 0.05);
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

  .paper-copy {
    display: grid;
    gap: 18px;
    font-size: clamp(18px, 2vw, 21px);
    line-height: 1.95;
    color: #2c241c;
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

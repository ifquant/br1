<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import {
    READER_EMPTY_TITLE,
    getReaderFormatDisplayLabel,
    getReaderLayoutDisplayLabel,
    getReaderLocationDisplayLabel,
    type ReaderControlRequest,
    type ReaderPreviewState,
    type ReaderViewWidthMode
  } from '$lib/reader';

  const dispatch = createEventDispatcher<{
    controlrequest: ReaderControlRequest;
  }>();

  export let preview: ReaderPreviewState;
  export let isWindowMode = false;
  export let isVisible = true;
  export let viewWidthMode: ReaderViewWidthMode = 'standard';

  let controlNonce = 0;
  let sliderValue = 0;

  $: sliderValue = Math.round(preview.progressFraction * 100);
  $: locationDisplayLabel = getReaderLocationDisplayLabel(preview.locationLabel);
  $: formatDisplayLabel = getReaderFormatDisplayLabel(preview.formatLabel);
  $: layoutDisplayLabel = getReaderLayoutDisplayLabel(preview.layoutLabel);
  $: chapterDisplayLabel = (() => {
    const chapterLabel = preview.chapterLabel.trim();
    if (chapterLabel && chapterLabel !== '等待打开书籍') return chapterLabel;
    if (preview.title.trim() && preview.title !== READER_EMPTY_TITLE) return preview.title.trim();
    return '等待打开书籍';
  })();

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
</script>

<footer
  class:window-mode={isWindowMode}
  class:visible={isVisible}
  class="footer-bar"
  aria-label="阅读页脚控制"
  >
    <div
    class:window-mode={isWindowMode}
    class:focus-width={viewWidthMode === 'focus'}
    class:wide-width={viewWidthMode === 'wide'}
    class="footer-frame"
    >
    <div class="footer-controls">
      <button type="button" aria-label="上一页" title="上一页" on:click={() => issueControl('prev')}>‹</button>
      <button type="button" aria-label="回到开头" title="回到开头" on:click={() => issueControl('start')}>·</button>
      <button type="button" aria-label="下一页" title="下一页" on:click={() => issueControl('next')}>›</button>
    </div>
    <div class="footer-reading-status" aria-label="当前阅读状态">
      <div class="reading-summary">
        <strong>{chapterDisplayLabel}</strong>
        <span>{locationDisplayLabel}</span>
      </div>
      <label class="progress-strip" aria-label="阅读进度">
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
        <span>{preview.progressLabel}</span>
      </label>
    </div>
    <div class="footer-meta" aria-label="阅读环境">
      <span class="footer-chip">{formatDisplayLabel}</span>
      <span class="footer-chip">{layoutDisplayLabel}</span>
    </div>
  </div>
</footer>

<style>
  .footer-bar {
    width: 100%;
  }

  .footer-frame {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px 14px;
    padding: 8px 12px 10px;
    border-top: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-panel) 96%, white 4%);
    color: var(--text-secondary);
    font-family: var(--font-chrome);
    font-size: 10px;
    letter-spacing: 0.02em;
    text-transform: none;
  }

  .footer-bar.window-mode {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    opacity: 0;
    transform: translateY(8px);
    transition:
      opacity 180ms ease,
      transform 180ms ease;
    pointer-events: none;
  }

  .footer-bar.window-mode.visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .footer-frame.window-mode {
    width: min(100%, var(--reader-window-frame-width, 1080px));
    margin: 0 auto;
    padding: 6px 12px 10px;
    border-top: 1px solid rgba(64, 47, 24, 0.04);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-page) 98%, white 2%);
  }

  .footer-frame.window-mode.focus-width {
    width: min(100%, var(--reader-window-frame-width-focus, 920px));
  }

  .footer-frame.window-mode.wide-width {
    width: min(100%, var(--reader-window-frame-width-wide, 1320px));
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

  .footer-controls button:focus-visible,
  .progress-strip input:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--reader-shell-accent, #8c6a3b) 72%, white 28%);
    outline-offset: 2px;
  }

  .progress-strip {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    min-width: 0;
    width: 100%;
  }

  .progress-strip input {
    flex: 1;
    accent-color: #8c6a3b;
  }

  .progress-strip span {
    min-width: 36px;
    text-align: right;
    color: var(--text-secondary);
    font-weight: 700;
  }

  .footer-reading-status {
    display: grid;
    gap: 6px;
    min-width: 0;
  }

  .reading-summary {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px 12px;
    min-width: 0;
    flex-wrap: wrap;
  }

  .reading-summary strong {
    min-width: 0;
    color: var(--text-primary);
    font: 700 12px/1.25 var(--font-chrome);
    letter-spacing: 0.02em;
  }

  .reading-summary span {
    color: var(--text-muted);
    white-space: nowrap;
  }

  .footer-meta {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    color: var(--text-muted);
  }

  .footer-chip {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 0 10px;
    border: 1px solid color-mix(in srgb, var(--border-light) 92%, white 8%);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
    color: var(--text-muted);
    font: 700 10px/1 var(--font-chrome);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  @media (max-width: 860px) {
    .footer-frame,
    .footer-frame.window-mode {
      grid-template-columns: 1fr;
      align-items: stretch;
    }

    .footer-controls {
      justify-content: flex-start;
    }

    .footer-meta {
      justify-content: flex-start;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .footer-bar.window-mode {
      transition: none;
      transform: none;
    }
  }
</style>

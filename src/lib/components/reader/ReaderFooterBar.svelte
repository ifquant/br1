<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import {
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
  aria-label="reader footer controls preview"
>
  <div
    class:window-mode={isWindowMode}
    class:focus-width={viewWidthMode === 'focus'}
    class:wide-width={viewWidthMode === 'wide'}
    class="footer-frame"
  >
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
      <span>{preview.progressLabel}</span>
    </label>
    <div class="footer-meta">
      <span>{locationDisplayLabel}</span>
      <span>{formatDisplayLabel}</span>
      <span>{layoutDisplayLabel}</span>
    </div>
  </div>
</footer>

<style>
  .footer-bar {
    width: 100%;
  }

  .footer-frame {
    display: flex;
    justify-content: space-between;
    gap: 10px 14px;
    flex-wrap: wrap;
    padding: 8px 12px 10px;
    border-top: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-panel) 96%, white 4%);
    color: var(--text-secondary);
    font-family: var(--font-chrome);
    font-size: 10px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
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
    width: min(100%, 1080px);
    margin: 0 auto;
    padding: 6px 12px 10px;
    border-top: 1px solid rgba(64, 47, 24, 0.04);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-page) 98%, white 2%);
  }

  .footer-frame.window-mode.focus-width {
    width: min(100%, 920px);
  }

  .footer-frame.window-mode.wide-width {
    width: min(100%, 1320px);
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
</style>

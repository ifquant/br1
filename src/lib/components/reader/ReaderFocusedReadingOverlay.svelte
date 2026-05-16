<!-- Ownership: this overlay only renders the temporary focused-reading shell.
 Route/state helpers still decide what text is active and whether the mode can
 run for the current format. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { ReaderFocusedReadingState } from '$lib/reader/readingMode';

  export let state: ReaderFocusedReadingState;
  export let summary = '';
  export let isRsvpPlaying = false;
  export let onExit: (() => void) | null = null;
  export let onSwitchToParagraph: (() => void) | null = null;
  export let onSwitchToRsvp: (() => void) | null = null;
  export let onRestartRsvp: (() => void) | null = null;
  export let onTogglePlayback: (() => void) | null = null;
  export let onSlowerPace: (() => void) | null = null;
  export let onFasterPace: (() => void) | null = null;
  export let onPreviousWord: (() => void) | null = null;
  export let onNextWord: (() => void) | null = null;

  let overlayElement: HTMLElement | null = null;
  $: isParagraphMode = state.mode === 'paragraph';
  $: isRsvpMode = state.mode === 'rsvp';
  $: currentWord = state.words[state.activeWordIndex] ?? '';
  $: hasCapabilityGap = Boolean(state.capabilityMessage) || !state.sourceText.trim();
  $: rsvpCanAutoplay = isRsvpMode && state.words.length > 0 && (isRsvpPlaying || state.activeWordIndex < state.words.length - 1);
  $: rsvpPaceLabel = `${state.paceWpm} 词/分钟`;
  $: rsvpKeyboardTransportEnabled = isRsvpMode && !hasCapabilityGap;
  $: readingSourceLabel = state.sourceLabel.trim();
  $: readingProgressLabel = state.progressLabel.trim();
  $: readingProgressLocationLabel = getReadableProgressLocationLabel(state.progressLocation);

  onMount(() => {
    overlayElement?.focus();
  });

  const isInteractiveKeyboardTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        'button, a, input, select, textarea, summary, [role="button"], [contenteditable="true"]'
      )
    );

  const consumeOverlayKey = (event: KeyboardEvent, callback: (() => void) | null) => {
    event.preventDefault();
    if (event.repeat) {
      return;
    }
    callback?.();
  };

  const handleOverlayKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      consumeOverlayKey(event, onExit);
      return;
    }
    if (!rsvpKeyboardTransportEnabled) {
      return;
    }
    if (isInteractiveKeyboardTarget(event.target)) {
      return;
    }

    // Keyboard transport stops at the overlay boundary: the route still owns
    // autoplay timing and focused-reading state, while this view only maps
    // focused key presses into the existing route callbacks.
    if (event.code === 'Space') {
      consumeOverlayKey(event, onTogglePlayback);
      return;
    }
    if (event.key === 'ArrowLeft') {
      consumeOverlayKey(event, onPreviousWord);
      return;
    }
    if (event.key === 'ArrowRight') {
      consumeOverlayKey(event, onNextWord);
      return;
    }
    if (event.key === 'ArrowUp') {
      consumeOverlayKey(event, onFasterPace);
      return;
    }
    if (event.key === 'ArrowDown') {
      consumeOverlayKey(event, onSlowerPace);
    }
  };

  const getReadableProgressLocationLabel = (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      return '';
    }

    // Focused-reading should surface human reading context, not raw restore
    // locators that only make sense to the persistence/runtime layers.
    if (
      normalized.startsWith('epubcfi(') ||
      normalized.startsWith('txt:') ||
      normalized.startsWith('page:') ||
      normalized.startsWith('pdf:')
    ) {
      return '';
    }

    return normalized;
  };
</script>

<div
  bind:this={overlayElement}
  class="focused-reading-overlay"
  role="dialog"
  aria-modal="true"
  aria-label="专注阅读浮层"
  tabindex="-1"
  on:keydown={handleOverlayKeydown}
>
  <div class="overlay-card">
    <header class="overlay-header">
      <div>
        <span class="eyebrow">FOCUSED READING</span>
        <h2>{isParagraphMode ? '段落聚焦' : 'RSVP-lite'}</h2>
      </div>
      <button type="button" class="exit-button" on:click={() => onExit?.()}>
        退出专注阅读
      </button>
    </header>

    <div class="overlay-summary" aria-live="polite">
      <strong>{summary}</strong>
    </div>
    {#if readingSourceLabel || readingProgressLabel || readingProgressLocationLabel}
      <section class="overlay-context" aria-label="当前阅读上下文">
        {#if readingSourceLabel}
          <div class="overlay-context-item">
            <span class="overlay-context-label">摘录来源</span>
            <strong>{readingSourceLabel}</strong>
          </div>
        {/if}
        {#if readingProgressLabel}
          <div class="overlay-context-item">
            <span class="overlay-context-label">进度</span>
            <strong>{readingProgressLabel}</strong>
          </div>
        {/if}
        {#if readingProgressLocationLabel}
          <div class="overlay-context-item overlay-context-item-wide">
            <span class="overlay-context-label">定位</span>
            <strong>{readingProgressLocationLabel}</strong>
          </div>
        {/if}
      </section>
    {/if}
    {#if !hasCapabilityGap}
      <div class="overlay-mode-actions" aria-label="专注阅读模式切换">
        {#if isParagraphMode}
          <button type="button" on:click={() => onSwitchToRsvp?.()}>切换到 RSVP-lite</button>
        {:else if isRsvpMode}
          <button type="button" on:click={() => onSwitchToParagraph?.()}>切换到段落聚焦</button>
          <button type="button" on:click={() => onRestartRsvp?.()}>从第 1 词重新开始</button>
        {/if}
        <span>保持当前摘录，不重新抓取正文。</span>
      </div>
    {/if}
    <div class="overlay-hints" aria-label="专注阅读快捷键提示">
      <span>Esc 退出专注阅读</span>
      {#if rsvpKeyboardTransportEnabled}
        <span>Space 暂停 / 继续</span>
        <span>← → 上一个 / 下一个</span>
        <span>↑ ↓ 更快 / 更慢</span>
      {/if}
    </div>

    {#if hasCapabilityGap}
      <p class="capability-copy">
        {state.capabilityMessage || '当前还没有可进入专注阅读的正文摘录。'}
      </p>
    {:else if isParagraphMode}
      <article class="paragraph-card">
        <p>{state.sourceText}</p>
      </article>
    {:else if isRsvpMode}
      <div class="rsvp-shell">
        <div class="rsvp-word-card" aria-label="RSVP-lite 当前词">
          {currentWord || '...'}
        </div>
        <div class="rsvp-controls">
          <button type="button" disabled={!rsvpCanAutoplay} on:click={() => onTogglePlayback?.()}>
            {isRsvpPlaying ? '暂停自动播放' : '继续自动播放'}
          </button>
          <button
            type="button"
            disabled={state.activeWordIndex === 0}
            on:click={() => onPreviousWord?.()}
          >
            上一个词
          </button>
          <div class="rsvp-progress" aria-label="RSVP-lite 进度">
            {state.activeWordIndex + 1} / {Math.max(state.words.length, 1)}
          </div>
          <button
            type="button"
            disabled={state.activeWordIndex >= state.words.length - 1}
            on:click={() => onNextWord?.()}
          >
            下一个词
          </button>
        </div>
        <div class="rsvp-pace-controls" aria-label="RSVP-lite 播放速度">
          <span class="rsvp-pace-label">阅读速度</span>
          <button type="button" on:click={() => onSlowerPace?.()}>更慢</button>
          <strong>{rsvpPaceLabel}</strong>
          <button type="button" on:click={() => onFasterPace?.()}>更快</button>
        </div>
        <p class="rsvp-source">{state.sourceText}</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .focused-reading-overlay {
    position: absolute;
    inset: clamp(12px, 2vw, 24px);
    z-index: 7;
    display: grid;
    place-items: center;
    padding: clamp(12px, 3vw, 28px);
    background:
      linear-gradient(180deg, rgba(18, 14, 10, 0.06), rgba(18, 14, 10, 0.12)),
      color-mix(in srgb, var(--reader-shell-backdrop, rgba(245, 237, 223, 0.74)) 82%, transparent);
    backdrop-filter: blur(10px);
  }

  .overlay-card {
    display: grid;
    gap: 16px;
    width: min(100%, 720px);
    padding: clamp(18px, 3vw, 28px);
    border-radius: 28px;
    border: 1px solid color-mix(in srgb, var(--reader-shell-border, rgba(80, 58, 28, 0.16)) 88%, transparent);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.56), rgba(255, 255, 255, 0.18)),
      color-mix(in srgb, var(--reader-paper-bg, #f8f1e4) 90%, white 10%);
    color: var(--reader-text-color, var(--reader-shell-text, #2b241a));
    box-shadow: 0 24px 48px color-mix(in srgb, var(--reader-shell-shadow, rgba(34, 24, 12, 0.14)) 72%, transparent);
  }

  .overlay-header,
  .rsvp-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .eyebrow,
  .rsvp-progress {
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 11px;
    color: var(--reader-shell-muted, #78644a);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  h2 {
    margin: 4px 0 0;
    font-size: 20px;
    line-height: 1.2;
  }

  .overlay-summary {
    display: grid;
    gap: 4px;
  }

  .overlay-context {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .overlay-context-item {
    display: grid;
    gap: 2px;
    min-width: 120px;
    padding: 10px 12px;
    border-radius: 16px;
    border: 1px solid color-mix(in srgb, var(--reader-shell-border, rgba(80, 58, 28, 0.16)) 76%, transparent);
    background: color-mix(in srgb, var(--reader-paper-bg, #f8f1e4) 84%, white 16%);
  }

  .overlay-context-item strong {
    font-size: 14px;
    line-height: 1.3;
  }

  .overlay-context-item-wide {
    flex: 1 1 100%;
  }

  .overlay-context-label {
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 11px;
    color: var(--reader-shell-muted, #78644a);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .overlay-hints {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .overlay-mode-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .overlay-mode-actions span {
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 12px;
    color: var(--reader-shell-muted, #78644a);
  }

  .overlay-hints span {
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 11px;
    color: var(--reader-shell-muted, #78644a);
    padding: 4px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--reader-shell-raised, #f9f2e6) 90%, white 10%);
    border: 1px solid
      color-mix(in srgb, var(--reader-shell-border, rgba(80, 58, 28, 0.16)) 74%, transparent);
  }

  .overlay-summary strong {
    font-size: 14px;
    line-height: 1.4;
  }

  .paragraph-card,
  .rsvp-word-card,
  .rsvp-source,
  .capability-copy {
    font-family: var(
      --reader-font-family,
      "Iowan Old Style",
      "Noto Serif SC",
      "Source Han Serif SC",
      serif
    );
    color: var(--reader-text-color, #2c241c);
  }

  .paragraph-card {
    padding: clamp(18px, 3vw, 28px);
    border-radius: 20px;
    background: color-mix(in srgb, var(--reader-paper-bg, #fffaf0) 84%, white 16%);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--reader-border-color, rgba(84, 62, 34, 0.08)) 82%, transparent),
      0 18px 34px color-mix(in srgb, var(--reader-shell-shadow, rgba(38, 27, 14, 0.08)) 58%, transparent);
  }

  .paragraph-card p,
  .capability-copy,
  .rsvp-source {
    margin: 0;
    font-size: var(--reader-font-size, 20px);
    line-height: var(--reader-line-height, 1.9);
  }

  .rsvp-shell {
    display: grid;
    gap: 14px;
  }

  .rsvp-word-card {
    display: grid;
    place-items: center;
    min-height: 220px;
    padding: 16px;
    border-radius: 24px;
    background:
      radial-gradient(circle at top, rgba(255, 255, 255, 0.42), transparent 58%),
      color-mix(in srgb, var(--reader-paper-bg, #fffaf0) 88%, white 12%);
    font-size: clamp(42px, 8vw, 72px);
    line-height: 1.1;
    text-align: center;
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--reader-border-color, rgba(84, 62, 34, 0.08)) 84%, transparent),
      0 20px 36px color-mix(in srgb, var(--reader-shell-shadow, rgba(38, 27, 14, 0.1)) 56%, transparent);
  }

  .rsvp-controls {
    justify-content: center;
    flex-wrap: wrap;
  }

  .rsvp-pace-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .rsvp-pace-label {
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 12px;
    color: var(--reader-shell-muted, #78644a);
  }

  .rsvp-source,
  .capability-copy {
    color: color-mix(in srgb, var(--reader-text-color, #2c241c) 76%, white 24%);
  }

  button {
    border: 1px solid color-mix(in srgb, var(--reader-shell-border, rgba(80, 58, 28, 0.16)) 84%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--reader-shell-raised, #f9f2e6) 90%, white 10%);
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    padding: 8px 12px;
  }

  button:disabled {
    cursor: default;
    opacity: 0.45;
  }

  .exit-button {
    background: color-mix(in srgb, var(--reader-shell-accent, #8c6a3b) 16%, white 84%);
  }

  @media (max-width: 720px) {
    .focused-reading-overlay {
      inset: 0;
      padding: 12px;
    }

    .overlay-card {
      width: 100%;
      min-height: 100%;
      border-radius: 20px;
    }

    .overlay-header {
      align-items: start;
      flex-direction: column;
    }
  }
</style>

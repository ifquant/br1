<script lang="ts">
  import { onMount } from 'svelte';
  import type { ReaderPlaybackQueueSummary, ReaderTtsReadAloudTextMode } from '$lib/reader';

  export let summary: ReaderPlaybackQueueSummary;
  export let readAloudTextMode: ReaderTtsReadAloudTextMode = 'source';
  export let canGoPrevious = false;
  export let canGoNext = false;
  export let supportsSegmentNavigation = false;
  export let canRunPrimaryAction = false;
  export let canStop = false;
  export let followsCurrentLocation = true;
  export let hasTarget = false;
  export let canJumpToCurrentTtsLocation = false;
  export let voiceCapabilityLabel = '当前浏览器没有暴露可选语音列表。';
  export let selectedVoiceLabel = '';
  export let primaryActionLabel = '开始朗读';
  export let onPrevious: (() => void) | null = null;
  export let onNext: (() => void) | null = null;
  export let onRunPrimaryAction: (() => void) | null = null;
  export let onStop: (() => void) | null = null;
  export let onPinCurrentTarget: (() => void) | null = null;
  export let onResumeFollowingCurrent: (() => void) | null = null;
  export let onJumpToCurrentTtsLocation: (() => void) | null = null;
  export let onSetReadAloudTextMode: ((mode: ReaderTtsReadAloudTextMode) => void) | null = null;
  export let onSetRate: ((rate: number) => void) | null = null;
  export let onToggleTimeout: (() => void) | null = null;

  let browserVoiceLabels: string[] = [];

  const collectBrowserVoiceLabels = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      browserVoiceLabels = [];
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    browserVoiceLabels = voices
      .map((voice) => voice.name.trim())
      .filter(Boolean)
      .slice(0, 4);
  };

  onMount(() => {
    collectBrowserVoiceLabels();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const handleVoicesChanged = () => {
      collectBrowserVoiceLabels();
    };

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
  });

  $: voicePreviewLabel = browserVoiceLabels.length
    ? browserVoiceLabels.join(' / ')
    : voiceCapabilityLabel.trim() || '当前浏览器没有暴露可选语音列表。';
  $: playbackRate = Number.isFinite(summary.rate) ? summary.rate : 1;
  $: sliderValue = String(Math.round(playbackRate * 10));
</script>

<section class="playback-panel" aria-label="播放控制">
  <div class="playback-header">
    <strong>播放控制</strong>
    <span>速度、段落队列和定时关闭留在当前阅读路由里，暂时不写入持久化设置。</span>
  </div>

  <div class="playback-actions">
    <button
      type="button"
      class:active={readAloudTextMode === 'source'}
      class="ghost-action"
      aria-pressed={readAloudTextMode === 'source'}
      on:click={() => onSetReadAloudTextMode?.('source')}
    >
      朗读原文
    </button>
    <button
      type="button"
      class:active={readAloudTextMode === 'translated'}
      class="ghost-action"
      aria-pressed={readAloudTextMode === 'translated'}
      on:click={() => onSetReadAloudTextMode?.('translated')}
    >
      朗读译文
    </button>
    <button
      type="button"
      class="primary-action"
      disabled={!canRunPrimaryAction}
      aria-label={primaryActionLabel}
      on:click={() => onRunPrimaryAction?.()}
    >
      {primaryActionLabel}
    </button>
    {#if canStop}
      <button type="button" class="ghost-action" on:click={() => onStop?.()}>
        停止朗读
      </button>
    {/if}
    {#if followsCurrentLocation}
      <button type="button" class="ghost-action" disabled={!hasTarget} on:click={() => onPinCurrentTarget?.()}>
        锁定当前朗读目标
      </button>
    {:else}
      <button type="button" class="ghost-action" on:click={() => onResumeFollowingCurrent?.()}>
        回到当前阅读位置
      </button>
    {/if}
    {#if canJumpToCurrentTtsLocation}
      <button type="button" class="ghost-action" on:click={() => onJumpToCurrentTtsLocation?.()}>
        回到朗读位置
      </button>
    {/if}
  </div>

  <div class="playback-grid">
    <article class="playback-card">
      <div class="playback-card-head">
        <strong>朗读速度</strong>
        <span>面板预设 {summary.rateLabel}</span>
      </div>
      <label class="slider-field">
        <span class="sr-only">朗读速度</span>
        <input
          type="range"
          min="2"
          max="30"
          step="1"
          value={sliderValue}
          aria-label="朗读速度"
          on:input={(event) => onSetRate?.(Number((Number(event.currentTarget.value) / 10).toFixed(1)))}
        />
      </label>
      <p>当前只更新本页播放面板预设，不会改变当前或下次浏览器朗读的真实语速，直到 runtime 真正接入这项设置。</p>
    </article>

    <article class="playback-card">
      <div class="playback-card-head">
        <strong>播放队列</strong>
        <span>{summary.positionLabel}</span>
      </div>
      <p>{summary.currentLabel}</p>
      <span>{summary.currentSourceLabel || '当前只有一个 route-local 朗读片段。'}</span>
      {#if supportsSegmentNavigation}
        <div class="playback-actions">
          <button type="button" class="ghost-action" disabled={!canGoPrevious} on:click={() => onPrevious?.()}>
            上一段
          </button>
          <button type="button" class="ghost-action" disabled={!canGoNext} on:click={() => onNext?.()}>
            下一段
          </button>
        </div>
      {:else}
        <span>正文多段分段还没有接入这条 route-local 队列，所以这里先只展示当前片段摘要。</span>
      {/if}
    </article>

    <article class="playback-card">
      <div class="playback-card-head">
        <strong>定时关闭</strong>
        <span>{summary.timeoutLabel}</span>
      </div>
      <p>先提供当前页面的 15 分钟定时关闭切换，后续再扩展成更完整的播放计划。</p>
      <button type="button" class="ghost-action" on:click={() => onToggleTimeout?.()}>
        定时关闭
      </button>
    </article>

    <article class="playback-card" aria-label="可选语音">
      <div class="playback-card-head">
        <strong>语音能力</strong>
      <span>{selectedVoiceLabel || '未锁定语音'}</span>
      </div>
      <p>{voicePreviewLabel}</p>
      <span>当前只展示浏览器是否暴露语音列表，不会假装已经锁定、持久化或切换实际发声人。</span>
    </article>
  </div>
</section>

<style>
  .playback-panel,
  .playback-header,
  .playback-card {
    display: grid;
    gap: 8px;
  }

  .playback-panel {
    padding: 12px;
    border: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
  }

  .playback-header strong,
  .playback-card strong {
    color: var(--text-primary);
    font: 700 14px/1.25 var(--font-chrome);
    letter-spacing: 0.02em;
  }

  .playback-header span,
  .playback-card span,
  .playback-card p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.6;
  }

  .playback-grid {
    display: grid;
    gap: 10px;
  }

  .playback-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .playback-card {
    padding: 12px;
    border: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-reader) 86%, white 14%);
  }

  .playback-card-head,
  .playback-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .playback-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .slider-field {
    display: grid;
    gap: 8px;
  }

  input[type='range'] {
    width: 100%;
    accent-color: color-mix(in srgb, var(--accent-warm, #8c6a3b) 70%, black 30%);
  }

  .primary-action,
  .ghost-action {
    min-height: 34px;
    border: 1px solid var(--border-light);
    border-radius: 999px;
    font: 700 12px/1 var(--font-chrome);
    letter-spacing: 0.04em;
    padding: 0 12px;
    cursor: pointer;
  }

  .primary-action {
    background: color-mix(in srgb, var(--accent-warm, #8c6a3b) 20%, var(--surface-reader) 80%);
    color: color-mix(in srgb, var(--accent-warm, #8c6a3b) 78%, black 22%);
  }

  .ghost-action {
    background: color-mix(in srgb, var(--surface-reader) 88%, white 12%);
    color: var(--text-secondary);
  }

  .primary-action:disabled,
  .ghost-action:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .ghost-action.active {
    border-color: color-mix(in srgb, var(--accent-warm, #8c6a3b) 38%, var(--border-light) 62%);
    color: color-mix(in srgb, var(--accent-warm, #8c6a3b) 68%, black 32%);
  }

  .primary-action:focus-visible,
  .ghost-action:focus-visible,
  input[type='range']:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent-warm, #8c6a3b) 72%, white 28%);
    outline-offset: 3px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>

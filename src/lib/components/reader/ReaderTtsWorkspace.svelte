<script lang="ts">
  import type { ReaderTtsSessionState, ReaderTtsSpeechTarget } from '$lib/reader';
  import {
    getReaderTtsPrimaryActionLabel,
    getReaderTtsReadableSourceLabel,
    getReaderTtsReadableTargetLabel,
    getReaderTtsSessionStatusLabel,
    getReaderTtsStatusDetail
  } from '$lib/reader';

  export let ttsSession: ReaderTtsSessionState;
  export let target: ReaderTtsSpeechTarget | null = null;
  export let followsCurrentLocation = true;
  export let onStart: (() => void) | null = null;
  export let onPause: (() => void) | null = null;
  export let onResume: (() => void) | null = null;
  export let onStop: (() => void) | null = null;
  export let onPinCurrentTarget: (() => void) | null = null;
  export let onResumeFollowingCurrent: (() => void) | null = null;

  $: ttsStatusLabel = getReaderTtsSessionStatusLabel(ttsSession);
  $: ttsStatusDetail = getReaderTtsStatusDetail(ttsSession);
  $: ttsPrimaryActionLabel = getReaderTtsPrimaryActionLabel(ttsSession);
  $: ttsSourceLabel = getReaderTtsReadableSourceLabel(ttsSession);
  $: ttsTargetLabel = getReaderTtsReadableTargetLabel(ttsSession);
  $: ttsFollowLabel = followsCurrentLocation ? '跟随当前阅读位置' : '已锁定朗读目标';
  $: canStop = ttsSession.status === 'speaking' || ttsSession.status === 'paused';
  $: hasTarget = !!target?.text.trim();

  const runPrimaryAction = () => {
    if (ttsSession.status === 'speaking') {
      onPause?.();
      return;
    }

    if (ttsSession.status === 'paused') {
      onResume?.();
      return;
    }

    onStart?.();
  };
</script>

<section class="tts-workspace" aria-label="朗读模式">
  <div class="tts-summary">
    <strong>朗读模式</strong>
    <span>把朗读从 header 的瞬时按钮收成显式阅读模式，让目标、跟随状态和会话控制都可见。</span>
  </div>

  <div class="tts-status-strip" aria-label="朗读模式状态">
    <span>{ttsStatusLabel}</span>
    <span>{ttsFollowLabel}</span>
    <span>{ttsTargetLabel || '没有可朗读目标'}</span>
  </div>

  <div class="tts-actions">
    <button
      type="button"
      class="primary-action"
      disabled={!hasTarget || ttsSession.status === 'unavailable'}
      aria-label={ttsPrimaryActionLabel}
      on:click={runPrimaryAction}
    >
      {ttsPrimaryActionLabel}
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
  </div>

  <div class="tts-panels">
    <article class="tts-panel">
      <strong>当前朗读目标</strong>
      <span>{ttsSourceLabel || '等待正文、选区或章节提供朗读目标。'}</span>
      <p>{target?.text || '当前没有可朗读内容。'}</p>
    </article>
    <article class="tts-panel">
      <strong>会话状态</strong>
      <span>{ttsStatusDetail}</span>
      <p>
        {#if followsCurrentLocation}
          现在会在空闲状态下自动跟随当前选区或阅读位置，不需要每次重新指定朗读目标。
        {:else}
          当前朗读目标已经锁定，直到你手动回到当前阅读位置。
        {/if}
      </p>
    </article>
  </div>
</section>

<style>
  .tts-workspace {
    display: grid;
    gap: 14px;
  }

  .tts-summary {
    display: grid;
    gap: 6px;
  }

  .tts-summary strong,
  .tts-panel strong {
    color: var(--text-primary);
    font: 700 14px/1.25 var(--font-chrome);
    letter-spacing: 0.02em;
  }

  .tts-summary span,
  .tts-status-strip span,
  .tts-panel span,
  .tts-panel p {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.6;
    margin: 0;
  }

  .tts-status-strip,
  .tts-panel {
    display: grid;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-reader) 86%, white 14%);
  }

  .tts-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
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

  .tts-panels {
    display: grid;
    gap: 10px;
  }

  .primary-action:focus-visible,
  .ghost-action:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent-warm, #8c6a3b) 72%, white 28%);
    outline-offset: 3px;
  }
</style>

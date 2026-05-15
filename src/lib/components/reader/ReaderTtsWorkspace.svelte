<!-- Ownership: this reader surface explains one part of the reading workflow
 to the user. It may render state from the route or helper modules, but it should
 not silently become a second owner of persistence or route semantics. -->
<script lang="ts">
  import ReaderPlaybackPanel from './ReaderPlaybackPanel.svelte';
  import type {
    ReaderPlaybackQueueSummary,
    ReaderTtsReadAloudTextMode,
    ReaderTtsSessionState,
    ReaderTtsSpeechTarget
  } from '$lib/reader';
  import {
    getReaderTtsPlaybackLocationSummary,
    getReaderTtsPrimaryActionLabel,
    getReaderTtsReadableSourceLabel,
    getReaderTtsReadableTargetLabel,
    getReaderTtsSessionStatusLabel,
    getReaderTtsStatusDetail
  } from '$lib/reader';

  export let ttsSession: ReaderTtsSessionState;
  export let target: ReaderTtsSpeechTarget | null = null;
  export let followsCurrentLocation = true;
  export let readAloudTextMode: ReaderTtsReadAloudTextMode = 'source';
  export let canJumpToCurrentTtsLocation = false;
  export let fallbackPlaybackLocationSummary = '';
  export let translatedTtsSourceKind: 'none' | 'live-translation' | 'archived-translation' = 'none';
  export let translatedWaitingSourceLabel = '';
  export let translatedWaitingSourceText = '';
  export let translationModeSourceText = '';
  export let translationModeSourceLabel = '';
  export let translationModeFollowsCurrent = true;
  export let playbackSummary: ReaderPlaybackQueueSummary;
  export let playbackSupportsSegmentNavigation = false;
  export let canGoToPreviousPlaybackSegment = false;
  export let canGoToNextPlaybackSegment = false;
  export let playbackVoiceCapabilityLabel = '当前浏览器没有暴露可选语音列表。';
  export let playbackSelectedVoiceLabel = '';
  export let onStart: (() => void) | null = null;
  export let onPause: (() => void) | null = null;
  export let onResume: (() => void) | null = null;
  export let onStop: (() => void) | null = null;
  export let onPinCurrentTarget: (() => void) | null = null;
  export let onResumeFollowingCurrent: (() => void) | null = null;
  export let onJumpToCurrentTtsLocation: (() => void) | null = null;
  export let onSetReadAloudTextMode: ((mode: ReaderTtsReadAloudTextMode) => void) | null = null;
  export let onOpenTranslationMode: (() => void) | null = null;
  export let onGoToPreviousPlaybackSegment: (() => void) | null = null;
  export let onGoToNextPlaybackSegment: (() => void) | null = null;
  export let onSetPlaybackRate: ((rate: number) => void) | null = null;
  export let onTogglePlaybackTimeout: (() => void) | null = null;

  $: ttsStatusLabel = getReaderTtsSessionStatusLabel(ttsSession);
  $: ttsStatusDetail = getReaderTtsStatusDetail(ttsSession);
  $: ttsPrimaryActionLabel = getReaderTtsPrimaryActionLabel(ttsSession);
  $: ttsSourceLabel = getReaderTtsReadableSourceLabel(ttsSession);
  $: ttsTargetLabel = getReaderTtsReadableTargetLabel(ttsSession);
  $: ttsFollowLabel = followsCurrentLocation ? '跟随当前阅读位置' : '已锁定朗读目标';
  $: playbackLocationSummary = getReaderTtsPlaybackLocationSummary(ttsSession);
  $: normalizedFallbackPlaybackLocationSummary = fallbackPlaybackLocationSummary.trim();
  $: effectivePlaybackLocationSummary =
    playbackLocationSummary ||
    (readAloudTextMode === 'translated' ? normalizedFallbackPlaybackLocationSummary : '');
  $: ttsPlaybackLocationDetail = effectivePlaybackLocationSummary
    ? canJumpToCurrentTtsLocation
      ? `已固定到较早的朗读位置 · ${effectivePlaybackLocationSummary}`
      : followsCurrentLocation
        ? effectivePlaybackLocationSummary
        : `已固定朗读位置 · ${effectivePlaybackLocationSummary}`
    : '';
  $: playbackOwnershipLabel = followsCurrentLocation
    ? '正在跟随当前阅读位置'
    : canJumpToCurrentTtsLocation
      ? '已固定到较早的朗读位置'
      : '已固定当前朗读位置';
  $: readAloudTextModeLabel = readAloudTextMode === 'translated' ? '译文朗读' : '原文朗读';
  $: canStop = ttsSession.status === 'speaking' || ttsSession.status === 'paused';
  $: hasTarget = !!target?.text.trim();
  $: normalizedTranslatedWaitingSourceLabel = translatedWaitingSourceLabel.trim();
  $: normalizedTranslatedWaitingSourceText = translatedWaitingSourceText.trim();
  $: normalizedTranslationModeSourceText = translationModeSourceText.trim();
  $: translatedSourceContextLabel =
    normalizedTranslatedWaitingSourceLabel ||
    (normalizedTranslationModeSourceText
      ? translationModeFollowsCurrent
        ? `正在跟随${translationModeSourceLabel.trim() || '当前阅读位置'}`
        : `已锁定${translationModeSourceLabel.trim() || '当前翻译目标'}`
      : '');
  $: translatedSourceContextText =
    normalizedTranslatedWaitingSourceText || normalizedTranslationModeSourceText;
  $: translatedTtsSourceSummary =
    translatedTtsSourceKind === 'archived-translation'
      ? '正在复用已选中的历史译文来源。'
      : translatedTtsSourceKind === 'live-translation' || normalizedTranslationModeSourceText
        ? '正在等待当前翻译阅读来源产出译文结果。'
        : '当前还没有可用于译文朗读的翻译来源。';
  $: effectivePlaybackOwnershipLabel =
    effectivePlaybackLocationSummary && !playbackLocationSummary && readAloudTextMode === 'translated'
      ? translatedSourceContextLabel ||
        (translationModeFollowsCurrent ? '正在跟随当前阅读位置' : '已锁定当前翻译目标')
      : playbackOwnershipLabel;
  // Dedicated TTS mode and the mini playback bar intentionally share playback
  // provenance semantics. If their labels/actions diverge, the reader starts showing
  // conflicting ownership on the same active session.

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
    <span>{readAloudTextModeLabel}</span>
    <span>{ttsTargetLabel || '没有可朗读目标'}</span>
    <span>{effectivePlaybackLocationSummary || '朗读位置待定'}</span>
  </div>

  <ReaderPlaybackPanel
    summary={playbackSummary}
    {readAloudTextMode}
    supportsSegmentNavigation={playbackSupportsSegmentNavigation}
    canGoPrevious={canGoToPreviousPlaybackSegment}
    canGoNext={canGoToNextPlaybackSegment}
    canRunPrimaryAction={hasTarget && ttsSession.status !== 'unavailable'}
    {canStop}
    {followsCurrentLocation}
    {hasTarget}
    {canJumpToCurrentTtsLocation}
    voiceCapabilityLabel={playbackVoiceCapabilityLabel}
    selectedVoiceLabel={playbackSelectedVoiceLabel}
    primaryActionLabel={ttsPrimaryActionLabel}
    onPrevious={onGoToPreviousPlaybackSegment}
    onNext={onGoToNextPlaybackSegment}
    onRunPrimaryAction={runPrimaryAction}
    {onStop}
    onPinCurrentTarget={onPinCurrentTarget}
    onResumeFollowingCurrent={onResumeFollowingCurrent}
    onJumpToCurrentTtsLocation={onJumpToCurrentTtsLocation}
    onSetReadAloudTextMode={onSetReadAloudTextMode}
    onSetRate={onSetPlaybackRate}
    onToggleTimeout={onTogglePlaybackTimeout}
  />

  <div class="tts-panels">
    <article class="tts-panel">
      <strong>当前朗读目标</strong>
      <span>
        {#if readAloudTextMode === 'translated'}
          {ttsSourceLabel || translatedSourceContextLabel || '等待当前翻译结果提供译文朗读目标。'}
        {:else}
          {ttsSourceLabel || '等待正文、选区或章节提供朗读目标。'}
        {/if}
      </span>
      <p>
        {#if target?.text}
          {target.text}
        {:else if readAloudTextMode === 'translated'}
          {translatedSourceContextText || '当前还没有可朗读的译文结果。'}
        {:else}
          当前没有可朗读内容。
        {/if}
      </p>
    </article>
    <article class="tts-panel" aria-label="朗读位置">
      <strong>朗读位置</strong>
      <span>{effectivePlaybackOwnershipLabel}</span>
      <p>{effectivePlaybackLocationSummary || '当前这段朗读还没有可显示的位置摘要。'}</p>
    </article>
    {#if readAloudTextMode === 'translated'}
      <article class="tts-panel" aria-label="译文朗读来源">
        <strong>译文来源</strong>
        <span>
          {translatedSourceContextLabel ||
            (translatedTtsSourceKind === 'archived-translation'
              ? '历史译文来源'
              : translatedTtsSourceKind === 'live-translation' || normalizedTranslationModeSourceText
                ? '当前翻译阅读来源'
                : '暂无译文来源')}
        </span>
        <p>{translatedSourceContextText || translatedTtsSourceSummary}</p>
        {#if translatedTtsSourceKind !== 'none' || normalizedTranslationModeSourceText}
          <button type="button" class="ghost-action provenance-action" on:click={() => onOpenTranslationMode?.()}>
            在翻译模式中查看
          </button>
        {/if}
      </article>
    {/if}
    <article class="tts-panel">
      <strong>会话状态</strong>
      <span>{ttsStatusDetail}</span>
      <p>
        {#if canJumpToCurrentTtsLocation}
          当前阅读已经离开朗读位置，可以直接回到朗读停留处继续跟读。
        {:else if followsCurrentLocation}
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

  .ghost-action {
    min-height: 34px;
    border: 1px solid var(--border-light);
    border-radius: 999px;
    font: 700 12px/1 var(--font-chrome);
    letter-spacing: 0.04em;
    padding: 0 12px;
    cursor: pointer;
  }

  .ghost-action {
    background: color-mix(in srgb, var(--surface-reader) 88%, white 12%);
    color: var(--text-secondary);
  }

  .ghost-action:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .tts-panels {
    display: grid;
    gap: 10px;
  }

  .provenance-action {
    justify-self: start;
  }

  .ghost-action:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent-warm, #8c6a3b) 72%, white 28%);
    outline-offset: 3px;
  }
</style>

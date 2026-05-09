<script lang="ts">
  export let statusLabel = '空闲';
  export let contextSummary = '';
  export let targetLabel = '';
  export let locationSummary = '';
  export let primaryActionLabel = '开始朗读';
  export let canRunPrimaryAction = false;
  export let canStop = false;
  export let canJumpToPlaybackLocation = false;
  export let canOpenTranslationMode = false;
  export let onRunPrimaryAction: (() => void) | null = null;
  export let onStop: (() => void) | null = null;
  export let onOpenWorkspace: (() => void) | null = null;
  export let onJumpToPlaybackLocation: (() => void) | null = null;
  export let onOpenTranslationMode: (() => void) | null = null;
</script>

<section class="tts-mini-bar" aria-label="阅读中的朗读控制条">
  <div class="mini-copy">
    <strong>朗读中枢</strong>
    <span>{statusLabel}</span>
    <span>{contextSummary || '朗读模式待定'}</span>
    <span>{targetLabel || '没有可朗读目标'}</span>
    <span>{locationSummary || '朗读位置待定'}</span>
  </div>

  <div class="mini-actions">
    <button type="button" class="ghost-action" aria-label="打开朗读工作台" on:click={() => onOpenWorkspace?.()}>
      打开朗读工作台
    </button>
    {#if canOpenTranslationMode}
      <button
        type="button"
        class="ghost-action"
        aria-label="在翻译模式中查看"
        on:click={() => onOpenTranslationMode?.()}
      >
        在翻译模式中查看
      </button>
    {/if}
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
        停止
      </button>
    {/if}
    {#if canJumpToPlaybackLocation}
      <button type="button" class="ghost-action" on:click={() => onJumpToPlaybackLocation?.()}>
        回到朗读位置
      </button>
    {/if}
  </div>
</section>

<style>
  .tts-mini-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    border: 1px solid var(--reader-shell-border, var(--border-light));
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: 0 8px 22px rgba(36, 24, 12, 0.08);
  }

  .mini-copy {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
    align-items: center;
  }

  .mini-copy strong,
  .mini-copy span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mini-copy strong {
    color: var(--text-primary);
    font: 700 12px/1 var(--font-chrome);
    letter-spacing: 0.06em;
  }

  .mini-copy span {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.4;
  }

  .mini-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }

  .primary-action,
  .ghost-action {
    min-height: 32px;
    border: 1px solid var(--border-light);
    border-radius: 999px;
    font: 700 12px/1 var(--font-chrome);
    letter-spacing: 0.04em;
    padding: 0 12px;
    cursor: pointer;
  }

  .primary-action {
    background: color-mix(in srgb, var(--accent-warm, #8c6a3b) 18%, var(--surface-reader) 82%);
    color: color-mix(in srgb, var(--accent-warm, #8c6a3b) 78%, black 22%);
  }

  .ghost-action {
    background: color-mix(in srgb, var(--surface-reader) 88%, white 12%);
    color: var(--text-secondary);
  }

  .primary-action:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  @media (max-width: 900px) {
    .tts-mini-bar {
      align-items: stretch;
      flex-direction: column;
    }

    .mini-actions {
      justify-content: flex-start;
    }
  }
</style>

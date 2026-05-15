<!-- Ownership: this layer presents route-owned inline translation state. It does
 not call translation providers or mutate reader renderer DOM. -->
<script lang="ts">
  import {
    getReaderTranslationProviderDisplayLabel,
    type ReaderInlineTranslationState
  } from '$lib/reader';

  export let state: ReaderInlineTranslationState;
  export let summary = '';
  export let statusMessage = '等待可翻译正文。';
  export let capabilityMessage = '';
  export let onToggleEnabled: (() => void) | null = null;
  export let onToggleSourceVisibility: (() => void) | null = null;
  export let onToggleTranslationVisibility: (() => void) | null = null;

  $: providerLabel = getReaderTranslationProviderDisplayLabel(state.provider);
  $: languageLabel = state.targetLanguage.toUpperCase();
  $: currentStatus =
    statusMessage ||
    summary ||
    (state.enabled ? '等待可翻译正文。' : '正文内译文尚未开启。');
  $: previewBlocks = state.blocks.slice(0, 2);
</script>

<section class:enabled={state.enabled} class="inline-translation-layer" aria-label="正文内译文">
  <div class="inline-translation-card">
    <header>
      <div>
        <span class="eyebrow">INLINE TRANSLATION</span>
        <h2>正文内译文</h2>
      </div>
      <span class:enabled={state.enabled} class="mode-pill">
        {state.enabled ? '已开启' : '未开启'}
      </span>
    </header>

    <div class="inline-status" role="region" aria-label="正文内译文状态" aria-live="polite">
      <strong>{currentStatus}</strong>
      <span>{providerLabel} · 翻译为 {languageLabel} · {state.blocks.length} 段候选</span>
      {#if capabilityMessage}
        <p>{capabilityMessage}</p>
      {/if}
      {#if state.enabled && summary}
        <p>{summary}</p>
      {/if}
    </div>

    <div class="inline-actions" aria-label="正文内译文控制">
      <button type="button" class="primary-action" on:click={() => onToggleEnabled?.()}>
        {state.enabled ? '关闭正文内译文' : '开启正文内译文'}
      </button>
      {#if state.enabled}
        <button
          type="button"
          aria-pressed={state.showSource}
          on:click={() => onToggleSourceVisibility?.()}
        >
          {state.showSource ? '隐藏原文' : '显示原文'}
        </button>
        <button
          type="button"
          aria-pressed={state.showTranslation}
          on:click={() => onToggleTranslationVisibility?.()}
        >
          {state.showTranslation ? '隐藏译文' : '显示译文'}
        </button>
      {/if}
    </div>

    {#if state.enabled && previewBlocks.length}
      <div class="inline-previews" aria-label="正文内译文候选预览">
        {#each previewBlocks as block}
          <article class="inline-preview">
            <span>{block.sourceLabel || '当前正文'} · {block.status}</span>
            {#if state.showSource}
              <p>{block.sourceText}</p>
            {/if}
            {#if state.showTranslation}
              <p class="translation">
                {block.translatedText || (block.status === 'error' ? block.error : '译文等待 provider 工作流写入。')}
              </p>
            {/if}
          </article>
        {/each}
      </div>
    {:else}
      <p class="empty-copy">
        {state.enabled ? '等待可翻译正文。翻页、滚动或打开支持的正文格式后会刷新候选。' : '开启后只会读取当前视窗已经公开给 reader 的安全正文摘录。'}
      </p>
    {/if}
  </div>
</section>

<style>
  .inline-translation-layer {
    position: absolute;
    right: clamp(12px, 3vw, 28px);
    bottom: clamp(54px, 8vh, 82px);
    z-index: 5;
    display: grid;
    justify-items: end;
    pointer-events: none;
  }

  .inline-translation-layer.enabled {
    left: clamp(12px, 3vw, 28px);
    justify-items: center;
  }

  .inline-translation-card {
    display: grid;
    gap: 12px;
    width: min(100%, 340px);
    padding: 14px;
    border: 1px solid color-mix(in srgb, var(--reader-shell-border, rgba(80, 58, 28, 0.14)) 88%, transparent);
    border-radius: 20px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0.32)),
      color-mix(in srgb, var(--reader-shell-raised, #fbf5e9) 88%, white 12%);
    box-shadow: 0 18px 36px color-mix(in srgb, var(--reader-shell-shadow, rgba(34, 24, 12, 0.1)) 78%, transparent);
    color: var(--reader-shell-text, #2b241a);
    pointer-events: auto;
    backdrop-filter: blur(14px);
  }

  .inline-translation-layer.enabled .inline-translation-card {
    width: min(100%, 620px);
  }

  .inline-translation-layer:not(.enabled) .inline-status,
  .inline-translation-layer:not(.enabled) .empty-copy {
    display: none;
  }

  header,
  .inline-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .eyebrow,
  .mode-pill,
  .inline-status span,
  .inline-preview span {
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 11px;
    color: var(--reader-shell-muted, #78644a);
  }

  h2 {
    margin: 2px 0 0;
    font-size: 17px;
    line-height: 1.2;
  }

  .mode-pill {
    padding: 6px 9px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--reader-shell-border, rgba(80, 58, 28, 0.14)) 82%, transparent);
  }

  .mode-pill.enabled {
    color: color-mix(in srgb, var(--reader-shell-accent, #7b5b2e) 88%, black 12%);
    background: color-mix(in srgb, var(--reader-shell-accent, #7b5b2e) 12%, transparent);
  }

  .inline-status {
    display: grid;
    gap: 4px;
  }

  .inline-status strong {
    font-size: 14px;
  }

  .inline-status p,
  .empty-copy,
  .inline-preview p {
    margin: 0;
    color: var(--reader-shell-muted, #6f604e);
    font-size: 12px;
    line-height: 1.55;
  }

  .inline-actions {
    justify-content: start;
    flex-wrap: wrap;
  }

  button {
    border: 1px solid color-mix(in srgb, var(--reader-shell-border, rgba(80, 58, 28, 0.14)) 86%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--reader-shell-raised, #fff9ef) 90%, white 10%);
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    padding: 7px 10px;
  }

  button.primary-action {
    background: color-mix(in srgb, var(--reader-shell-accent, #7b5b2e) 18%, white 82%);
  }

  .inline-previews {
    display: grid;
    gap: 8px;
  }

  .inline-preview {
    display: grid;
    gap: 4px;
    padding: 9px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.32);
  }

  .inline-preview .translation {
    color: color-mix(in srgb, var(--reader-shell-text, #2b241a) 78%, var(--reader-shell-accent, #7b5b2e) 22%);
  }
</style>

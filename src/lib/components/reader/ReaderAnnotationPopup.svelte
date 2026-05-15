<script lang="ts">
  export let visible = false;
  export let placement: 'selection' | 'bottom-center' = 'bottom-center';
  export let position: { top: number; left: number } | null = null;
  export let selectionSummary = '';
  export let selectionDetail = '';
  export let supportsAnnotationActions = true;
  export let supportMessage = '';
  export let onHighlight: (() => void) | null = null;
  export let onNote: (() => void) | null = null;
  export let onLookup: (() => void) | null = null;
  export let onTranslate: (() => void) | null = null;
  export let onTts: (() => void) | null = null;
  export let onCopy: (() => void) | null = null;

  const getPopupStyle = () => {
    if (!position) return 'display:none;';
    return `top:${position.top}px;left:${position.left}px;`;
  };
</script>

{#if visible && position}
  <div
    class:selection-placement={placement === 'selection'}
    class:bottom-center-placement={placement === 'bottom-center'}
    class="annotation-popup"
    role="toolbar"
    aria-label="选中文本操作"
    style={getPopupStyle()}
  >
    <div class="selection-copy">
      <strong>已选文本</strong>
      <span>{selectionSummary}</span>
      {#if selectionDetail}
        <small>{selectionDetail}</small>
      {/if}
    </div>

    {#if !supportsAnnotationActions && supportMessage}
      <p class="support-copy">{supportMessage}</p>
    {/if}

    <div class="action-row">
      {#if supportsAnnotationActions}
        <button type="button" on:click={() => onHighlight?.()}>高亮</button>
        <button type="button" on:click={() => onNote?.()}>笔记</button>
        <button type="button" on:click={() => onLookup?.()}>查找</button>
        <button type="button" on:click={() => onTranslate?.()}>翻译</button>
        <button type="button" on:click={() => onTts?.()}>朗读</button>
      {/if}
      <button type="button" on:click={() => onCopy?.()}>复制</button>
    </div>
  </div>
{/if}

<style>
  .annotation-popup {
    position: fixed;
    z-index: 60;
    display: grid;
    gap: 10px;
    width: min(520px, calc(100vw - 24px));
    padding: 14px 16px;
    border: 1px solid color-mix(in srgb, var(--reader-shell-border, rgba(15, 23, 42, 0.2)) 76%, transparent);
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(248, 244, 235, 0.95)),
      var(--reader-paper-bg, #fffdf8);
    box-shadow:
      0 22px 52px rgba(15, 23, 42, 0.18),
      0 8px 20px rgba(15, 23, 42, 0.08);
    color: var(--reader-shell-text, var(--text-primary));
    box-sizing: border-box;
  }

  .annotation-popup.selection-placement {
    transform: translate(-50%, calc(-100% - 10px));
  }

  .annotation-popup.bottom-center-placement {
    transform: translate(-50%, -100%);
  }

  .selection-copy {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .selection-copy strong {
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--reader-shell-muted, var(--text-muted));
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .selection-copy span {
    display: -webkit-box;
    overflow: hidden;
    line-height: 1.5;
    word-break: break-word;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .selection-copy small,
  .support-copy {
    margin: 0;
    color: var(--reader-shell-muted, var(--text-muted));
    line-height: 1.45;
    font-size: 13px;
  }

  .action-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .action-row button {
    border: 1px solid color-mix(in srgb, var(--reader-shell-border, rgba(15, 23, 42, 0.2)) 72%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--reader-paper-bg, #fffdf8) 88%, white 12%);
    color: var(--reader-shell-text, var(--text-primary));
    padding: 8px 12px;
    font: inherit;
    line-height: 1.2;
    cursor: pointer;
    transition:
      transform 120ms ease,
      border-color 120ms ease,
      background-color 120ms ease;
  }

  .action-row button:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--reader-shell-accent, #215d4f) 42%, white 58%);
    background: color-mix(in srgb, var(--reader-shell-accent, #215d4f) 10%, white 90%);
  }

  .action-row button:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--reader-shell-accent, #215d4f) 58%, white 42%);
    outline-offset: 2px;
  }

  @media (max-width: 720px) {
    .annotation-popup {
      width: min(100vw - 16px, 100%);
      padding: 12px 14px;
      border-radius: 16px;
    }

    .annotation-popup.selection-placement {
      transform: translate(-50%, calc(-100% - 8px));
    }
  }
</style>

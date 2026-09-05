<!-- Ownership: this popup only presents the intercepted footnote payload. The
 stage still decides whether to close or jump, so navigation policy stays in one
 reader coordination layer. -->
<script lang="ts">
  export let visible = false;
  export let label = '脚注';
  export let excerptHtml = '';
  export let excerptText = '';
  export let fallbackHref = '';
  export let onClose: (() => void) | null = null;
  export let onJump: (() => void) | null = null;
  export let onSelection: ((root: Element, range: Range | null) => void) | null = null;
  let previewRoot: HTMLDivElement | null = null;

  const handleSelectionChange = () => {
    if (!visible || !previewRoot) return;
    const selection = previewRoot.ownerDocument.getSelection();
    const range = selection?.rangeCount === 1 && !selection.isCollapsed ? selection.getRangeAt(0) : null;
    onSelection?.(previewRoot, range && previewRoot.contains(range.startContainer) &&
      previewRoot.contains(range.endContainer) ? range.cloneRange() : null);
  };

  $: hasPreview = !!excerptHtml.trim() || !!excerptText.trim();
</script>

<svelte:document on:selectionchange={handleSelectionChange} />

{#if visible}
  <div class="footnote-popup" role="dialog" aria-modal="false" aria-label="脚注预览">
    <div class="popup-copy">
      <strong>脚注预览</strong>
      <span>{label}</span>
    </div>

    {#if hasPreview}
      <div class="footnote-body" bind:this={previewRoot}>
        {#if excerptHtml}
          {@html excerptHtml}
        {:else}
          <p>{excerptText}</p>
        {/if}
      </div>
    {:else}
      <p class="footnote-fallback">{fallbackHref.trim() ? '无法预览，可跳转到正文位置' : '无法预览'}</p>
    {/if}

    <div class="popup-actions">
      <button type="button" class="primary-action" on:click={() => onClose?.()}>关闭脚注</button>
      {#if fallbackHref.trim()}
        <button type="button" on:click={() => onJump?.()}>跳转到正文位置</button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .footnote-popup {
    position: absolute;
    right: 18px;
    bottom: 18px;
    z-index: 36;
    display: grid;
    gap: 12px;
    width: min(420px, calc(100% - 24px));
    padding: 16px;
    border: 1px solid color-mix(in srgb, var(--reader-shell-border, rgba(84, 62, 34, 0.16)) 90%, white 10%);
    border-radius: 20px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--reader-shell-panel, #fffaf0) 95%, white 5%);
    box-shadow:
      0 18px 40px color-mix(in srgb, var(--reader-shell-shadow, rgba(36, 25, 12, 0.18)) 78%, transparent 22%),
      inset 0 1px 0 rgba(255, 255, 255, 0.72);
    color: var(--reader-shell-text, #2d2418);
  }

  .popup-copy {
    display: grid;
    gap: 4px;
  }

  .popup-copy strong {
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--reader-shell-accent, #7a5730);
  }

  .popup-copy span,
  .footnote-fallback {
    margin: 0;
    color: var(--reader-shell-muted, #6c5a45);
    font-size: 13px;
    line-height: 1.55;
  }

  .footnote-body {
    max-height: min(38vh, 260px);
    overflow: auto;
    display: grid;
    gap: 8px;
    font-size: 15px;
    line-height: 1.65;
  }

  .footnote-body :global(p),
  .footnote-body :global(li) {
    margin: 0;
  }

  .popup-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .popup-actions button {
    border: 1px solid color-mix(in srgb, var(--reader-shell-border, rgba(84, 62, 34, 0.16)) 90%, white 10%);
    border-radius: 999px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.78);
    color: var(--reader-shell-text, #2d2418);
    font: inherit;
    cursor: pointer;
  }

  .popup-actions button.primary-action {
    background: color-mix(in srgb, var(--reader-shell-accent, #8c6a3b) 14%, white 86%);
    border-color: color-mix(in srgb, var(--reader-shell-accent, #8c6a3b) 36%, white 64%);
  }

  @media (max-width: 720px) {
    .footnote-popup {
      right: 10px;
      left: 10px;
      bottom: 10px;
      width: auto;
    }
  }
</style>

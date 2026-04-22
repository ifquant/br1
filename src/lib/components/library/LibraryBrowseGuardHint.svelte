<script lang="ts">
  export let reasonLabels: string[] = [];
  export let prefix = '当前部分浏览入口暂不可用';

  $: visibleReasonLabels = Array.from(
    new Set(
      reasonLabels
        .map((label) => label.trim())
        .filter(Boolean)
    )
  );
</script>

{#if visibleReasonLabels.length > 0}
  <div class="browse-guard-hint" aria-live="polite">
    <strong>{prefix}</strong>
    <span>{visibleReasonLabels[0]}</span>
  </div>
{/if}

<style>
  .browse-guard-hint {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, #8c6a3b 18%, var(--line-soft) 82%);
    background: color-mix(in srgb, #f3e6d1 42%, white 58%);
  }

  .browse-guard-hint strong {
    color: var(--text-primary);
    font: 600 11px/1.2 var(--font-chrome);
  }

  .browse-guard-hint span {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
  }
</style>

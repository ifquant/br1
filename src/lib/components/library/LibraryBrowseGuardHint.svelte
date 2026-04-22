<script lang="ts">
  import type { LibraryBrowseGuardExplanation } from '$lib/library/types';

  export let explanations: LibraryBrowseGuardExplanation[] = [];
  export let heading = '当前部分浏览入口暂不可用';

  $: visibleExplanations = Array.from(
    explanations.reduce((entries, explanation) => {
      const title = explanation.title.trim();
      const detail = explanation.detail.trim();
      if (!title || !detail) return entries;
      const key = `${title}::${detail}`;
      if (entries.some((entry) => entry.key === key)) return entries;
      entries.push({ key, title, detail });
      return entries;
    }, [] as Array<{ key: string; title: string; detail: string }>)
  );
</script>

{#if visibleExplanations.length > 0}
  <div class="browse-guard-hint" aria-live="polite">
    <strong>{heading}</strong>
    <div class="browse-guard-hint-list">
      {#each visibleExplanations.slice(0, 2) as explanation}
        <div class="browse-guard-hint-item">
          <span class="browse-guard-hint-title">{explanation.title}</span>
          <span>{explanation.detail}</span>
        </div>
      {/each}
    </div>
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

  .browse-guard-hint-list {
    display: grid;
    gap: 6px;
  }

  .browse-guard-hint-item {
    display: grid;
    gap: 2px;
  }

  .browse-guard-hint-title {
    color: var(--text-primary);
    font: 600 11px/1.2 var(--font-chrome);
  }

  .browse-guard-hint span {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
  }
</style>

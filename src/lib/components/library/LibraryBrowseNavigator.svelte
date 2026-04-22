<script lang="ts">
  export let eyebrow = '当前浏览导航';
  export let title = '';
  export let summary = '';
  export let trail: Array<{
    groupBy: 'author' | 'collection' | 'format';
    label: string;
  }> = [];
  export let currentGroupBy: 'author' | 'collection' | 'format' = 'author';
  export let currentGroupLabel = '';
  export let siblings: Array<{ label: string; count: number }> = [];
  export let pivots: Array<{
    title: string;
    items: Array<{
      label: string;
      value: string;
      groupBy: 'author' | 'collection' | 'format';
    }>;
  }> = [];
  export let onJumpTrail: ((index: number) => void | Promise<void>) | null = null;
  export let onSelectSibling:
    | ((label: string, groupBy: 'author' | 'collection' | 'format') => void | Promise<void>)
    | null = null;
  export let onSelectPivot:
    | ((groupBy: 'author' | 'collection' | 'format', value: string) => void | Promise<void>)
    | null = null;

  const getGroupByLabel = (groupBy: 'author' | 'collection' | 'format') =>
    groupBy === 'author' ? '作者' : groupBy === 'collection' ? '归类' : '格式';
</script>

<section class="group-browse-navigator" aria-label="当前分组浏览导航">
  <div class="group-browse-navigator-copy">
    <span class="group-browse-eyebrow">{eyebrow}</span>
    <strong>{title}</strong>
    <p>{summary}</p>
  </div>
  <div class="group-browse-navigator-sections">
    <div class="group-browse-navigator-section">
      <span class="group-browse-navigator-title">当前路径</span>
      <div class="group-browse-navigator-list">
        {#each trail as segment, index}
          <button
            type="button"
            class="group-browse-navigator-chip"
            on:click={() => onJumpTrail && onJumpTrail(index)}
          >
            <strong>{segment.label}</strong>
            <small>{getGroupByLabel(segment.groupBy)}</small>
          </button>
        {/each}
        <span class="group-browse-navigator-chip current">
          <strong>{currentGroupLabel}</strong>
          <small>{getGroupByLabel(currentGroupBy)}</small>
        </span>
      </div>
    </div>

    {#if siblings.length > 0}
      <div class="group-browse-navigator-section">
        <span class="group-browse-navigator-title">同层切换</span>
        <div class="group-browse-navigator-list">
          {#each siblings as sibling}
            <button
              type="button"
              class="group-browse-navigator-chip"
              on:click={() => onSelectSibling && onSelectSibling(sibling.label, currentGroupBy)}
            >
              <strong>{sibling.label}</strong>
              <small>{sibling.count} 本</small>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if pivots.some((section) => section.items.length > 0)}
      <div class="group-browse-navigator-section">
        <span class="group-browse-navigator-title">跨维继续看</span>
        <div class="group-browse-navigator-list">
          {#each pivots as section}
            {#each section.items as item}
              <button
                type="button"
                class="group-browse-navigator-chip"
                on:click={() => onSelectPivot && onSelectPivot(item.groupBy, item.value)}
              >
                <strong>{item.value}</strong>
                <small>{section.title} · {item.label}</small>
              </button>
            {/each}
          {/each}
        </div>
      </div>
    {/if}
  </div>
</section>

<style>
  .group-browse-navigator {
    display: grid;
    gap: 14px;
    padding: 16px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 84%, white 16%);
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 86%, white 14%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.24),
      0 10px 24px rgba(42, 30, 15, 0.05);
  }

  .group-browse-navigator-copy {
    display: grid;
    gap: 5px;
    min-width: 0;
  }

  .group-browse-eyebrow {
    color: var(--text-muted);
    font: 700 10px/1 var(--font-chrome);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .group-browse-navigator-copy strong {
    color: var(--text-primary);
    font: 600 16px/1.2 var(--font-chrome);
  }

  .group-browse-navigator-copy p {
    margin: 0;
    max-width: 60ch;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
  }

  .group-browse-navigator-sections {
    display: grid;
    gap: 12px;
  }

  .group-browse-navigator-section {
    display: grid;
    gap: 8px;
  }

  .group-browse-navigator-title {
    color: var(--text-muted);
    font: 600 10px/1 var(--font-chrome);
    letter-spacing: 0.04em;
  }

  .group-browse-navigator-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .group-browse-navigator-chip {
    display: inline-grid;
    gap: 4px;
    justify-items: start;
    width: auto;
    min-height: 0;
    padding: 9px 11px;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 82%, white 18%);
    background: color-mix(in srgb, var(--surface-reader) 78%, white 22%);
    box-shadow: 0 8px 20px rgba(42, 30, 15, 0.04);
  }

  .group-browse-navigator-chip.current {
    box-shadow: inset 0 0 0 1px color-mix(in srgb, #8c6a3b 24%, white 76%);
    background: color-mix(in srgb, #ead5b7 22%, white 78%);
  }

  .group-browse-navigator-chip:hover {
    border-color: color-mix(in srgb, #8c6a3b 24%, var(--line-soft) 76%);
    background: color-mix(in srgb, var(--surface-reader) 68%, white 32%);
  }

  .group-browse-navigator-chip strong {
    color: var(--text-primary);
    font: 600 12px/1.2 var(--font-chrome);
  }

  .group-browse-navigator-chip small {
    color: var(--text-muted);
    font: 600 10px/1 var(--font-chrome);
  }
</style>

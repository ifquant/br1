<script lang="ts">
  import LibraryBrowseGuardHint from './LibraryBrowseGuardHint.svelte';
  import type {
    ActiveLibraryGroupOverview,
    LibraryBrowseGuardExplanation,
    LibraryGroupBy
  } from '$lib/library/types';

  export let overview: ActiveLibraryGroupOverview;
  export let groupBy: LibraryGroupBy;
  export let siblingGroups: Array<{ label: string; count: number }> = [];
  export let siblingGuardExplanations: LibraryBrowseGuardExplanation[] = [];
  export let pivotGuardExplanations: LibraryBrowseGuardExplanation[] = [];
  export let isSiblingAvailable: (label: string, groupBy: LibraryGroupBy) => boolean;
  export let getSiblingReasonLabel: (label: string, groupBy: LibraryGroupBy) => string;
  export let onSelectSibling: (label: string, groupBy: LibraryGroupBy) => void | Promise<void>;
  export let isPivotAvailable: (groupBy: LibraryGroupBy, value: string) => boolean;
  export let getPivotReasonLabel: (groupBy: LibraryGroupBy, value: string) => string;
  export let onSelectPivot: (groupBy: LibraryGroupBy, value: string) => void | Promise<void>;
</script>

<section class="group-browse-overview" aria-label={`${overview.title} 分组概览`}>
  <div class="group-browse-copy">
    <span class="group-browse-eyebrow">{overview.eyebrow}</span>
    <strong>{overview.title}</strong>
    <p>{overview.summary}</p>
  </div>
  <div class="group-browse-metrics">
    {#each overview.metrics as metric}
      <div class="group-browse-metric">
        <span>{metric.label}</span>
        <strong>{metric.value}</strong>
      </div>
    {/each}
  </div>
  {#if siblingGroups.length > 0}
    <div class="group-browse-sibling-graph">
      <span class="group-browse-sibling-title">同层其它分组</span>
      <LibraryBrowseGuardHint
        explanations={siblingGuardExplanations}
        heading="当前组的同层切换里有暂不可用的入口"
      />
      <div class="group-browse-sibling-list">
        {#each siblingGroups as sibling}
          <button
            type="button"
            class="group-browse-sibling"
            disabled={!isSiblingAvailable(sibling.label, groupBy)}
            title={!isSiblingAvailable(sibling.label, groupBy)
              ? getSiblingReasonLabel(sibling.label, groupBy)
              : ''}
            on:click={() => onSelectSibling(sibling.label, groupBy)}
          >
            <strong>{sibling.label}</strong>
            <small>{sibling.count} 本</small>
          </button>
        {/each}
      </div>
    </div>
  {/if}
  {#if overview.pivots.some((section) => section.items.length > 0)}
    <div class="group-browse-pivots">
      <LibraryBrowseGuardHint
        explanations={pivotGuardExplanations}
        heading="当前组的跨维继续看里有暂不可用的入口"
      />
      {#each overview.pivots as section}
        {#if section.items.length > 0}
          <div class="group-browse-pivot-section">
            <span class="group-browse-pivot-title">{section.title}</span>
            <div class="group-browse-pivot-list">
              {#each section.items as item}
                <button
                  type="button"
                  class="group-browse-pivot"
                  disabled={!isPivotAvailable(item.groupBy, item.value)}
                  title={!isPivotAvailable(item.groupBy, item.value)
                    ? getPivotReasonLabel(item.groupBy, item.value)
                    : ''}
                  on:click={() => onSelectPivot(item.groupBy, item.value)}
                >
                  <strong>{item.value}</strong>
                  <small>{item.label}</small>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</section>

<style>
  .group-browse-overview {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.9fr);
    gap: 14px;
    padding: 14px 16px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 84%, white 16%);
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 88%, white 12%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.26),
      0 10px 24px rgba(42, 30, 15, 0.05);
  }

  .group-browse-copy {
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

  .group-browse-copy strong {
    color: var(--text-primary);
    font: 600 16px/1.2 var(--font-chrome);
  }

  .group-browse-copy p {
    margin: 0;
    max-width: 56ch;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.5;
  }

  .group-browse-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .group-browse-metric {
    display: grid;
    gap: 6px;
    align-content: start;
    padding: 10px 12px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--surface-reader) 80%, white 20%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--line-soft) 82%, white 18%);
  }

  .group-browse-metric span {
    color: var(--text-muted);
    font: 600 10px/1 var(--font-chrome);
    letter-spacing: 0.04em;
  }

  .group-browse-metric strong {
    color: var(--text-primary);
    font: 600 15px/1.1 var(--font-chrome);
  }

  .group-browse-sibling-graph {
    display: grid;
    gap: 8px;
    grid-column: 1 / -1;
  }

  .group-browse-sibling-title {
    color: var(--text-muted);
    font: 600 10px/1 var(--font-chrome);
    letter-spacing: 0.04em;
  }

  .group-browse-sibling-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .group-browse-sibling {
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

  .group-browse-sibling:hover {
    border-color: color-mix(in srgb, #8c6a3b 24%, var(--line-soft) 76%);
    background: color-mix(in srgb, var(--surface-reader) 68%, white 32%);
  }

  .group-browse-sibling:disabled {
    cursor: not-allowed;
    opacity: 0.56;
    box-shadow: none;
  }

  .group-browse-sibling:disabled:hover {
    border-color: color-mix(in srgb, var(--line-soft) 82%, white 18%);
    background: color-mix(in srgb, var(--surface-reader) 78%, white 22%);
  }

  .group-browse-sibling strong {
    color: var(--text-primary);
    font: 600 12px/1.2 var(--font-chrome);
  }

  .group-browse-sibling small {
    color: var(--text-muted);
    font: 600 10px/1 var(--font-chrome);
  }

  .group-browse-pivots {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    grid-column: 1 / -1;
  }

  .group-browse-pivot-section {
    display: grid;
    gap: 8px;
    align-content: start;
  }

  .group-browse-pivot-title {
    color: var(--text-muted);
    font: 600 10px/1 var(--font-chrome);
    letter-spacing: 0.04em;
  }

  .group-browse-pivot-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .group-browse-pivot {
    display: inline-grid;
    gap: 4px;
    justify-items: start;
    min-width: 0;
    padding: 9px 11px;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 82%, white 18%);
    background: color-mix(in srgb, var(--surface-reader) 78%, white 22%);
    box-shadow: 0 8px 20px rgba(42, 30, 15, 0.05);
  }

  .group-browse-pivot strong {
    color: var(--text-primary);
    font: 600 12px/1.2 var(--font-chrome);
  }

  .group-browse-pivot small {
    color: var(--text-muted);
    font: 600 10px/1 var(--font-chrome);
  }

  .group-browse-pivot:hover {
    background: color-mix(in srgb, var(--surface-reader) 68%, white 32%);
    border-color: color-mix(in srgb, #8c6a3b 24%, var(--line-soft) 76%);
  }

  .group-browse-pivot:disabled {
    cursor: not-allowed;
    opacity: 0.56;
    box-shadow: none;
  }

  .group-browse-pivot:disabled:hover {
    background: color-mix(in srgb, var(--surface-reader) 78%, white 22%);
    border-color: color-mix(in srgb, var(--line-soft) 82%, white 18%);
  }

  @media (max-width: 900px) {
    .group-browse-overview {
      grid-template-columns: 1fr;
    }

    .group-browse-pivots {
      grid-template-columns: 1fr;
    }
  }
</style>

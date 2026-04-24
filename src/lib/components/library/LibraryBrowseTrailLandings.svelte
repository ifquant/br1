<script lang="ts">
  import BookshelfPreview from './BookshelfPreview.svelte';
  import LibraryBrowseGuardHint from './LibraryBrowseGuardHint.svelte';
  import type {
    LibraryBrowseGuardExplanation,
    LibraryGroupBy,
    LibraryTrailLanding,
    LibraryShelfBook
  } from '$lib/library/types';

  export let landings: LibraryTrailLanding[] = [];
  export let viewMode: 'grid' | 'list' = 'grid';
  export let getLandingGroupBy: (landing: LibraryTrailLanding) => LibraryGroupBy;
  export let getTrailActionExplanations: (landing: LibraryTrailLanding) => LibraryBrowseGuardExplanation[];
  export let getTrailSiblingExplanations: (landing: LibraryTrailLanding) => LibraryBrowseGuardExplanation[];
  export let isJumpAvailable: (index: number) => boolean;
  export let getJumpReasonLabel: (index: number) => string;
  export let onJumpTrail: (index: number) => void | Promise<void>;
  export let isSiblingAvailable: (
    label: string,
    groupBy: LibraryGroupBy,
    trailIndex: number
  ) => boolean;
  export let getSiblingReasonLabel: (
    label: string,
    groupBy: LibraryGroupBy,
    trailIndex: number
  ) => string;
  export let onSelectSibling: (
    label: string,
    groupBy: LibraryGroupBy,
    trailIndex: number
  ) => void | Promise<void>;
  export let getBlockedGroupExplanations: (
    landing: LibraryTrailLanding,
    groupBy: LibraryGroupBy
  ) => LibraryBrowseGuardExplanation[];
  export let isEnterFromTrailAvailable: (
    trailIndex: number,
    label: string,
    groupBy: LibraryGroupBy
  ) => boolean;
  export let getEnterFromTrailReasonLabel: (
    trailIndex: number,
    label: string,
    groupBy: LibraryGroupBy
  ) => string;
  export let onEnterFromTrail: (
    trailIndex: number,
    label: string,
    groupBy: LibraryGroupBy
  ) => void | Promise<void>;
  export let onOpenLink: (href: string) => void | Promise<void>;
</script>

{#if landings.length > 0}
  <section class="group-browse-trail-landing" aria-label="当前分组的祖先层级">
    {#each landings as landing}
      <div class="group-browse-trail-card">
        <div class="group-browse-trail-copy">
          <span class="group-browse-eyebrow">{landing.eyebrow}</span>
          <strong>{landing.title}</strong>
          <p>{landing.summary}</p>
          <LibraryBrowseGuardHint
            explanations={getTrailActionExplanations(landing)}
            heading="这一层的返回入口暂不可用"
          />
          <div class="group-browse-trail-actions">
            <button
              type="button"
              class="group-browse-trail-action"
              disabled={!isJumpAvailable(landing.index)}
              title={!isJumpAvailable(landing.index) ? getJumpReasonLabel(landing.index) : ''}
              on:click={() => onJumpTrail(landing.index)}
            >
              回到这一层
            </button>
          </div>
        </div>
        <div class="group-browse-trail-metrics">
          {#each landing.metrics as metric}
            <div class="group-browse-trail-metric">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          {/each}
        </div>
        {#if landing.siblingGroups.length > 0}
          <div class="group-browse-sibling-graph">
            <span class="group-browse-sibling-title">同层其它分组</span>
            <LibraryBrowseGuardHint
              explanations={getTrailSiblingExplanations(landing)}
              heading="这一层的同层切换里有暂不可用的入口"
            />
            <div class="group-browse-sibling-list">
              {#each landing.siblingGroups as sibling}
                <button
                  type="button"
                  class="group-browse-sibling"
                  disabled={!isSiblingAvailable(
                    sibling.label,
                    getLandingGroupBy(landing),
                    landing.index
                  )}
                  title={!isSiblingAvailable(
                    sibling.label,
                    getLandingGroupBy(landing),
                    landing.index
                  )
                    ? getSiblingReasonLabel(
                        sibling.label,
                        getLandingGroupBy(landing),
                        landing.index
                      )
                    : ''}
                  on:click={() =>
                    onSelectSibling(
                      sibling.label,
                      getLandingGroupBy(landing),
                      landing.index
                    )}
                >
                  <strong>{sibling.label}</strong>
                  <small>{sibling.count} 本</small>
                </button>
              {/each}
            </div>
          </div>
        {/if}
        {#if landing.subgroupShelves.length > 0}
          <div class="group-browse-trail-subgroups">
            {#each landing.subgroupShelves as subgroupShelf}
              <div class="group-browse-subgroup-shelf">
                <div class="group-browse-subgroup-copy">
                  <strong>{subgroupShelf.title}</strong>
                  <span>{subgroupShelf.description}</span>
                </div>
                <BookshelfPreview
                  sectionTitle={subgroupShelf.title}
                  books={landing.scopedBooks as LibraryShelfBook[]}
                  viewMode={viewMode}
                  groupBy={subgroupShelf.groupBy}
                  activeGroupLabel=""
                  blockedGroupExplanations={getBlockedGroupExplanations(landing, subgroupShelf.groupBy)}
                  groupEnterHintSurface="subgroup"
                  onEnterGroupAvailable={(label, nextGroupBy) =>
                    isEnterFromTrailAvailable(landing.index, label, nextGroupBy)}
                  onEnterGroupReasonLabel={(label, nextGroupBy) =>
                    getEnterFromTrailReasonLabel(landing.index, label, nextGroupBy)}
                  onEnterGroup={(label, nextGroupBy) =>
                    onEnterFromTrail(landing.index, label, nextGroupBy)}
                  onOpenLink={onOpenLink}
                />
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </section>
{/if}

<style>
  .group-browse-trail-landing {
    display: grid;
    gap: 12px;
  }

  .group-browse-trail-card {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.9fr);
    gap: 14px;
    align-items: start;
    padding: 14px 16px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 84%, white 16%);
    background: color-mix(in srgb, var(--surface-panel) 82%, white 18%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.24),
      0 10px 22px rgba(42, 30, 15, 0.04);
    text-align: left;
  }

  .group-browse-trail-copy {
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

  .group-browse-trail-copy strong {
    color: var(--text-primary);
    font: 600 15px/1.2 var(--font-chrome);
  }

  .group-browse-trail-copy p {
    margin: 0;
    max-width: 58ch;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
  }

  .group-browse-trail-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 2px;
  }

  .group-browse-trail-action {
    width: auto;
    min-height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 82%, white 18%);
    background: color-mix(in srgb, var(--surface-reader) 80%, white 20%);
    color: var(--text-primary);
    font: 600 11px/1 var(--font-chrome);
  }

  .group-browse-trail-action:hover {
    border-color: color-mix(in srgb, #8c6a3b 22%, var(--line-soft) 78%);
    background: color-mix(in srgb, var(--surface-reader) 70%, white 30%);
  }

  .group-browse-trail-action:disabled {
    cursor: not-allowed;
    opacity: 0.56;
  }

  .group-browse-trail-action:disabled:hover {
    border-color: color-mix(in srgb, var(--line-soft) 82%, white 18%);
    background: color-mix(in srgb, var(--surface-reader) 80%, white 20%);
  }

  .group-browse-trail-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    align-self: start;
  }

  .group-browse-trail-metric {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--surface-reader) 78%, white 22%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--line-soft) 82%, white 18%);
  }

  .group-browse-trail-metric span {
    color: var(--text-muted);
    font: 600 10px/1 var(--font-chrome);
    letter-spacing: 0.04em;
  }

  .group-browse-trail-metric strong {
    color: var(--text-primary);
    font: 600 14px/1.1 var(--font-chrome);
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

  .group-browse-trail-subgroups {
    display: grid;
    gap: 14px;
    grid-column: 1 / -1;
  }

  .group-browse-subgroup-shelf {
    display: grid;
    gap: 12px;
    padding: 16px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 86%, white 14%);
    background: color-mix(in srgb, var(--surface-panel) 84%, white 16%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.24),
      0 10px 24px rgba(42, 30, 15, 0.04);
  }

  .group-browse-subgroup-copy {
    display: grid;
    gap: 4px;
  }

  .group-browse-subgroup-copy strong {
    color: var(--text-primary);
    font: 600 14px/1.2 var(--font-chrome);
  }

  .group-browse-subgroup-copy span {
    max-width: 54ch;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
  }

  @media (max-width: 900px) {
    .group-browse-trail-card {
      grid-template-columns: 1fr;
    }
  }
</style>

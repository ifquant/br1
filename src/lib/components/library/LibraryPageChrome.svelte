  <script lang="ts">
  import LibraryHeader from './LibraryHeader.svelte';
  import type { LibraryBrowseAction, LibraryPageChromeModel } from '$lib/library/types';

  export let model: LibraryPageChromeModel = {
    header: {
      totalBooks: 0,
      query: '',
      viewMode: 'grid',
      sortBy: 'recent',
      groupBy: 'none',
      browseState: {
        groupBy: 'none',
        groupScope: '',
        trail: []
      },
      activeGroupVisibleCount: 0,
      activeFilter: 'all',
      statusOptionCounts: {
        all: 0,
        reading: 0,
        unstarted: 0,
        finished: 0
      },
      activeFormatFilter: 'all',
      formatOptions: [],
      formatOptionCounts: {},
      activeCollectionFilter: 'all',
      collectionOptions: [],
      collectionOptionCounts: {},
      activeTagFilter: 'all',
      tagOptions: [],
      tagOptionCounts: {},
      importDisabled: false,
      statusSummary: '',
      activeFilterDetail: '',
      activeFilterChips: [],
      filterSummary: '',
      formatSummary: '',
      collectionSummary: '',
      tagSummary: '',
      coverSummary: ''
    },
    notice: null,
    showReadestMigration: false,
    readestLibraryCount: 0,
    readestCompatibleCount: 0,
    migrationBusy: false
  };
  export let onDispatchBrowseAction: ((action: LibraryBrowseAction) => void | Promise<void>) | null =
    null;
  export let onRunNoticeAction: (() => void | Promise<void>) | null = null;
  export let onClearNotice: (() => void | Promise<void>) | null = null;
  export let onReadestMigration: (() => void | Promise<void>) | null = null;

  const handleRunNoticeAction = () => {
    if (!onRunNoticeAction) return;
    void onRunNoticeAction();
  };

  const handleClearNotice = () => {
    if (!onClearNotice) return;
    void onClearNotice();
  };

  const handleReadestMigration = () => {
    if (!onReadestMigration) return;
    void onReadestMigration();
  };
</script>

<LibraryHeader
  model={model.header}
  {onDispatchBrowseAction}
  on:querychange
  on:importbooks
  on:filterchange
  on:formatfilterchange
  on:collectionfilterchange
  on:tagfilterchange
  on:clearfilterchip
  on:clearfilters
  on:jumptrail
  on:sortchange
  on:viewmodechange
/>

{#if model.notice}
  <section class:error={model.notice.kind === 'error'} class="library-notice" aria-live="polite">
    <span>{model.notice.message}</span>
    <div class="notice-actions">
      {#if model.notice.actionLabel}
        <button type="button" class="notice-dismiss primary" on:click={handleRunNoticeAction}>
          {model.notice.actionLabel}
        </button>
      {/if}
      <button type="button" class="notice-dismiss" on:click={handleClearNotice}>知道了</button>
    </div>
  </section>
{/if}

{#if model.showReadestMigration}
  <section class="migration-banner" aria-label="Readest 迁移提示">
    <div class="migration-copy">
      <strong>发现 Readest 书库</strong>
      <span>
        本机找到 {model.readestLibraryCount} 本 Readest 藏书；
        {#if model.readestCompatibleCount > 0}
          当前已有 {model.readestCompatibleCount} 本以兼容方式进入 br1，可继续同步补齐新增内容。
        {:else}
          还没有兼容进 br1，可开始同步本地元数据、封面和阅读位置。
        {/if}
      </span>
    </div>
    <button type="button" class="migration-button" on:click={handleReadestMigration}>
      {model.migrationBusy ? '兼容中…' : `同步 Readest 藏书`}
    </button>
  </section>
{/if}

<slot />

<style>
  .migration-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 10px 14px;
    margin-top: 10px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 82%, white 18%);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 90%, white 10%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      0 8px 24px rgba(42, 30, 15, 0.05);
  }

  .library-notice {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 10px 14px;
    margin-top: 10px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 82%, white 18%);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 88%, white 12%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.24),
      0 8px 24px rgba(42, 30, 15, 0.05);
  }

  .library-notice.error {
    border-color: color-mix(in srgb, #b04133 28%, var(--line-soft) 72%);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0)),
      color-mix(in srgb, #fff2ee 82%, var(--surface-panel) 18%);
  }

  .library-notice span {
    font-size: 12px;
    line-height: 1.4;
    color: var(--text-primary);
  }

  .notice-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .notice-dismiss {
    border: 0;
    border-radius: 999px;
    padding: 8px 12px;
    background: color-mix(in srgb, var(--surface-reader) 80%, white 20%);
    color: var(--text-primary);
    font-family: var(--font-chrome);
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    box-shadow:
      inset 0 0 0 1px var(--border-light),
      0 6px 14px rgba(42, 30, 15, 0.06);
  }

  .notice-dismiss.primary {
    background: color-mix(in srgb, #dbeed8 78%, white 22%);
    color: color-mix(in srgb, #456246 84%, black 16%);
  }

  .migration-copy {
    display: grid;
    gap: 3px;
  }

  .migration-copy strong {
    font-family: var(--font-chrome);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--text-primary);
  }

  .migration-copy span {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .migration-button {
    border: 0;
    border-radius: 999px;
    padding: 10px 14px;
    background: color-mix(in srgb, var(--text-primary) 94%, white 6%);
    color: white;
    font-family: var(--font-chrome);
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    box-shadow: 0 10px 20px rgba(42, 30, 15, 0.12);
  }
</style>

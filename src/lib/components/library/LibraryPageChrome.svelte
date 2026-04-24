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
      showSyncSnapshotActions: false,
      syncSnapshotBusy: false,
      showRemoteSyncActions: false,
      remoteSyncBusy: false,
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
    readestImportableCount: 0,
    readestMissingFileCount: 0,
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
  on:exportsyncsnapshot
  on:importsyncsnapshot
  on:exportkoreadersync
  on:importkoreadersync
  on:pushkoreaderremotesync
  on:pullkoreaderremotesync
  on:pushremotesync
  on:pullremotesync
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
        本机检测到 {model.readestLibraryCount} 本 Readest 藏书；
        {#if model.readestImportableCount > 0}
          当前仍有 {model.readestImportableCount} 本保留本地文件，可兼容进 br1。
        {/if}
        {#if model.readestMissingFileCount > 0}
          另有 {model.readestMissingFileCount} 本只剩记录，缺少本地文件，暂时无法兼容。
        {/if}
        {#if model.readestCompatibleCount > 0}
          br1 里当前已有 {model.readestCompatibleCount} 本可用兼容记录。
        {:else}
          br1 里还没有可用兼容记录。
        {/if}
      </span>
    </div>
    <button type="button" class="migration-button" on:click={handleReadestMigration}>
      {#if model.migrationBusy}
        兼容中…
      {:else if model.readestImportableCount > 0}
        {`同步 ${model.readestImportableCount} 本可兼容的 Readest 藏书`}
      {:else}
        重新检查 Readest 书库
      {/if}
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

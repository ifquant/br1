<!-- Ownership: this library component renders the header chrome plus desktop support notices
for the library page. It should present desktop-owned state clearly without pulling the
privileged queue or migration logic into the Svelte layer. -->
  <script lang="ts">
  import { getContext } from 'svelte';
  import { readable, type Readable } from 'svelte/store';
  import LibraryHeader from './LibraryHeader.svelte';
  import type { LibraryBrowseAction, LibraryPageChromeModel } from '$lib/library/types';

  type LibraryDesktopSupportState = {
    desktopAvailable: boolean;
    mainWindowActive: boolean;
    queueStatus: 'unavailable' | 'idle' | 'queued' | 'processing';
    pendingRequestCount: number;
    activeRequestPreview: string[];
    lastProcessedCount: number;
    lastProcessedPreview: string[];
    lastQueueActivityLabel: string;
    rejectedInputCount: number;
    rejectedInputPreview: string[];
  };

  type LibraryDesktopSupportContext = {
    state: Readable<LibraryDesktopSupportState>;
    refreshQueue: () => void;
    clearRejectedInputs: () => void;
  };

  const LIBRARY_DESKTOP_SUPPORT_CONTEXT = 'br1-library-desktop-support-context';

  const createEmptyLibraryDesktopSupportState = (): LibraryDesktopSupportState => ({
    desktopAvailable: false,
    mainWindowActive: false,
    queueStatus: 'unavailable',
    pendingRequestCount: 0,
    activeRequestPreview: [],
    lastProcessedCount: 0,
    lastProcessedPreview: [],
    lastQueueActivityLabel: '',
    rejectedInputCount: 0,
    rejectedInputPreview: []
  });

  const libraryDesktopSupportContext =
    getContext<LibraryDesktopSupportContext | undefined>(LIBRARY_DESKTOP_SUPPORT_CONTEXT) ?? {
      // Boundary: web mode still renders the same chrome shell, but it must fall back to an
      // inert desktop-support context so the UI never overclaims local maintenance abilities.
      state: readable(createEmptyLibraryDesktopSupportState()),
      refreshQueue: () => {},
      clearRejectedInputs: () => {}
    };
  const libraryDesktopSupportState = libraryDesktopSupportContext.state;

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

  const handleRefreshDesktopQueue = () => {
    libraryDesktopSupportContext.refreshQueue();
  };

  const handleClearRejectedInputs = () => {
    libraryDesktopSupportContext.clearRejectedInputs();
  };

  $: queueStatusTitle =
    $libraryDesktopSupportState.queueStatus === 'processing'
      ? `正在接管 ${$libraryDesktopSupportState.pendingRequestCount} 个桌面打开请求`
      : $libraryDesktopSupportState.queueStatus === 'queued'
        ? $libraryDesktopSupportState.pendingRequestCount > 0
          ? `发现 ${$libraryDesktopSupportState.pendingRequestCount} 个待处理的桌面打开请求`
          : '正在检查桌面打开队列'
        : $libraryDesktopSupportState.desktopAvailable
          ? $libraryDesktopSupportState.mainWindowActive
            ? '当前没有待处理的桌面打开请求'
            : '当前窗口不负责处理桌面打开请求'
          : '当前是网页/预览环境，桌面打开支持不可用';
  $: queueStatusDetail =
    $libraryDesktopSupportState.queueStatus === 'processing' &&
    $libraryDesktopSupportState.activeRequestPreview.length > 0
      ? $libraryDesktopSupportState.activeRequestPreview.join('，')
      : $libraryDesktopSupportState.lastProcessedCount > 0
        ? `最近一次处理 ${$libraryDesktopSupportState.lastProcessedCount} 个请求${
            $libraryDesktopSupportState.lastQueueActivityLabel
              ? ` · ${$libraryDesktopSupportState.lastQueueActivityLabel}`
              : ''
          }`
        : $libraryDesktopSupportState.desktopAvailable
          ? $libraryDesktopSupportState.mainWindowActive
            ? '主窗口会继续监听文件关联打开队列，并把可信输入送入阅读器。'
            : '只有主窗口会消费文件关联打开队列。'
          : '在桌面应用中，主窗口会消费关联打开队列并拦截不受信任的输入。';
  $: showDesktopSupportCard =
    $libraryDesktopSupportState.desktopAvailable ||
    $libraryDesktopSupportState.rejectedInputCount > 0;
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

{#if showDesktopSupportCard}
  <section class="desktop-support-card" aria-label="桌面支持与关联打开状态">
    <div class="desktop-support-copy">
      <strong>桌面支持</strong>
      <span>{queueStatusTitle}</span>
      <small>{queueStatusDetail}</small>
      {#if $libraryDesktopSupportState.rejectedInputCount > 0}
        <small class="desktop-support-warning">
          最近忽略 {$libraryDesktopSupportState.rejectedInputCount} 个无法打开的输入：
          {$libraryDesktopSupportState.rejectedInputPreview.join('，')}
        </small>
      {/if}
    </div>
    <div class="desktop-support-actions">
      <button
        type="button"
        class="notice-dismiss primary"
        disabled={!$libraryDesktopSupportState.desktopAvailable || !$libraryDesktopSupportState.mainWindowActive}
        on:click={handleRefreshDesktopQueue}
      >
        立即检查打开队列
      </button>
      {#if $libraryDesktopSupportState.rejectedInputCount > 0}
        <button type="button" class="notice-dismiss" on:click={handleClearRejectedInputs}>
          清除忽略提示
        </button>
      {/if}
    </div>
  </section>
{/if}

<slot />

<style>
  .desktop-support-card,
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

  .desktop-support-card {
    margin-top: 10px;
    border-color: color-mix(in srgb, #5d775b 16%, var(--line-soft) 84%);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0)),
      color-mix(in srgb, #edf3e8 80%, var(--surface-panel) 20%);
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

  .desktop-support-copy {
    display: grid;
    gap: 4px;
  }

  .desktop-support-copy strong {
    font-family: var(--font-chrome);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--text-primary);
  }

  .desktop-support-copy span,
  .desktop-support-copy small {
    font-size: 12px;
    line-height: 1.45;
    color: var(--text-secondary);
  }

  .desktop-support-warning {
    color: color-mix(in srgb, #96552b 82%, var(--text-primary) 18%);
  }

  .desktop-support-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
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

  @media (max-width: 900px) {
    .desktop-support-card,
    .library-notice,
    .migration-banner {
      align-items: flex-start;
      flex-direction: column;
    }

    .desktop-support-actions,
    .notice-actions {
      justify-content: flex-start;
    }
  }
</style>

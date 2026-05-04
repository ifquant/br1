<script lang="ts">
  import type {
    KoReaderSyncConflict,
    KoReaderSyncExchangeExportDialogResult,
    Br1KoReaderRemoteSyncResult,
    RestoreKoReaderSyncExchangeDialogResult
  } from '$lib/services';
  import type { PersistedLibraryBook } from '$lib/services';
  import type { ReaderPreviewState } from '$lib/reader';

  export let preview: ReaderPreviewState;
  export let currentBook: PersistedLibraryBook | null = null;
  export let desktopAvailable = false;
  export let busyAction: 'export-current' | 'import-exchange' | 'push-remote' | 'pull-remote' | null =
    null;
  export let exchangeExportResult: KoReaderSyncExchangeExportDialogResult | null = null;
  export let exchangeImportResult: RestoreKoReaderSyncExchangeDialogResult | null = null;
  export let remoteSyncResult: Br1KoReaderRemoteSyncResult | null = null;
  export let notice: { kind: 'info' | 'error'; message: string } | null = null;
  export let noteCount = 0;
  export let bookmarkCount = 0;
  export let onExportCurrentBookExchange: (() => void) | null = null;
  export let onImportExchange: (() => void) | null = null;
  export let onPushRemoteProgress: (() => void) | null = null;
  export let onPullRemoteProgress: (() => void) | null = null;
  export let onRetryBusyAction: (() => void) | null = null;
  export let currentBookActivity:
    | {
        actionLabel: string;
        status: 'success' | 'error' | 'cancelled';
        message: string;
        recordedAt: number;
      }
    | null = null;
  export let libraryActivity:
    | {
        actionLabel: string;
        status: 'success' | 'error' | 'cancelled';
        message: string;
        recordedAt: number;
      }
    | null = null;

  $: hasManagedLibraryBook = !!currentBook;
  $: currentKoReaderLocator = currentBook?.koreaderProgressLocation?.trim() || '';
  $: currentRestoreLocator = currentBook?.progressLocation?.trim() || '';
  $: currentLocatorSummary = currentKoReaderLocator
    ? '当前图书已有 KOReader-compatible locator。'
    : currentRestoreLocator
      ? '当前图书只有本地恢复定位，还没有 KOReader locator。'
      : '当前图书还没有可用于同步的定位信息。';
  $: exchangeConflictSummary = summarizeExchangeConflicts(exchangeImportResult?.applyResult?.conflicts ?? []);
  $: remoteStatusSummary = summarizeRemoteStatus(remoteSyncResult);
  $: currentBookActivityTime = formatActivityTime(currentBookActivity?.recordedAt ?? null);
  $: libraryActivityTime = formatActivityTime(libraryActivity?.recordedAt ?? null);

  const summarizeExchangeConflicts = (conflicts: KoReaderSyncConflict[]) => {
    if (conflicts.length === 0) return '';
    const missingCount = conflicts.filter((conflict) => conflict.kind === 'missing-local-book').length;
    const ambiguousCount = conflicts.filter(
      (conflict) => conflict.kind === 'ambiguous-local-book'
    ).length;
    const localNewerCount = conflicts.filter((conflict) => conflict.kind === 'local-newer').length;
    const parts = [
      missingCount > 0 ? `未匹配 ${missingCount} 本` : null,
      ambiguousCount > 0 ? `歧义 ${ambiguousCount} 本` : null,
      localNewerCount > 0 ? `本地更新 ${localNewerCount} 本` : null
    ].filter((value): value is string => Boolean(value));
    return parts.length > 0 ? parts.join('，') : '';
  };

  const summarizeRemoteStatus = (result: Br1KoReaderRemoteSyncResult | null) => {
    if (!result) return '';
    if (result.status === 'missing-config') {
      return '需要先在桌面环境里配置 KOReader server 基础地址、用户名和 user key。';
    }
    if (result.status === 'auth-failure') {
      return '当前凭据无法通过远端认证；需要回到桌面环境修正用户或 user key。';
    }
    if (result.status === 'offline') {
      return '当前像是网络不可达或 KOReader server 无法连接。';
    }
    if (result.status === 'retryable-failure') {
      return '远端返回了可重试失败；可以直接在这里再试一次。';
    }
    if (result.status === 'empty') {
      return '这次没有可推送或可拉取的阅读进度。';
    }
    return '当前仍然遵守 progress-only 边界，不会通过官方 KOSync 同步批注。';
  };

  const formatActivityTime = (value: number | null) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '';
    return new Date(value).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const describeActivityStatus = (status: 'success' | 'error' | 'cancelled') => {
    if (status === 'success') return '成功';
    if (status === 'cancelled') return '已取消';
    return '失败';
  };
</script>

<section class="sync-workspace" aria-label="同步工作台">
  <div class="sync-summary">
    <strong>同步工作台</strong>
    <span>把 KOReader 交换文件和远端进度控制从 library 菜单抬到 reader notebook，让同步成为显式阅读工作流。</span>
  </div>

  <div class="sync-status-strip" aria-label="同步工作台状态">
    <span>{desktopAvailable ? '桌面同步能力可用' : '当前环境不支持桌面同步'}</span>
    <span>{hasManagedLibraryBook ? '当前图书来自受管书库' : '当前图书不是受管书库文件'}</span>
    <span>{noteCount} 笔记 / {bookmarkCount} 书签</span>
  </div>

  <div class="sync-panels">
    <article class="sync-panel">
      <strong>当前图书</strong>
      <span>{preview.title}</span>
      <p>{currentLocatorSummary}</p>
      <small>
        {#if hasManagedLibraryBook}
          KOReader 交换文件导出会只打包当前受管图书，以及它当前的笔记和书签。
        {:else if desktopAvailable}
          只有从 br1 受管书库打开的图书，才可以从 reader 里直接导出当前图书交换文件。
        {:else}
          在桌面应用里打开受管书库图书后，这里会显示当前图书的同步就绪状态。
        {/if}
      </small>
      {#if currentBookActivity}
        <div class="sync-activity-card">
          <span>最近动作 · {currentBookActivity.actionLabel}</span>
          <small>
            {describeActivityStatus(currentBookActivity.status)}
            {currentBookActivityTime ? ` · ${currentBookActivityTime}` : ''}
          </small>
          <p>{currentBookActivity.message}</p>
        </div>
      {/if}
    </article>

    <article class="sync-panel">
      <strong>整库远端动作</strong>
      <span>KOReader 远端 push / pull 仍然按整库阅读进度运行。</span>
      <p>当前工作台只把控制入口移到 reader，不改变现有 progress-only 边界，也不新增批注远端协议。</p>
      {#if libraryActivity}
        <div class="sync-activity-card">
          <span>最近动作 · {libraryActivity.actionLabel}</span>
          <small>
            {describeActivityStatus(libraryActivity.status)}
            {libraryActivityTime ? ` · ${libraryActivityTime}` : ''}
          </small>
          <p>{libraryActivity.message}</p>
        </div>
      {/if}
    </article>
  </div>

  <div class="sync-actions">
    <button
      type="button"
      class="primary-action"
      disabled={!desktopAvailable || !hasManagedLibraryBook || busyAction !== null}
      on:click={() => onExportCurrentBookExchange?.()}
    >
      {busyAction === 'export-current' ? '导出中…' : '导出当前图书 KOReader 交换文件'}
    </button>
    <button
      type="button"
      class="ghost-action"
      disabled={!desktopAvailable || busyAction !== null}
      on:click={() => onImportExchange?.()}
    >
      {busyAction === 'import-exchange' ? '导入中…' : '导入 KOReader 交换文件'}
    </button>
    <button
      type="button"
      class="ghost-action"
      disabled={!desktopAvailable || busyAction !== null}
      on:click={() => onPushRemoteProgress?.()}
    >
      {busyAction === 'push-remote' ? '推送中…' : '推送 KOReader 阅读进度'}
    </button>
    <button
      type="button"
      class="ghost-action"
      disabled={!desktopAvailable || busyAction !== null}
      on:click={() => onPullRemoteProgress?.()}
    >
      {busyAction === 'pull-remote' ? '拉取中…' : '拉取 KOReader 阅读进度'}
    </button>
  </div>

  {#if notice}
    <div class:error={notice.kind === 'error'} class="sync-notice" aria-live="polite">
      <strong>{notice.kind === 'error' ? '同步失败' : '同步提示'}</strong>
      <span>{notice.message}</span>
      {#if notice.kind === 'error' && onRetryBusyAction}
        <div class="sync-inline-actions">
          <button type="button" class="ghost-action" on:click={() => onRetryBusyAction?.()}>
            重试刚才的动作
          </button>
        </div>
      {/if}
    </div>
  {/if}

  {#if exchangeExportResult && !exchangeExportResult.cancelled}
    <div class="sync-result-card">
      <strong>最近一次当前图书导出</strong>
      <span>
        已导出 {exchangeExportResult.bookCount} 本
        {exchangeExportResult.fileName ? ` · ${exchangeExportResult.fileName}` : ''}。
      </span>
    </div>
  {/if}

  {#if exchangeImportResult?.applyResult}
    <div class="sync-result-card">
      <strong>最近一次交换文件导入</strong>
      <span>
        应用 {exchangeImportResult.applyResult.appliedBookCount} 本，跳过
        {exchangeImportResult.applyResult.skippedBookCount} 本。
      </span>
      {#if exchangeConflictSummary}
        <small>冲突摘要：{exchangeConflictSummary}</small>
      {/if}
      {#if exchangeImportResult.applyResult.conflicts.length > 0}
        <ul class="sync-conflict-list" aria-label="交换文件导入冲突摘要">
          {#each exchangeImportResult.applyResult.conflicts.slice(0, 3) as conflict}
            <li>{conflict.bookTitle}：{conflict.detail}</li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}

  {#if remoteSyncResult}
    <div class="sync-result-card">
      <strong>最近一次远端同步</strong>
      <span>{remoteSyncResult.message}</span>
      <small>
        {remoteSyncResult.operation === 'push' ? '推送' : '拉取'} · 状态 {remoteSyncResult.status}
        · push {remoteSyncResult.pushedCount} / pull {remoteSyncResult.pulledCount} / skip
        {remoteSyncResult.skippedCount}
      </small>
      {#if remoteStatusSummary}
        <small>{remoteStatusSummary}</small>
      {/if}
    </div>
  {/if}
</section>

<style>
  .sync-workspace {
    display: grid;
    gap: 14px;
  }

  .sync-summary,
  .sync-panel,
  .sync-activity-card,
  .sync-result-card,
  .sync-notice {
    display: grid;
    gap: 6px;
  }

  .sync-summary strong,
  .sync-panel strong,
  .sync-result-card strong,
  .sync-notice strong {
    color: var(--text-primary);
    font: 700 14px/1.25 var(--font-chrome);
    letter-spacing: 0.02em;
  }

  .sync-summary span,
  .sync-status-strip span,
  .sync-panel span,
  .sync-panel p,
  .sync-panel small,
  .sync-activity-card span,
  .sync-activity-card p,
  .sync-activity-card small,
  .sync-result-card span,
  .sync-result-card small,
  .sync-notice span {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.6;
    margin: 0;
  }

  .sync-status-strip,
  .sync-panel,
  .sync-result-card,
  .sync-notice {
    padding: 12px;
    border: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-reader) 86%, white 14%);
  }

  .sync-status-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
  }

  .sync-panels {
    display: grid;
    gap: 10px;
  }

  .sync-activity-card {
    padding: 10px;
    border: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
  }

  .sync-inline-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .sync-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .sync-conflict-list {
    margin: 0;
    padding-left: 18px;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.6;
  }

  .primary-action,
  .ghost-action {
    min-height: 34px;
    border: 1px solid var(--border-light);
    border-radius: 999px;
    font: 700 12px/1 var(--font-chrome);
    letter-spacing: 0.04em;
    padding: 0 12px;
    cursor: pointer;
  }

  .primary-action {
    background: color-mix(in srgb, var(--accent-warm, #8c6a3b) 20%, var(--surface-reader) 80%);
    color: color-mix(in srgb, var(--accent-warm, #8c6a3b) 78%, black 22%);
  }

  .ghost-action {
    background: color-mix(in srgb, var(--surface-reader) 88%, white 12%);
    color: var(--text-secondary);
  }

  .sync-notice.error {
    border-color: color-mix(in srgb, var(--danger, #a94a4a) 35%, var(--border-light) 65%);
    background: color-mix(in srgb, var(--danger, #a94a4a) 8%, var(--surface-reader) 92%);
  }

  .primary-action:disabled,
  .ghost-action:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .primary-action:focus-visible,
  .ghost-action:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent-warm, #8c6a3b) 72%, white 28%);
    outline-offset: 3px;
  }
</style>

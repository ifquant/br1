<script lang="ts">
  import type {
    KoReaderSyncConflict,
    KoReaderSyncExchangeExportDialogResult,
    Br1KoReaderRemoteSyncResult,
    RestoreKoReaderSyncExchangeDialogResult
  } from '$lib/services';
  import type { PersistedLibraryBook } from '$lib/services';
  import type { ReaderPreviewState } from '$lib/reader';

  type SyncTimelineEntry = {
    label: string;
    status: 'success' | 'error' | 'cancelled' | 'info';
    summary: string;
    recordedAt: number | null;
    details: string[];
  };

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
  $: hasLibraryReplica = currentBook?.libraryFileExists !== false;
  $: hasSourceFileAssociation = !!currentBook?.sourcePath?.trim();
  $: hasSourceFile = currentBook?.sourceFileExists === true;
  $: exportReady = desktopAvailable && hasManagedLibraryBook && hasLibraryReplica;
  $: currentLocatorSummary = currentKoReaderLocator
    ? '当前图书已有 KOReader-compatible locator。'
    : currentRestoreLocator
      ? '当前图书只有本地恢复定位，还没有 KOReader locator。'
      : '当前图书还没有可用于同步的定位信息。';
  $: exportReadinessSummary = exportReady
    ? '当前图书已经满足 reader 内当前书交换文件导出的基本条件。'
    : !desktopAvailable
      ? '当前环境不是桌面端，所以这里只能展示同步状态，不能执行导出。'
      : !hasManagedLibraryBook
        ? '当前图书不在 br1 受管书库里，所以不能直接导出当前书交换文件。'
        : !hasLibraryReplica
          ? '当前图书的受管书库副本缺失，当前书导出已被阻断。'
          : '当前图书还没有达到当前书导出条件。';
  $: exchangeConflictSummary = summarizeExchangeConflicts(exchangeImportResult?.applyResult?.conflicts ?? []);
  $: remoteStatusSummary = summarizeRemoteStatus(remoteSyncResult);
  $: remoteStatus = remoteSyncResult?.status ?? null;
  $: hasKnownRemoteState = remoteStatus !== null;
  $: libraryReadinessSummary = !desktopAvailable
    ? '当前环境不是桌面端，所以这里只能展示整库同步边界，不能执行交换文件导入或远端进度同步。'
    : !hasKnownRemoteState
      ? '桌面端整库同步入口已可用，但 KOReader 远端状态还没有探测；先执行一次 push 或 pull 才会得到配置或连通性结论。'
      : remoteStatus === 'missing-config'
        ? '交换文件导入可用，但 KOReader 远端还缺少基础地址、用户名或 user key 配置。'
        : remoteStatus === 'auth-failure'
          ? '交换文件导入可用，但 KOReader 远端凭据当前无法通过认证。'
          : remoteStatus === 'offline'
            ? '交换文件导入可用，但 KOReader 远端当前不可达。'
            : remoteStatus === 'retryable-failure'
              ? '交换文件导入可用，但 KOReader 远端上一次返回了可重试失败。'
              : '交换文件导入和 KOReader 远端进度同步都处于可执行状态。';
  $: currentBookTimeline = buildCurrentBookTimeline();
  $: libraryTimeline = buildLibraryTimeline();

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

  const describeTimelineStatus = (status: SyncTimelineEntry['status']) => {
    if (status === 'success') return '成功';
    if (status === 'cancelled') return '已取消';
    if (status === 'error') return '失败';
    return '信息';
  };

  const describeReadinessStatus = (status: 'ready' | 'partial' | 'blocked') => {
    if (status === 'ready') return '已就绪';
    if (status === 'partial') return '部分就绪';
    return '阻断';
  };

  const toRemoteConfigReadiness = (status: Br1KoReaderRemoteSyncResult['status'] | null) => {
    if (status === null) return 'partial';
    if (status === 'missing-config' || status === 'auth-failure') return 'blocked';
    return 'ready';
  };

  const toRemoteConnectivityReadiness = (status: Br1KoReaderRemoteSyncResult['status'] | null) => {
    if (status === null) return 'partial';
    if (status === 'offline' || status === 'retryable-failure') return 'blocked';
    return 'ready';
  };

  const buildCurrentBookTimeline = (): SyncTimelineEntry[] => {
    if (currentBookActivity) {
      const details: string[] = [];
      if (exchangeExportResult && !exchangeExportResult.cancelled) {
        details.push(
          `导出文件：${exchangeExportResult.fileName ?? '未返回文件名'}`,
          `导出图书：${exchangeExportResult.bookCount} 本`
        );
      }

      return [
        {
          label: currentBookActivity.actionLabel,
          status: currentBookActivity.status,
          summary: currentBookActivity.message,
          recordedAt: currentBookActivity.recordedAt,
          details
        }
      ];
    }

    if (exchangeExportResult && !exchangeExportResult.cancelled) {
      return [
        {
          label: '最近导出结果',
          status: 'success',
          summary: `已导出 ${exchangeExportResult.bookCount} 本。`,
          recordedAt: null,
          details: exchangeExportResult.fileName ? [`导出文件：${exchangeExportResult.fileName}`] : []
        }
      ];
    }

    return [];
  };

  const buildLibraryTimeline = (): SyncTimelineEntry[] => {
    const entries: SyncTimelineEntry[] = [];

    if (libraryActivity) {
      const details: string[] = [];
      if (exchangeImportResult?.applyResult && libraryActivity.actionLabel === '导入交换文件') {
        details.push(
          `应用 ${exchangeImportResult.applyResult.appliedBookCount} 本`,
          `跳过 ${exchangeImportResult.applyResult.skippedBookCount} 本`
        );
        if (exchangeConflictSummary) {
          details.push(`冲突摘要：${exchangeConflictSummary}`);
        }
      }
      if (remoteSyncResult && libraryActivity.actionLabel !== '导入交换文件') {
        details.push(
          `${remoteSyncResult.operation === 'push' ? '推送' : '拉取'} · 状态 ${remoteSyncResult.status}`,
          `push ${remoteSyncResult.pushedCount} / pull ${remoteSyncResult.pulledCount} / skip ${remoteSyncResult.skippedCount}`
        );
        if (remoteStatusSummary) {
          details.push(remoteStatusSummary);
        }
      }

      entries.push({
        label: libraryActivity.actionLabel,
        status: libraryActivity.status,
        summary: libraryActivity.message,
        recordedAt: libraryActivity.recordedAt,
        details
      });
    }

    if (!libraryActivity && exchangeImportResult?.applyResult) {
      const details = [
        `应用 ${exchangeImportResult.applyResult.appliedBookCount} 本`,
        `跳过 ${exchangeImportResult.applyResult.skippedBookCount} 本`
      ];
      if (exchangeConflictSummary) {
        details.push(`冲突摘要：${exchangeConflictSummary}`);
      }
      entries.push({
        label: '最近交换文件导入',
        status: 'info',
        summary: '当前 reader 会保留最近一次交换文件导入结果。',
        recordedAt: null,
        details
      });
    }

    if (!libraryActivity && remoteSyncResult) {
      const details = [
        `${remoteSyncResult.operation === 'push' ? '推送' : '拉取'} · 状态 ${remoteSyncResult.status}`,
        `push ${remoteSyncResult.pushedCount} / pull ${remoteSyncResult.pulledCount} / skip ${remoteSyncResult.skippedCount}`
      ];
      if (remoteStatusSummary) {
        details.push(remoteStatusSummary);
      }
      entries.push({
        label: '最近远端同步',
        status: remoteSyncResult.status === 'success' || remoteSyncResult.status === 'empty' ? 'success' : 'error',
        summary: remoteSyncResult.message,
        recordedAt: null,
        details
      });
    }

    return entries;
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
      <div class="sync-readiness-card" aria-label="当前图书同步就绪状态">
        <strong>同步就绪状态</strong>
        <span>{exportReadinessSummary}</span>
        <div class="sync-readiness-list">
          <div class="sync-readiness-item">
            <small>{describeReadinessStatus(hasManagedLibraryBook ? 'ready' : 'blocked')}</small>
            <span>{hasManagedLibraryBook ? '受管书库记录已识别' : '当前图书不在受管书库中'}</span>
          </div>
          <div class="sync-readiness-item">
            <small>{describeReadinessStatus(hasLibraryReplica ? 'ready' : 'blocked')}</small>
            <span>{hasLibraryReplica ? '受管书库副本可用' : '受管书库副本缺失'}</span>
          </div>
          <div class="sync-readiness-item">
            <small>{describeReadinessStatus(currentKoReaderLocator ? 'ready' : currentRestoreLocator ? 'partial' : 'blocked')}</small>
            <span>
              {currentKoReaderLocator
                ? '已有 KOReader locator'
                : currentRestoreLocator
                  ? '只有本地恢复 locator'
                  : '还没有定位信息'}
            </span>
          </div>
          <div class="sync-readiness-item">
            <small>{describeReadinessStatus(!hasSourceFileAssociation ? 'partial' : hasSourceFile ? 'ready' : 'blocked')}</small>
            <span>
              {!hasSourceFileAssociation
                ? '没有原始来源文件关联'
                : hasSourceFile
                  ? '原始来源文件仍可访问'
                  : '原始来源文件已缺失'}
            </span>
          </div>
        </div>
      </div>
      {#if currentBookTimeline.length > 0}
        <div class="sync-timeline-card" aria-label="当前图书同步状态时间线">
          <strong>状态时间线</strong>
          {#each currentBookTimeline as entry}
            <div class="sync-timeline-entry">
              <span>最近动作 · {entry.label}</span>
              <small>
                {describeTimelineStatus(entry.status)}
                {entry.recordedAt ? ` · ${formatActivityTime(entry.recordedAt)}` : ''}
              </small>
              <p>{entry.summary}</p>
              {#if entry.details.length > 0}
                <ul class="sync-timeline-detail-list">
                  {#each entry.details as detail}
                    <li>{detail}</li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </article>

    <article class="sync-panel">
      <strong>整库远端动作</strong>
      <span>KOReader 远端 push / pull 仍然按整库阅读进度运行。</span>
      <p>当前工作台只把控制入口移到 reader，不改变现有 progress-only 边界，也不新增批注远端协议。</p>
      <div class="sync-readiness-card" aria-label="整库同步就绪状态">
        <strong>同步就绪状态</strong>
        <span>{libraryReadinessSummary}</span>
        <div class="sync-readiness-list">
          <div class="sync-readiness-item">
            <small>{describeReadinessStatus(desktopAvailable ? 'ready' : 'blocked')}</small>
            <span>{desktopAvailable ? '桌面运行时可执行整库同步动作' : '当前环境不是桌面端'}</span>
          </div>
          <div class="sync-readiness-item">
            <small>{describeReadinessStatus(desktopAvailable ? 'ready' : 'blocked')}</small>
            <span>{desktopAvailable ? 'KOReader 交换文件导入入口可用' : '交换文件导入需要桌面端文件选择器'}</span>
          </div>
          <div class="sync-readiness-item">
            <small>{describeReadinessStatus(toRemoteConfigReadiness(remoteStatus))}</small>
            <span>
              {remoteStatus === null
                ? 'KOReader 远端配置状态尚未探测'
                : remoteStatus === 'missing-config'
                  ? 'KOReader 远端缺少基础配置'
                  : remoteStatus === 'auth-failure'
                    ? 'KOReader 远端凭据认证失败'
                    : 'KOReader 远端配置已知可用'}
            </span>
          </div>
          <div class="sync-readiness-item">
            <small>{describeReadinessStatus(toRemoteConnectivityReadiness(remoteStatus))}</small>
            <span>
              {remoteStatus === null
                ? 'KOReader 远端连通性尚未探测'
                : remoteStatus === 'offline'
                  ? 'KOReader 远端当前不可达'
                  : remoteStatus === 'retryable-failure'
                    ? 'KOReader 远端上一次返回可重试失败'
                    : 'KOReader 远端最近一次连通性可用'}
            </span>
          </div>
          <div class="sync-readiness-item">
            <small>{describeReadinessStatus('partial')}</small>
            <span>官方 KOSync 仍然只同步阅读进度，不会同步批注</span>
          </div>
        </div>
      </div>
      {#if libraryTimeline.length > 0}
        <div class="sync-timeline-card" aria-label="整库同步状态时间线">
          <strong>状态时间线</strong>
          {#each libraryTimeline as entry}
            <div class="sync-timeline-entry">
              <span>最近动作 · {entry.label}</span>
              <small>
                {describeTimelineStatus(entry.status)}
                {entry.recordedAt ? ` · ${formatActivityTime(entry.recordedAt)}` : ''}
              </small>
              <p>{entry.summary}</p>
              {#if entry.details.length > 0}
                <ul class="sync-timeline-detail-list">
                  {#each entry.details as detail}
                    <li>{detail}</li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/each}
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

</section>

<style>
  .sync-workspace {
    display: grid;
    gap: 14px;
  }

  .sync-summary,
  .sync-panel,
  .sync-readiness-card,
  .sync-timeline-card,
  .sync-timeline-entry,
  .sync-notice {
    display: grid;
    gap: 6px;
  }

  .sync-summary strong,
  .sync-panel strong,
  .sync-readiness-card strong,
  .sync-timeline-card strong,
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
  .sync-readiness-card span,
  .sync-readiness-card small,
  .sync-timeline-card span,
  .sync-timeline-card p,
  .sync-timeline-card small,
  .sync-timeline-entry span,
  .sync-timeline-entry p,
  .sync-timeline-entry small,
  .sync-notice span {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.6;
    margin: 0;
  }

  .sync-status-strip,
  .sync-panel,
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

  .sync-readiness-card {
    padding: 10px;
    border: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-panel) 90%, white 10%);
  }

  .sync-readiness-list {
    display: grid;
    gap: 8px;
  }

  .sync-readiness-item {
    display: grid;
    gap: 2px;
    padding-top: 8px;
    border-top: 1px dashed var(--border-light);
  }

  .sync-readiness-item:first-child {
    padding-top: 0;
    border-top: 0;
  }

  .sync-timeline-card {
    padding: 10px;
    border: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
  }

  .sync-timeline-entry {
    padding-top: 8px;
    border-top: 1px dashed var(--border-light);
  }

  .sync-timeline-entry:first-of-type {
    padding-top: 0;
    border-top: 0;
  }

  .sync-timeline-detail-list {
    margin: 0;
    padding-left: 18px;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.6;
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

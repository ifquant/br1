<script lang="ts">
  import type {
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
  export let exchangeImportResult: RestoreKoReaderSyncExchangeDialogResult | null = null;
  export let remoteSyncResult: Br1KoReaderRemoteSyncResult | null = null;
  export let notice: { kind: 'info' | 'error'; message: string } | null = null;
  export let noteCount = 0;
  export let bookmarkCount = 0;
  export let onExportCurrentBookExchange: (() => void) | null = null;
  export let onImportExchange: (() => void) | null = null;
  export let onPushRemoteProgress: (() => void) | null = null;
  export let onPullRemoteProgress: (() => void) | null = null;

  $: hasManagedLibraryBook = !!currentBook;
  $: currentKoReaderLocator = currentBook?.koreaderProgressLocation?.trim() || '';
  $: currentRestoreLocator = currentBook?.progressLocation?.trim() || '';
  $: currentLocatorSummary = currentKoReaderLocator
    ? '当前图书已有 KOReader-compatible locator。'
    : currentRestoreLocator
      ? '当前图书只有本地恢复定位，还没有 KOReader locator。'
      : '当前图书还没有可用于同步的定位信息。';
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
    </article>

    <article class="sync-panel">
      <strong>整库远端动作</strong>
      <span>KOReader 远端 push / pull 仍然按整库阅读进度运行。</span>
      <p>当前工作台只把控制入口移到 reader，不改变现有 progress-only 边界，也不新增批注远端协议。</p>
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
    </div>
  {/if}

  {#if exchangeImportResult?.applyResult}
    <div class="sync-result-card">
      <strong>最近一次交换文件导入</strong>
      <span>
        应用 {exchangeImportResult.applyResult.appliedBookCount} 本，跳过
        {exchangeImportResult.applyResult.skippedBookCount} 本。
      </span>
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

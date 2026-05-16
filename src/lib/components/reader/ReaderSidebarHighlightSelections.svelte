<!-- This child only renders the cross-book saved highlight-selection workspace.
 The parent still owns import/export state, refresh summaries, and persistence so
 cross-book mapping semantics do not silently split into a second owner here. -->
<script lang="ts">
  import type {
    ReaderHighlightSelectionSet,
    ReaderHighlightSelectionSetExport
  } from '$lib/reader';
  import type {
    ReaderHighlightSelectionsFormatTimestamp,
    ReaderHighlightSelectionsImportPreview,
    ReaderHighlightSelectionsRefreshCounts,
    ReaderHighlightSelectionsRefreshDetail,
    ReaderHighlightSelectionsRefreshFilter,
    ReaderHighlightSelectionsRefreshLabel,
    ReaderHighlightSelectionsRefreshOutcomeResolver,
    ReaderHighlightSelectionsRefreshSummary,
    ReaderHighlightSelectionsUnmatchedTexts
  } from '$lib/reader/sidebarHighlightSelections';

  export let savedHighlightSelections: ReaderHighlightSelectionSet[] = [];
  export let importedSavedHighlightSelections: ReaderHighlightSelectionSet[] = [];
  export let savedHighlightSelectionsSort: 'recent' | 'oldest' = 'recent';
  export let savedHighlightSelectionsRefreshFilter: ReaderHighlightSelectionsRefreshFilter = 'all';
  export let savedHighlightSelectionsRefreshCounts: ReaderHighlightSelectionsRefreshCounts;
  export let filteredSavedHighlightSelections: ReaderHighlightSelectionSet[] = [];
  export let orderedSavedHighlightSelections: ReaderHighlightSelectionSet[] = [];
  export let savedHighlightSelectionImportNotice = '';
  export let savedHighlightSelectionRefreshSummary: ReaderHighlightSelectionsRefreshSummary | null = null;
  export let savedHighlightSelectionImportPreview: ReaderHighlightSelectionsImportPreview | null = null;
  export let exportedHighlightSelection: ReaderHighlightSelectionSetExport | null = null;
  export let exportHighlightSelectionNotice = '';
  export let formatTimestamp: ReaderHighlightSelectionsFormatTimestamp;
  export let getSavedHighlightSelectionRefreshDetail: ReaderHighlightSelectionsRefreshDetail;
  export let getSavedHighlightSelectionUnmatchedTexts: ReaderHighlightSelectionsUnmatchedTexts;
  export let getSavedHighlightSelectionRefreshOutcome: ReaderHighlightSelectionsRefreshOutcomeResolver;
  export let getSavedHighlightSelectionRefreshLabel: ReaderHighlightSelectionsRefreshLabel;
  export let onImportSavedHighlightSelection: () => void;
  export let onRefreshAllCrossBookImportedSelections: () => void;
  export let onSetSavedHighlightSelectionsSort: (value: 'recent' | 'oldest') => void;
  export let onSetSavedHighlightSelectionsRefreshFilter:
    (value: ReaderHighlightSelectionsRefreshFilter) => void;
  export let onImportMatchedHighlightsFromPreview: () => void;
  export let onApplySavedHighlightSelection: (selectionSet: ReaderHighlightSelectionSet) => void;
  export let onExportSavedHighlightSelection: (selectionSet: ReaderHighlightSelectionSet) => void;
  export let onRefreshCrossBookImportedSelection: (selectionSet: ReaderHighlightSelectionSet) => void;
  export let onRenameSavedHighlightSelection: (selectionId: string) => void;
  export let onDeleteSavedHighlightSelection: (selectionId: string) => void;
  export let onCopyExportedHighlightSelection: () => void;
  export let onCloseExportedHighlightSelection: () => void;
</script>

<section class="saved-highlight-selections" aria-label="已保存高亮选择集">
  <div class="saved-highlight-selections-head">
    <div class="saved-highlight-selections-summary">
      <strong>跨书高亮选择集</strong>
      <span>{savedHighlightSelections.length} 组</span>
      <span>按书保留跨书映射结果</span>
    </div>
    <div class="saved-highlight-selections-toolbar">
      <button type="button" class="notes-filter-chip" on:click={onImportSavedHighlightSelection}>
        导入
      </button>
      <button
        type="button"
        class="notes-filter-chip"
        disabled={!importedSavedHighlightSelections.length}
        on:click={onRefreshAllCrossBookImportedSelections}
      >
        刷新全部跨书映射
      </button>
      <div class="saved-highlight-selections-sort" aria-label="选择集排序控制">
        <button
          type="button"
          class:active={savedHighlightSelectionsSort === 'recent'}
          class="notes-filter-chip"
          on:click={() => onSetSavedHighlightSelectionsSort('recent')}
        >
          最近保存
        </button>
        <button
          type="button"
          class:active={savedHighlightSelectionsSort === 'oldest'}
          class="notes-filter-chip"
          on:click={() => onSetSavedHighlightSelectionsSort('oldest')}
        >
          最早保存
        </button>
      </div>
    </div>
  </div>

  {#if savedHighlightSelectionImportNotice}
    <p class="saved-highlight-selection-import-notice">{savedHighlightSelectionImportNotice}</p>
  {/if}

  {#if savedHighlightSelectionRefreshSummary}
    <section class="saved-highlight-selection-refresh-summary" aria-label="高亮选择集刷新摘要">
      <strong>刷新结果</strong>
      <span>共处理 {savedHighlightSelectionRefreshSummary.refreshedCount} 组跨书选择集</span>
      <span>刷新结果筛选会按书保留</span>
      {#if savedHighlightSelectionRefreshSummary.fullMatches.length}
        <span>完全匹配：{savedHighlightSelectionRefreshSummary.fullMatches.join('、')}</span>
      {/if}
      {#if savedHighlightSelectionRefreshSummary.partialMatches.length}
        <span>
          部分匹配：
          {savedHighlightSelectionRefreshSummary.partialMatches
            .map((item) => `${item.name}（${item.matchedCount}/${item.totalCount}）`)
            .join('、')}
        </span>
      {/if}
      {#if savedHighlightSelectionRefreshSummary.missedMatches.length}
        <span>
          未匹配：
          {savedHighlightSelectionRefreshSummary.missedMatches
            .map((item) => `${item.name}（0/${item.totalCount}）`)
            .join('、')}
        </span>
      {/if}
      <div class="saved-highlight-selection-refresh-filters" aria-label="高亮选择集刷新结果筛选">
        <button
          type="button"
          class="notes-filter-chip"
          class:active={savedHighlightSelectionsRefreshFilter === 'all'}
          on:click={() => onSetSavedHighlightSelectionsRefreshFilter('all')}
        >
          全部选择集
        </button>
        <button
          type="button"
          class="notes-filter-chip"
          class:active={savedHighlightSelectionsRefreshFilter === 'full'}
          disabled={!savedHighlightSelectionsRefreshCounts.full}
          on:click={() => onSetSavedHighlightSelectionsRefreshFilter('full')}
        >
          完全匹配 {savedHighlightSelectionsRefreshCounts.full}
        </button>
        <button
          type="button"
          class="notes-filter-chip"
          class:active={savedHighlightSelectionsRefreshFilter === 'partial'}
          disabled={!savedHighlightSelectionsRefreshCounts.partial}
          on:click={() => onSetSavedHighlightSelectionsRefreshFilter('partial')}
        >
          部分匹配 {savedHighlightSelectionsRefreshCounts.partial}
        </button>
        <button
          type="button"
          class="notes-filter-chip"
          class:active={savedHighlightSelectionsRefreshFilter === 'missed'}
          disabled={!savedHighlightSelectionsRefreshCounts.missed}
          on:click={() => onSetSavedHighlightSelectionsRefreshFilter('missed')}
        >
          未匹配 {savedHighlightSelectionsRefreshCounts.missed}
        </button>
      </div>
    </section>
  {:else if importedSavedHighlightSelections.length}
    <section class="saved-highlight-selection-refresh-summary" aria-label="高亮选择集刷新摘要">
      <strong>跨书映射视图</strong>
      <span>按当前映射结果筛选已保存的跨书选择集。</span>
      <div class="saved-highlight-selection-refresh-filters" aria-label="高亮选择集刷新结果筛选">
        <button
          type="button"
          class="notes-filter-chip"
          class:active={savedHighlightSelectionsRefreshFilter === 'all'}
          on:click={() => onSetSavedHighlightSelectionsRefreshFilter('all')}
        >
          全部选择集
        </button>
        <button
          type="button"
          class="notes-filter-chip"
          class:active={savedHighlightSelectionsRefreshFilter === 'full'}
          disabled={!savedHighlightSelectionsRefreshCounts.full}
          on:click={() => onSetSavedHighlightSelectionsRefreshFilter('full')}
        >
          完全匹配 {savedHighlightSelectionsRefreshCounts.full}
        </button>
        <button
          type="button"
          class="notes-filter-chip"
          class:active={savedHighlightSelectionsRefreshFilter === 'partial'}
          disabled={!savedHighlightSelectionsRefreshCounts.partial}
          on:click={() => onSetSavedHighlightSelectionsRefreshFilter('partial')}
        >
          部分匹配 {savedHighlightSelectionsRefreshCounts.partial}
        </button>
        <button
          type="button"
          class="notes-filter-chip"
          class:active={savedHighlightSelectionsRefreshFilter === 'missed'}
          disabled={!savedHighlightSelectionsRefreshCounts.missed}
          on:click={() => onSetSavedHighlightSelectionsRefreshFilter('missed')}
        >
          未匹配 {savedHighlightSelectionsRefreshCounts.missed}
        </button>
      </div>
    </section>
  {/if}

  {#if savedHighlightSelectionImportPreview}
    <section class="saved-highlight-selection-import-preview" aria-label="高亮选择集导入预检">
      <div class="saved-highlight-selection-import-preview-head">
        <div class="saved-highlight-selection-import-preview-copy">
          <strong>跨书兼容预检</strong>
          <span>
            来源：{savedHighlightSelectionImportPreview.sourceBookTitle} · {savedHighlightSelectionImportPreview.sourceFormatLabel}
          </span>
          <span>来源选择集：{savedHighlightSelectionImportPreview.selectionName}</span>
          <span>
            当前书可映射 {savedHighlightSelectionImportPreview.matchedCount} / {savedHighlightSelectionImportPreview.totalCount} 条高亮
          </span>
        </div>
        {#if savedHighlightSelectionImportPreview.importedIds.length}
          <div class="saved-highlight-selection-import-preview-actions">
            <button type="button" class="notes-filter-chip" on:click={onImportMatchedHighlightsFromPreview}>
              导入已匹配高亮
            </button>
          </div>
        {/if}
      </div>
      {#if savedHighlightSelectionImportPreview.unmatchedTexts.length}
        <ul class="saved-highlight-selection-import-preview-list">
          {#each savedHighlightSelectionImportPreview.unmatchedTexts as unmatchedText}
            <li>{unmatchedText}</li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}

  <div class="saved-highlight-selections-list">
    {#if filteredSavedHighlightSelections.length}
      {#each filteredSavedHighlightSelections as selectionSet}
        <article class="saved-highlight-selection-card">
          <div class="saved-highlight-selection-copy">
            <strong>{selectionSet.name}</strong>
            <span>{selectionSet.selectedIds.length} 条高亮</span>
            {#if selectionSet.importSource}
              <span class="saved-highlight-selection-origin">
                跨书导入 · {selectionSet.importSource.bookTitle} / {selectionSet.importSource.selectionName} · {selectionSet.importSource.matchedCount}/{selectionSet.importSource.totalCount}
              </span>
              <span class="saved-highlight-selection-detail">
                {getSavedHighlightSelectionRefreshDetail(selectionSet)}
              </span>
              {@const unmatchedTexts = getSavedHighlightSelectionUnmatchedTexts(selectionSet)}
              {#if unmatchedTexts.length}
                <div class="saved-highlight-selection-unmatched" aria-label={`${selectionSet.name} 未映射高亮`}>
                  <span>未映射片段</span>
                  <ul>
                    {#each unmatchedTexts as unmatchedText}
                      <li>{unmatchedText}</li>
                    {/each}
                  </ul>
                </div>
              {/if}
              {@const refreshOutcome = getSavedHighlightSelectionRefreshOutcome(selectionSet)}
              {@const displayOutcome =
                refreshOutcome === 'full' ? 'full' : refreshOutcome === 'missed' ? 'missed' : 'partial'}
              <span
                class="saved-highlight-selection-status"
                class:saved-highlight-selection-status-full={displayOutcome === 'full'}
                class:saved-highlight-selection-status-missed={displayOutcome === 'missed'}
              >
                {getSavedHighlightSelectionRefreshLabel(displayOutcome)}
              </span>
            {/if}
            <time>{formatTimestamp(selectionSet.createdAt)}</time>
          </div>
          <div class="saved-highlight-selection-actions">
            <button type="button" class="notes-filter-chip" on:click={() => onApplySavedHighlightSelection(selectionSet)}>
              套用
            </button>
            <button type="button" class="notes-filter-chip" on:click={() => onExportSavedHighlightSelection(selectionSet)}>
              导出
            </button>
            {#if selectionSet.importSource}
              <button
                type="button"
                class="notes-filter-chip"
                on:click={() => onRefreshCrossBookImportedSelection(selectionSet)}
              >
                刷新映射
              </button>
            {/if}
            <button type="button" class="notes-filter-chip" on:click={() => onRenameSavedHighlightSelection(selectionSet.id)}>
              重命名
            </button>
            <button
              type="button"
              class="notes-filter-chip danger-action"
              on:click={() => onDeleteSavedHighlightSelection(selectionSet.id)}
            >
              删除
            </button>
          </div>
        </article>
      {/each}
    {:else if orderedSavedHighlightSelections.length}
      <p class="saved-highlight-selection-empty">
        当前筛选下没有
        {savedHighlightSelectionsRefreshFilter === 'full'
          ? '完全匹配'
          : savedHighlightSelectionsRefreshFilter === 'partial'
            ? '部分匹配'
            : '未匹配'}
        的跨书选择集。
      </p>
    {:else}
      <p class="saved-highlight-selection-empty">还没有保存的高亮选择集，可以先导入一组或从当前选中高亮创建。</p>
    {/if}
  </div>

  {#if exportedHighlightSelection}
    <section class="saved-highlight-selection-export" aria-label="高亮选择集导出预览">
      <div class="saved-highlight-selection-export-head">
        <div class="saved-highlight-selection-export-copy">
          <strong>导出预览</strong>
          <span>{exportedHighlightSelection.selectionSet.name}</span>
        </div>
        <div class="saved-highlight-selection-export-actions">
          <button type="button" class="notes-filter-chip" on:click={onCopyExportedHighlightSelection}>
            复制导出内容
          </button>
          <button type="button" class="notes-filter-chip" on:click={onCloseExportedHighlightSelection}>
            关闭
          </button>
        </div>
      </div>
      {#if exportHighlightSelectionNotice}
        <p class="saved-highlight-selection-export-notice">{exportHighlightSelectionNotice}</p>
      {/if}
      <textarea
        class="saved-highlight-selection-export-payload"
        readonly
        value={JSON.stringify(exportedHighlightSelection, null, 2)}
      ></textarea>
    </section>
  {/if}
</section>

<style>
  .saved-highlight-selections {
    display: grid;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--border-light) 72%, transparent 28%);
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
  }

  .saved-highlight-selections-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 12px;
    flex-wrap: wrap;
  }

  .saved-highlight-selections-summary {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .saved-highlight-selections-sort,
  .saved-highlight-selections-toolbar,
  .saved-highlight-selection-import-preview-actions,
  .saved-highlight-selection-actions,
  .saved-highlight-selection-export-actions {
    display: inline-flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
  }

  .saved-highlight-selections-list {
    display: grid;
    gap: 8px;
  }

  .saved-highlight-selection-import-notice,
  .saved-highlight-selection-empty,
  .saved-highlight-selection-export-notice {
    margin: 0;
    color: var(--text-secondary);
    font-size: 12px;
  }

  .saved-highlight-selection-refresh-summary,
  .saved-highlight-selection-import-preview,
  .saved-highlight-selection-export {
    display: grid;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--border-light) 72%, transparent 28%);
    background: color-mix(in srgb, var(--surface-panel) 82%, white 18%);
  }

  .saved-highlight-selection-refresh-summary {
    gap: 4px;
    color: var(--text-secondary);
    font-size: 12px;
  }

  .saved-highlight-selection-refresh-summary strong,
  .saved-highlight-selection-import-preview-copy strong,
  .saved-highlight-selection-copy strong,
  .saved-highlight-selection-export-copy strong {
    color: var(--text-primary);
    font-size: 13px;
    line-height: 1.3;
  }

  .saved-highlight-selection-refresh-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 2px;
  }

  .saved-highlight-selection-import-preview-head,
  .saved-highlight-selection-export-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .saved-highlight-selection-import-preview-copy,
  .saved-highlight-selection-copy,
  .saved-highlight-selection-export-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .saved-highlight-selection-import-preview-copy span,
  .saved-highlight-selection-import-preview-list,
  .saved-highlight-selection-copy span,
  .saved-highlight-selection-copy time,
  .saved-highlight-selection-export-copy span,
  .saved-highlight-selection-export-notice {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .saved-highlight-selection-import-preview-list {
    margin: 0;
    padding-left: 18px;
    line-height: 1.5;
  }

  .saved-highlight-selection-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--border-light) 72%, transparent 28%);
    background: color-mix(in srgb, var(--surface-panel) 78%, white 22%);
  }

  .saved-highlight-selection-detail {
    color: var(--text-primary);
    font-size: 11px;
    line-height: 1.35;
  }

  .saved-highlight-selection-unmatched {
    display: grid;
    gap: 4px;
    margin-top: 4px;
    padding: 8px 10px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--surface-panel) 64%, #f7d6bd 36%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border-light) 70%, #bc6c31 30%);
  }

  .saved-highlight-selection-unmatched span {
    color: var(--text-primary);
    font: 600 11px/1.3 var(--font-chrome);
  }

  .saved-highlight-selection-unmatched ul {
    display: grid;
    gap: 3px;
    margin: 0;
    padding-left: 16px;
  }

  .saved-highlight-selection-unmatched li {
    color: var(--text-secondary);
    font-size: 11px;
    line-height: 1.35;
  }

  .saved-highlight-selection-origin {
    color: var(--text-primary);
  }

  .saved-highlight-selection-status {
    display: inline-flex;
    width: fit-content;
    padding: 2px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 72%, white 28%);
    color: var(--text-secondary);
    font-size: 11px;
    line-height: 1.3;
  }

  .saved-highlight-selection-status-full {
    background: color-mix(in srgb, #d7f6e6 72%, white 28%);
    color: #17603c;
  }

  .saved-highlight-selection-status-missed {
    background: color-mix(in srgb, #fde2e2 78%, white 22%);
    color: #8f2f2f;
  }

  .saved-highlight-selection-export-payload {
    min-height: 192px;
    width: 100%;
    resize: vertical;
    border: 1px solid color-mix(in srgb, var(--border-light) 80%, transparent 20%);
    border-radius: 10px;
    background: color-mix(in srgb, white 92%, var(--surface-reader) 8%);
    color: var(--text-primary);
    font-family: 'SFMono-Regular', 'SF Mono', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.55;
    padding: 10px 12px;
  }
</style>

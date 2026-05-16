<!-- This child only renders the search workspace. The parent still owns the
 route/search-controller state so cache, history replay, and result navigation
 do not quietly split into a second owner here. -->
<script lang="ts">
  import './readerSidebarPanel.css';
  import type {
    ReaderSearchConfig,
    ReaderSearchHistoryEntry,
    ReaderSidebarSearchState
  } from '$lib/reader';

  export let search: ReaderSidebarSearchState;
  export let searchHistoryFilter: 'all' | 'results' | 'empty' = 'all';
  export let successfulSearchHistoryCount = 0;
  export let emptySearchHistoryCount = 0;
  export let visibleSearchHistory: ReaderSearchHistoryEntry[] = [];
  export let cachedSearchHistoryEntries: ReaderSearchHistoryEntry[] = [];
  export let searchCacheDisplayKey = '';
  export let currentSearchResultIndex = 0;
  export let searchSummaryModel: { title: string; detail: string } = {
    title: '',
    detail: ''
  };
  export let formatSearchConfigLabel: (config: ReaderSearchConfig) => string;
  export let formatSearchHistoryAge: (value: number) => string;
  export let onIssueSearch: ((term: string) => void) | null = null;
  export let onUpdateSearchConfig:
    | (<K extends keyof ReaderSearchConfig>(key: K, value: ReaderSearchConfig[K]) => void)
    | null = null;
  export let onRunSearchHistory: ((entry: ReaderSearchHistoryEntry) => void) | null = null;
  export let onSetSearchHistoryFilter:
    | ((filter: 'all' | 'results' | 'empty') => void)
    | null = null;
  export let onClearSearchHistory: (() => void) | null = null;
  export let onDeleteSearchHistoryEntry: ((entryId: string) => void) | null = null;
  export let onClearSearchCache: (() => void) | null = null;
  export let onNavigateSearchResult: ((direction: -1 | 1) => void) | null = null;
  export let onOpenSearchResult: ((cfi: string) => void) | null = null;
</script>

<section class="reader-sidebar-panel" aria-label="正文搜索面板">
  <label class="search-field">
    <span class="sr-only">搜索正文内容</span>
    <input
      type="search"
      placeholder="搜索正文内容"
      value={search.term}
      on:input={(event) => onIssueSearch?.((event.currentTarget as HTMLInputElement).value)}
    />
  </label>

  <div class="search-options" aria-label="搜索选项">
    <button
      type="button"
      class:active={search.config.scope === 'book'}
      class="option-chip"
      on:click={() => onUpdateSearchConfig?.('scope', 'book')}
    >
      全书
    </button>
    <button
      type="button"
      class:active={search.config.scope === 'section'}
      class="option-chip"
      on:click={() => onUpdateSearchConfig?.('scope', 'section')}
    >
      本章
    </button>
    <button
      type="button"
      class:active={search.config.matchCase}
      class="option-chip"
      on:click={() => onUpdateSearchConfig?.('matchCase', !search.config.matchCase)}
    >
      区分大小写
    </button>
    <button
      type="button"
      class:active={search.config.matchWholeWords}
      class="option-chip"
      on:click={() => onUpdateSearchConfig?.('matchWholeWords', !search.config.matchWholeWords)}
    >
      整词
    </button>
    <button
      type="button"
      class:active={search.config.matchDiacritics}
      class="option-chip"
      on:click={() => onUpdateSearchConfig?.('matchDiacritics', !search.config.matchDiacritics)}
    >
      保留重音
    </button>
  </div>

  {#if search.cacheKey && !search.term.trim()}
    <section class="search-cache-status" aria-label="搜索缓存状态">
      <div>
        <strong>当前书搜索缓存已启用</strong>
        <span>
          {search.history.length} 条历史 · {successfulSearchHistoryCount} 条有命中 · {emptySearchHistoryCount} 条无命中
        </span>
        <small title={search.cacheKey}>缓存标识：{searchCacheDisplayKey}</small>
      </div>
      <button type="button" class="history-clear" on:click={() => onClearSearchCache?.()}>
        清空缓存
      </button>
      {#if cachedSearchHistoryEntries.length}
        <ul aria-label="搜索缓存查询记录">
          {#each cachedSearchHistoryEntries as entry}
            <li>
              <button type="button" on:click={() => onRunSearchHistory?.(entry)}>
                <strong>{entry.query}</strong>
                <span>{entry.resultCount} 条 · {entry.config.scope === 'section' ? '当前章节' : '全书'}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}

  {#if search.history.length > 0 && !search.term.trim()}
    <div class="search-history">
      <div class="search-history-head">
        <strong>最近搜索</strong>
        <div class="history-actions">
          <button type="button" class="history-clear" on:click={() => onClearSearchHistory?.()}>
            清空历史
          </button>
        </div>
      </div>
      <div class="search-history-filters" aria-label="搜索历史筛选">
        <button
          type="button"
          class:active={searchHistoryFilter === 'all'}
          class="history-filter-chip"
          on:click={() => onSetSearchHistoryFilter?.('all')}
        >
          全部 {search.history.length}
        </button>
        <button
          type="button"
          class:active={searchHistoryFilter === 'results'}
          class="history-filter-chip"
          disabled={successfulSearchHistoryCount === 0}
          on:click={() => onSetSearchHistoryFilter?.('results')}
        >
          有命中 {successfulSearchHistoryCount}
        </button>
        <button
          type="button"
          class:active={searchHistoryFilter === 'empty'}
          class="history-filter-chip"
          disabled={emptySearchHistoryCount === 0}
          on:click={() => onSetSearchHistoryFilter?.('empty')}
        >
          无命中 {emptySearchHistoryCount}
        </button>
      </div>
      <div class="history-list">
        {#if visibleSearchHistory.length}
          {#each visibleSearchHistory as entry}
            <div class="history-chip-row">
              <button type="button" class="history-chip" on:click={() => onRunSearchHistory?.(entry)}>
                <strong>{entry.query}</strong>
                <span>
                  {entry.resultCount > 0 ? `${entry.resultCount} 条命中` : '0 条命中'} · {formatSearchConfigLabel(entry.config)}
                </span>
                <time>{formatSearchHistoryAge(entry.createdAt)}</time>
              </button>
              <button
                type="button"
                class="history-delete"
                aria-label={`删除搜索记录 ${entry.query}`}
                on:click={() => onDeleteSearchHistoryEntry?.(entry.id)}
              >
                ×
              </button>
            </div>
          {/each}
        {:else}
          <p class="empty">当前筛选下还没有搜索记录。</p>
        {/if}
      </div>
    </div>
  {/if}

  <div class="search-summary">
    <strong>{searchSummaryModel.title}</strong>
    <span>{searchSummaryModel.detail}</span>
  </div>

  {#if search.results.length}
    <div class="search-result-nav" aria-label="搜索结果导航">
      <button
        type="button"
        class="history-filter-chip"
        disabled={search.results.length <= 1 || currentSearchResultIndex === 0}
        on:click={() => onNavigateSearchResult?.(-1)}
      >
        上一条
      </button>
      <span>{currentSearchResultIndex + 1} / {search.results.length}</span>
      <button
        type="button"
        class="history-filter-chip"
        disabled={search.results.length <= 1 || currentSearchResultIndex >= search.results.length - 1}
        on:click={() => onNavigateSearchResult?.(1)}
      >
        下一条
      </button>
    </div>
  {/if}

  {#if search.notice}
    <div class:error={search.notice.kind === 'error'} class="search-notice" role="status">
      {search.notice.message}
    </div>
  {/if}

  <div class="search-results" aria-label="搜索结果">
    {#if search.status === 'error'}
      <p class="empty">{search.error || '正文搜索失败。'}</p>
    {:else if search.status === 'searching' && !search.results.length}
      <p class="empty">正在整理命中的正文段落和所在章节。</p>
    {:else if search.results.length}
      {#each search.results as item}
        <button
          type="button"
          class:active-result={item.cfi === search.activeResultCfi}
          class:recent-result={item.cfi === search.recentResultCfi}
          class="search-result"
          on:click={() => onOpenSearchResult?.(item.cfi)}
        >
          <strong>{item.label || '搜索结果'}</strong>
          <span>
            {item.excerpt.pre}<mark>{item.excerpt.match}</mark>{item.excerpt.post}
          </span>
        </button>
      {/each}
    {:else if search.term.trim() && search.status === 'done'}
      <p class="empty">没有命中正文内容。</p>
    {:else}
      <p class="empty">输入关键词后，这里会显示命中的正文段落和所在章节。</p>
    {/if}
  </div>
</section>

<style>
  .search-field input {
    width: 100%;
    height: 34px;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    color: var(--text-primary);
    font: inherit;
    font-size: 13px;
  }

  .search-options {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .option-chip,
  .history-filter-chip,
  .history-clear,
  .history-delete {
    border: 0;
    font: inherit;
  }

  .option-chip,
  .history-filter-chip {
    padding: 6px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    color: var(--text-secondary);
    font-size: 11px;
    line-height: 1;
  }

  .option-chip.active,
  .history-filter-chip.active {
    background: color-mix(in srgb, var(--surface-panel) 80%, white 20%);
    color: var(--text-primary);
  }

  .history-filter-chip:disabled {
    opacity: 0.55;
  }

  .search-history {
    display: grid;
    gap: 8px;
  }

  .search-cache-status {
    display: grid;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
    box-shadow: inset 0 0 0 1px var(--border-light);
  }

  .search-cache-status div {
    display: grid;
    gap: 3px;
  }

  .search-cache-status strong {
    color: var(--text-primary);
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.3;
  }

  .search-cache-status span {
    color: var(--text-muted);
    font-size: 11px;
    line-height: 1.4;
  }

  .search-cache-status small {
    color: var(--text-muted);
    display: block;
    font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
    font-size: 11px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .search-cache-status > .history-clear {
    justify-self: start;
  }

  .search-cache-status ul {
    display: grid;
    gap: 6px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .search-cache-status li button {
    align-items: center;
    background: rgba(255, 255, 255, 0.56);
    border: 1px solid var(--border-light);
    border-radius: 12px;
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    gap: 8px;
    justify-content: space-between;
    padding: 7px 9px;
    text-align: left;
    width: 100%;
  }

  .search-cache-status li strong {
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.3;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .search-cache-status li span {
    flex: none;
  }

  .search-result-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px var(--border-light);
  }

  .search-result-nav span {
    color: var(--text-secondary);
    font-family: var(--font-chrome);
    font-size: 11px;
    line-height: 1;
  }

  .search-history-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
  }

  .search-history-head strong {
    font-size: 12px;
    line-height: 1.3;
    font-family: var(--font-chrome);
  }

  .history-actions {
    display: inline-flex;
    gap: 8px;
    align-items: center;
  }

  .search-history-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .history-clear {
    background: transparent;
    color: var(--text-muted);
    font-size: 11px;
  }

  .history-list {
    display: grid;
    gap: 6px;
  }

  .history-chip-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px;
    align-items: stretch;
  }

  .history-chip {
    display: grid;
    gap: 3px;
    align-items: start;
    justify-items: start;
    min-width: 0;
    padding: 9px 11px;
    border: 0;
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    color: var(--text-secondary);
    font: inherit;
    text-align: left;
  }

  .history-chip strong {
    color: var(--text-primary);
    font-size: 12px;
    line-height: 1.35;
  }

  .history-chip span,
  .history-chip time {
    color: var(--text-muted);
    font-family: var(--font-chrome);
    font-size: 11px;
    line-height: 1.35;
  }

  .history-delete {
    width: 28px;
    min-width: 28px;
    border-radius: 12px;
    background: transparent;
    color: var(--text-muted);
    font-size: 16px;
    line-height: 1;
  }

  .history-delete:hover,
  .history-chip:hover {
    background: color-mix(in srgb, var(--surface-panel) 80%, white 20%);
  }

  .search-summary {
    display: grid;
    gap: 2px;
    padding: 0 2px;
  }

  .search-summary strong {
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.3;
  }

  .search-summary span {
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .search-results {
    display: grid;
    gap: 8px;
  }

  .search-notice {
    padding: 8px 10px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.4;
  }

  .search-notice.error {
    background: color-mix(in srgb, #f4d8d3 72%, white 28%);
    color: #7b3a31;
    box-shadow: inset 0 0 0 1px rgba(123, 58, 49, 0.12);
  }

  .search-result {
    display: grid;
    gap: 3px;
    padding: 10px 12px;
    border: 0;
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface-reader) 93%, white 7%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border-light) 88%, transparent 12%);
    text-align: left;
  }

  .search-result strong {
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.35;
  }

  .search-result span {
    margin: 0;
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .search-result mark {
    background: color-mix(in srgb, #f4df9d 72%, white 28%);
    color: var(--text-primary);
  }

  .search-result:hover {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--surface-panel) 74%, white 26%);
  }

  .search-result.active-result {
    background: color-mix(in srgb, var(--surface-panel) 76%, white 24%);
    box-shadow:
      inset 2px 0 0 #b18952,
      inset 0 0 0 1px var(--border-light);
    color: var(--text-primary);
  }

  .search-result.recent-result {
    box-shadow:
      inset 0 0 0 1px rgba(177, 137, 82, 0.22),
      0 0 0 1px rgba(177, 137, 82, 0.08);
  }

  :is(button, input):focus-visible {
    outline: 2px solid color-mix(in srgb, var(--reader-shell-accent, #8c6a3b) 72%, white 28%);
    outline-offset: 2px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>

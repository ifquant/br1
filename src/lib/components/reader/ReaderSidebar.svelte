<script lang="ts">
  import { tick } from 'svelte';
  import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
  import type { ReaderSearchConfig, ReaderTocItem } from '$lib/reader';

  export let toc: ReaderTocItem[] = [];
  export let activeHref = '';
  export let isWindowMode = false;
  export let isPinned = true;
  export let activeTab: SidebarTab = 'toc';
  export let searchTerm = '';
  export let searchStatus: 'idle' | 'searching' | 'done' | 'error' = 'idle';
  export let searchResults: Array<{
    cfi: string;
    label: string;
    excerpt: { pre: string; match: string; post: string };
  }> = [];
  export let searchError = '';
  export let searchProgress = 0;
  export let searchHistory: string[] = [];
  export let searchConfig: ReaderSearchConfig = {
    scope: 'book',
    matchCase: false,
    matchWholeWords: false,
    matchDiacritics: false
  };
  export let searchCacheKey = '';
  export let searchNotice: { kind: 'success' | 'error'; message: string } | null = null;
  export let activeSearchResultCfi = '';
  export let recentSearchResultCfi = '';
  export let onNavigate: ((href: string) => void) | null = null;
  export let onClose: (() => void) | null = null;
  export let onToggleSidebar: (() => void) | null = null;
  export let onTogglePin: (() => void) | null = null;
  export let onTabChange: ((tab: SidebarTab) => void) | null = null;
  export let onSearch: ((query: string) => void) | null = null;
  export let onSearchResult: ((cfi: string) => void) | null = null;
  export let onSearchConfigChange: ((config: ReaderSearchConfig) => void) | null = null;
  export let onSearchHistory: ((query: string) => void) | null = null;
  export let onClearSearchHistory: (() => void) | null = null;
  export let onClearSearchCache: (() => void) | null = null;

  type SidebarTab = 'toc' | 'search' | 'notes';
  let lastScrolledHref = '';

  const scrollActiveIntoView = async () => {
    if (activeTab !== 'toc') return;
    if (!activeHref || activeHref === lastScrolledHref) return;
    await tick();

    const target = document.querySelector<HTMLButtonElement>(`.toc button[data-href="${CSS.escape(activeHref)}"]`);
    target?.scrollIntoView({ block: 'nearest' });
    lastScrolledHref = activeHref;
  };

  $: void scrollActiveIntoView();

  $: notePreview = toc.slice(0, 3).map((item, index) => ({
    key: `${item.href}-${index}`,
    title: item.label,
    excerpt: `在 ${item.label} 里留下高亮、批注和 bridge 沉淀后，会先出现在这里。`
  }));

  const handleSidebarToggle = () => {
    onToggleSidebar?.();
  };

  const handlePinToggle = () => {
    onTogglePin?.();
  };

  const setActiveTab = (tab: SidebarTab) => {
    onTabChange?.(tab);
  };

  const updateSearchConfig = <K extends keyof ReaderSearchConfig>(key: K, value: ReaderSearchConfig[K]) => {
    onSearchConfigChange?.({
      ...searchConfig,
      [key]: value
    });
  };
</script>

<aside
  class:window-mode={isWindowMode}
  class:overlay-mode={isWindowMode && !isPinned}
  class="reader-sidebar"
  aria-label="reader navigation preview"
>
  <header class="sidebar-head">
    <div class="sidebar-tools">
      <button
        type="button"
        class="ghost-button"
        aria-label="toggle sidebar"
        title="Toggle sidebar"
        on:click={handleSidebarToggle}
      >
        ☰
      </button>
      <div class="sidebar-labels">
        <span class="eyebrow">Contents</span>
        <strong>目录</strong>
      </div>
      <div class="sidebar-actions">
        {#if isWindowMode}
          <button
            type="button"
            class:active={isPinned}
            class="ghost-button pin-button"
            aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
            title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
            on:click={handlePinToggle}
          >
            {isPinned ? '📌' : '⌖'}
          </button>
        {/if}
        <button
          type="button"
          class="ghost-button"
          aria-label="Hide sidebar"
          title="Hide sidebar"
          on:click={() => onClose?.()}
        >
          ×
        </button>
      </div>
    </div>
  </header>

  <div class="tabs" role="tablist" aria-label="reader sidebar tabs">
    <button
      type="button"
      role="tab"
      class:active={activeTab === 'toc'}
      class="tab"
      aria-selected={activeTab === 'toc'}
      on:click={() => setActiveTab('toc')}
    >
      目录
    </button>
    <button
      type="button"
      role="tab"
      class:active={activeTab === 'search'}
      class="tab"
      aria-selected={activeTab === 'search'}
      on:click={() => setActiveTab('search')}
    >
      搜索
    </button>
    <button
      type="button"
      role="tab"
      class:active={activeTab === 'notes'}
      class="tab"
      aria-selected={activeTab === 'notes'}
      on:click={() => setActiveTab('notes')}
    >
      笔记
    </button>
  </div>

  <OverlayScrollbarsComponent
    defer
    element="div"
    class="sidebar-scroll"
    options={{ scrollbars: { autoHide: 'scroll', theme: 'os-theme-readest' } }}
  >
    <div class="book-chip" aria-hidden="true">
      <div class="book-spine"></div>
      <div class="book-copy">
        <strong>当前阅读</strong>
        <span>{toc.length ? `${toc.length} sections available` : 'Open a book to populate the sidebar'}</span>
      </div>
    </div>

    {#if activeTab === 'toc'}
      <nav class="toc" aria-label="table of contents preview">
        {#if toc.length}
          {#each toc as item}
            <button
              type="button"
              class:active={item.href === activeHref}
              data-href={item.href}
              style={`--toc-level:${item.level};`}
              on:click={() => onNavigate?.(item.href)}
            >
              {item.label}
            </button>
          {/each}
        {:else}
          <p class="empty">打开书后，这里会显示最小章节列表。</p>
        {/if}
      </nav>
    {:else if activeTab === 'search'}
      <section class="sidebar-panel" aria-label="search panel preview">
        <label class="search-field">
          <span class="sr-only">Search book contents</span>
          <input
            type="search"
            placeholder="搜索正文内容"
            value={searchTerm}
            on:input={(event) => onSearch?.((event.currentTarget as HTMLInputElement).value)}
          />
        </label>

        <div class="search-options" aria-label="search options">
          <button
            type="button"
            class:active={searchConfig.scope === 'book'}
            class="option-chip"
            on:click={() => updateSearchConfig('scope', 'book')}
          >
            全书
          </button>
          <button
            type="button"
            class:active={searchConfig.scope === 'section'}
            class="option-chip"
            on:click={() => updateSearchConfig('scope', 'section')}
          >
            本章
          </button>
          <button
            type="button"
            class:active={searchConfig.matchCase}
            class="option-chip"
            on:click={() => updateSearchConfig('matchCase', !searchConfig.matchCase)}
          >
            区分大小写
          </button>
          <button
            type="button"
            class:active={searchConfig.matchWholeWords}
            class="option-chip"
            on:click={() => updateSearchConfig('matchWholeWords', !searchConfig.matchWholeWords)}
          >
            整词
          </button>
          <button
            type="button"
            class:active={searchConfig.matchDiacritics}
            class="option-chip"
            on:click={() => updateSearchConfig('matchDiacritics', !searchConfig.matchDiacritics)}
          >
            保留重音
          </button>
        </div>

        {#if searchHistory.length > 0 && !searchTerm.trim()}
          <div class="search-history">
            <div class="search-history-head">
              <strong>最近搜索</strong>
              <div class="history-actions">
                <button type="button" class="history-clear" on:click={() => onClearSearchHistory?.()}>
                  清空历史
                </button>
                {#if searchCacheKey}
                  <button type="button" class="history-clear" on:click={() => onClearSearchCache?.()}>
                    清空缓存
                  </button>
                {/if}
              </div>
            </div>
            <div class="history-list">
              {#each searchHistory as item}
                <button type="button" class="history-chip" on:click={() => onSearchHistory?.(item)}>
                  {item}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <div class="search-summary">
          {#if searchStatus === 'searching'}
            <strong>Searching…</strong>
            <span>
              {#if searchProgress > 0}
                已扫描 {Math.round(searchProgress * 100)}%
              {:else}
                正在扫描当前书的正文。
              {/if}
            </span>
          {:else if searchTerm.trim()}
            <strong>{searchResults.length}</strong>
            <span>正文命中结果</span>
          {:else}
            <strong>Search</strong>
            <span>输入关键词后会在正文里搜索，而不只是过滤目录。</span>
          {/if}
        </div>

        {#if searchNotice}
          <div class:error={searchNotice.kind === 'error'} class="search-notice" role="status">
            {searchNotice.message}
          </div>
        {/if}

        <div class="search-results" aria-label="search results">
          {#if searchStatus === 'error'}
            <p class="empty">{searchError || '正文搜索失败。'}</p>
          {:else if searchResults.length}
            {#each searchResults as item}
              <button
                type="button"
                class:active-result={item.cfi === activeSearchResultCfi}
                class:recent-result={item.cfi === recentSearchResultCfi}
                class="search-result"
                on:click={() => {
                  onSearchResult?.(item.cfi);
                }}
              >
                <strong>{item.label || 'Search result'}</strong>
                <span>
                  {item.excerpt.pre}<mark>{item.excerpt.match}</mark>{item.excerpt.post}
                </span>
              </button>
            {/each}
          {:else if searchTerm.trim() && searchStatus === 'done'}
            <p class="empty">没有命中正文内容。</p>
          {:else}
            <p class="empty">打开书后，这里会显示真正的正文搜索结果。</p>
          {/if}
        </div>
      </section>
    {:else}
      <section class="sidebar-panel" aria-label="notes panel preview">
        <div class="notes-summary">
          <strong>最近笔记</strong>
          <span>这里先保留成最小的 notes surface，后续会接 Readest 风格的 annotations / notebook。</span>
        </div>

        <div class="note-list">
          {#if notePreview.length}
            {#each notePreview as note}
              <article class="note-card">
                <strong>{note.title}</strong>
                <p>{note.excerpt}</p>
              </article>
            {/each}
          {:else}
            <p class="empty">打开书并留下高亮后，这里会出现最近的笔记卡片。</p>
          {/if}
        </div>
      </section>
    {/if}
  </OverlayScrollbarsComponent>
</aside>

<style>
  .reader-sidebar {
    display: grid;
    align-content: start;
    gap: 10px;
    min-height: 0;
    height: 100%;
    padding: 10px 10px 8px;
    border: 1px solid rgba(64, 47, 24, 0.08);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 96%, white 4%);
  }

  .reader-sidebar.window-mode {
    border-top: 0;
    border-left: 0;
    border-bottom: 0;
    padding-top: 18px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 97%, white 3%);
  }

  .reader-sidebar.overlay-mode {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(320px, 42vw);
    z-index: 20;
    border-left: 0;
    box-shadow: 22px 0 40px rgba(32, 23, 10, 0.08);
  }

  .sidebar-head {
    display: grid;
    gap: 8px;
  }

  .sidebar-tools {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
  }

  .sidebar-actions {
    display: inline-flex;
    gap: 4px;
    align-items: center;
  }

  .ghost-button {
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    font: inherit;
    line-height: 1;
  }

  .ghost-button:hover {
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
    color: var(--text-primary);
  }

  .pin-button.active {
    background: color-mix(in srgb, var(--surface-reader) 86%, white 14%);
    color: var(--text-primary);
    box-shadow: inset 0 0 0 1px rgba(64, 47, 24, 0.08);
  }

  .sidebar-labels {
    display: grid;
    gap: 1px;
    min-width: 0;
  }

  .eyebrow {
    color: var(--text-muted);
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .sidebar-labels strong {
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 13px;
    line-height: 1.2;
  }

  .tabs {
    display: flex;
    gap: 0;
    padding: 1px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px rgba(64, 47, 24, 0.08);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .tab {
    flex: 1 1 0;
    padding: 5px 8px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    text-align: center;
    font-size: 10px;
    letter-spacing: 0.03em;
    font: inherit;
  }

  .tab.active {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--surface-panel) 66%, white 34%);
    box-shadow:
      inset 0 0 0 1px rgba(64, 47, 24, 0.08),
      0 1px 2px rgba(35, 25, 13, 0.05);
  }

  .tab:hover {
    color: var(--text-primary);
  }

  .toc {
    display: grid;
    gap: 3px;
    padding-top: 10px;
  }

  :global(.sidebar-scroll) {
    min-height: 0;
    height: 100%;
    overscroll-behavior: contain;
  }

  :global(.sidebar-scroll .os-scrollbar.os-theme-readest) {
    --os-size: 8px;
    --os-padding-perpendicular: 1px;
    --os-padding-axis: 1px;
    --os-track-bg: transparent;
    --os-handle-border-radius: 999px;
    --os-handle-bg: rgba(95, 85, 72, 0.12);
    --os-handle-bg-hover: rgba(95, 85, 72, 0.18);
    --os-handle-bg-active: rgba(95, 85, 72, 0.22);
  }

  .book-chip {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    padding: 10px;
    border: 1px solid rgba(64, 47, 24, 0.07);
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
  }

  .book-spine {
    width: 8px;
    min-height: 42px;
    border-radius: 4px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0)),
      linear-gradient(180deg, #c8a878, #a98350);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      0 0 0 1px rgba(84, 62, 34, 0.08);
  }

  .book-copy {
    display: grid;
    gap: 3px;
    min-width: 0;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .book-copy strong {
    font-size: 12px;
    line-height: 1.3;
  }

  .book-copy span {
    color: var(--text-muted);
    font-size: 11px;
    line-height: 1.45;
  }

  .toc button {
    width: 100%;
    padding: 8px 10px;
    padding-left: calc(10px + var(--toc-level, 0) * 10px);
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    border-radius: 6px;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 12px;
    line-height: 1.4;
    text-align: left;
  }

  .toc button.active {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--surface-reader) 82%, white 18%);
    box-shadow: inset 2px 0 0 #b18952;
  }

  .empty {
    margin: 0;
    padding: 8px 10px 0;
    color: var(--text-muted);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 12px;
    line-height: 1.5;
  }

  .sidebar-panel {
    display: grid;
    gap: 10px;
    padding-top: 10px;
  }

  .search-field input {
    width: 100%;
    height: 34px;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px rgba(64, 47, 24, 0.08);
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
  .history-chip,
  .history-clear {
    border: 0;
    font: inherit;
  }

  .option-chip,
  .history-chip {
    padding: 6px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px rgba(64, 47, 24, 0.08);
    color: var(--text-secondary);
    font-size: 11px;
    line-height: 1;
  }

  .option-chip.active {
    background: color-mix(in srgb, var(--surface-panel) 80%, white 20%);
    color: var(--text-primary);
  }

  .search-history {
    display: grid;
    gap: 8px;
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
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .history-actions {
    display: inline-flex;
    gap: 8px;
    align-items: center;
  }

  .history-clear {
    background: transparent;
    color: var(--text-muted);
    font-size: 11px;
  }

  .history-list {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .search-summary,
  .notes-summary {
    display: grid;
    gap: 2px;
    padding: 0 2px;
  }

  .search-summary strong,
  .notes-summary strong {
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 12px;
    line-height: 1.3;
  }

  .search-summary span,
  .notes-summary span {
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .search-results,
  .note-list {
    display: grid;
    gap: 8px;
  }

  .search-notice {
    padding: 8px 10px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
    box-shadow: inset 0 0 0 1px rgba(64, 47, 24, 0.08);
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.4;
  }

  .search-notice.error {
    background: color-mix(in srgb, #f4d8d3 72%, white 28%);
    color: #7b3a31;
    box-shadow: inset 0 0 0 1px rgba(123, 58, 49, 0.12);
  }

  .search-result,
  .note-card {
    display: grid;
    gap: 3px;
    padding: 10px 12px;
    border: 0;
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface-reader) 93%, white 7%);
    box-shadow: inset 0 0 0 1px rgba(64, 47, 24, 0.07);
    text-align: left;
  }

  .search-result strong,
  .note-card strong {
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 12px;
    line-height: 1.35;
  }

  .search-result span,
  .note-card p {
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
      inset 0 0 0 1px rgba(64, 47, 24, 0.08);
    color: var(--text-primary);
  }

  .search-result.recent-result {
    box-shadow:
      inset 0 0 0 1px rgba(177, 137, 82, 0.22),
      0 0 0 1px rgba(177, 137, 82, 0.08);
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

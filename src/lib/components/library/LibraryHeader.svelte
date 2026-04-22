<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { onMount } from 'svelte';

  export let totalBooks = 0;
  export let query = '';
  export let placeholder = '搜索书库、作者、标签';
  export let viewMode: 'grid' | 'list' = 'grid';
  export let sortBy: 'recent' | 'added' | 'title' | 'author' | 'format' = 'recent';
  export let groupBy: 'none' | 'author' | 'collection' | 'format' = 'none';
  export let activeGroupLabel = '';
  export let activeGroupDescription = '';
  export let activeFilter: 'all' | 'reading' | 'unstarted' | 'finished' = 'all';
  export let statusOptionCounts: Record<'all' | 'reading' | 'unstarted' | 'finished', number> = {
    all: 0,
    reading: 0,
    unstarted: 0,
    finished: 0
  };
  export let activeFormatFilter = 'all';
  export let formatOptions: string[] = [];
  export let formatOptionCounts: Record<string, number> = {};
  export let activeCollectionFilter = 'all';
  export let collectionOptions: string[] = [];
  export let collectionOptionCounts: Record<string, number> = {};
  export let activeTagFilter = 'all';
  export let tagOptions: string[] = [];
  export let tagOptionCounts: Record<string, number> = {};
  export let importDisabled = false;
  export let statusSummary = '';
  export let activeFilterDetail = '';
  export let activeFilterChips: Array<{
    id: 'query' | 'status' | 'format' | 'collection' | 'tag';
    label: string;
  }> = [];
  export let filterSummary = '';
  export let formatSummary = '';
  export let collectionSummary = '';
  export let tagSummary = '';
  export let coverSummary = '';

  let sortMenuOpen = false;
  let advancedFiltersOpen = false;
  let sortMenuElement: HTMLDivElement | null = null;

  const dispatch = createEventDispatcher<{
    querychange: { query: string };
    importbooks: void;
    viewmodechange: { viewMode: 'grid' | 'list' };
    sortchange: { sortBy: 'recent' | 'added' | 'title' | 'author' | 'format' };
    groupbychange: { groupBy: 'none' | 'author' | 'collection' | 'format' };
    filterchange: { filterBy: 'all' | 'reading' | 'unstarted' | 'finished' };
    formatfilterchange: { format: string };
    collectionfilterchange: { collection: string };
    tagfilterchange: { tag: string };
    clearfilterchip: { id: 'query' | 'status' | 'format' | 'collection' | 'tag' };
    clearfilters: void;
    exitgroup: void;
  }>();

  const actions = [
    {
      label: '导入书籍',
      className: 'plus',
      svg: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.25v11.5M4.25 10h11.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7"/></svg>`
    },
    {
      label: '更多操作',
      className: 'view',
      svg: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="5" cy="10" r="1.35" fill="currentColor"/><circle cx="10" cy="10" r="1.35" fill="currentColor"/><circle cx="15" cy="10" r="1.35" fill="currentColor"/></svg>`
    }
  ];

  const sortOptions = [
    { value: 'recent', label: '最近阅读' },
    { value: 'added', label: '最近导入' },
    { value: 'title', label: '书名' },
    { value: 'author', label: '作者' },
    { value: 'format', label: '格式' }
  ] as const;

  const filterOptions = [
    { value: 'all', label: '全部' },
    { value: 'reading', label: '在读' },
    { value: 'unstarted', label: '未开始' },
    { value: 'finished', label: '已读完' }
  ] as const;

  const groupOptions = [
    { value: 'none', label: '不分组', detail: '平铺书库' },
    { value: 'author', label: '按作者', detail: '作者书架' },
    { value: 'collection', label: '按归类', detail: '书架归类' },
    { value: 'format', label: '按格式', detail: '阅读格式' }
  ] as const;

  $: derivedPlaceholder =
    query || totalBooks <= 0 ? placeholder : `在 ${totalBooks} 本书籍中搜索...`;
  $: advancedFiltersAvailable =
    formatOptions.length > 0 ||
    collectionOptions.length > 0 ||
    tagOptions.length > 0 ||
    !!statusSummary ||
    !!activeFilterDetail ||
    activeFilterChips.length > 0 ||
    !!formatSummary ||
    !!collectionSummary ||
    !!tagSummary ||
    !!coverSummary ||
    !!filterSummary;
  $: advancedFiltersActive =
    activeFormatFilter !== 'all' ||
    activeCollectionFilter !== 'all' ||
    activeTagFilter !== 'all' ||
    activeFilterChips.some((chip) => chip.id !== 'query' && chip.id !== 'status') ||
    !!filterSummary;
  $: showAdvancedFilters = advancedFiltersOpen || advancedFiltersActive;

  const handleQueryInput = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    dispatch('querychange', { query: input.value });
  };

  const handleImportBooks = () => {
    dispatch('importbooks');
  };

  const handleFilterChange = (nextFilterBy: 'all' | 'reading' | 'unstarted' | 'finished') => {
    if (nextFilterBy === activeFilter) return;
    dispatch('filterchange', { filterBy: nextFilterBy });
  };

  const handleFormatFilterChange = (nextFormat: string) => {
    if (nextFormat === activeFormatFilter) return;
    dispatch('formatfilterchange', { format: nextFormat });
  };

  const handleCollectionFilterChange = (nextCollection: string) => {
    if (nextCollection === activeCollectionFilter) return;
    dispatch('collectionfilterchange', { collection: nextCollection });
  };

  const handleTagFilterChange = (nextTag: string) => {
    if (nextTag === activeTagFilter) return;
    dispatch('tagfilterchange', { tag: nextTag });
  };

  const handleClearFilters = () => {
    dispatch('clearfilters');
  };

  const handleExitGroup = () => {
    dispatch('exitgroup');
  };

  const handleClearFilterChip = (id: 'query' | 'status' | 'format' | 'collection' | 'tag') => {
    dispatch('clearfilterchip', { id });
  };

  const handleViewModeChange = (nextViewMode: 'grid' | 'list') => {
    if (nextViewMode === viewMode) return;
    dispatch('viewmodechange', { viewMode: nextViewMode });
  };

  const handleSortChange = (nextSortBy: 'recent' | 'added' | 'title' | 'author' | 'format') => {
    if (nextSortBy === sortBy) {
      return;
    }
    dispatch('sortchange', { sortBy: nextSortBy });
    sortMenuOpen = false;
  };

  const handleGroupByChange = (nextGroupBy: 'none' | 'author' | 'collection' | 'format') => {
    if (nextGroupBy === groupBy) {
      sortMenuOpen = false;
      return;
    }
    dispatch('groupbychange', { groupBy: nextGroupBy });
    sortMenuOpen = false;
  };

  const handleToggleSortMenu = () => {
    sortMenuOpen = !sortMenuOpen;
  };

  const handleToggleAdvancedFilters = () => {
    advancedFiltersOpen = !advancedFiltersOpen;
  };

  const handleWindowClick = (event: MouseEvent) => {
    if (!sortMenuOpen || !sortMenuElement) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (sortMenuElement.contains(target)) return;
    sortMenuOpen = false;
  };

  const handleWindowKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      sortMenuOpen = false;
    }
  };

  onMount(() => {
    return () => {
      sortMenuOpen = false;
    };
  });
</script>

<svelte:window on:click={handleWindowClick} on:keydown={handleWindowKeydown} />

<header class="library-header">
  <div class="search-shell" aria-label="书库搜索">
    <span class="search-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20">
        <circle cx="8.25" cy="8.25" r="4.6" fill="none" stroke="currentColor" stroke-width="1.55"></circle>
        <path d="M11.75 11.75L15.6 15.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.55"></path>
      </svg>
    </span>
    <input
      type="search"
      value={query}
      placeholder={derivedPlaceholder}
      spellcheck="false"
      aria-label="搜索书籍"
      on:input={handleQueryInput}
    />
  </div>

  <div class="actions" aria-label="书库操作">
    <div class="modes" aria-label="书库视图模式">
      <button
        type="button"
        class:active={viewMode === 'grid'}
        class="mode"
        aria-label="网格视图"
        aria-pressed={viewMode === 'grid'}
        on:click={() => handleViewModeChange('grid')}
      >
        网格
      </button>
      <button
        type="button"
        class:active={viewMode === 'list'}
        class="mode"
        aria-label="列表视图"
        aria-pressed={viewMode === 'list'}
        on:click={() => handleViewModeChange('list')}
      >
        列表
      </button>
    </div>
    {#each actions as action}
      {#if action.className === 'view'}
        <div bind:this={sortMenuElement} class:open={sortMenuOpen} class="menu-shell">
          <button
            type="button"
            class={`ghost ${action.className}`}
            aria-label={action.label}
            aria-expanded={sortMenuOpen}
            aria-haspopup="menu"
            on:click={handleToggleSortMenu}
          >
            <span aria-hidden="true">{@html action.svg}</span>
          </button>

          {#if sortMenuOpen}
            <div class="sort-menu" role="menu" aria-label="书库浏览选项">
              <span class="sort-menu-label">排序方式</span>
              {#each sortOptions as option}
                <button
                  type="button"
                  class:active-sort={sortBy === option.value}
                  class="sort-option"
                  role="menuitemradio"
                  aria-checked={sortBy === option.value}
                  on:click={() => handleSortChange(option.value)}
                >
                  <span>{option.label}</span>
                  {#if sortBy === option.value}
                    <small>当前</small>
                  {/if}
                </button>
              {/each}

              <span class="sort-menu-label secondary-label">书库分组</span>
              {#each groupOptions as option}
                <button
                  type="button"
                  class:active-sort={groupBy === option.value}
                  class="sort-option"
                  role="menuitemradio"
                  aria-checked={groupBy === option.value}
                  on:click={() => handleGroupByChange(option.value)}
                >
                  <span>{option.label}</span>
                  <small>{groupBy === option.value ? '当前' : option.detail}</small>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {:else}
        <button
          type="button"
          class={`ghost ${action.className}`}
          aria-label={action.label}
          disabled={importDisabled}
          on:click={handleImportBooks}
        >
          <span aria-hidden="true">{@html action.svg}</span>
        </button>
      {/if}
    {/each}
  </div>
</header>

{#if activeGroupLabel}
  <div class="group-context" aria-label="当前书库分组路径">
    <button type="button" class="group-context-back" on:click={handleExitGroup}>
      返回整库
    </button>
    <div class="group-context-copy">
      <span class="group-context-type">
        {groupBy === 'author' ? '作者' : groupBy === 'collection' ? '归类' : groupBy === 'format' ? '格式' : '分组'}
      </span>
      <strong>{activeGroupLabel}</strong>
      {#if activeGroupDescription}
        <small>{activeGroupDescription}</small>
      {/if}
    </div>
  </div>
{/if}

<div class="filter-row" aria-label="书库筛选">
  {#each filterOptions as option}
    <button
      type="button"
      class:active-filter={activeFilter === option.value}
      class="filter-pill"
      aria-label={option.label}
      aria-pressed={activeFilter === option.value}
      on:click={() => handleFilterChange(option.value)}
    >
      <span>{option.label}</span>
      <small aria-hidden="true">{statusOptionCounts[option.value] ?? 0} 本</small>
    </button>
  {/each}

  {#if advancedFiltersAvailable}
    <button
      type="button"
      class:active-filter={advancedFiltersActive}
      class:open={showAdvancedFilters}
      class="filter-pill advanced-toggle"
      aria-expanded={showAdvancedFilters}
      aria-controls="library-advanced-filters"
      on:click={handleToggleAdvancedFilters}
    >
      <span>筛选</span>
      <small>{advancedFiltersActive ? '已应用' : showAdvancedFilters ? '收起' : '更多'}</small>
    </button>
  {/if}

  {#if showAdvancedFilters}
    <div id="library-advanced-filters" class="advanced-filter-row" aria-label="高级书库筛选">
      {#if formatOptions.length > 0}
        <span class="filter-divider" aria-hidden="true"></span>
        <div class="format-filters" aria-label="书库格式筛选">
          <button
            type="button"
            class:active-filter={activeFormatFilter === 'all'}
            class="filter-pill format-pill"
            aria-pressed={activeFormatFilter === 'all'}
            on:click={() => handleFormatFilterChange('all')}
          >
            <span>全部格式</span>
            <small>{formatOptions.length} 种</small>
          </button>
          {#each formatOptions as format}
            <button
              type="button"
              class:active-filter={activeFormatFilter === format}
              class="filter-pill format-pill"
              aria-pressed={activeFormatFilter === format}
              on:click={() => handleFormatFilterChange(format)}
            >
              <span>{format}</span>
              <small>{formatOptionCounts[format] ?? 0} 本</small>
            </button>
          {/each}
        </div>
      {/if}

      {#if collectionOptions.length > 0}
        <span class="filter-divider" aria-hidden="true"></span>
        <div class="collection-filters" aria-label="书库归类筛选">
          <button
            type="button"
            class:active-filter={activeCollectionFilter === 'all'}
            class="filter-pill collection-pill"
            aria-pressed={activeCollectionFilter === 'all'}
            on:click={() => handleCollectionFilterChange('all')}
          >
            <span>全部归类</span>
            <small>{collectionOptions.length} 组</small>
          </button>
          {#each collectionOptions as collection}
            <button
              type="button"
              class:active-filter={activeCollectionFilter === collection}
              class="filter-pill collection-pill"
              aria-pressed={activeCollectionFilter === collection}
              on:click={() => handleCollectionFilterChange(collection)}
            >
              <span>{collection}</span>
              <small>{collectionOptionCounts[collection] ?? 0} 本</small>
            </button>
          {/each}
        </div>
      {/if}

      {#if tagOptions.length > 0}
        <span class="filter-divider" aria-hidden="true"></span>
        <div class="tag-filters" aria-label="书库标签筛选">
          <button
            type="button"
            class:active-filter={activeTagFilter === 'all'}
            class="filter-pill tag-pill"
            aria-pressed={activeTagFilter === 'all'}
            on:click={() => handleTagFilterChange('all')}
          >
            <span>全部标签</span>
            <small>{tagOptions.length} 个</small>
          </button>
          {#each tagOptions as tag}
            <button
              type="button"
              class:active-filter={activeTagFilter === tag}
              class="filter-pill tag-pill"
              aria-pressed={activeTagFilter === tag}
              on:click={() => handleTagFilterChange(tag)}
            >
              <span>{tag}</span>
              <small>{tagOptionCounts[tag] ?? 0} 本</small>
            </button>
          {/each}
        </div>
      {/if}

      {#if statusSummary}
        <span class="status-summary" aria-label="书库状态摘要">{statusSummary}</span>
      {/if}
      {#if activeFilterDetail}
        <span class="active-filter-detail" aria-label="书库当前筛选详情">
          {activeFilterDetail}
        </span>
      {/if}
      {#if activeFilterChips.length > 0}
        <div class="active-filter-chips" aria-label="书库当前筛选条件">
          {#each activeFilterChips as chip}
            <button
              type="button"
              class="active-filter-chip"
              aria-label={`移除书库筛选：${chip.label}`}
              on:click={() => handleClearFilterChip(chip.id)}
            >
              <span>{chip.label}</span>
              <small>移除</small>
            </button>
          {/each}
        </div>
      {/if}
      {#if formatSummary}
        <span class="metadata-summary format-summary" aria-label="书库格式摘要">{formatSummary}</span>
      {/if}
      {#if collectionSummary}
        <span class="metadata-summary" aria-label="书库归类摘要">{collectionSummary}</span>
      {/if}
      {#if tagSummary}
        <span class="metadata-summary tag-summary" aria-label="书库标签摘要">{tagSummary}</span>
      {/if}
      {#if coverSummary}
        <span class="metadata-summary cover-summary" aria-label="书库封面摘要">{coverSummary}</span>
      {/if}
      {#if filterSummary}
        <span class="filter-summary" aria-label="书库筛选摘要">{filterSummary}</span>
        <button
          type="button"
          class="clear-filters"
          aria-label="清除书库筛选"
          on:click={handleClearFilters}
        >
          清除筛选
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .library-header {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 0 0 8px;
    font-family: var(--font-chrome);
    border-bottom: 1px solid var(--line-soft);
  }

  .filter-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0 12px;
    flex-wrap: wrap;
    border-bottom: 1px solid color-mix(in srgb, var(--line-soft) 82%, transparent);
    margin-bottom: 2px;
  }

  .group-context {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0 4px;
    flex-wrap: wrap;
  }

  .group-context-back {
    width: auto;
    min-height: 28px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 80%, white 20%);
    background: color-mix(in srgb, var(--surface-elevated) 82%, white 18%);
    color: var(--text-secondary);
    font: 600 11px/1 var(--font-chrome);
    letter-spacing: 0.01em;
  }

  .group-context-back:hover {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--surface-elevated) 72%, white 28%);
  }

  .group-context-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .group-context-type {
    color: var(--text-muted);
    font: 600 10px/1 var(--font-chrome);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .group-context-copy strong {
    color: var(--text-primary);
    font: 600 13px/1.2 var(--font-chrome);
  }

  .group-context-copy small {
    color: var(--text-secondary);
    font: 500 10px/1.3 var(--font-chrome);
  }

  .advanced-filter-row {
    display: flex;
    align-items: center;
    flex: 1 0 100%;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
  }

  .status-summary {
    display: inline-flex;
    align-items: center;
    min-height: 23px;
    padding: 0 10px;
    border-radius: 999px;
    background: color-mix(in srgb, #cf7a35 10%, white 90%);
    color: color-mix(in srgb, #7c4619 86%, var(--text-secondary) 14%);
    font: 600 10px/1 var(--font-chrome);
    letter-spacing: 0.01em;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, #cf7a35 20%, white 80%);
  }

  .filter-summary {
    display: inline-flex;
    align-items: center;
    min-height: 23px;
    padding: 0 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 82%, white 18%);
    color: var(--text-secondary);
    font: 600 10px/1 var(--font-chrome);
    letter-spacing: 0.01em;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--line-soft) 82%, white 18%);
  }

  .active-filter-detail {
    display: inline-flex;
    align-items: center;
    min-height: 23px;
    padding: 0 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent-warm) 10%, white 90%);
    color: color-mix(in srgb, #73481f 84%, var(--text-secondary) 16%);
    font: 650 10px/1 var(--font-chrome);
    letter-spacing: 0.01em;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-warm) 22%, white 78%);
  }

  .active-filter-chips {
    display: contents;
  }

  .active-filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    width: auto;
    min-width: max-content;
    min-height: 23px;
    border: 1px solid color-mix(in srgb, var(--accent-warm) 22%, white 78%);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 72%, white 28%);
    color: color-mix(in srgb, #73481f 84%, var(--text-secondary) 16%);
    font: 650 10px/1 var(--font-chrome);
    padding: 0 9px 0 10px;
    white-space: nowrap;
  }

  .active-filter-chip span {
    width: auto;
    height: auto;
    justify-content: flex-start;
    line-height: inherit;
    transform: none;
    white-space: nowrap;
  }

  .active-filter-chip small {
    color: color-mix(in srgb, currentColor 68%, transparent);
    font-size: 9px;
    font-weight: 700;
  }

  .active-filter-chip:hover {
    background: color-mix(in srgb, var(--surface-panel) 62%, white 38%);
    color: var(--text-primary);
  }

  .metadata-summary {
    display: inline-flex;
    align-items: center;
    min-height: 23px;
    padding: 0 10px;
    border-radius: 999px;
    background: color-mix(in srgb, #e7d3ad 14%, white 86%);
    color: color-mix(in srgb, #6f4c20 82%, var(--text-secondary) 18%);
    font: 600 10px/1 var(--font-chrome);
    letter-spacing: 0.01em;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, #b99661 20%, white 80%);
  }

  .metadata-summary.tag-summary {
    background: color-mix(in srgb, #cfdcc1 16%, white 84%);
    color: color-mix(in srgb, #49612f 82%, var(--text-secondary) 18%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, #8da36b 20%, white 80%);
  }

  .metadata-summary.format-summary {
    background: color-mix(in srgb, #d8c8e5 14%, white 86%);
    color: color-mix(in srgb, #5e4771 82%, var(--text-secondary) 18%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, #a58abc 20%, white 80%);
  }

  .metadata-summary.cover-summary {
    background: color-mix(in srgb, #c9d8e8 16%, white 84%);
    color: color-mix(in srgb, #365a78 82%, var(--text-secondary) 18%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, #7f9db8 20%, white 80%);
  }

  .clear-filters {
    width: auto;
    height: 23px;
    padding: 0 10px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 82%, white 18%);
    background: color-mix(in srgb, var(--surface-panel) 78%, white 22%);
    color: var(--text-secondary);
    font-size: 10px;
    font-weight: 600;
  }

  .clear-filters:hover {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--surface-panel) 68%, white 32%);
  }

  .collection-filters {
    display: contents;
  }

  .format-filters {
    display: contents;
  }

  .tag-filters {
    display: contents;
  }

  .filter-divider {
    width: 1px;
    height: 18px;
    margin-inline: 2px;
    background: color-mix(in srgb, var(--line-soft) 86%, transparent);
  }

  .filter-pill {
    display: inline-flex;
    align-items: center;
    width: auto;
    min-width: max-content;
    height: auto;
    min-height: 26px;
    flex: 0 0 auto;
    gap: 5px;
    border: 0;
    border-radius: 999px;
    padding: 6px 11px;
    background: color-mix(in srgb, var(--surface-panel) 84%, white 16%);
    color: var(--text-muted);
    font: 500 11px/1 var(--font-chrome);
    letter-spacing: 0.01em;
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--line-soft) 85%, white 15%),
      0 1px 0 rgba(255, 255, 255, 0.28);
    transition:
      color 140ms ease,
      background 140ms ease,
      box-shadow 140ms ease;
    white-space: nowrap;
  }

  .filter-pill span {
    width: auto;
    height: auto;
    justify-content: flex-start;
    line-height: inherit;
    transform: none;
    white-space: nowrap;
  }

  .filter-pill small {
    color: color-mix(in srgb, currentColor 72%, transparent);
    font-size: 9px;
    font-weight: 650;
    line-height: 1;
  }

  .filter-pill:hover {
    color: var(--text-secondary);
    background: color-mix(in srgb, var(--surface-panel) 76%, white 24%);
  }

  .filter-pill.active-filter {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--accent-warm) 14%, var(--surface-panel) 86%);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--accent-warm) 28%, white 72%),
      0 6px 16px rgba(128, 84, 44, 0.08);
  }

  .advanced-toggle {
    background: color-mix(in srgb, var(--surface-reader) 58%, var(--surface-panel) 42%);
  }

  .advanced-toggle.open {
    color: var(--text-primary);
  }

  .collection-pill {
    background: color-mix(in srgb, #e7d3ad 16%, var(--surface-panel) 84%);
  }

  .tag-pill {
    background: color-mix(in srgb, #cfdcc1 18%, var(--surface-panel) 82%);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0;
    flex: 0 0 auto;
  }

  .menu-shell {
    position: relative;
  }

  .search-shell {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    min-width: 0;
    height: 30px;
    padding: 0 12px 0 33px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 62%, white 38%);
    color: var(--text-muted);
    box-shadow:
      inset 0 0 0 1px var(--border-light),
      0 1px 0 rgba(255, 255, 255, 0.34);
  }

  .search-icon {
    position: absolute;
    left: 11px;
    top: 50%;
    width: 13px;
    height: 13px;
    font-size: 12px;
    line-height: 1;
    opacity: 0.62;
    transform: translateY(-50%);
  }

  .search-icon svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: -0.01em;
    font-family: inherit;
    appearance: none;
  }

  input::placeholder {
    color: color-mix(in srgb, var(--text-muted) 86%, white 14%);
    opacity: 1;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border-radius: 999px;
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }

  button span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    line-height: 1;
    transform: translateY(-0.25px);
  }

  button span :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  button.ghost:hover {
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
    color: var(--text-primary);
  }

  .menu-shell.open button.ghost,
  .mode.active {
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
    color: var(--text-primary);
  }

  .sort-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    z-index: 3;
    min-width: 156px;
    display: grid;
    gap: 4px;
    padding: 10px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 82%, white 18%);
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 92%, white 8%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      0 16px 32px rgba(42, 30, 15, 0.08);
  }

  .sort-menu-label {
    padding: 2px 4px 6px;
    color: var(--text-muted);
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .sort-menu-label.secondary-label {
    margin-top: 4px;
    padding-top: 10px;
    border-top: 1px solid color-mix(in srgb, var(--line-soft) 78%, transparent);
  }

  .sort-option {
    width: 100%;
    height: auto;
    justify-content: space-between;
    padding: 9px 10px;
    border-radius: 10px;
    font-size: 12px;
  }

  .sort-option:hover,
  .sort-option.active-sort {
    background: color-mix(in srgb, var(--surface-reader) 82%, white 18%);
    color: var(--text-primary);
  }

  .sort-option small {
    color: var(--text-muted);
    font-size: 9px;
    line-height: 1;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  button:disabled {
    cursor: default;
    opacity: 0.5;
  }

  @media (max-width: 900px) {
    .search-shell {
      min-width: 0;
    }

    .filter-row {
      flex-wrap: nowrap;
      overflow-x: auto;
      overflow-y: hidden;
      gap: 7px;
      padding: 8px 0 10px;
      margin-inline: -14px;
      padding-inline: 14px;
      scroll-padding-inline: 14px;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }

    .advanced-filter-row {
      flex: 0 0 auto;
      flex-wrap: nowrap;
      gap: 7px;
    }

    .filter-row::-webkit-scrollbar {
      display: none;
    }

    .filter-divider {
      display: none;
    }

    .metadata-summary,
    .status-summary,
    .active-filter-detail,
    .filter-summary,
    .clear-filters {
      flex: 0 0 auto;
    }
  }
</style>

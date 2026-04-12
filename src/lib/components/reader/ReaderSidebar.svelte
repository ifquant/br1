<script lang="ts">
  import { tick } from 'svelte';
  import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
  import type {
    ReaderBookmarksState,
    ReaderPreviewState,
    ReaderSearchConfig,
    ReaderSidebarCallbacks,
    ReaderSidebarNotesState,
    ReaderSidebarSearchState,
    ReaderTocItem,
    SidebarTab
  } from '$lib/reader';

  export let toc: ReaderTocItem[] = [];
  export let activeHref = '';
  export let isWindowMode = false;
  export let isPinned = true;
  export let activeTab: SidebarTab = 'toc';
  export let coverUrl = '';
  export let preview: ReaderPreviewState = {
    title: 'Bridge Reader',
    author: 'Open a book to start reading',
    chapterLabel: 'Waiting for book',
    chapterHref: '',
    progressLabel: '0%',
    locationLabel: 'Not opened',
    formatLabel: 'BOOK',
    layoutLabel: 'WAITING',
    progressFraction: 0,
    progressLocation: ''
  };
  export let search: ReaderSidebarSearchState = {
    term: '',
    status: 'idle',
    results: [],
    error: '',
    progress: 0,
    history: [],
    config: {
      scope: 'book',
      matchCase: false,
      matchWholeWords: false,
      matchDiacritics: false
    },
    cacheKey: '',
    notice: null,
    activeResultCfi: '',
    recentResultCfi: ''
  };
  export let notesState: ReaderSidebarNotesState = {
    activeCfi: '',
    selection: null,
    notes: []
  };
  export let bookmarksState: ReaderBookmarksState = {
    activeLocator: '',
    bookmarks: []
  };
  export let callbacks: ReaderSidebarCallbacks = {
    onNavigate: null,
    onToggleCurrentBookmark: null,
    onOpenBookmark: null,
    onDeleteBookmark: null,
    onGoToLibrary: null,
    onOpenSourcePath: null,
    onClose: null,
    onToggleSidebar: null,
    onTogglePin: null,
    onTabChange: null,
    onSearch: null,
    onSearchResult: null,
    onSearchConfigChange: null,
    onSearchHistory: null,
    onClearSearchHistory: null,
    onClearSearchCache: null,
    onAddNote: null,
    onOpenNote: null,
    onEditNote: null,
    onDeleteNote: null
  };
  let lastScrolledHref = '';
  let lastScrolledNoteCfi = '';
  let lastScrolledBookmarkLocator = '';
  let bookMenuOpen = false;
  let notesFilter: 'all' | 'chapter' = 'all';
  let bookmarksFilter: 'all' | 'chapter' = 'all';
  let bookmarksSort: 'recent' | 'chapter' = 'recent';
  let collapsedNoteGroups = new Set<string>();

  const scrollActiveIntoView = async () => {
    if (activeTab !== 'toc') return;
    if (!activeHref || activeHref === lastScrolledHref) return;
    await tick();

    const target = document.querySelector<HTMLButtonElement>(`.toc button[data-href="${CSS.escape(activeHref)}"]`);
    target?.scrollIntoView({ block: 'nearest' });
    lastScrolledHref = activeHref;
  };

  $: void scrollActiveIntoView();

  const scrollActiveNoteIntoView = async () => {
    if (activeTab !== 'notes') return;
    if (!notesState.activeCfi || notesState.activeCfi === lastScrolledNoteCfi) return;
    await tick();

    const target = document.querySelector<HTMLElement>(
      `.note-card[data-note-cfi="${CSS.escape(notesState.activeCfi)}"]`
    );
    target?.scrollIntoView({ block: 'nearest' });
    lastScrolledNoteCfi = notesState.activeCfi;
  };

  $: void scrollActiveNoteIntoView();

  const scrollActiveBookmarkIntoView = async () => {
    if (activeTab !== 'bookmarks') return;
    if (!bookmarksState.activeLocator || bookmarksState.activeLocator === lastScrolledBookmarkLocator) return;
    await tick();

    const target = document.querySelector<HTMLElement>(
      `.bookmark-card[data-bookmark-locator="${CSS.escape(bookmarksState.activeLocator)}"]`
    );
    target?.scrollIntoView({ block: 'nearest' });
    lastScrolledBookmarkLocator = bookmarksState.activeLocator;
  };

  $: void scrollActiveBookmarkIntoView();

  const formatTimestamp = (value: number) =>
    new Date(value).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const handleSidebarToggle = () => {
    callbacks.onToggleSidebar?.();
  };

  const handlePinToggle = () => {
    callbacks.onTogglePin?.();
  };

  const setActiveTab = (tab: SidebarTab) => {
    callbacks.onTabChange?.(tab);
  };

  const updateSearchConfig = <K extends keyof ReaderSearchConfig>(key: K, value: ReaderSearchConfig[K]) => {
    callbacks.onSearchConfigChange?.({
      ...search.config,
      [key]: value
    });
  };

  const toggleBookMenu = () => {
    bookMenuOpen = !bookMenuOpen;
  };

  const closeBookMenu = () => {
    bookMenuOpen = false;
  };

  const runBookMenuAction = (action: (() => void) | null | undefined) => {
    closeBookMenu();
    action?.();
  };

  const handleWindowPointerDown = (event: MouseEvent) => {
    if (!bookMenuOpen) return;
    const target = event.target;
    if (target instanceof Element && target.closest('.book-menu-anchor')) return;
    closeBookMenu();
  };

  const handleWindowKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeBookMenu();
    }
  };

  $: hasOpenedBook = !!preview.progressLocation || preview.title !== 'Bridge Reader';
  $: isCurrentLocationBookmarked =
    !!bookmarksState.activeLocator &&
    bookmarksState.bookmarks.some((bookmark) => bookmark.locator === bookmarksState.activeLocator);
  $: filteredBookmarks =
    bookmarksFilter === 'chapter' && activeHref
      ? bookmarksState.bookmarks.filter((bookmark) => bookmark.chapterHref === activeHref)
      : bookmarksState.bookmarks;
  $: sortedBookmarks =
    bookmarksSort === 'chapter'
      ? [...filteredBookmarks].sort((left, right) => {
          const chapterCompare = (left.chapterLabel || '').localeCompare(right.chapterLabel || '', 'zh-CN');
          if (chapterCompare !== 0) return chapterCompare;
          return right.createdAt - left.createdAt;
        })
      : filteredBookmarks;
  $: filteredNotes =
    notesFilter === 'chapter' && activeHref
      ? notesState.notes.filter((note) => note.chapterHref === activeHref)
      : notesState.notes;
  $: groupedNotes = filteredNotes.reduce<Array<{ chapterHref: string; chapterLabel: string; notes: typeof filteredNotes }>>(
    (groups, note) => {
      const chapterHref = note.chapterHref || '__unknown__';
      const chapterLabel = note.chapterLabel || '未命名章节';
      const existingGroup = groups.find((group) => group.chapterHref === chapterHref);
      if (existingGroup) {
        existingGroup.notes.push(note);
        return groups;
      }

      groups.push({
        chapterHref,
        chapterLabel,
        notes: [note]
      });
      return groups;
    },
    []
  );
  $: collapsibleGroupKeys = groupedNotes
    .map((group) => group.chapterHref)
    .filter((chapterHref) => chapterHref && chapterHref !== '__unknown__');
  $: areAllNoteGroupsExpanded =
    collapsibleGroupKeys.length > 0 &&
    collapsibleGroupKeys.every((chapterHref) => !collapsedNoteGroups.has(chapterHref));
  $: areAllNoteGroupsCollapsed =
    collapsibleGroupKeys.length > 0 &&
    collapsibleGroupKeys.every((chapterHref) => collapsedNoteGroups.has(chapterHref));
  $: {
    const activeNote = notesState.notes.find((note) => note.cfi === notesState.activeCfi);
    if (activeNote?.chapterHref) {
      collapsedNoteGroups.delete(activeNote.chapterHref);
      collapsedNoteGroups = new Set(collapsedNoteGroups);
    }
  }

  const isNoteGroupCollapsed = (chapterHref: string) => collapsedNoteGroups.has(chapterHref);

  const toggleNoteGroup = (chapterHref: string) => {
    if (!chapterHref || chapterHref === '__unknown__') return;
    if (collapsedNoteGroups.has(chapterHref)) {
      collapsedNoteGroups.delete(chapterHref);
    } else {
      collapsedNoteGroups.add(chapterHref);
    }
    collapsedNoteGroups = new Set(collapsedNoteGroups);
  };

  const expandAllNoteGroups = () => {
    collapsedNoteGroups = new Set();
  };

  const collapseAllNoteGroups = () => {
    collapsedNoteGroups = new Set(collapsibleGroupKeys);
  };
</script>

<svelte:window on:mousedown={handleWindowPointerDown} on:keydown={handleWindowKeydown} />

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
          on:click={() => callbacks.onClose?.()}
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
      class:active={activeTab === 'bookmarks'}
      class="tab"
      aria-selected={activeTab === 'bookmarks'}
      on:click={() => setActiveTab('bookmarks')}
    >
      书签
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
    <div class="book-chip">
      <div class="book-visual" aria-hidden="true">
        {#if coverUrl}
          <img class="book-cover-image" src={coverUrl} alt="" loading="lazy" />
        {:else}
          <div class="book-spine"></div>
        {/if}
      </div>
      <div class="book-copy">
        <span class="book-kicker">{preview.formatLabel} · {preview.layoutLabel}</span>
        <strong>{preview.title}</strong>
        <span>{preview.author}</span>
        <span>{preview.chapterLabel}</span>
        <div class="book-stats">
          <span>{preview.progressLabel}</span>
          <span>{preview.locationLabel}</span>
        </div>
        <div class="book-meta-row">
          <span>{toc.length} 章节</span>
          <span>{bookmarksState.bookmarks.length} 书签</span>
          <span>{notesState.notes.length} 笔记</span>
        </div>
        <div class="book-actions-row">
          <button type="button" class="book-action-chip primary" on:click={() => callbacks.onGoToLibrary?.()}>
            回到书库
          </button>
          <div class="book-menu-anchor">
            <button
              type="button"
              class:active={bookMenuOpen}
              class="book-action-chip menu-trigger"
              aria-label="更多书籍操作"
              aria-expanded={bookMenuOpen}
              on:click={toggleBookMenu}
            >
              ⋯
            </button>

            {#if bookMenuOpen}
              <div class="book-action-menu" role="menu" aria-label="书籍更多操作">
                <button type="button" role="menuitem" on:click={() => runBookMenuAction(callbacks.onGoToLibrary)}>
                  回到书库
                </button>
                {#if callbacks.onOpenSourcePath}
                  <button type="button" role="menuitem" on:click={() => runBookMenuAction(callbacks.onOpenSourcePath)}>
                    打开原文件
                  </button>
                {/if}
              </div>
            {/if}
          </div>
        </div>
        {#if !hasOpenedBook}
          <p class="book-empty">打开一本书后，这里会显示更完整的书籍信息。</p>
        {/if}
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
              on:click={() => callbacks.onNavigate?.(item.href)}
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
            value={search.term}
            on:input={(event) => callbacks.onSearch?.((event.currentTarget as HTMLInputElement).value)}
          />
        </label>

        <div class="search-options" aria-label="search options">
          <button
            type="button"
            class:active={search.config.scope === 'book'}
            class="option-chip"
            on:click={() => updateSearchConfig('scope', 'book')}
          >
            全书
          </button>
          <button
            type="button"
            class:active={search.config.scope === 'section'}
            class="option-chip"
            on:click={() => updateSearchConfig('scope', 'section')}
          >
            本章
          </button>
          <button
            type="button"
            class:active={search.config.matchCase}
            class="option-chip"
            on:click={() => updateSearchConfig('matchCase', !search.config.matchCase)}
          >
            区分大小写
          </button>
          <button
            type="button"
            class:active={search.config.matchWholeWords}
            class="option-chip"
            on:click={() => updateSearchConfig('matchWholeWords', !search.config.matchWholeWords)}
          >
            整词
          </button>
          <button
            type="button"
            class:active={search.config.matchDiacritics}
            class="option-chip"
            on:click={() => updateSearchConfig('matchDiacritics', !search.config.matchDiacritics)}
          >
            保留重音
          </button>
        </div>

        {#if search.history.length > 0 && !search.term.trim()}
          <div class="search-history">
            <div class="search-history-head">
              <strong>最近搜索</strong>
              <div class="history-actions">
                <button type="button" class="history-clear" on:click={() => callbacks.onClearSearchHistory?.()}>
                  清空历史
                </button>
                {#if search.cacheKey}
                  <button type="button" class="history-clear" on:click={() => callbacks.onClearSearchCache?.()}>
                    清空缓存
                  </button>
                {/if}
              </div>
            </div>
            <div class="history-list">
              {#each search.history as item}
                <button type="button" class="history-chip" on:click={() => callbacks.onSearchHistory?.(item)}>
                  {item}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <div class="search-summary">
          {#if search.status === 'searching'}
            <strong>Searching…</strong>
            <span>
              {#if search.progress > 0}
                已扫描 {Math.round(search.progress * 100)}%
              {:else}
                正在扫描当前书的正文。
              {/if}
            </span>
          {:else if search.term.trim()}
            <strong>{search.results.length}</strong>
            <span>正文命中结果</span>
          {:else}
            <strong>Search</strong>
            <span>输入关键词后会在正文里搜索，而不只是过滤目录。</span>
          {/if}
        </div>

        {#if search.notice}
          <div class:error={search.notice.kind === 'error'} class="search-notice" role="status">
            {search.notice.message}
          </div>
        {/if}

        <div class="search-results" aria-label="search results">
          {#if search.status === 'error'}
            <p class="empty">{search.error || '正文搜索失败。'}</p>
          {:else if search.results.length}
            {#each search.results as item}
              <button
                type="button"
                class:active-result={item.cfi === search.activeResultCfi}
                class:recent-result={item.cfi === search.recentResultCfi}
                class="search-result"
                on:click={() => {
                  callbacks.onSearchResult?.(item.cfi);
                }}
              >
                <strong>{item.label || 'Search result'}</strong>
                <span>
                  {item.excerpt.pre}<mark>{item.excerpt.match}</mark>{item.excerpt.post}
                </span>
              </button>
            {/each}
          {:else if search.term.trim() && search.status === 'done'}
            <p class="empty">没有命中正文内容。</p>
          {:else}
            <p class="empty">打开书后，这里会显示真正的正文搜索结果。</p>
          {/if}
        </div>
      </section>
    {:else if activeTab === 'bookmarks'}
      <section class="sidebar-panel" aria-label="bookmarks panel preview">
        <div class="bookmarks-summary">
          <strong>书签</strong>
          <span>
            {#if bookmarksState.bookmarks.length}
              已保存 {bookmarksState.bookmarks.length} 个阅读位置，可直接跳回正文。
            {:else}
              用顶栏星标把当前位置存成书签。
            {/if}
          </span>
        </div>

        <div class="bookmarks-meta-row">
          <span>{bookmarksState.bookmarks.length} 书签</span>
          <span>{isCurrentLocationBookmarked ? '当前位置已保存' : '当前位置未保存'}</span>
          <span>{bookmarksFilter === 'chapter' ? `${sortedBookmarks.length} 当前章节` : '全部章节'}</span>
          <span>{bookmarksSort === 'recent' ? '最近添加优先' : '按章节排序'}</span>
        </div>

        <div class="bookmarks-actions">
          <button
            type="button"
            class="primary-bookmark-action"
            on:click={() => callbacks.onToggleCurrentBookmark?.()}
          >
            {isCurrentLocationBookmarked ? '取消当前位置书签' : '保存当前位置为书签'}
          </button>
        </div>

        <div class="bookmarks-filter-row" aria-label="bookmark filter controls">
          <div class="bookmarks-filter-chips">
            <button
              type="button"
              class:active={bookmarksFilter === 'all'}
              class="bookmarks-filter-chip"
              on:click={() => {
                bookmarksFilter = 'all';
              }}
            >
              全部
            </button>
            <button
              type="button"
              class:active={bookmarksFilter === 'chapter'}
              class="bookmarks-filter-chip"
              disabled={!activeHref}
              on:click={() => {
                bookmarksFilter = 'chapter';
              }}
            >
              当前章节
            </button>
          </div>
          <div class="bookmarks-sort-chips">
            <button
              type="button"
              class:active={bookmarksSort === 'recent'}
              class="bookmarks-filter-chip"
              on:click={() => {
                bookmarksSort = 'recent';
              }}
            >
              最近添加
            </button>
            <button
              type="button"
              class:active={bookmarksSort === 'chapter'}
              class="bookmarks-filter-chip"
              on:click={() => {
                bookmarksSort = 'chapter';
              }}
            >
              章节顺序
            </button>
          </div>
        </div>

        <div class="bookmark-list">
          {#if sortedBookmarks.length}
            {#each sortedBookmarks as bookmark}
              <article
                class:active-bookmark={bookmark.locator === bookmarksState.activeLocator}
                class="bookmark-card"
                data-bookmark-locator={bookmark.locator}
              >
                <div class="bookmark-head">
                  <button
                    type="button"
                    class="bookmark-link"
                    on:click={() => callbacks.onOpenBookmark?.(bookmark.targetHref)}
                  >
                    <strong>{bookmark.chapterLabel || '未命名位置'}</strong>
                    <span>{bookmark.progressLabel} · {bookmark.locationLabel}</span>
                    <time>{formatTimestamp(bookmark.createdAt)}</time>
                  </button>
                  <button
                    type="button"
                    class="bookmark-action danger"
                    on:click={() => callbacks.onDeleteBookmark?.(bookmark.id)}
                  >
                    删除
                  </button>
                </div>
              </article>
            {/each}
          {:else if bookmarksState.bookmarks.length && bookmarksFilter === 'chapter'}
            <p class="empty">当前章节还没有书签，可以切回“全部”查看其他位置。</p>
          {:else}
            <p class="empty">还没有书签，先在顶栏点一下星标保存当前位置。</p>
          {/if}
        </div>
      </section>
    {:else}
      <section class="sidebar-panel" aria-label="notes panel preview">
        <div class="notes-summary">
          <strong>最近笔记</strong>
          <span>
            {#if notesState.selection}
              已选中一段正文，可以直接记一条笔记。
            {:else}
              先在正文里选中一段文本，再把它存成当前书的笔记。
            {/if}
          </span>
        </div>

        <div class="notes-meta-row">
          <span>{notesState.notes.length} 笔记</span>
          <span>{notesFilter === 'chapter' ? `${filteredNotes.length} 当前章节` : '全部章节'}</span>
          <span>{notesState.selection ? '已选中文本' : '未选中文本'}</span>
        </div>

        <div class="notes-filter-row" aria-label="notes filter controls">
          <div class="notes-filter-chips">
            <button
              type="button"
              class:active={notesFilter === 'all'}
              class="notes-filter-chip"
              on:click={() => {
                notesFilter = 'all';
              }}
            >
              全部
            </button>
            <button
              type="button"
              class:active={notesFilter === 'chapter'}
              class="notes-filter-chip"
              disabled={!activeHref}
              on:click={() => {
                notesFilter = 'chapter';
              }}
            >
              当前章节
            </button>
          </div>
          <div class="notes-group-actions">
            <button
              type="button"
              class="notes-filter-chip"
              disabled={!groupedNotes.length || areAllNoteGroupsExpanded}
              on:click={expandAllNoteGroups}
            >
              全部展开
            </button>
            <button
              type="button"
              class="notes-filter-chip"
              disabled={!groupedNotes.length || areAllNoteGroupsCollapsed}
              on:click={collapseAllNoteGroups}
            >
              全部折叠
            </button>
          </div>
        </div>

        {#if notesState.selection}
          <div class="selection-card" aria-label="current text selection preview">
            <strong>{notesState.selection.chapterLabel || '当前选中内容'}</strong>
            <p>{notesState.selection.text}</p>
          </div>
        {/if}

        <div class="notes-actions">
          <button
            type="button"
            class="primary-note-action"
            disabled={!notesState.selection}
            on:click={() => callbacks.onAddNote?.()}
          >
            {notesState.selection ? '为当前选中内容记笔记' : '先选中文本'}
          </button>
        </div>

        <div class="note-list">
          {#if groupedNotes.length}
            {#each groupedNotes as group}
              <section class="note-group" aria-label={`notes for ${group.chapterLabel}`}>
                <button
                  type="button"
                  class="note-group-head"
                  aria-expanded={!isNoteGroupCollapsed(group.chapterHref)}
                  on:click={() => toggleNoteGroup(group.chapterHref)}
                >
                  <strong>{group.chapterLabel}</strong>
                  <span>{group.notes.length} 条 {!isNoteGroupCollapsed(group.chapterHref) ? '−' : '+'}</span>
                </button>

                {#if !isNoteGroupCollapsed(group.chapterHref)}
                  {#each group.notes as note}
                    <article class:active-note={note.cfi === notesState.activeCfi} class="note-card" data-note-cfi={note.cfi}>
                      <div class="note-head">
                        <button type="button" class="note-link" on:click={() => callbacks.onOpenNote?.(note.cfi)}>
                          <strong>{note.chapterLabel || '未命名章节'}</strong>
                          <time>{formatTimestamp(note.createdAt)}</time>
                        </button>
                        <div class="note-actions">
                          <button type="button" class="note-action" on:click={() => callbacks.onEditNote?.(note.id)}>
                            编辑
                          </button>
                          <button type="button" class="note-action danger" on:click={() => callbacks.onDeleteNote?.(note.id)}>
                            删除
                          </button>
                        </div>
                      </div>
                      <p class="note-text">{note.text}</p>
                      {#if note.note}
                        <p class="note-body">{note.note}</p>
                      {/if}
                    </article>
                  {/each}
                {/if}
              </section>
            {/each}
          {:else if notesState.notes.length && notesFilter === 'chapter'}
            <p class="empty">当前章节还没有笔记，可以切回“全部”查看其他章节内容。</p>
          {:else}
            <p class="empty">打开书并选中一段正文后，这里会出现最近的笔记卡片。</p>
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
    border: 1px solid var(--border-light);
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
    box-shadow: inset 0 0 0 1px var(--border-light);
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
    font-family: var(--font-chrome);
  }

  .sidebar-labels strong {
    font-family: var(--font-chrome);
    font-size: 13px;
    line-height: 1.2;
  }

  .tabs {
    display: flex;
    gap: 0;
    padding: 1px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    font-family: var(--font-chrome);
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
      inset 0 0 0 1px var(--border-light),
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
    grid-template-columns: 56px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    padding: 10px;
    border: 1px solid color-mix(in srgb, var(--border-light) 88%, transparent 12%);
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
  }

  .book-visual {
    display: grid;
    width: 56px;
    min-height: 76px;
  }

  .book-cover-image,
  .book-spine {
    width: 56px;
    min-height: 76px;
    border-radius: 10px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      0 0 0 1px rgba(84, 62, 34, 0.08);
  }

  .book-cover-image {
    object-fit: cover;
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
  }

  .book-spine {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0)),
      linear-gradient(180deg, #c8a878, #a98350);
  }

  .book-copy {
    display: grid;
    gap: 3px;
    min-width: 0;
    font-family: var(--font-chrome);
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

  .book-kicker {
    color: var(--text-secondary);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .book-stats,
  .book-meta-row,
  .notes-meta-row,
  .bookmarks-meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .book-meta-row span,
  .notes-meta-row span,
  .bookmarks-meta-row span {
    padding: 3px 6px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    color: var(--text-secondary);
    font-size: 10px;
    line-height: 1;
  }

  .book-actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .book-action-chip {
    position: relative;
    min-height: 26px;
    padding: 0 10px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 84%, white 16%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    color: var(--text-primary);
    font: inherit;
    font-size: 11px;
    line-height: 1;
  }

  .book-action-chip:hover {
    background: color-mix(in srgb, var(--surface-panel) 76%, white 24%);
  }

  .book-action-chip.primary {
    background: color-mix(in srgb, var(--surface-panel) 78%, white 22%);
  }

  .book-action-chip.menu-trigger {
    min-width: 30px;
    padding: 0 9px;
  }

  .book-action-chip.menu-trigger.active {
    background: color-mix(in srgb, var(--surface-panel) 74%, white 26%);
  }

  .book-menu-anchor {
    position: relative;
  }

  .book-action-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    display: grid;
    min-width: 132px;
    padding: 6px;
    border: 1px solid var(--border-light);
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 242, 231, 0.98));
    box-shadow:
      0 18px 40px rgba(56, 40, 18, 0.12),
      0 3px 12px rgba(56, 40, 18, 0.08);
    z-index: 4;
  }

  .book-action-menu button {
    justify-content: flex-start;
    width: 100%;
    min-width: 0;
    min-height: 30px;
    padding: 7px 10px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: 12px;
    text-align: left;
  }

  .book-action-menu button:hover {
    background: color-mix(in srgb, var(--surface-panel) 80%, white 20%);
  }

  .book-empty {
    margin: 0;
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
    font-family: var(--font-chrome);
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
    font-family: var(--font-chrome);
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
    box-shadow: inset 0 0 0 1px var(--border-light);
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
    font-family: var(--font-chrome);
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
  .notes-summary,
  .bookmarks-summary {
    display: grid;
    gap: 2px;
    padding: 0 2px;
  }

  .search-summary strong,
  .notes-summary strong,
  .bookmarks-summary strong {
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.3;
  }

  .search-summary span,
  .notes-summary span,
  .bookmarks-summary span {
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .search-results,
  .note-list,
  .bookmark-list {
    display: grid;
    gap: 8px;
  }

  .note-group {
    display: grid;
    gap: 8px;
  }

  .note-group-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
    padding: 0 2px;
    border: 0;
    background: transparent;
    text-align: left;
    font: inherit;
  }

  .note-group-head strong {
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.35;
    color: var(--text-primary);
  }

  .note-group-head span {
    color: var(--text-muted);
    font-size: 11px;
    line-height: 1;
  }

  .bookmarks-filter-row,
  .notes-filter-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 6px;
    align-items: center;
  }

  .bookmarks-filter-chips,
  .bookmarks-sort-chips,
  .notes-filter-chips,
  .notes-group-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .bookmarks-actions {
    display: flex;
    justify-content: flex-start;
  }

  .primary-bookmark-action {
    min-height: 34px;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 84%, white 16%);
    color: var(--text-primary);
    font: inherit;
    font-size: 12px;
    box-shadow: inset 0 0 0 1px var(--border-light);
  }

  .primary-bookmark-action:hover {
    background: color-mix(in srgb, var(--surface-panel) 76%, white 24%);
  }

  .bookmarks-filter-chip,
  .notes-filter-chip {
    min-height: 28px;
    padding: 0 10px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    color: var(--text-secondary);
    font: inherit;
    font-size: 11px;
    line-height: 1;
  }

  .bookmarks-filter-chip.active,
  .notes-filter-chip.active {
    background: color-mix(in srgb, var(--surface-panel) 80%, white 20%);
    color: var(--text-primary);
  }

  .bookmarks-filter-chip:disabled,
  .notes-filter-chip:disabled {
    opacity: 0.55;
  }

  .selection-card {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border-light) 88%, transparent 12%);
  }

  .selection-card strong {
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.35;
    color: var(--text-primary);
  }

  .selection-card p {
    margin: 0;
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1.5;
    line-clamp: 4;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .notes-actions {
    display: flex;
    justify-content: flex-start;
  }

  .primary-note-action {
    min-height: 34px;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 84%, white 16%);
    color: var(--text-primary);
    font: inherit;
    font-size: 12px;
    box-shadow: inset 0 0 0 1px var(--border-light);
  }

  .primary-note-action:disabled {
    color: var(--text-muted);
    opacity: 0.7;
  }

  .primary-note-action:not(:disabled):hover {
    background: color-mix(in srgb, var(--surface-panel) 76%, white 24%);
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

  .search-result,
  .note-card,
  .bookmark-card {
    display: grid;
    gap: 3px;
    padding: 10px 12px;
    border: 0;
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface-reader) 93%, white 7%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border-light) 88%, transparent 12%);
    text-align: left;
  }

  .search-result strong,
  .note-card strong,
  .bookmark-card strong {
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.35;
  }

  .search-result span,
  .note-card p,
  .bookmark-card span,
  .bookmark-card time {
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

  .note-card.active-note {
    background: color-mix(in srgb, var(--surface-panel) 78%, white 22%);
    box-shadow:
      inset 2px 0 0 #b18952,
      inset 0 0 0 1px var(--border-light);
  }

  .bookmark-card.active-bookmark {
    background: color-mix(in srgb, var(--surface-panel) 78%, white 22%);
    box-shadow:
      inset 2px 0 0 #b18952,
      inset 0 0 0 1px var(--border-light);
  }

  .note-link {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: baseline;
    border: 0;
    padding: 0;
    background: transparent;
    color: inherit;
    text-align: left;
    font: inherit;
  }

  .bookmark-link {
    display: grid;
    gap: 4px;
    min-width: 0;
    border: 0;
    padding: 0;
    background: transparent;
    color: inherit;
    text-align: left;
    font: inherit;
  }

  .bookmark-head {
    display: grid;
    gap: 8px;
  }

  .bookmark-action {
    min-height: 24px;
    width: fit-content;
    padding: 0 8px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
    color: var(--text-secondary);
    font: inherit;
    font-size: 11px;
    line-height: 1;
  }

  .bookmark-action:hover {
    color: var(--text-primary);
  }

  .bookmark-action.danger {
    color: #8a4c40;
  }

  .note-head {
    display: grid;
    gap: 8px;
  }

  .note-actions {
    display: inline-flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .note-action {
    min-height: 24px;
    padding: 0 8px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
    color: var(--text-secondary);
    font: inherit;
    font-size: 11px;
    line-height: 1;
  }

  .note-action:hover {
    color: var(--text-primary);
  }

  .note-action.danger {
    color: #8a4c40;
  }

  .note-link time {
    color: var(--text-muted);
    font-size: 11px;
    white-space: nowrap;
  }

  .note-text {
    color: var(--text-primary);
  }

  .note-body {
    padding-top: 6px;
    border-top: 1px solid rgba(64, 47, 24, 0.06);
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

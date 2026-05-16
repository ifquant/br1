<!-- Ownership: this sidebar child only renders the annotations/bookmarks surface.
 It accepts already-derived state and callbacks from ReaderSidebar so persistence,
 highlight workspace state, and route coordination stay owned by the parent. -->
<script lang="ts">
  import type {
    ReaderBookmarksState,
    ReaderHighlightsFilter,
    ReaderHighlightsSort,
    ReaderSidebarCallbacks,
    ReaderSidebarNotesState,
    SidebarTab
  } from '$lib/reader';

  type Bookmark = ReaderBookmarksState['bookmarks'][number];
  type Note = ReaderSidebarNotesState['notes'][number];
  type BookmarkGroup = {
    chapterHref: string;
    chapterLabel: string;
    bookmarks: Bookmark[];
  };
  type NoteGroup = {
    chapterHref: string;
    chapterLabel: string;
    notes: Note[];
  };
  interface $$Slots {
    'highlights-extra': Record<string, never>;
  }

  export let activeTab: SidebarTab = 'notes';
  export let activeHref = '';
  export let supportsTextAnnotations = false;
  export let textAnnotationSupportMessage = '';
  export let notesPanelSummary = '';
  export let bookmarksPanelSummary = '';
  export let highlightsPanelSummary = '';
  export let notesState: ReaderSidebarNotesState = {
    activeCfi: '',
    selection: null,
    notes: []
  };
  export let bookmarksState: ReaderBookmarksState = {
    activeLocator: '',
    bookmarks: []
  };
  export let callbacks: ReaderSidebarCallbacks;
  export let formatTimestamp: (value: number) => string = (value) => String(value);

  export let isCurrentLocationBookmarked = false;
  export let bookmarksFilter: 'all' | 'chapter' = 'all';
  export let bookmarksSort: 'recent' | 'chapter' = 'recent';
  export let sortedBookmarks: Bookmark[] = [];
  export let groupedBookmarks: BookmarkGroup[] = [];
  export let areAllBookmarkGroupsExpanded = false;
  export let areAllBookmarkGroupsCollapsed = false;
  export let isBookmarkGroupCollapsed: (chapterHref: string) => boolean = () => false;
  export let onSetBookmarksFilter: ((value: 'all' | 'chapter') => void) | null = null;
  export let onSetBookmarksSort: ((value: 'recent' | 'chapter') => void) | null = null;
  export let onToggleBookmarkGroup: ((chapterHref: string) => void) | null = null;
  export let onExpandAllBookmarkGroups: (() => void) | null = null;
  export let onCollapseAllBookmarkGroups: (() => void) | null = null;

  export let allHighlights: Note[] = [];
  export let hasSavedHighlightSelections = false;
  export let highlightsFilter: ReaderHighlightsFilter = 'all';
  export let highlightsSort: ReaderHighlightsSort = 'recent';
  export let groupedHighlights: NoteGroup[] = [];
  export let sortedHighlights: Note[] = [];
  export let selectedHighlightIds = new Set<string>();
  export let selectedVisibleHighlights: Note[] = [];
  export let areAllVisibleHighlightsSelected = false;
  export let areAllHighlightGroupsExpanded = false;
  export let areAllHighlightGroupsCollapsed = false;
  export let isHighlightGroupCollapsed: (chapterHref: string) => boolean = () => false;
  export let isHighlightGroupFullySelected: (notes: Note[]) => boolean = () => false;
  export let isHighlightGroupPartiallySelected: (notes: Note[]) => boolean = () => false;
  export let onSetHighlightsFilter: ((value: ReaderHighlightsFilter) => void) | null = null;
  export let onSetHighlightsSort: ((value: ReaderHighlightsSort) => void) | null = null;
  export let onToggleHighlightGroup: ((chapterHref: string) => void) | null = null;
  export let onExpandAllHighlightGroups: (() => void) | null = null;
  export let onCollapseAllHighlightGroups: (() => void) | null = null;
  export let onSelectAllVisibleHighlights: (() => void) | null = null;
  export let onClearSelectedHighlights: (() => void) | null = null;
  export let onInvertVisibleHighlightsSelection: (() => void) | null = null;
  export let onDeleteVisibleHighlights: (() => void) | null = null;
  export let onDeleteSelectedHighlights: (() => void) | null = null;
  export let onSaveCurrentHighlightSelection: (() => void) | null = null;
  export let onToggleHighlightSelection: ((id: string) => void) | null = null;
  export let onSelectHighlightGroup: ((notes: Note[]) => void) | null = null;
  export let onClearHighlightGroupSelection: ((notes: Note[]) => void) | null = null;
  export let onInvertHighlightGroupSelection: ((notes: Note[]) => void) | null = null;
  export let onDeleteHighlightGroup: ((notes: Note[], chapterLabel: string) => void) | null = null;

  export let notesFilter: 'all' | 'chapter' = 'all';
  export let notesKindFilter: 'all' | 'highlight' | 'note' = 'all';
  export let notesByScope: Note[] = [];
  export let filteredNotes: Note[] = [];
  export let groupedNotes: NoteGroup[] = [];
  export let areAllNoteGroupsExpanded = false;
  export let areAllNoteGroupsCollapsed = false;
  export let isNoteGroupCollapsed: (chapterHref: string) => boolean = () => false;
  export let getAnnotationKindLabel: (notes: Note[]) => string = () => '标注';
  export let onSetNotesFilter: ((value: 'all' | 'chapter') => void) | null = null;
  export let onSetNotesKindFilter: ((value: 'all' | 'highlight' | 'note') => void) | null = null;
  export let onExpandAllNoteGroups: (() => void) | null = null;
  export let onCollapseAllNoteGroups: (() => void) | null = null;
  export let onToggleNoteGroup: ((chapterHref: string) => void) | null = null;
  export let onDeleteVisibleNotes: (() => void) | null = null;
  export let onDeleteNoteGroup: ((notes: Note[], chapterLabel: string) => void) | null = null;
</script>

{#if activeTab === 'bookmarks'}
  <section class="sidebar-panel" aria-label="书签面板">
    <div class="bookmarks-summary">
      <strong>阅读位置</strong>
      <span>{bookmarksPanelSummary}</span>
    </div>

    <div class="bookmarks-meta-row">
      <span>{bookmarksState.bookmarks.length} 书签</span>
      <span>{isCurrentLocationBookmarked ? '当前页已入书签' : '当前页未入书签'}</span>
      <span>{bookmarksFilter === 'chapter' ? `${sortedBookmarks.length} 当前章节` : '查看全部章节'}</span>
      <span>{bookmarksSort === 'recent' ? '按最近保存' : '按章节浏览'}</span>
    </div>

    <div class="bookmarks-actions">
      <button
        type="button"
        class="primary-bookmark-action"
        on:click={() => callbacks.onToggleCurrentBookmark?.()}
      >
        {isCurrentLocationBookmarked ? '移除当前页书签' : '保存当前页位置'}
      </button>
    </div>

    <div class="bookmarks-filter-row" aria-label="书签筛选控制">
      <div class="bookmarks-filter-chips">
        <button
          type="button"
          class:active={bookmarksFilter === 'all'}
          class="bookmarks-filter-chip"
          on:click={() => onSetBookmarksFilter?.('all')}
        >
          全部
        </button>
        <button
          type="button"
          class:active={bookmarksFilter === 'chapter'}
          class="bookmarks-filter-chip"
          disabled={!activeHref}
          on:click={() => onSetBookmarksFilter?.('chapter')}
        >
          当前章节
        </button>
      </div>
      <div class="bookmarks-sort-chips">
        <button
          type="button"
          class:active={bookmarksSort === 'recent'}
          class="bookmarks-filter-chip"
          on:click={() => onSetBookmarksSort?.('recent')}
        >
          最近添加
        </button>
        <button
          type="button"
          class:active={bookmarksSort === 'chapter'}
          class="bookmarks-filter-chip"
          on:click={() => onSetBookmarksSort?.('chapter')}
        >
          章节顺序
        </button>
      </div>
      <div class="bookmarks-group-actions">
        <button
          type="button"
          class="bookmarks-filter-chip"
          disabled={bookmarksSort !== 'chapter' || !groupedBookmarks.length || areAllBookmarkGroupsExpanded}
          on:click={() => onExpandAllBookmarkGroups?.()}
        >
          全部展开
        </button>
        <button
          type="button"
          class="bookmarks-filter-chip"
          disabled={bookmarksSort !== 'chapter' || !groupedBookmarks.length || areAllBookmarkGroupsCollapsed}
          on:click={() => onCollapseAllBookmarkGroups?.()}
        >
          全部折叠
        </button>
      </div>
    </div>

    <div class="bookmark-list">
      {#if sortedBookmarks.length}
        {#if bookmarksSort === 'chapter'}
          {#each groupedBookmarks as group}
            <section class="bookmark-group" aria-label={`${group.chapterLabel} 的书签`}>
              <button
                type="button"
                class="bookmark-group-head"
                aria-expanded={!isBookmarkGroupCollapsed(group.chapterHref)}
                on:click={() => onToggleBookmarkGroup?.(group.chapterHref)}
              >
                <strong>{group.chapterLabel}</strong>
                <span>{group.bookmarks.length} 条 {!isBookmarkGroupCollapsed(group.chapterHref) ? '−' : '+'}</span>
              </button>

              {#if !isBookmarkGroupCollapsed(group.chapterHref)}
                {#each group.bookmarks as bookmark}
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
              {/if}
            </section>
          {/each}
        {:else}
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
        {/if}
      {:else if bookmarksState.bookmarks.length && bookmarksFilter === 'chapter'}
        <p class="empty">当前章节还没有保存的阅读位置，可以切回“全部”查看其他位置。</p>
      {:else}
        <p class="empty">还没有保存的阅读位置，先把当前页存成书签。</p>
      {/if}
    </div>
  </section>
{:else if activeTab === 'highlights'}
  <section class="sidebar-panel" aria-label="高亮面板">
    <div class="notes-summary">
      <strong>高亮</strong>
      <span>{highlightsPanelSummary}</span>
    </div>

    <div class="notes-meta-row">
      <span>{allHighlights.length} 高亮</span>
      <span>
        {highlightsFilter === 'chapter'
          ? `${sortedHighlights.length} 当前章节`
          : highlightsFilter === 'selected'
            ? `${sortedHighlights.length} 已选高亮`
            : '全部章节'}
      </span>
      <span>{highlightsSort === 'recent' ? '最近添加优先' : '最早添加优先'}</span>
      <span>{selectedVisibleHighlights.length ? `已选 ${selectedVisibleHighlights.length} 条` : '未选高亮'}</span>
      <span>{notesState.activeCfi ? '可跳回当前高亮' : '未聚焦高亮'}</span>
    </div>

    <div class="notes-filter-row" aria-label="高亮筛选控制">
      <div class="notes-filter-chips">
        <button
          type="button"
          class:active={highlightsFilter === 'all'}
          class="notes-filter-chip"
          on:click={() => onSetHighlightsFilter?.('all')}
        >
          全部
        </button>
        <button
          type="button"
          class:active={highlightsFilter === 'chapter'}
          class="notes-filter-chip"
          disabled={!activeHref}
          on:click={() => onSetHighlightsFilter?.('chapter')}
        >
          当前章节
        </button>
        <button
          type="button"
          class:active={highlightsFilter === 'selected'}
          class="notes-filter-chip"
          disabled={!selectedHighlightIds.size}
          on:click={() => onSetHighlightsFilter?.('selected')}
        >
          已选高亮
        </button>
      </div>
      <div class="notes-filter-chips" role="group" aria-label="高亮排序控制">
        <button
          type="button"
          class:active={highlightsSort === 'recent'}
          class="notes-filter-chip"
          disabled={sortedHighlights.length <= 1}
          on:click={() => onSetHighlightsSort?.('recent')}
        >
          最近添加
        </button>
        <button
          type="button"
          class:active={highlightsSort === 'oldest'}
          class="notes-filter-chip"
          disabled={sortedHighlights.length <= 1}
          on:click={() => onSetHighlightsSort?.('oldest')}
        >
          最早添加
        </button>
      </div>
      <div class="notes-group-actions">
        <button
          type="button"
          class="notes-filter-chip"
          disabled={!groupedHighlights.length || areAllHighlightGroupsExpanded}
          on:click={() => onExpandAllHighlightGroups?.()}
        >
          全部展开
        </button>
        <button
          type="button"
          class="notes-filter-chip"
          disabled={!groupedHighlights.length || areAllHighlightGroupsCollapsed}
          on:click={() => onCollapseAllHighlightGroups?.()}
        >
          全部折叠
        </button>
      </div>
    </div>

    <div class="notes-actions">
      <button
        type="button"
        class="secondary-note-action"
        disabled={!selectedHighlightIds.size}
        on:click={() => onSaveCurrentHighlightSelection?.()}
      >
        保存当前选择集
      </button>
      <button
        type="button"
        class="secondary-note-action"
        disabled={!sortedHighlights.length || areAllVisibleHighlightsSelected}
        on:click={() => onSelectAllVisibleHighlights?.()}
      >
        选中当前视图高亮
      </button>
      <button
        type="button"
        class="secondary-note-action"
        disabled={!sortedHighlights.length}
        on:click={() => onInvertVisibleHighlightsSelection?.()}
      >
        反选当前视图高亮
      </button>
      <button
        type="button"
        class="secondary-note-action"
        disabled={!selectedVisibleHighlights.length}
        on:click={() => onClearSelectedHighlights?.()}
      >
        清空选中
      </button>
      <button
        type="button"
        class="secondary-note-action danger-action"
        disabled={!selectedVisibleHighlights.length}
        on:click={() => onDeleteSelectedHighlights?.()}
      >
        删除选中高亮
      </button>
      <button
        type="button"
        class="secondary-note-action danger-action"
        disabled={!sortedHighlights.length}
        on:click={() => onDeleteVisibleHighlights?.()}
      >
        {highlightsFilter === 'chapter'
          ? '删除当前章节高亮'
          : highlightsFilter === 'selected'
            ? '删除当前已选高亮'
          : '删除当前视图高亮'}
      </button>
    </div>

    <slot name="highlights-extra" />

    <div class="note-list">
      {#if groupedHighlights.length}
        {#each groupedHighlights as group}
          <section class="note-group" aria-label={`${group.chapterLabel} 的高亮`}>
            <button
              type="button"
              class="note-group-head"
              aria-expanded={!isHighlightGroupCollapsed(group.chapterHref)}
              on:click={() => onToggleHighlightGroup?.(group.chapterHref)}
            >
              <strong>{group.chapterLabel}</strong>
              <span>{group.notes.length} 条 {!isHighlightGroupCollapsed(group.chapterHref) ? '−' : '+'}</span>
            </button>

            {#if !isHighlightGroupCollapsed(group.chapterHref)}
              <div class="note-group-actions">
                <button
                  type="button"
                  class="notes-filter-chip"
                  disabled={isHighlightGroupFullySelected(group.notes)}
                  on:click={() => onSelectHighlightGroup?.(group.notes)}
                >
                  选中本组高亮
                </button>
                <button
                  type="button"
                  class="notes-filter-chip"
                  disabled={!isHighlightGroupPartiallySelected(group.notes)}
                  on:click={() => onClearHighlightGroupSelection?.(group.notes)}
                >
                  清空本组选择
                </button>
                <button
                  type="button"
                  class="notes-filter-chip"
                  on:click={() => onInvertHighlightGroupSelection?.(group.notes)}
                >
                  反选本组高亮
                </button>
                <button
                  type="button"
                  class="notes-filter-chip danger-action"
                  on:click={() => onDeleteHighlightGroup?.(group.notes, group.chapterLabel)}
                >
                  删除本组高亮
                </button>
              </div>

              {#each group.notes as note}
                <article
                  class:active-note={note.cfi === notesState.activeCfi}
                  class="note-card highlight-card"
                  data-note-cfi={note.cfi}
                >
                  <div class="note-head">
                    <button type="button" class="note-link" on:click={() => callbacks.onOpenNote?.(note.cfi)}>
                      <strong>{note.chapterLabel || '未命名章节'}</strong>
                      <span class="annotation-kind-badge highlight-badge">高亮</span>
                      <time>{formatTimestamp(note.createdAt)}</time>
                    </button>
                    <div class="note-actions">
                      <button
                        type="button"
                        class:selected={selectedHighlightIds.has(note.id)}
                        class="note-action highlight-selection-toggle"
                        aria-pressed={selectedHighlightIds.has(note.id)}
                        aria-label={selectedHighlightIds.has(note.id) ? '取消选中高亮' : '选中高亮'}
                        on:click={() => onToggleHighlightSelection?.(note.id)}
                      >
                        {selectedHighlightIds.has(note.id) ? '已选' : '选中'}
                      </button>
                      <button type="button" class="note-action danger" on:click={() => callbacks.onDeleteNote?.(note.id)}>
                        删除
                      </button>
                    </div>
                  </div>
                  <p class="note-text">{note.text}</p>
                </article>
              {/each}
            {/if}
          </section>
        {/each}
      {:else if allHighlights.length && highlightsFilter === 'chapter'}
        <p class="empty">当前章节还没有高亮，可以切回“全部”查看其他章节标记。</p>
      {:else if allHighlights.length && highlightsFilter === 'selected'}
        <p class="empty">还没有选中的高亮，可以先选中几条再切回“已选高亮”查看。</p>
      {:else if hasSavedHighlightSelections}
        <p class="empty">当前书还没有高亮，但跨书高亮选择集还保留在上面，可以继续整理或导入匹配结果。</p>
      {:else}
        <p class="empty">还没有高亮，先选中一段正文再用“先高亮当前选中内容”。</p>
      {/if}
    </div>
  </section>
{:else if activeTab === 'notes'}
  <section class="sidebar-panel" aria-label="笔记面板">
    <div class="notes-summary">
      <strong>标注</strong>
      <span>{notesPanelSummary}</span>
    </div>

    <div class="notes-meta-row">
      <span>{notesState.notes.length} 标注</span>
      <span>{notesState.notes.filter((note) => note.kind === 'highlight').length} 高亮</span>
      <span>{notesState.notes.filter((note) => note.kind !== 'highlight').length} 笔记</span>
      <span>{notesFilter === 'chapter' ? `${notesByScope.length} 当前章节` : '全部章节'}</span>
      <span>
        {#if notesKindFilter === 'highlight'}
          仅看高亮
        {:else if notesKindFilter === 'note'}
          仅看笔记
        {:else}
          全部类型
        {/if}
      </span>
      <span>
        {#if !supportsTextAnnotations}
          当前格式未开放正文批注
        {:else if notesState.selection}
          已选中文本
        {:else}
          未选中文本
        {/if}
      </span>
    </div>

    <div class="notes-filter-row" aria-label="笔记筛选控制">
      <div class="notes-filter-chips">
        <button
          type="button"
          class:active={notesFilter === 'all'}
          class="notes-filter-chip"
          on:click={() => onSetNotesFilter?.('all')}
        >
          全部
        </button>
        <button
          type="button"
          class:active={notesFilter === 'chapter'}
          class="notes-filter-chip"
          disabled={!activeHref}
          on:click={() => onSetNotesFilter?.('chapter')}
        >
          当前章节
        </button>
      </div>
      <div class="notes-filter-chips" aria-label="标注类型筛选控制">
        <button
          type="button"
          class:active={notesKindFilter === 'all'}
          class="notes-filter-chip"
          on:click={() => onSetNotesKindFilter?.('all')}
        >
          全部类型
        </button>
        <button
          type="button"
          class:active={notesKindFilter === 'highlight'}
          class="notes-filter-chip"
          disabled={!notesState.notes.some((note) => note.kind === 'highlight')}
          on:click={() => onSetNotesKindFilter?.('highlight')}
        >
          高亮
        </button>
        <button
          type="button"
          class:active={notesKindFilter === 'note'}
          class="notes-filter-chip"
          disabled={!notesState.notes.some((note) => note.kind !== 'highlight')}
          on:click={() => onSetNotesKindFilter?.('note')}
        >
          笔记
        </button>
      </div>
      <div class="notes-group-actions">
        <button
          type="button"
          class="notes-filter-chip"
          disabled={!groupedNotes.length || areAllNoteGroupsExpanded}
          on:click={() => onExpandAllNoteGroups?.()}
        >
          全部展开
        </button>
        <button
          type="button"
          class="notes-filter-chip"
          disabled={!groupedNotes.length || areAllNoteGroupsCollapsed}
          on:click={() => onCollapseAllNoteGroups?.()}
        >
          全部折叠
        </button>
      </div>
    </div>

    {#if supportsTextAnnotations && notesState.selection}
      <div class="selection-card" aria-label="当前选中文本预览">
        <strong>{notesState.selection.chapterLabel || '当前选中内容'}</strong>
        <p>{notesState.selection.text}</p>
      </div>
    {:else if !supportsTextAnnotations}
      <div class="selection-card unsupported-selection" aria-label="正文批注支持提示">
        <strong>当前格式暂不支持正文批注</strong>
        <p>{textAnnotationSupportMessage}</p>
      </div>
    {/if}

    <div class="notes-actions">
      <button
        type="button"
        class="secondary-note-action"
        disabled={!supportsTextAnnotations || !notesState.selection}
        on:click={() => callbacks.onAddHighlight?.()}
      >
        {#if !supportsTextAnnotations}
          当前格式暂不支持高亮
        {:else if notesState.selection}
          先高亮当前选中内容
        {:else}
          先选中文本
        {/if}
      </button>
      <button
        type="button"
        class="primary-note-action"
        disabled={!supportsTextAnnotations || !notesState.selection}
        on:click={() => callbacks.onAddNote?.()}
      >
        {#if !supportsTextAnnotations}
          当前格式暂不支持批注
        {:else if notesState.selection}
          为当前选中内容记笔记
        {:else}
          先选中文本
        {/if}
      </button>
      <button
        type="button"
        class="secondary-note-action danger-action"
        disabled={!filteredNotes.length}
        on:click={() => onDeleteVisibleNotes?.()}
      >
        {notesFilter === 'chapter'
          ? notesKindFilter === 'highlight'
            ? '删除当前章节高亮'
            : notesKindFilter === 'note'
              ? '删除当前章节笔记'
              : '删除当前章节标注'
          : notesKindFilter === 'highlight'
            ? '删除当前视图高亮'
            : notesKindFilter === 'note'
              ? '删除当前视图笔记'
              : '删除当前视图标注'}
      </button>
    </div>

    <div class="note-list">
      {#if groupedNotes.length}
        {#each groupedNotes as group}
          <section class="note-group" aria-label={`${group.chapterLabel} 的标注`}>
            <button
              type="button"
              class="note-group-head"
              aria-expanded={!isNoteGroupCollapsed(group.chapterHref)}
              on:click={() => onToggleNoteGroup?.(group.chapterHref)}
            >
              <strong>{group.chapterLabel}</strong>
              <span>{group.notes.length} 条 {!isNoteGroupCollapsed(group.chapterHref) ? '−' : '+'}</span>
            </button>

            {#if !isNoteGroupCollapsed(group.chapterHref)}
              <div class="note-group-actions">
                <button
                  type="button"
                  class="notes-filter-chip danger-action"
                  on:click={() => onDeleteNoteGroup?.(group.notes, group.chapterLabel)}
                >
                  删除本组{getAnnotationKindLabel(group.notes)}
                </button>
              </div>

              {#each group.notes as note}
                <article class:active-note={note.cfi === notesState.activeCfi} class="note-card" data-note-cfi={note.cfi}>
                  <div class="note-head">
                    <button type="button" class="note-link" on:click={() => callbacks.onOpenNote?.(note.cfi)}>
                      <strong>{note.chapterLabel || '未命名章节'}</strong>
                      <span class:highlight-badge={note.kind === 'highlight'} class="annotation-kind-badge">
                        {note.kind === 'highlight' ? '高亮' : '笔记'}
                      </span>
                      <time>{formatTimestamp(note.createdAt)}</time>
                    </button>
                    <div class="note-actions">
                      {#if note.kind !== 'highlight'}
                        <button type="button" class="note-action" on:click={() => callbacks.onEditNote?.(note.id)}>
                          编辑
                        </button>
                      {/if}
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
      {:else if notesByScope.length && notesKindFilter !== 'all'}
        <p class="empty">
          当前筛选下还没有{notesKindFilter === 'highlight' ? '高亮' : '笔记'}，可以切回“全部类型”查看其他标注。
        </p>
      {:else if notesState.notes.length && notesFilter === 'chapter'}
        <p class="empty">
          当前章节还没有{notesKindFilter === 'highlight' ? '高亮' : notesKindFilter === 'note' ? '笔记' : '标注'}，可以切回“全部”查看其他章节内容。
        </p>
      {:else}
        <p class="empty">打开书并选中一段正文后，这里会出现当前书的笔记和高亮。</p>
      {/if}
    </div>
  </section>
{/if}

<style>
  .sidebar-panel {
    display: grid;
    gap: 10px;
  }

  .notes-summary,
  .bookmarks-summary {
    display: grid;
    gap: 2px;
    padding: 0 2px;
  }

  .notes-summary strong,
  .bookmarks-summary strong {
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.3;
  }

  .notes-summary span,
  .bookmarks-summary span {
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .note-list,
  .bookmark-list {
    display: grid;
    gap: 8px;
  }

  .note-group,
  .bookmark-group {
    display: grid;
    gap: 8px;
  }

  .note-group-head,
  .bookmark-group-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
    width: 100%;
    padding: 0 2px;
    border: 0;
    background: transparent;
    text-align: left;
    font: inherit;
  }

  .note-group-head strong,
  .bookmark-group-head strong {
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.35;
    color: var(--text-primary);
  }

  .note-group-head span,
  .bookmark-group-head span {
    color: var(--text-muted);
    font-size: 11px;
    line-height: 1;
  }

  .bookmarks-meta-row,
  .notes-meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    color: var(--text-muted);
    font-size: 11px;
    line-height: 1.4;
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
  .bookmarks-group-actions,
  .notes-filter-chips,
  .notes-group-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .bookmarks-actions,
  .notes-actions {
    display: flex;
    justify-content: flex-start;
    gap: 8px;
    flex-wrap: wrap;
  }

  .primary-bookmark-action,
  .primary-note-action,
  .secondary-note-action,
  .bookmarks-filter-chip,
  .notes-filter-chip,
  .bookmark-action,
  .note-action {
    font: inherit;
  }

  .primary-bookmark-action,
  .primary-note-action {
    min-height: 34px;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 84%, white 16%);
    color: var(--text-primary);
    font-size: 12px;
    box-shadow: inset 0 0 0 1px var(--border-light);
  }

  .primary-bookmark-action:hover,
  .primary-note-action:not(:disabled):hover {
    background: color-mix(in srgb, var(--surface-panel) 76%, white 24%);
  }

  .primary-note-action:disabled,
  .secondary-note-action:disabled,
  .bookmarks-filter-chip:disabled,
  .notes-filter-chip:disabled {
    color: var(--text-muted);
    opacity: 0.7;
  }

  .secondary-note-action,
  .bookmarks-filter-chip,
  .notes-filter-chip {
    min-height: 28px;
    padding: 0 10px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    color: var(--text-secondary);
    font-size: 11px;
    line-height: 1;
  }

  .secondary-note-action {
    min-height: 34px;
    padding: 0 12px;
    color: var(--text-primary);
    font-size: 12px;
  }

  .secondary-note-action:not(:disabled):hover {
    background: color-mix(in srgb, var(--surface-panel) 72%, white 28%);
  }

  .bookmarks-filter-chip.active,
  .notes-filter-chip.active {
    background: color-mix(in srgb, var(--surface-panel) 80%, white 20%);
    color: var(--text-primary);
  }

  :global(.saved-highlight-selections) {
    display: grid;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--border-light) 72%, transparent 28%);
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
  }

  :global(.saved-highlight-selections-head) {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 12px;
    flex-wrap: wrap;
  }

  :global(.saved-highlight-selections-summary) {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  :global(.saved-highlight-selections-sort),
  :global(.saved-highlight-selections-toolbar),
  :global(.saved-highlight-selection-import-preview-actions),
  :global(.saved-highlight-selection-actions),
  :global(.saved-highlight-selection-export-actions) {
    display: inline-flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
  }

  :global(.saved-highlight-selections-list) {
    display: grid;
    gap: 8px;
  }

  :global(.saved-highlight-selection-import-notice),
  :global(.saved-highlight-selection-empty),
  :global(.saved-highlight-selection-export-notice) {
    margin: 0;
    color: var(--text-secondary);
    font-size: 12px;
  }

  :global(.saved-highlight-selection-refresh-summary),
  :global(.saved-highlight-selection-import-preview),
  :global(.saved-highlight-selection-export) {
    display: grid;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--border-light) 72%, transparent 28%);
    background: color-mix(in srgb, var(--surface-panel) 82%, white 18%);
  }

  :global(.saved-highlight-selection-refresh-summary) {
    gap: 4px;
    color: var(--text-secondary);
    font-size: 12px;
  }

  :global(.saved-highlight-selection-refresh-summary strong),
  :global(.saved-highlight-selection-import-preview-copy strong),
  :global(.saved-highlight-selection-copy strong),
  :global(.saved-highlight-selection-export-copy strong) {
    color: var(--text-primary);
    font-size: 13px;
    line-height: 1.3;
  }

  :global(.saved-highlight-selection-refresh-filters) {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 2px;
  }

  :global(.saved-highlight-selection-import-preview-head),
  :global(.saved-highlight-selection-export-head) {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  :global(.saved-highlight-selection-import-preview-copy),
  :global(.saved-highlight-selection-copy),
  :global(.saved-highlight-selection-export-copy) {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  :global(.saved-highlight-selection-import-preview-copy span),
  :global(.saved-highlight-selection-import-preview-list),
  :global(.saved-highlight-selection-copy span),
  :global(.saved-highlight-selection-copy time),
  :global(.saved-highlight-selection-export-copy span),
  :global(.saved-highlight-selection-export-notice) {
    color: var(--text-secondary);
    font-size: 12px;
  }

  :global(.saved-highlight-selection-import-preview-list) {
    margin: 0;
    padding-left: 18px;
    line-height: 1.5;
  }

  :global(.saved-highlight-selection-card) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--border-light) 72%, transparent 28%);
    background: color-mix(in srgb, var(--surface-panel) 78%, white 22%);
  }

  :global(.saved-highlight-selection-detail) {
    color: var(--text-primary);
    font-size: 11px;
    line-height: 1.35;
  }

  :global(.saved-highlight-selection-unmatched) {
    display: grid;
    gap: 4px;
    margin-top: 4px;
    padding: 8px 10px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--surface-panel) 64%, #f7d6bd 36%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border-light) 70%, #bc6c31 30%);
  }

  :global(.saved-highlight-selection-unmatched span) {
    color: var(--text-primary);
    font: 600 11px/1.3 var(--font-chrome);
  }

  :global(.saved-highlight-selection-unmatched ul) {
    display: grid;
    gap: 3px;
    margin: 0;
    padding-left: 16px;
  }

  :global(.saved-highlight-selection-unmatched li) {
    color: var(--text-secondary);
    font-size: 11px;
    line-height: 1.35;
  }

  :global(.saved-highlight-selection-origin) {
    color: var(--text-primary);
  }

  :global(.saved-highlight-selection-status) {
    display: inline-flex;
    width: fit-content;
    padding: 2px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 72%, white 28%);
    color: var(--text-secondary);
    font-size: 11px;
    line-height: 1.3;
  }

  :global(.saved-highlight-selection-status-full) {
    background: color-mix(in srgb, #d7f6e6 72%, white 28%);
    color: #17603c;
  }

  :global(.saved-highlight-selection-status-missed) {
    background: color-mix(in srgb, #fde2e2 78%, white 22%);
    color: #8f2f2f;
  }

  :global(.saved-highlight-selection-export-payload) {
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

  .note-card.active-note,
  .bookmark-card.active-bookmark {
    background: color-mix(in srgb, var(--surface-panel) 78%, white 22%);
    box-shadow:
      inset 2px 0 0 #b18952,
      inset 0 0 0 1px var(--border-light);
  }

  .note-link,
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

  .note-link {
    gap: 6px;
  }

  .note-head,
  .bookmark-head {
    display: grid;
    gap: 8px;
  }

  .bookmark-action,
  .note-action {
    min-height: 24px;
    padding: 0 8px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
    color: var(--text-secondary);
    font-size: 11px;
    line-height: 1;
    width: fit-content;
  }

  .bookmark-action:hover,
  .note-action:hover {
    color: var(--text-primary);
  }

  .bookmark-action.danger,
  .note-action.danger {
    color: #8a4c40;
  }

  .note-actions {
    display: inline-flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .note-action.highlight-selection-toggle.selected {
    background: color-mix(in srgb, var(--surface-panel) 76%, white 24%);
    color: var(--text-primary);
    box-shadow: inset 0 0 0 1px var(--border-light);
  }

  .note-card strong,
  .bookmark-card strong {
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.35;
  }

  .note-card p,
  .bookmark-card span,
  .bookmark-card time {
    margin: 0;
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .note-link time {
    color: var(--text-muted);
    font-size: 11px;
    white-space: nowrap;
  }

  .annotation-kind-badge {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    padding: 2px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 82%, white 18%);
    color: var(--text-muted);
    font-size: 10px;
    line-height: 1.2;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .annotation-kind-badge.highlight-badge {
    background: rgba(190, 150, 78, 0.18);
    color: color-mix(in srgb, #7a5626 84%, black 16%);
  }

  .note-text {
    color: var(--text-primary);
  }

  .note-body {
    padding-top: 6px;
    border-top: 1px solid rgba(64, 47, 24, 0.06);
  }

  .empty {
    margin: 0;
    padding: 2px 2px 0;
    color: var(--text-muted);
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.5;
  }

  button:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--reader-shell-accent, #8c6a3b) 72%, white 28%);
    outline-offset: 2px;
  }
</style>

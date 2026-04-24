<script lang="ts">
  import LibraryBrowseGuardHint from './LibraryBrowseGuardHint.svelte';
  import type {
    BookshelfPreviewBook,
    LibraryBrowseGuardExplanation,
    LibraryBrowseGuardSurface
  } from '$lib/library/types';

  export let sectionTitle = '最近阅读';
  export let books: BookshelfPreviewBook[] = [];
  export let viewMode: 'grid' | 'list' = 'grid';
  export let groupBy: 'none' | 'author' | 'collection' | 'format' = 'none';
  export let activeGroupLabel = '';
  export let onEnterGroup:
    | ((label: string, groupBy: 'author' | 'collection' | 'format') => void | Promise<void>)
    | null = null;
  export let onEnterGroupAvailable:
    | ((label: string, groupBy: 'author' | 'collection' | 'format') => boolean)
    | null = null;
  export let onEnterGroupReasonLabel:
    | ((label: string, groupBy: 'author' | 'collection' | 'format') => string)
    | null = null;
  export let blockedGroupExplanations: LibraryBrowseGuardExplanation[] = [];
  export let groupEnterHintSurface: LibraryBrowseGuardSurface = 'group-card';
  export let onOpenLink: ((href: string) => void | Promise<void>) | null = null;
  export let onOpenSourcePath: ((filePath: string) => void | Promise<void>) | null = null;
  export let onUpdateBookMetadata:
    | ((
        book: BookshelfPreviewBook,
        metadata: {
          title: string;
          author: string;
          description?: string;
          language?: string;
          publisher?: string;
          collection?: string;
          tags?: string[];
        }
      ) => void | Promise<void>)
    | null = null;
  export let onRemoveBook: ((book: BookshelfPreviewBook) => void | Promise<void>) | null = null;
  export let onFilterStatus:
    | ((status: 'reading' | 'unstarted' | 'finished') => void | Promise<void>)
    | null = null;
  export let onFilterFormat: ((format: string) => void | Promise<void>) | null = null;
  export let onFilterCollection: ((collection: string) => void | Promise<void>) | null = null;
  export let onFilterTag: ((tag: string) => void | Promise<void>) | null = null;
  let expandedKey = '';
  let metadataEditKey = '';
  let metadataEditTitle = '';
  let metadataEditAuthor = '';
  let metadataEditDescription = '';
  let metadataEditLanguage = '';
  let metadataEditPublisher = '';
  let metadataEditCollection = '';
  let metadataEditTags = '';

  $: topLevelGroupedBrowse = groupBy !== 'none' && !activeGroupLabel;
  $: itemCountLabel = topLevelGroupedBrowse ? `${groupedBooks.length} 组` : `${books.length} 本`;
  $: groupedBooks = groupBooks(books, groupBy);

  const handleLinkClick = (event: MouseEvent, href: string | undefined) => {
    if (!href || !onOpenLink) return;
    event.preventDefault();
    void onOpenLink(href);
  };

  const handleEnterGroup = (event: MouseEvent, label: string) => {
    if (!onEnterGroup || groupBy === 'none') return;
    event.preventDefault();
    event.stopPropagation();
    void onEnterGroup(label, groupBy);
  };

  const isEnterGroupAvailable = (label: string) => {
    if (!onEnterGroupAvailable || groupBy === 'none') return true;
    return onEnterGroupAvailable(label, groupBy);
  };

  const getEnterGroupReasonLabel = (label: string) => {
    if (!onEnterGroupReasonLabel || groupBy === 'none') return '';
    return onEnterGroupReasonLabel(label, groupBy);
  };

  const getBookKey = (book: BookshelfPreviewBook) =>
    book.readerHref || `${book.format}::${book.title}::${book.author}`;

  const toggleDetails = (event: MouseEvent, key: string) => {
    event.preventDefault();
    event.stopPropagation();
    expandedKey = expandedKey === key ? '' : key;
    if (expandedKey !== key) {
      metadataEditKey = '';
    }
  };

  const startMetadataEdit = (event: MouseEvent, book: BookshelfPreviewBook) => {
    if (!onUpdateBookMetadata) return;
    event.preventDefault();
    event.stopPropagation();
    metadataEditKey = getBookKey(book);
    metadataEditTitle = book.title;
    metadataEditAuthor = book.author;
    metadataEditDescription = book.description ?? '';
    metadataEditLanguage = book.language ?? '';
    metadataEditPublisher = book.publisher ?? '';
    metadataEditCollection = book.collection ?? '';
    metadataEditTags = book.tags?.join(', ') ?? '';
  };

  const cancelMetadataEdit = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    metadataEditKey = '';
  };

  const handleMetadataSubmit = (event: SubmitEvent, book: BookshelfPreviewBook) => {
    event.preventDefault();
    event.stopPropagation();
    if (!onUpdateBookMetadata) return;
    const title = metadataEditTitle.trim();
    const author = metadataEditAuthor.trim();
    if (!title || !author) return;
    metadataEditKey = '';
    void onUpdateBookMetadata(book, {
      title,
      author,
      description: metadataEditDescription.trim(),
      language: metadataEditLanguage.trim(),
      publisher: metadataEditPublisher.trim(),
      collection: metadataEditCollection.trim(),
      tags: metadataEditTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    });
  };

  const handleRemoveBook = (event: MouseEvent, book: BookshelfPreviewBook) => {
    if (!onRemoveBook) return;
    event.preventDefault();
    event.stopPropagation();
    void onRemoveBook(book);
  };

  const handleOpenSourcePath = (event: MouseEvent, filePath: string | undefined) => {
    if (!filePath || !onOpenSourcePath) return;
    event.preventDefault();
    event.stopPropagation();
    void onOpenSourcePath(filePath);
  };

  const handleFilterFormat = (event: MouseEvent, format: string | undefined) => {
    const nextFormat = format?.trim().toUpperCase();
    if (!nextFormat || !onFilterFormat) return;
    event.preventDefault();
    event.stopPropagation();
    void onFilterFormat(nextFormat);
  };

  const getFilterableStatus = (book: BookshelfPreviewBook) => {
    const label = book.readingStatusLabel || book.status || '';
    if (label === '在读') return 'reading';
    if (label === '未开始') return 'unstarted';
    if (label === '已读完') return 'finished';
    return '';
  };

  const handleFilterStatus = (
    event: MouseEvent,
    status: 'reading' | 'unstarted' | 'finished' | ''
  ) => {
    if (!status || !onFilterStatus) return;
    event.preventDefault();
    event.stopPropagation();
    void onFilterStatus(status);
  };

  const getFilterStatusLabel = (status: 'reading' | 'unstarted' | 'finished' | '') => {
    if (status === 'reading') return '在读';
    if (status === 'unstarted') return '未开始';
    if (status === 'finished') return '已读完';
    return '';
  };

  const handleFilterCollection = (event: MouseEvent, collection: string | undefined) => {
    const nextCollection = collection?.trim();
    if (!nextCollection || !onFilterCollection) return;
    event.preventDefault();
    event.stopPropagation();
    void onFilterCollection(nextCollection);
  };

  const handleFilterTag = (event: MouseEvent, tag: string | undefined) => {
    const nextTag = tag?.trim();
    if (!nextTag || !onFilterTag) return;
    event.preventDefault();
    event.stopPropagation();
    void onFilterTag(nextTag);
  };

  const getPrimaryProgress = (book: BookshelfPreviewBook) => {
    if (book.progressPercentLabel) return book.progressPercentLabel;
    return book.progress;
  };

  const getPrimaryStatus = (book: BookshelfPreviewBook) => {
    if (book.readingStatusLabel) return book.readingStatusLabel;
    return book.status;
  };

  const getGroupLabel = (
    book: BookshelfPreviewBook,
    nextGroupBy: 'none' | 'author' | 'collection' | 'format'
  ) => {
    if (nextGroupBy === 'author') return book.author?.trim() || '未知作者';
    if (nextGroupBy === 'collection') return book.collection?.trim() || '未归类';
    if (nextGroupBy === 'format') return book.format?.trim().toUpperCase() || '未知格式';
    return '';
  };

  const getGroupDescription = (
    label: string,
    nextGroupBy: 'none' | 'author' | 'collection' | 'format',
    count: number
  ) => {
    if (nextGroupBy === 'author') return `${label} · ${count} 本`;
    if (nextGroupBy === 'collection') return `归类 ${label} · ${count} 本`;
    if (nextGroupBy === 'format') return `格式 ${label} · ${count} 本`;
    return '';
  };

  const groupBooks = (
    sourceBooks: BookshelfPreviewBook[],
    nextGroupBy: 'none' | 'author' | 'collection' | 'format'
  ) => {
    if (nextGroupBy === 'none') {
      return [{ key: 'all', label: '', description: '', books: sourceBooks }];
    }

    const groups = new Map<
      string,
      { key: string; label: string; description: string; books: BookshelfPreviewBook[] }
    >();

    for (const book of sourceBooks) {
      const label = getGroupLabel(book, nextGroupBy);
      const key = `${nextGroupBy}:${label}`;
      const existing = groups.get(key);
      if (existing) {
        existing.books.push(book);
        existing.description = getGroupDescription(label, nextGroupBy, existing.books.length);
        continue;
      }
      groups.set(key, {
        key,
        label,
        description: getGroupDescription(label, nextGroupBy, 1),
        books: [book]
      });
    }

    return Array.from(groups.values());
  };

  const getSecondaryMeta = (book: BookshelfPreviewBook) => {
    if (book.compatibilityLabel) return book.compatibilityLabel;
    if (book.readingStatusLabel && book.status && book.status !== book.readingStatusLabel) {
      return book.status;
    }
    if (book.sourceLabel) return book.sourceLabel;
    return book.author;
  };

</script>

<section class="shelf">
  <header class="shelf-head">
    <div class="heading">
      <h2>{sectionTitle}</h2>
      <div class="shelf-meta">
        <span>{itemCountLabel}</span>
      </div>
    </div>
  </header>
  <LibraryBrowseGuardHint
    explanations={topLevelGroupedBrowse ? blockedGroupExplanations : []}
    heading={
      groupEnterHintSurface === 'subgroup'
        ? '当前子层入口里有暂不可用的书架'
        : '当前分组入口里有暂不可用的书架'
    }
  />

  <div class="shelf-body" aria-label={sectionTitle}>
    {#if topLevelGroupedBrowse}
      <div class:grid={viewMode === 'grid'} class:list={viewMode === 'list'} aria-label={sectionTitle}>
        {#each groupedBooks as group}
          <article class:list-card={viewMode === 'list'} class="group-card">
            <button
              type="button"
              class:list-link={viewMode === 'list'}
              class="group-card-link"
              aria-label={`进入 ${group.label} 分组`}
              disabled={!isEnterGroupAvailable(group.label)}
              title={!isEnterGroupAvailable(group.label) ? getEnterGroupReasonLabel(group.label) : ''}
              on:click={(event: MouseEvent) => handleEnterGroup(event, group.label)}
            >
              <div class="group-cover-shell" aria-hidden="true">
                <div class:group-cover-strip={viewMode === 'list'} class="group-cover-grid">
                  {#each group.books.slice(0, viewMode === 'list' ? 6 : 4) as book}
                    <div class="group-cover-cell">
                      {#if book.coverUrl}
                        <img class="group-cover-image" src={book.coverUrl} alt="" loading="lazy" />
                      {:else}
                        <div class="group-cover-fallback">
                          <span>{book.title.slice(0, 8)}</span>
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
                <div class="group-cover-badge">{group.books.length} 本</div>
              </div>
              {#if viewMode === 'list'}
                <div class="meta list-meta group-list-meta">
                  <div class="list-copy">
                    <strong>{group.label}</strong>
                    <span>{group.description}</span>
                    <div class="meta-pills">
                      <span class="meta-pill strong">
                        {groupBy === 'author'
                          ? '作者书架'
                          : groupBy === 'collection'
                            ? '归类书架'
                            : '格式书架'}
                      </span>
                      {#if group.books[0]?.format}
                        <span class="meta-pill">{group.books[0].format}</span>
                      {/if}
                    </div>
                  </div>
                  <div class="list-trailing">
                    <div class="trailing-copy">
                      <small>进入分组</small>
                      <em>继续浏览这一组中的全部书。</em>
                    </div>
                    <div class="inline-actions" aria-hidden="true">
                      <span class="action-dot">↗</span>
                    </div>
                  </div>
                </div>
              {:else}
                <div class="meta group-meta">
                  <strong>{group.label}</strong>
                  <span>{group.description}</span>
                  <p>
                    {groupBy === 'author'
                      ? '集中浏览同一作者的书。'
                      : groupBy === 'collection'
                        ? '沿着当前归类继续浏览。'
                        : '按阅读格式进入这一组。'}
                  </p>
                  <div class="status-row">
                    <small>前往该组</small>
                    <em>继续浏览</em>
                  </div>
                </div>
              {/if}
            </button>
          </article>
        {/each}
      </div>
    {:else}
      {#each groupedBooks as group}
        <section class:ungrouped={groupBy === 'none'} class="group-section" aria-label={groupBy === 'none' ? sectionTitle : `${group.label} 分组`}>
          {#if groupBy !== 'none'}
            <header class="group-head">
              <div class="group-copy">
                <strong>{group.label}</strong>
                <span>{group.description}</span>
              </div>
            </header>
          {/if}

          <div class:grid={viewMode === 'grid'} class:list={viewMode === 'list'} aria-label={groupBy === 'none' ? sectionTitle : group.label}>
      {#each group.books as book}
      {@const bookKey = getBookKey(book)}
      {@const filterableStatus = getFilterableStatus(book)}
      {@const filterableStatusLabel = getFilterStatusLabel(filterableStatus)}
      <article class:list-card={viewMode === 'list'} class="book-card">
        <svelte:element
          this={book.readerHref ? 'a' : 'div'}
          class:list-link={viewMode === 'list'}
          class="book-link"
          href={book.readerHref}
          role={book.readerHref ? 'link' : undefined}
          aria-label={book.readerHref ? `在阅读器打开《${book.title}》` : undefined}
          on:click={(event: MouseEvent) => handleLinkClick(event, book.readerHref)}
        >
          <div class="cover-shell">
            <div class="cover-badges" aria-hidden="true">
              {#if book.format}
                <span class="cover-badge">{book.format}</span>
              {/if}
            </div>
            {#if book.coverUrl}
              <div class="cover" aria-hidden="true">
                <img class="cover-image" src={book.coverUrl} alt="" loading="lazy" />
              </div>
            {:else}
              <div class="cover" aria-hidden="true">
                <div class:list-cover={viewMode === 'list'} class="cover-fallback">
                  <div class="cover-title">{book.title}</div>
                  <div class="cover-author">{book.author}</div>
                </div>
              </div>
            {/if}
            <div class:list-hidden={viewMode === 'list'} class="cover-actions" aria-hidden="true">
              <span class="action-dot">⋯</span>
              <span class="action-dot">↗</span>
            </div>
          </div>
          {#if viewMode === 'list'}
            <div class="meta list-meta">
              <div class="list-copy">
                <strong>{book.title}</strong>
                <span>{book.author}</span>
                <div class="meta-pills">
                  {#if book.format}
                    <span class="meta-pill strong">{book.format}</span>
                  {/if}
                  <span class="meta-pill">{getPrimaryStatus(book)}</span>
                  {#if book.sourceLabel}
                    <span class="meta-pill">{book.sourceLabel}</span>
                  {/if}
                </div>
              </div>
              <div class="list-trailing">
                <div class="trailing-copy">
                  <small>{getPrimaryProgress(book)}</small>
                  <em>{getSecondaryMeta(book)}</em>
                </div>
                <div class="inline-actions" aria-hidden="true">
                  <span class="action-dot">⋯</span>
                  <span class="action-dot">↗</span>
                </div>
              </div>
            </div>
          {:else}
            <div class="meta">
              <strong>{book.title}</strong>
              <span>{book.author}</span>
              <p>{getSecondaryMeta(book)}</p>
              <div class="status-row">
                <small>{getPrimaryProgress(book)}</small>
                <em>{getPrimaryStatus(book)}</em>
              </div>
            </div>
          {/if}
        </svelte:element>
        <button
          type="button"
          class="detail-action"
          aria-expanded={expandedKey === bookKey}
          on:click={(event: MouseEvent) => toggleDetails(event, bookKey)}
        >
          详情
        </button>
        {#if expandedKey === bookKey}
          <div class="metadata-panel" aria-label={`《${book.title}》的书库元数据`}>
            <div class="metadata-grid">
              <span>标题</span>
              <strong>{book.title}</strong>
              <span>作者</span>
              <strong>{book.author}</strong>
              <span>格式</span>
              {#if book.format && onFilterFormat}
                <button
                  type="button"
                  class="metadata-filter-button"
                  aria-label={`筛选 ${book.format.toUpperCase()} 格式`}
                  on:click={(event: MouseEvent) => handleFilterFormat(event, book.format)}
                >
                  {book.format.toUpperCase()}
                </button>
              {:else}
                <strong>{book.format || '未知'}</strong>
              {/if}
              <span>状态</span>
              {#if filterableStatus && onFilterStatus}
                <button
                  type="button"
                  class="metadata-filter-button"
                  aria-label={`筛选 ${filterableStatusLabel} 状态`}
                  on:click={(event: MouseEvent) => handleFilterStatus(event, filterableStatus)}
                >
                  {filterableStatusLabel}
                </button>
              {:else}
                <strong>{book.readingStatusLabel || book.status || '未标记'}</strong>
              {/if}
              <span>进度</span>
              <strong>{book.progressPercentLabel || book.progress || '未记录'}</strong>
              <span>语言</span>
              <strong>{book.language || '未知'}</strong>
              <span>出版者</span>
              <strong>{book.publisher || '未记录'}</strong>
              <span>封面</span>
              <strong>{book.coverUrl ? '已设置' : '使用标题封面'}</strong>
              <span>书架归类</span>
              {#if book.collection && onFilterCollection}
                <button
                  type="button"
                  class="metadata-filter-button"
                  aria-label={`筛选 ${book.collection} 归类`}
                  on:click={(event: MouseEvent) => handleFilterCollection(event, book.collection)}
                >
                  {book.collection}
                </button>
              {:else}
                <strong>{book.collection || '未归类'}</strong>
              {/if}
              <span>标签</span>
              {#if book.tags?.length && onFilterTag}
                <div class="metadata-filter-list" aria-label={`《${book.title}》的标签`}>
                  {#each book.tags as tag}
                    <button
                      type="button"
                      class="metadata-filter-button"
                      aria-label={`筛选 ${tag} 标签`}
                      on:click={(event: MouseEvent) => handleFilterTag(event, tag)}
                    >
                      {tag}
                    </button>
                  {/each}
                </div>
              {:else}
                <strong>{book.tags?.length ? book.tags.join(' / ') : '未标记'}</strong>
              {/if}
              <span>来源</span>
              <strong>{book.sourceLabel || '未知来源'}</strong>
              <span>可用性</span>
              <strong>{book.availabilityLabel || '本地可读'}</strong>
              <span>兼容信息</span>
              <strong>{book.compatibilityLabel || '标准本地书籍'}</strong>
              <span>恢复定位</span>
              <strong>{book.progressLocation || '未记录'}</strong>
              <span>原文件</span>
              <strong>{book.sourcePath || '未记录'}</strong>
              <span>导入时间</span>
              <strong>{book.importedAtLabel || '未记录'}</strong>
              <span>最近阅读</span>
              <strong>{book.lastOpenedLabel || '未阅读'}</strong>
            </div>
            {#if book.description}
              <p>{book.description}</p>
            {/if}
            {#if metadataEditKey === bookKey && onUpdateBookMetadata}
              <form
                class="metadata-edit"
                aria-label={`编辑《${book.title}》的元数据`}
                on:submit={(event: SubmitEvent) => handleMetadataSubmit(event, book)}
              >
                <p class="metadata-edit-note">
                  只更新书库元数据；不会移动文件、重置阅读进度或覆盖恢复定位。
                </p>
                <label>
                  <span>标题</span>
                  <input bind:value={metadataEditTitle} required aria-label="编辑书名" />
                </label>
                <label>
                  <span>作者</span>
                  <input bind:value={metadataEditAuthor} required aria-label="编辑作者" />
                </label>
                <label>
                  <span>语言</span>
                  <input bind:value={metadataEditLanguage} aria-label="编辑语言" />
                </label>
                <label>
                  <span>出版者</span>
                  <input bind:value={metadataEditPublisher} aria-label="编辑出版者" />
                </label>
                <label>
                  <span>书架归类</span>
                  <input bind:value={metadataEditCollection} aria-label="编辑书架归类" />
                </label>
                <label>
                  <span>标签</span>
                  <input bind:value={metadataEditTags} aria-label="编辑标签" />
                </label>
                <label class="wide-field">
                  <span>简介</span>
                  <textarea
                    bind:value={metadataEditDescription}
                    aria-label="编辑简介"
                    rows="3"
                  ></textarea>
                </label>
                <div class="metadata-actions">
                  <button type="submit" class="metadata-action">保存元数据</button>
                  <button type="button" class="metadata-action" on:click={cancelMetadataEdit}>
                    取消
                  </button>
                </div>
              </form>
            {/if}
            {#if onOpenSourcePath || onRemoveBook || onUpdateBookMetadata}
              <div class="metadata-actions">
                {#if onUpdateBookMetadata && metadataEditKey !== bookKey}
                  <button
                    type="button"
                    class="metadata-action"
                    on:click={(event: MouseEvent) => startMetadataEdit(event, book)}
                  >
                    编辑元数据
                  </button>
                {/if}
                {#if onOpenSourcePath && book.sourcePath && !book.availabilityLabel?.includes('原文件缺失')}
                  <button
                    type="button"
                    class="metadata-action"
                    on:click={(event: MouseEvent) => handleOpenSourcePath(event, book.sourcePath)}
                  >
                    打开原文件
                  </button>
                {/if}
                {#if onRemoveBook}
                  <button
                    type="button"
                    class="metadata-action remove-action"
                    on:click={(event: MouseEvent) => handleRemoveBook(event, book)}
                  >
                    从书库移除
                  </button>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </article>
      {/each}
          </div>
        </section>
      {/each}
    {/if}
  </div>
</section>

<style>
  .shelf {
    --book-width: 132px;
    --cover-radius: 10px;
    --list-cover-width: 84px;
    --card-row-height: 122px;
    display: grid;
    gap: 10px;
  }

  .shelf-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    padding-inline: 2px;
  }

  .heading {
    display: grid;
    gap: 3px;
  }

  h2 {
    margin: 0;
    font-size: 15px;
    font-family: var(--font-chrome);
    font-weight: 600;
  }

  .shelf-meta {
    display: flex;
    gap: 7px;
    align-items: center;
    flex-wrap: wrap;
    color: var(--text-muted);
    font-size: 10px;
    line-height: 1.2;
    letter-spacing: 0.02em;
    font-family: var(--font-chrome);
  }

  .shelf-meta span {
    white-space: nowrap;
  }

  .shelf-body {
    display: grid;
    gap: 18px;
  }

  .group-section {
    display: grid;
    gap: 10px;
  }

  .group-section.ungrouped {
    gap: 0;
  }

  .group-card {
    display: grid;
    gap: 7px;
    width: 100%;
    max-width: 196px;
    font-family: var(--font-chrome);
  }

  .group-card-link {
    display: grid;
    gap: 9px;
    width: 100%;
    color: inherit;
    text-decoration: none;
  }

  .group-card-link:disabled {
    cursor: not-allowed;
    opacity: 0.56;
  }

  .group-cover-shell {
    position: relative;
    aspect-ratio: 28 / 41;
    border-radius: 12px;
    padding: 10px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 88%, white 12%);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--line-soft) 84%, white 16%),
      0 10px 28px rgba(35, 28, 18, 0.08);
  }

  .group-cover-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(0, 1fr));
    gap: 6px;
    width: 100%;
    height: 100%;
  }

  .group-cover-grid.group-cover-strip {
    display: flex;
    align-items: stretch;
    gap: 8px;
    overflow: hidden;
  }

  .group-cover-cell {
    min-width: 0;
    border-radius: 8px;
    overflow: hidden;
    background: color-mix(in srgb, var(--surface-reader) 84%, white 16%);
    box-shadow: 0 6px 18px rgba(33, 24, 15, 0.12);
  }

  .group-cover-strip .group-cover-cell {
    flex: 0 0 62px;
  }

  .group-cover-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .group-cover-fallback {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    padding: 8px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 86%, #ead7b6 14%);
    color: color-mix(in srgb, var(--text-primary) 90%, #6f4d26 10%);
    font: 600 9px/1.3 var(--font-reading);
    text-align: center;
    overflow-wrap: anywhere;
  }

  .group-cover-badge {
    position: absolute;
    right: 10px;
    bottom: 10px;
    min-height: 22px;
    padding: 0 9px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    background: rgba(34, 28, 20, 0.72);
    color: rgba(255, 249, 240, 0.94);
    font: 600 10px/1 var(--font-chrome);
    letter-spacing: 0.01em;
  }

  .group-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-inline: 2px;
  }

  .group-copy {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .group-copy strong {
    font: 600 12px/1.2 var(--font-chrome);
    color: var(--text-primary);
    letter-spacing: 0.01em;
  }

  .group-copy span {
    color: var(--text-muted);
    font: 500 10px/1.2 var(--font-chrome);
  }


  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(var(--book-width), 1fr));
    gap: 22px 18px;
    align-items: start;
  }

  .list {
    display: grid;
    gap: 12px;
  }

  .list .book-card {
    padding: 6px 0 14px;
    border-bottom: 1px solid var(--border-light);
  }

  .list .book-card:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .list .group-card:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .book-card {
    display: grid;
    gap: 7px;
    width: 100%;
    max-width: 176px;
    font-family: var(--font-chrome);
    transition: transform 120ms ease;
  }

  .list .group-card {
    max-width: none;
    padding: 6px 0 14px;
    border-bottom: 1px solid var(--border-light);
  }

  .list .group-card-link {
    grid-template-columns: minmax(0, 176px) minmax(0, 1fr);
    align-items: center;
    gap: 14px;
  }

  .list .group-cover-shell {
    aspect-ratio: auto;
    height: var(--card-row-height);
  }

  .group-meta strong,
  .group-list-meta strong {
    color: var(--text-primary);
  }

  .detail-action {
    justify-self: start;
    border: 1px solid color-mix(in srgb, var(--line-soft) 82%, white 18%);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 86%, white 14%);
    color: var(--text-secondary);
    cursor: pointer;
    font-family: var(--font-chrome);
    font-size: 9px;
    line-height: 1;
    padding: 5px 8px;
  }

  .detail-action:hover,
  .detail-action[aria-expanded="true"] {
    color: var(--text-primary);
    border-color: color-mix(in srgb, #8c6a3b 34%, var(--line-soft) 66%);
  }

  .metadata-panel {
    display: grid;
    gap: 8px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 82%, white 18%);
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 90%, white 10%);
    color: var(--text-secondary);
    padding: 9px;
  }

  .list-card .metadata-panel {
    grid-column: 1 / -1;
  }

  .metadata-grid {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 5px 8px;
    align-items: baseline;
  }

  .metadata-grid span {
    color: var(--text-muted);
    font-size: 9px;
    white-space: nowrap;
  }

  .metadata-grid strong {
    color: var(--text-primary);
    font-size: 10px;
    font-weight: 560;
    line-height: 1.35;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .metadata-filter-list {
    display: flex;
    min-width: 0;
    flex-wrap: wrap;
    gap: 4px;
  }

  .metadata-filter-button {
    min-width: 0;
    border: 1px solid color-mix(in srgb, var(--line-soft) 78%, white 22%);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 82%, #e8d2aa 18%);
    color: var(--text-primary);
    cursor: pointer;
    font-family: var(--font-chrome);
    font-size: 10px;
    font-weight: 560;
    line-height: 1;
    padding: 4px 7px;
    text-align: left;
    overflow-wrap: anywhere;
  }

  .metadata-filter-button:hover {
    border-color: color-mix(in srgb, #8c6a3b 42%, var(--line-soft) 58%);
    background: color-mix(in srgb, var(--surface-reader) 74%, #e8d2aa 26%);
  }

  .metadata-panel p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 10px;
    line-height: 1.45;
  }

  .metadata-edit {
    display: grid;
    gap: 8px;
    padding: 8px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--surface-reader) 80%, white 20%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--line-soft) 82%, white 18%);
  }

  .metadata-edit-note {
    margin: 0;
    color: color-mix(in srgb, var(--text-secondary) 88%, #6f4a21 12%);
    font-size: 10px;
    line-height: 1.45;
  }

  .metadata-edit label {
    display: grid;
    gap: 4px;
    color: var(--text-muted);
    font-size: 9px;
  }

  .metadata-edit input,
  .metadata-edit textarea {
    min-width: 0;
    border: 1px solid color-mix(in srgb, var(--line-soft) 82%, white 18%);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.72);
    color: var(--text-primary);
    font: 560 11px/1.2 var(--font-chrome);
    padding: 7px 8px;
  }

  .metadata-edit textarea {
    resize: vertical;
    line-height: 1.45;
  }

  .metadata-edit .wide-field {
    grid-column: 1 / -1;
  }

  .metadata-actions {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
  }

  .metadata-action {
    justify-self: start;
    border: 1px solid color-mix(in srgb, var(--line-soft) 84%, white 16%);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 88%, #f7d8ce 12%);
    color: var(--text-secondary);
    cursor: pointer;
    font-family: var(--font-chrome);
    font-size: 9px;
    line-height: 1;
    padding: 6px 9px;
  }

  .metadata-action:hover {
    border-color: color-mix(in srgb, #8c6a3b 38%, var(--line-soft) 62%);
    color: var(--text-primary);
  }

  .remove-action {
    border-color: color-mix(in srgb, #9a3d2f 34%, var(--line-soft) 66%);
    color: color-mix(in srgb, #8a2d22 76%, var(--text-secondary) 24%);
  }

  .remove-action:hover {
    border-color: color-mix(in srgb, #9a3d2f 56%, var(--line-soft) 44%);
    color: #7b251b;
  }

  .book-link {
    display: grid;
    gap: 7px;
    color: inherit;
    text-decoration: none;
  }

  .book-card:hover {
    transform: translateY(-1px);
  }

  .book-link:focus-visible {
    outline: 2px solid color-mix(in srgb, #8c6a3b 72%, white 28%);
    outline-offset: 4px;
    border-radius: 10px;
  }

  .book-link.list-link {
    grid-template-columns: var(--list-cover-width) minmax(0, 1fr);
    gap: 16px;
    align-items: center;
    min-height: var(--card-row-height);
  }

  .book-card.list-card {
    width: auto;
    min-width: 0;
    grid-template-columns: var(--list-cover-width) minmax(0, 1fr);
    gap: 16px;
    align-items: center;
  }

  .cover-shell {
    position: relative;
    width: 100%;
    aspect-ratio: 28 / 41;
    border-radius: var(--cover-radius);
  }

  .cover-badges {
    position: absolute;
    left: 7px;
    top: 7px;
    z-index: 1;
    display: flex;
    gap: 5px;
    pointer-events: none;
  }

  .cover-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 18px;
    padding: 0 6px;
    border-radius: 999px;
    background: rgba(255, 250, 243, 0.92);
    color: color-mix(in srgb, var(--text-secondary) 86%, white 14%);
    font-size: 8px;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.5) inset,
      0 3px 8px rgba(25, 18, 10, 0.08);
  }

  .grid .book-card {
    justify-self: stretch;
  }

  .list-card .cover-shell {
    width: var(--list-cover-width);
  }

  .cover {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
    border-radius: var(--cover-radius);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.18) inset,
      0 8px 18px rgba(51, 37, 18, 0.11);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0)),
      linear-gradient(155deg, rgba(151, 108, 56, 0.08), rgba(78, 55, 31, 0.03)),
      color-mix(in srgb, var(--surface-panel) 84%, white 16%);
    border: 1px solid rgba(75, 56, 31, 0.1);
    transition:
      box-shadow 120ms ease,
      border-color 120ms ease;
  }

  .book-card:hover .cover {
    border-color: rgba(75, 56, 31, 0.15);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.2) inset,
      0 12px 24px rgba(51, 37, 18, 0.14);
  }

  .cover-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  .cover-fallback {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-rows: 1fr auto;
    padding: 11px 10px 9px;
    color: color-mix(in srgb, var(--text-primary) 76%, white 24%);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.02)),
      linear-gradient(0deg, rgba(244, 235, 222, 0.24), rgba(244, 235, 222, 0));
  }

  .cover-fallback.list-cover {
    padding: 8px 7px 7px;
  }

  .cover-title {
    align-self: center;
    text-align: center;
    font-family: var(--font-reading);
    font-size: 14px;
    line-height: 1.16;
    font-weight: 550;
    letter-spacing: -0.015em;
    display: -webkit-box;
    line-clamp: 3;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .list-cover .cover-title {
    font-size: 11px;
    line-height: 1.12;
  }

  .cover-author {
    text-align: center;
    color: color-mix(in srgb, var(--text-secondary) 68%, white 32%);
    font-size: 9px;
    line-height: 1.2;
    letter-spacing: 0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cover-actions {
    position: absolute;
    right: 6px;
    bottom: 6px;
    display: flex;
    gap: 5px;
    opacity: 0;
    transform: translateY(2px);
    transition:
      opacity 120ms ease,
      transform 120ms ease;
    pointer-events: none;
  }

  .book-card:hover .cover-actions,
  .book-card:hover .inline-actions,
  .book-card:focus-within .cover-actions,
  .book-card:focus-within .inline-actions {
    opacity: 1;
    transform: translateY(0);
  }

  .action-dot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 17px;
    height: 17px;
    border-radius: 999px;
    background: rgba(255, 251, 244, 0.94);
    color: color-mix(in srgb, var(--text-secondary) 82%, white 18%);
    font-size: 10px;
    line-height: 1;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.5) inset,
      0 2px 8px rgba(25, 18, 10, 0.1);
  }

  .meta {
    display: grid;
    gap: 3px;
    min-width: 0;
    align-self: stretch;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
  }

  .list-card .meta {
    gap: 8px;
    grid-template-rows: none;
  }

  .meta strong {
    overflow: hidden;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1.28;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    text-overflow: ellipsis;
  }

  .list-card .meta strong {
    font-size: 12px;
    line-clamp: 1;
    -webkit-line-clamp: 1;
  }

  .meta span,
  .meta p,
  .meta small,
  .meta em {
    color: var(--text-secondary);
    font-style: normal;
    font-size: 9px;
    line-height: 1.3;
  }

  .list-card .meta span,
  .list-card .meta p,
  .list-card .meta small,
  .list-card .meta em {
    font-size: 10px;
  }

  .meta span,
  .meta p {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta p {
    margin: 0;
    color: color-mix(in srgb, var(--text-secondary) 84%, white 16%);
  }

  .list-meta {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 16px;
  }

  .list-copy {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .meta-pills {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
  }

  .meta-pill {
    display: inline-flex;
    align-items: center;
    min-height: 18px;
    padding: 0 7px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 80%, white 20%);
    color: color-mix(in srgb, var(--text-secondary) 84%, white 16%);
    border: 1px solid color-mix(in srgb, var(--line-soft) 84%, white 16%);
    font-size: 9px;
    line-height: 1;
    white-space: nowrap;
  }

  .meta-pill.strong {
    color: color-mix(in srgb, var(--text-primary) 88%, white 12%);
    background: color-mix(in srgb, var(--surface-reader) 74%, white 26%);
  }

  .list-trailing {
    display: grid;
    justify-items: end;
    gap: 5px;
    min-width: 110px;
    align-self: stretch;
    grid-template-rows: minmax(0, 1fr) auto;
    padding-block: 2px;
  }

  .trailing-copy {
    display: grid;
    gap: 4px;
    align-content: start;
    justify-items: end;
    min-width: 0;
  }

  .list-trailing small {
    color: var(--text-muted);
    font-size: 9px;
    letter-spacing: 0.01em;
    text-align: right;
  }

  .list-trailing em {
    max-width: 100%;
    color: color-mix(in srgb, var(--text-secondary) 80%, white 20%);
    font-style: normal;
    font-size: 9px;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: right;
  }

  .inline-actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    opacity: 0;
    transform: translateY(2px);
    transition:
      opacity 120ms ease,
      transform 120ms ease;
  }

  .list-hidden {
    display: none;
  }

  .status-row {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    min-width: 0;
    align-items: baseline;
  }

  .status-row small,
  .status-row em {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status-row small {
    color: var(--text-muted);
  }

  .status-row em {
    max-width: 50%;
    text-align: right;
  }

  @media (max-width: 900px) {
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
      gap: 18px 14px;
    }

    .book-card {
      max-width: none;
    }
  }

  @media (max-width: 780px) {
    .shelf-head {
      display: grid;
      align-items: start;
    }

    .shelf {
      --book-width: 112px;
    }

    .shelf-body {
      gap: 16px;
    }

    .grid {
      grid-template-columns: repeat(auto-fill, minmax(var(--book-width), 1fr));
      gap: 16px 12px;
    }

    .book-card.list-card {
      width: auto;
      grid-template-columns: 68px minmax(0, 1fr);
    }

    .list-card .cover-shell {
      width: 68px;
    }

    .cover-title {
      font-size: 13px;
    }
  }

  @media (max-width: 620px) {
    .grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>

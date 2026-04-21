<script lang="ts">
  import type { BookshelfPreviewBook } from '$lib/library/types';

  export let sectionTitle = '最近阅读';
  export let books: BookshelfPreviewBook[] = [];
  export let viewMode: 'grid' | 'list' = 'grid';
  export let showImportTile = false;
  export let importHref = '';
  export let onOpenLink: ((href: string) => void | Promise<void>) | null = null;
  export let onImportBooks: (() => void | Promise<void>) | null = null;
  let expandedKey = '';

  $: totalItems = books.length + (showImportTile ? 1 : 0);

  const handleLinkClick = (event: MouseEvent, href: string | undefined) => {
    if (!href || !onOpenLink) return;
    event.preventDefault();
    void onOpenLink(href);
  };

  const handleImportClick = (event: MouseEvent) => {
    if (!onImportBooks) return;
    event.preventDefault();
    void onImportBooks();
  };

  const getBookKey = (book: BookshelfPreviewBook) =>
    book.readerHref || `${book.format}::${book.title}::${book.author}`;

  const toggleDetails = (event: MouseEvent, key: string) => {
    event.preventDefault();
    event.stopPropagation();
    expandedKey = expandedKey === key ? '' : key;
  };

  const getPrimaryProgress = (book: BookshelfPreviewBook) => {
    if (book.progressPercentLabel) return book.progressPercentLabel;
    return book.progress;
  };

  const getPrimaryStatus = (book: BookshelfPreviewBook) => {
    if (book.readingStatusLabel) return book.readingStatusLabel;
    return book.status;
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
        <span>{totalItems} items</span>
        <span>{viewMode}</span>
      </div>
    </div>
  </header>

  <div class:grid={viewMode === 'grid'} class:list={viewMode === 'list'} aria-label={sectionTitle}>
    {#each books as book}
      {@const bookKey = getBookKey(book)}
      <article class:list-card={viewMode === 'list'} class="book-card">
        <svelte:element
          this={book.readerHref ? 'a' : 'div'}
          class:list-link={viewMode === 'list'}
          class="book-link"
          href={book.readerHref}
          role={book.readerHref ? 'link' : undefined}
          aria-label={book.readerHref ? `Open ${book.title} in reader` : undefined}
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
          <div class="metadata-panel" aria-label={`Library metadata for ${book.title}`}>
            <div class="metadata-grid">
              <span>标题</span>
              <strong>{book.title}</strong>
              <span>作者</span>
              <strong>{book.author}</strong>
              <span>格式</span>
              <strong>{book.format || '未知'}</strong>
              <span>状态</span>
              <strong>{book.readingStatusLabel || book.status || '未标记'}</strong>
              <span>进度</span>
              <strong>{book.progressPercentLabel || book.progress || '未记录'}</strong>
              <span>语言</span>
              <strong>{book.language || '未知'}</strong>
              <span>出版者</span>
              <strong>{book.publisher || '未记录'}</strong>
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
          </div>
        {/if}
      </article>
    {/each}

    {#if showImportTile}
      <article class:list-card={viewMode === 'list'} class="book-card import-card" aria-label="import books">
        <svelte:element
          this={onImportBooks || importHref ? 'a' : 'div'}
          class:list-link={viewMode === 'list'}
          class="book-link import-link"
          href={importHref}
          role={onImportBooks || importHref ? 'link' : undefined}
          aria-label={onImportBooks || importHref ? 'Import books from the system' : undefined}
          on:click={(event: MouseEvent) => {
            if (onImportBooks) {
              handleImportClick(event);
            } else {
              handleLinkClick(event, importHref);
            }
          }}
        >
          <div class="cover-shell">
            <div class="cover import-cover" aria-hidden="true">
              <div class="import-plus">＋</div>
            </div>
          </div>
          {#if viewMode === 'list'}
            <div class="meta list-meta import-meta import-meta-list">
              <div class="list-copy">
                <strong>导入书籍</strong>
                <span>支持 EPUB / PDF / FB2 / MOBI / AZW3</span>
                <div class="meta-pills">
                  <span class="meta-pill strong">SYSTEM</span>
                  <span class="meta-pill">本机文件</span>
                </div>
              </div>
              <div class="list-trailing">
                <div class="trailing-copy">
                  <small>立即导入</small>
                  <em>把本机已有书籍并入当前书库。</em>
                </div>
                <div class="inline-actions" aria-hidden="true">
                  <span class="action-dot">＋</span>
                </div>
              </div>
            </div>
          {:else}
            <div class="meta import-meta">
              <strong>导入书籍</strong>
              <span>支持 EPUB / PDF / FB2 / MOBI / AZW3</span>
              <p>把本机已有书籍并入当前书库。</p>
            </div>
          {/if}
        </svelte:element>
      </article>
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
    font-size: 9px;
    line-height: 1.2;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    font-family: var(--font-chrome);
  }

  .shelf-meta span + span {
    position: relative;
    padding-left: 8px;
  }

  .shelf-meta span + span::before {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    width: 3px;
    height: 3px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--text-muted) 78%, white 22%);
    transform: translateY(-50%);
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

  .book-card {
    display: grid;
    gap: 7px;
    width: 100%;
    max-width: 176px;
    font-family: var(--font-chrome);
    transition: transform 120ms ease;
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

  .metadata-panel p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 10px;
    line-height: 1.45;
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

  .import-cover {
    display: grid;
    place-items: center;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 70%, white 30%);
    border-style: dashed;
    border-color: rgba(79, 59, 33, 0.16);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.28),
      inset 0 14px 28px rgba(248, 240, 228, 0.35);
    transition:
      border-color 120ms ease,
      background 120ms ease;
  }

  .import-card:hover .import-cover {
    border-color: rgba(79, 59, 33, 0.24);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 74%, white 26%);
  }

  .import-plus {
    color: color-mix(in srgb, var(--text-muted) 82%, white 18%);
    font-size: 23px;
    line-height: 1;
  }

  .import-meta strong {
    color: color-mix(in srgb, var(--text-primary) 92%, white 8%);
  }

  .import-meta span {
    color: var(--text-muted);
  }

  .import-meta p {
    color: color-mix(in srgb, var(--text-secondary) 80%, white 20%);
  }

  .import-meta-list .inline-actions {
    opacity: 1;
    transform: none;
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

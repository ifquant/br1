<script lang="ts">
  type Book = {
    title: string;
    author: string;
    status: string;
    progress: string;
    coverUrl?: string;
    readerHref?: string;
  };

  export let sectionTitle = '最近阅读';
  export let books: Book[] = [];
  export let viewMode: 'grid' | 'list' = 'grid';
  export let showImportTile = false;
  export let importHref = '';
  export let onOpenLink: ((href: string) => void | Promise<void>) | null = null;
  export let onImportBooks: (() => void | Promise<void>) | null = null;
  export let onChangeViewMode:
    | ((viewMode: 'grid' | 'list') => void | Promise<void>)
    | null = null;

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

  const handleViewModeClick = (nextViewMode: 'grid' | 'list') => {
    if (!onChangeViewMode) return;
    void onChangeViewMode(nextViewMode);
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
    <div class="tools" aria-label="view mode placeholder">
      <div class="modes">
        <button
          type="button"
          class:active={viewMode === 'grid'}
          class="mode"
          aria-pressed={viewMode === 'grid'}
          on:click={() => handleViewModeClick('grid')}
        >
          网格
        </button>
        <button
          type="button"
          class:active={viewMode === 'list'}
          class="mode"
          aria-pressed={viewMode === 'list'}
          on:click={() => handleViewModeClick('list')}
        >
          列表
        </button>
      </div>
      <button type="button" class="tool-button" aria-label="view settings">⋯</button>
    </div>
  </header>

  <div class:grid={viewMode === 'grid'} class:list={viewMode === 'list'} aria-label={sectionTitle}>
    {#each books as book}
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
              <span class="action-dot">i</span>
              <span class="action-dot">⇣</span>
            </div>
          </div>
          {#if viewMode === 'list'}
            <div class="meta list-meta">
              <div class="list-copy">
                <strong>{book.title}</strong>
                <span>{book.author}</span>
                <p>{book.status}</p>
              </div>
              <div class="list-trailing">
                <small>{book.progress}</small>
                <div class="inline-actions" aria-hidden="true">
                  <span class="action-dot">i</span>
                  <span class="action-dot">⇣</span>
                </div>
              </div>
            </div>
          {:else}
            <div class="meta">
              <strong>{book.title}</strong>
              <span>{book.author}</span>
              <div class="status-row">
                <small>{book.progress}</small>
                <em>{book.status}</em>
              </div>
            </div>
          {/if}
        </svelte:element>
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
          <div class="meta import-meta">
            <strong>导入书籍</strong>
            <span>epub / pdf / mobi</span>
          </div>
        </svelte:element>
      </article>
    {/if}
  </div>
</section>

<style>
  .shelf {
    --book-width: 132px;
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

  .tools {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-chrome);
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

  .modes {
    display: inline-flex;
    padding: 1px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 90%, white 10%);
    box-shadow:
      inset 0 0 0 1px var(--border-light),
      0 1px 0 rgba(255, 255, 255, 0.28);
    font-family: var(--font-chrome);
  }

  .mode {
    padding: 5px 9px;
    border: 0;
    border-radius: 999px;
    font-size: 11px;
    color: var(--text-muted);
    letter-spacing: -0.01em;
    background: transparent;
    font-family: inherit;
  }

  .mode.active {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--surface-reader) 88%, white 12%);
    box-shadow:
      inset 0 0 0 1px rgba(76, 57, 34, 0.06),
      0 1px 2px rgba(35, 25, 13, 0.06);
  }

  .tool-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    font: inherit;
    font-size: 13px;
  }

  .tool-button:hover {
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
    color: var(--text-primary);
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
    padding-bottom: 12px;
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
  }

  .book-link {
    display: grid;
    gap: 7px;
    color: inherit;
    text-decoration: none;
  }

  .book-link:focus-visible {
    outline: 2px solid color-mix(in srgb, #8c6a3b 72%, white 28%);
    outline-offset: 4px;
    border-radius: 10px;
  }

  .book-link.list-link {
    grid-template-columns: 76px minmax(0, 1fr);
    gap: 14px;
    align-items: center;
  }

  .book-card.list-card {
    width: auto;
    min-width: 0;
    grid-template-columns: 76px minmax(0, 1fr);
    gap: 14px;
    align-items: center;
  }

  .cover-shell {
    position: relative;
    width: 100%;
    aspect-ratio: 28 / 41;
    border-radius: 8px;
  }

  .grid .book-card {
    justify-self: stretch;
  }

  .list-card .cover-shell {
    width: 76px;
  }

  .cover {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
    border-radius: 8px;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.18) inset,
      0 8px 18px rgba(51, 37, 18, 0.11);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0)),
      linear-gradient(155deg, rgba(151, 108, 56, 0.08), rgba(78, 55, 31, 0.03)),
      color-mix(in srgb, var(--surface-panel) 84%, white 16%);
    border: 1px solid rgba(75, 56, 31, 0.1);
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
  }

  .book-card:hover .cover-actions {
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
    font-size: 9px;
    line-height: 1;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.5) inset,
      0 2px 8px rgba(25, 18, 10, 0.1);
  }

  .meta {
    display: grid;
    gap: 1px;
    min-width: 0;
  }

  .list-card .meta {
    gap: 6px;
  }

  .meta strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .list-card .meta strong {
    font-size: 12px;
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
    color: color-mix(in srgb, var(--text-secondary) 88%, white 12%);
  }

  .list-meta {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 14px;
  }

  .list-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .list-trailing {
    display: grid;
    justify-items: end;
    gap: 7px;
    min-width: 82px;
  }

  .list-trailing small {
    color: var(--text-muted);
    font-size: 9px;
    letter-spacing: 0.01em;
    text-align: right;
  }

  .inline-actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .list-hidden {
    display: none;
  }

  .status-row {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    min-width: 0;
    padding-top: 1px;
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

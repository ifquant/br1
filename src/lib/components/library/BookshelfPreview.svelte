<script lang="ts">
  type Book = {
    title: string;
    author: string;
    status: string;
    progress: string;
  };

  export let sectionTitle = '最近阅读';
  export let sectionHint = '先对齐 Readest 的书架、分组和继续阅读主路径。';
  export let books: Book[] = [];
</script>

<section class="shelf">
  <header class="shelf-head">
    <div>
      <h2>{sectionTitle}</h2>
      <p>{sectionHint}</p>
    </div>
    <div class="modes" aria-label="view mode placeholder">
      <span class="mode active">网格</span>
      <span class="mode">列表</span>
    </div>
  </header>

  <div class="grid" aria-label={sectionTitle}>
    {#each books as book}
      <article class="book-card">
        <div class="cover-shell">
          <div class="cover" aria-hidden="true">
            <div class="cover-fallback">
              <div class="cover-title">{book.title}</div>
              <div class="cover-author">{book.author}</div>
            </div>
          </div>
          <div class="cover-actions" aria-hidden="true">
            <span class="action-dot">i</span>
            <span class="action-dot">⇣</span>
          </div>
        </div>
        <div class="meta">
          <strong>{book.title}</strong>
          <span>{book.author}</span>
          <div class="status-row">
            <small>{book.progress}</small>
            <em>{book.status}</em>
          </div>
        </div>
      </article>
    {/each}
  </div>
</section>

<style>
  .shelf {
    display: grid;
    gap: 12px;
  }

  .shelf-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: end;
  }

  h2 {
    margin: 0;
    font-size: 15px;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-weight: 600;
  }

  p {
    margin: 3px 0 0;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
  }

  .modes {
    display: inline-flex;
    padding: 2px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 86%, white 14%);
    box-shadow: inset 0 0 0 1px var(--line-soft);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .mode {
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .mode.active {
    color: var(--text-primary);
    background: var(--surface-reader);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(132px, 132px));
    gap: 20px 16px;
    justify-content: start;
  }

  .book-card {
    display: grid;
    gap: 7px;
    width: 132px;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .cover-shell {
    position: relative;
    width: 132px;
    aspect-ratio: 28 / 41;
    border-radius: 8px;
  }

  .cover {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
    border-radius: 8px;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.22) inset,
      0 10px 20px rgba(51, 37, 18, 0.14);
    background:
      linear-gradient(155deg, rgba(151, 108, 56, 0.2), rgba(78, 55, 31, 0.1)),
      linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 78%, var(--surface-page) 22%);
    border: 1px solid rgba(75, 56, 31, 0.12);
  }

  .cover-fallback {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-rows: 1fr auto;
    padding: 12px 10px 10px;
    color: color-mix(in srgb, var(--text-primary) 82%, white 18%);
  }

  .cover-title {
    align-self: center;
    text-align: center;
    font-family:
      "Iowan Old Style",
      "Palatino Linotype",
      "Noto Serif SC",
      Georgia,
      serif;
    font-size: 15px;
    line-height: 1.18;
    font-weight: 600;
    display: -webkit-box;
    line-clamp: 3;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .cover-author {
    text-align: center;
    color: color-mix(in srgb, var(--text-secondary) 78%, white 22%);
    font-size: 10px;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cover-actions {
    position: absolute;
    right: 6px;
    bottom: 6px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 120ms ease;
  }

  .book-card:hover .cover-actions {
    opacity: 1;
  }

  .action-dot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 999px;
    background: rgba(255, 250, 242, 0.92);
    color: var(--text-secondary);
    font-size: 10px;
    line-height: 1;
    box-shadow: 0 2px 8px rgba(25, 18, 10, 0.12);
  }

  .meta {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .meta strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .meta span,
  .meta small,
  .meta em {
    color: var(--text-secondary);
    font-style: normal;
    font-size: 10px;
    line-height: 1.35;
  }

  .meta span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status-row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    padding-top: 2px;
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
    max-width: 54%;
    text-align: right;
  }

  @media (max-width: 780px) {
    .shelf-head {
      display: grid;
      align-items: start;
    }

    .grid {
      grid-template-columns: repeat(auto-fill, minmax(112px, 112px));
      gap: 16px 12px;
    }

    .book-card,
    .cover-shell {
      width: 112px;
    }

    .cover-title {
      font-size: 13px;
    }
  }
</style>

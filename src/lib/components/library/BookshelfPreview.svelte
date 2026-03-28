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
          <div class="cover" aria-hidden="true"></div>
        </div>
        <div class="meta">
          <strong>{book.title}</strong>
          <span>{book.author}</span>
          <div class="status-row">
            <small>{book.status}</small>
            <em>{book.progress}</em>
          </div>
        </div>
      </article>
    {/each}
  </div>
</section>

<style>
  .shelf {
    display: grid;
    gap: 14px;
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
    margin: 4px 0 0;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.5;
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
    gap: 18px 16px;
    justify-content: start;
  }

  .book-card {
    display: grid;
    gap: 8px;
    width: 132px;
  }

  .cover-shell {
    position: relative;
    width: 132px;
    aspect-ratio: 28 / 41;
  }

  .cover {
    width: 100%;
    height: 100%;
    border-radius: 6px;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.22) inset,
      0 9px 20px rgba(51, 37, 18, 0.14);
    background:
      linear-gradient(155deg, rgba(151, 108, 56, 0.24), rgba(78, 55, 31, 0.12)),
      linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 78%, var(--surface-page) 22%);
    border: 1px solid rgba(75, 56, 31, 0.12);
  }

  .meta {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .meta strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 12px;
    font-weight: 600;
  }

  .meta span,
  .meta small,
  .meta em {
    color: var(--text-secondary);
    font-style: normal;
    font-size: 11px;
    line-height: 1.4;
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
  }

  .status-row small,
  .status-row em {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  }
</style>

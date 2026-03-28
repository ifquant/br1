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
        <div class="cover" aria-hidden="true"></div>
        <div class="meta">
          <strong>{book.title}</strong>
          <span>{book.author}</span>
          <small>{book.status}</small>
          <em>{book.progress}</em>
        </div>
      </article>
    {/each}
  </div>
</section>

<style>
  .shelf {
    display: grid;
    gap: 16px;
  }

  .shelf-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: end;
  }

  h2 {
    margin: 0;
    font-size: 22px;
  }

  p {
    margin: 6px 0 0;
    color: var(--text-secondary);
  }

  .modes {
    display: inline-flex;
    padding: 4px;
    border: 1px solid var(--line-soft);
    background: var(--surface-panel);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .mode {
    padding: 8px 12px;
    color: var(--text-muted);
  }

  .mode.active {
    color: var(--text-primary);
    background: var(--surface-reader);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
  }

  .book-card {
    display: grid;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--line-soft);
    background: var(--surface-panel);
  }

  .cover {
    aspect-ratio: 3 / 4;
    border: 1px solid var(--line-soft);
    background:
      linear-gradient(155deg, rgba(150, 111, 67, 0.16), rgba(53, 44, 31, 0.08)),
      var(--surface-page);
  }

  .meta {
    display: grid;
    gap: 5px;
  }

  .meta span,
  .meta small,
  .meta em {
    color: var(--text-secondary);
    font-style: normal;
  }

  @media (max-width: 780px) {
    .shelf-head {
      display: grid;
      align-items: start;
    }
  }
</style>

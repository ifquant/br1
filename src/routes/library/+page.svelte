<script lang="ts">
  const books = [
    { title: '政治秩序与政治衰败', author: 'Francis Fukuyama', status: '继续阅读 · 第 3 章' },
    { title: '置身事内', author: '兰小欢', status: '最近导入 · 尚未开始' },
    { title: 'A Theory of Justice', author: 'John Rawls', status: '英文原版 · 建议启用导读' }
  ];
</script>

<section class="library">
  <header class="section-head">
    <div>
      <div class="eyebrow">Library</div>
      <h1>继续阅读优先</h1>
    </div>
    <button class="import-button" type="button">导入书籍</button>
  </header>

  <section class="continue-card">
    <div class="continue-copy">
      <span class="label">当前建议</span>
      <strong>回到《政治秩序与政治衰败》</strong>
      <p>后续这里会接真实阅读进度、最近 bridge 痕迹和上次中断位置。</p>
    </div>
    <a class="continue-link" href="/reader">打开阅读器</a>
  </section>

  <section class="book-grid" aria-label="book shelf preview">
    {#each books as book}
      <article class="book-card">
        <div class="cover" aria-hidden="true"></div>
        <div class="meta">
          <strong>{book.title}</strong>
          <span>{book.author}</span>
          <small>{book.status}</small>
        </div>
      </article>
    {/each}
  </section>
</section>

<style>
  .library {
    display: grid;
    gap: 24px;
  }

  .section-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 16px;
  }

  .eyebrow {
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1 {
    margin: 6px 0 0;
    font-size: 32px;
    line-height: 1.1;
  }

  .import-button,
  .continue-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 16px;
    border: 1px solid var(--line-strong);
    background: var(--accent-reading);
    color: white;
    text-decoration: none;
    font: inherit;
    cursor: pointer;
  }

  .continue-card {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 18px;
    padding: 20px;
    border: 1px solid var(--line-soft);
    background: var(--surface-reader);
  }

  .continue-copy {
    display: grid;
    gap: 8px;
  }

  .continue-copy p,
  .meta span,
  .meta small {
    margin: 0;
    color: var(--text-secondary);
  }

  .label {
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .book-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
  }

  .book-card {
    display: grid;
    gap: 14px;
    padding: 16px;
    border: 1px solid var(--line-soft);
    background: var(--surface-panel);
  }

  .cover {
    aspect-ratio: 3 / 4;
    background:
      linear-gradient(145deg, rgba(162, 122, 70, 0.18), rgba(72, 57, 35, 0.08)),
      var(--surface-page);
    border: 1px solid var(--line-soft);
  }

  .meta {
    display: grid;
    gap: 6px;
  }

  @media (max-width: 780px) {
    .section-head,
    .continue-card {
      grid-template-columns: 1fr;
      align-items: start;
    }
  }
</style>

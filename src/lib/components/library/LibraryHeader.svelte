<script lang="ts">
  export let title = 'Your Library';
  export let subtitle = '继续阅读、最近导入和书架组织都先在这一层对齐 Readest。';
</script>

<header class="library-header">
  <div class="copy">
    <div class="eyebrow">Library</div>
    <h1>{title}</h1>
    <p>{subtitle}</p>
  </div>

  <div class="actions" aria-label="library actions preview">
    <div class="search-shell" aria-label="search placeholder">
      <span>搜索书库、作者、标签</span>
    </div>
    <button type="button">导入</button>
    <button type="button" class="secondary">视图</button>
  </div>
</header>

<style>
  .library-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 18px;
  }

  .copy {
    display: grid;
    gap: 6px;
  }

  .eyebrow {
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: clamp(30px, 4vw, 44px);
    line-height: 1.05;
  }

  p {
    margin: 0;
    max-width: 66ch;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: end;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .search-shell,
  button {
    min-height: 44px;
    border: 1px solid var(--line-soft);
    background: var(--surface-reader);
  }

  .search-shell {
    display: inline-flex;
    align-items: center;
    min-width: min(320px, 100%);
    padding: 0 16px;
    color: var(--text-muted);
  }

  button {
    padding: 0 16px;
    color: white;
    background: var(--accent-reading);
    font: inherit;
    cursor: pointer;
  }

  button.secondary {
    color: var(--text-primary);
    background: var(--surface-panel);
  }

  @media (max-width: 900px) {
    .library-header {
      display: grid;
    }

    .actions {
      justify-content: start;
    }

    .search-shell {
      min-width: 0;
      width: 100%;
    }
  }
</style>

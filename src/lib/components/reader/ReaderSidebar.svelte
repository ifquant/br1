<script lang="ts">
  const toc = [
    '第 1 章 国家与秩序',
    '第 2 章 制度与权力',
    '第 3 章 衰败的起点'
  ];
</script>

<aside class="reader-sidebar" aria-label="reader navigation preview">
  <header class="sidebar-head">
    <div class="eyebrow">Contents</div>
    <strong>目录 / 搜索 / 笔记</strong>
  </header>

  <div class="tabs" aria-label="sidebar tabs preview">
    <span class="tab active">目录</span>
    <span class="tab">搜索</span>
    <span class="tab">笔记</span>
  </div>

  <nav class="toc" aria-label="table of contents preview">
    {#each toc as item, index}
      <a href="/reader" class:active={index === 2}>{item}</a>
    {/each}
  </nav>
</aside>

<style>
  .reader-sidebar {
    display: grid;
    align-content: start;
    gap: 14px;
    padding: 18px;
    border: 1px solid var(--line-soft);
    background: var(--surface-panel);
  }

  .sidebar-head {
    display: grid;
    gap: 4px;
  }

  .eyebrow {
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .tabs {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .tab {
    padding: 8px 10px;
    border: 1px solid var(--line-soft);
    color: var(--text-muted);
    background: var(--surface-reader);
  }

  .tab.active {
    color: var(--text-primary);
    border-color: var(--line-strong);
  }

  .toc {
    display: grid;
    gap: 6px;
  }

  .toc a {
    padding: 10px 12px;
    color: var(--text-secondary);
    text-decoration: none;
    border: 1px solid transparent;
  }

  .toc a.active {
    color: var(--text-primary);
    background: var(--surface-reader);
    border-color: var(--line-soft);
  }
</style>

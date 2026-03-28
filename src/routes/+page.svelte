<script lang="ts">
  // 模拟 readest-app 的布局：头部 + 侧栏 + 主内容
  let collapsed = $state(false);
  const toggleSidebar = () => (collapsed = !collapsed);
  const items = $state([
    { id: 'library', title: 'Library' },
    { id: 'reader', title: 'Reader' },
    { id: 'settings', title: 'Settings' }
  ]);
</script>

<div class="layout">
  <header class="header">
    <div class="left">
      <button class="win-btn">≡</button>
      <h1 class="title">Readest</h1>
    </div>
    <div class="right">
      <button class="btn" onclick={toggleSidebar}>{collapsed ? '展开' : '折叠'}</button>
      <button class="btn primary">导入书籍</button>
    </div>
  </header>

  <div class="content">
    <aside class="sidebar" data-collapsed={collapsed}>
      <nav>
        {#each items as item}
          <a class="nav-item" href="#${item.id}">{item.title}</a>
        {/each}
      </nav>
    </aside>

    <main class="main">
      <section class="grid">
        {#each Array(12).fill(0).map((_, i) => i) as i}
          <div class="book-card">
            <div class="cover"></div>
            <div class="meta">
              <div class="title">示例书籍 {i + 1}</div>
              <div class="authors">作者 A, B</div>
            </div>
          </div>
        {/each}
      </section>
    </main>
  </div>
</div>

<style>
  .layout {
    display: grid;
    grid-template-rows: 48px 1fr;
    height: 100vh;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    border-bottom: 1px solid #e5e7eb;
    background: var(--bg);
    color: var(--fg);
  }
  .left { display: flex; align-items: center; gap: 8px; }
  .title { font-size: 14px; margin: 0; }
  .win-btn { width: 28px; height: 28px; border-radius: 6px; }
  .btn { height: 28px; padding: 0 10px; border-radius: 6px; }
  .primary { background: var(--accent); color: white; border: none; }

  .content {
    display: grid;
    grid-template-columns: 220px 1fr;
    min-height: 0; /* allow children to shrink */
  }
  .sidebar {
    border-right: 1px solid #e5e7eb;
    padding: 10px;
    background: #fafafa;
  }
  .sidebar[data-collapsed="true"] { width: 56px; }
  .nav-item { display: block; padding: 8px; border-radius: 6px; color: var(--fg); }
  .nav-item:hover { background: #efefef; }

  .main { padding: 12px; overflow: auto; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
  }
  .book-card { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: white; }
  .cover { height: 160px; background: #ddd; }
  .meta { padding: 8px; }
  .title { font-size: 13px; font-weight: 600; }
  .authors { font-size: 12px; color: #666; }

  @media (prefers-color-scheme: dark) {
    .header { border-color: #3a3a3a; }
    .sidebar { background: #202020; border-color: #3a3a3a; }
    .nav-item:hover { background: #333; }
    .book-card { background: #111; border-color: #333; }
    .cover { background: #222; }
    .meta { color: #ddd; }
  }
</style>

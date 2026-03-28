<script lang="ts">
  import { BookshelfPreview, LibraryHeader } from '$lib/components';

  const continueReading = [
    {
      title: '政治秩序与政治衰败',
      author: 'Francis Fukuyama',
      status: '继续阅读 · 第 3 章',
      progress: '上次读到 34%'
    },
    {
      title: '置身事内',
      author: '兰小欢',
      status: '最近导入 · 尚未开始',
      progress: '等待首轮阅读'
    },
    {
      title: 'A Theory of Justice',
      author: 'John Rawls',
      status: '英文原版 · 建议启用导读',
      progress: '可作为 bridge 验证样本'
    }
  ];

  const recentImports = [
    {
      title: '论法的精神',
      author: 'Montesquieu',
      status: '新导入',
      progress: '等待元数据整理'
    },
    {
      title: '叫魂',
      author: '孔飞力',
      status: '最近整理',
      progress: '封面与作者信息待接真实数据'
    }
  ];
</script>

<section class="library">
  <LibraryHeader />

  <section class="continue-card">
    <div class="continue-copy">
      <span class="label">Continue Reading</span>
      <strong>回到《政治秩序与政治衰败》</strong>
      <p>这里先对齐 Readest 最重要的主路径：从书库直接回到上次阅读位置。</p>
    </div>
    <a class="continue-link" href="/reader">打开阅读器</a>
  </section>

  <div class="library-meta">
    <span>共 5 本样例书籍</span>
    <span>分组 / 排序 / 搜索 后续接真实 store</span>
  </div>

  <BookshelfPreview
    sectionTitle="继续阅读"
    sectionHint="模拟 Readest 书库里的主书架区，先把继续阅读放在最前。"
    books={continueReading}
  />

  <BookshelfPreview
    sectionTitle="最近导入"
    sectionHint="给后续导入、元数据补全和分组视图保留落点。"
    books={recentImports}
  />
</section>

<style>
  .library {
    display: grid;
    gap: 24px;
  }

  .continue-card {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    padding: 20px;
    border: 1px solid var(--line-soft);
    background: var(--surface-reader);
  }

  .continue-copy {
    display: grid;
    gap: 8px;
  }

  .continue-copy p,
  .library-meta {
    margin: 0;
    color: var(--text-secondary);
  }

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
  }

  .label {
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .library-meta {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding-top: 4px;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  @media (max-width: 780px) {
    .continue-card {
      display: grid;
      align-items: start;
    }
  }
</style>

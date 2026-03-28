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
  <div class="library-summary">
    <span>5 books</span>
    <span>grid view</span>
    <span>fixed 28:41 covers</span>
  </div>

  <BookshelfPreview
    sectionTitle="继续阅读"
    sectionHint="第一版严格对齐，先把卡片密度、封面比例和书架栅格贴近 Readest。"
    books={continueReading}
  />

  <BookshelfPreview
    sectionTitle="最近导入"
    sectionHint="这里先保留第二组书架，后续再接分组、排序和真实导入数据。"
    books={recentImports}
  />
</section>

<style>
  .library {
    display: grid;
    gap: 18px;
    align-content: start;
  }

  .library-summary {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
    min-height: 20px;
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    border-bottom: 1px solid var(--line-soft);
    padding-bottom: 12px;
  }
</style>

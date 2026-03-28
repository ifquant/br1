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

<section class="library-page">
  <div class="library-surface">
    <LibraryHeader />

    <div class="library-scroll">
      <div class="library-summary">
        <span>5 books</span>
        <span>grid view</span>
        <span>fixed 28:41 covers</span>
      </div>

      <BookshelfPreview
        sectionTitle="继续阅读"
        sectionHint="第一版严格对齐，先把卡片密度、封面比例和书架栅格贴近 Readest。"
        books={continueReading}
        showImportTile={true}
      />

      <BookshelfPreview
        sectionTitle="最近导入"
        sectionHint="这里先保留第二组书架，后续再接分组、排序和真实导入数据。"
        books={recentImports}
        viewMode="list"
      />
    </div>
  </div>
</section>

<style>
  .library-page {
    min-height: 100%;
    display: grid;
  }

  .library-surface {
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    border: 1px solid var(--line-soft);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 88%, white 12%);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.18) inset,
      0 18px 44px rgba(42, 30, 15, 0.06);
    padding: 14px 18px 0;
  }

  .library-scroll {
    min-height: 0;
    overflow: auto;
    display: grid;
    align-content: start;
    gap: 22px;
    padding: 14px 2px 18px;
  }

  .library-summary {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
    min-height: 18px;
    color: var(--text-muted);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    border-bottom: 1px solid var(--line-soft);
    padding-bottom: 10px;
  }

  @media (max-width: 900px) {
    .library-surface {
      padding: 12px 14px 0;
      border-left: 0;
      border-right: 0;
      box-shadow: none;
    }

    .library-scroll {
      gap: 18px;
      padding-bottom: 16px;
    }
  }
</style>

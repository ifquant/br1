<script lang="ts">
  import { BookshelfPreview, LibraryHeader } from '$lib/components';

  const continueReading = [
    {
      title: '政治秩序与政治衰败',
      author: 'Francis Fukuyama',
      status: '继续阅读 · 第 3 章',
      progress: '上次读到 34%',
      coverUrl: '/covers/political-order.svg'
    },
    {
      title: '置身事内',
      author: '兰小欢',
      status: '最近导入 · 尚未开始',
      progress: '等待首轮阅读',
      coverUrl: '/covers/inside-china.svg'
    },
    {
      title: 'A Theory of Justice',
      author: 'John Rawls',
      status: '英文原版 · 建议启用导读',
      progress: '可作为 bridge 验证样本',
      coverUrl: '/covers/theory-of-justice.svg'
    }
  ];

  const recentImports = [
    {
      title: '论法的精神',
      author: 'Montesquieu',
      status: '新导入',
      progress: '等待元数据整理',
      coverUrl: '/covers/spirit-of-law.svg'
    },
    {
      title: '叫魂',
      author: '孔飞力',
      status: '最近整理',
      progress: '封面与作者信息待接真实数据',
      coverUrl: '/covers/soulstealers.svg'
    }
  ];
</script>

<section class="library-page">
  <div class="library-surface">
    <LibraryHeader />

    <div class="library-scroll">
      <BookshelfPreview
        sectionTitle="继续阅读"
        books={continueReading}
        showImportTile={true}
      />

      <BookshelfPreview
        sectionTitle="最近导入"
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
    gap: 18px;
    padding: 10px 2px 18px;
  }

  @media (max-width: 900px) {
    .library-surface {
      padding: 12px 14px 0;
      border-left: 0;
      border-right: 0;
      box-shadow: none;
    }

    .library-scroll {
      gap: 16px;
      padding-bottom: 16px;
    }
  }
</style>

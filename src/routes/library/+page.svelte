<script lang="ts">
  import { onMount } from 'svelte';
  import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
  import { BookshelfPreview, LibraryHeader } from '$lib/components';
  import {
    canPersistLibrary,
    importLibraryBooks,
    loadPersistedLibraryBooks,
    openReaderTarget,
    selectSystemBookPaths,
    toReaderAssetHref
  } from '$lib/services';

  const assetHref = (url: string, label: string) =>
    `/reader?source=asset&url=${encodeURIComponent(url)}&label=${encodeURIComponent(label)}`;

  const starterBooks = [
    {
      title: '政治秩序与政治衰败',
      author: 'Francis Fukuyama',
      status: '继续阅读 · 第 3 章',
      progress: '上次读到 34%',
      coverUrl: '/covers/political-order.svg',
      readerHref: assetHref('/samples/sample-book.epub', 'Sample Book')
    },
    {
      title: '置身事内',
      author: '兰小欢',
      status: '最近导入 · 尚未开始',
      progress: '等待首轮阅读',
      coverUrl: '/covers/inside-china.svg',
      readerHref: assetHref('/samples/sample-book.epub', 'Sample Book')
    },
    {
      title: 'A Theory of Justice',
      author: 'John Rawls',
      status: '英文原版 · 建议启用导读',
      progress: '可作为 bridge 验证样本',
      coverUrl: '/covers/theory-of-justice.svg',
      readerHref: assetHref('/samples/sample-book.epub', 'Sample Book')
    }
  ];

  const starterImports = [
    {
      title: '论法的精神',
      author: 'Montesquieu',
      status: '新导入',
      progress: '等待元数据整理',
      coverUrl: '/covers/spirit-of-law.svg',
      readerHref: assetHref('/samples/sample-outline.pdf', 'Sample Outline')
    },
    {
      title: '叫魂',
      author: '孔飞力',
      status: '最近整理',
      progress: '封面与作者信息待接真实数据',
      coverUrl: '/covers/soulstealers.svg',
      readerHref: assetHref('/samples/sample-book.epub', 'Sample Book')
    }
  ];

  type ShelfBook = {
    title: string;
    author: string;
    status: string;
    progress: string;
    coverUrl?: string;
    readerHref?: string;
  };

  let importedBooks: ShelfBook[] = [];
  let importInput: HTMLInputElement | null = null;

  const loadLibrary = async () => {
    if (!canPersistLibrary()) return;

    const records = await loadPersistedLibraryBooks();
    importedBooks = await Promise.all(
      records.map(async (record) => ({
        title: record.title,
        author: record.author,
        status: record.status,
        progress: record.progress,
        readerHref: await toReaderAssetHref(record)
      }))
    );
  };

  onMount(() => {
    void loadLibrary();
  });

  const handleOpenReaderLink = async (href: string) => {
    const opened = await openReaderTarget(href);
    if (!opened && typeof window !== 'undefined') {
      window.location.href = href;
    }
  };

  const triggerImportPicker = async () => {
    if (canPersistLibrary()) {
      const filePaths = await selectSystemBookPaths();
      if (filePaths.length === 0) return;

      const records = await importLibraryBooks(filePaths);
      const mappedRecords = await Promise.all(
        records.map(async (record) => ({
          title: record.title,
          author: record.author,
          status: record.status,
          progress: record.progress,
          readerHref: await toReaderAssetHref(record)
        }))
      );
      importedBooks = [...mappedRecords, ...importedBooks];

      const [firstRecord] = records;
      if (firstRecord) {
        const href = await toReaderAssetHref(firstRecord);
        await handleOpenReaderLink(href);
      }
      return;
    }

    if (!importInput) return;
    if (typeof importInput.showPicker === 'function') {
      try {
        await importInput.showPicker();
        return;
      } catch (error) {
        console.warn('showPicker() failed in library import flow, falling back to click()', error);
      }
    }
    importInput.click();
  };

  const handleImportChange = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const [file] = input.files ?? [];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    await handleOpenReaderLink(assetHref(objectUrl, file.name));

    input.value = '';
  };
</script>

<section class="library-page">
  <div class="library-surface">
    <input
      bind:this={importInput}
      class="import-input"
      type="file"
      accept=".epub,.pdf,.mobi,.azw3,.fb2"
      on:change={handleImportChange}
    />

    <LibraryHeader />

    <OverlayScrollbarsComponent
      defer
      element="div"
      class="library-scroll"
      options={{ scrollbars: { autoHide: 'scroll', theme: 'os-theme-readest' } }}
    >
      {#if importedBooks.length}
        <BookshelfPreview
          sectionTitle="你的书库"
          books={importedBooks}
          viewMode="list"
          onOpenLink={handleOpenReaderLink}
        />
      {/if}

      <BookshelfPreview
        sectionTitle={importedBooks.length ? '样例书架' : '继续阅读'}
        books={starterBooks}
        showImportTile={true}
        onOpenLink={handleOpenReaderLink}
        onImportBooks={triggerImportPicker}
      />

      <BookshelfPreview
        sectionTitle={importedBooks.length ? '参考导入' : '最近导入'}
        books={starterImports}
        viewMode="list"
        onOpenLink={handleOpenReaderLink}
      />
    </OverlayScrollbarsComponent>
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

  .import-input {
    display: none;
  }

  :global(.library-scroll) {
    min-height: 0;
    overflow: auto;
    display: grid;
    align-content: start;
    gap: 18px;
    padding: 10px 2px 18px;
    overscroll-behavior: contain;
  }

  :global(.library-scroll .os-scrollbar.os-theme-readest) {
    --os-size: 10px;
    --os-padding-perpendicular: 2px;
    --os-padding-axis: 2px;
    --os-track-bg: transparent;
    --os-track-bg-hover: transparent;
    --os-track-bg-active: transparent;
    --os-track-border: none;
    --os-track-border-hover: none;
    --os-track-border-active: none;
    --os-handle-border-radius: 999px;
    --os-handle-bg: rgba(95, 85, 72, 0.12);
    --os-handle-bg-hover: rgba(95, 85, 72, 0.18);
    --os-handle-bg-active: rgba(95, 85, 72, 0.22);
    --os-handle-min-size: 28px;
    --os-handle-interactive-area-offset: 1px;
  }

  :global(.library-scroll .os-scrollbar-vertical.os-theme-readest) {
    --os-size: 8px;
  }

  @media (max-width: 900px) {
    .library-surface {
      padding: 12px 14px 0;
      border-left: 0;
      border-right: 0;
      box-shadow: none;
    }

    :global(.library-scroll) {
      gap: 16px;
      padding-bottom: 16px;
    }

    :global(.library-scroll .os-scrollbar.os-theme-readest) {
      --os-size: 8px;
      --os-padding-perpendicular: 1px;
      --os-padding-axis: 1px;
    }
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
  import type { LibraryShelfBook } from '$lib/library/types';
  import { BookshelfPreview, ContinueReadingShelf, LibraryHeader } from '$lib/components';
  import type { PersistedLibraryBook } from '$lib/services/libraryPersistence';
  import {
    canPersistLibrary,
    detectReadestLibrary,
    importBooksFromDesktopPicker,
    importBooksFromReadest,
    loadPersistedLibraryBooks,
    openLibraryBookPath,
    openReaderTarget,
    toAssetReaderHref,
    toLibraryCoverUrl,
    toReaderAssetHref,
    toReaderStartHref
  } from '$lib/services';

  const starterBooks = [
    {
      title: '政治秩序与政治衰败',
      author: 'Francis Fukuyama',
      status: '继续阅读 · 第 3 章',
      progress: '上次读到 34%',
      coverUrl: '/covers/political-order.svg',
      readerHref: toAssetReaderHref('/samples/sample-book.epub', 'Sample Book')
    },
    {
      title: '置身事内',
      author: '兰小欢',
      status: '最近导入 · 尚未开始',
      progress: '等待首轮阅读',
      coverUrl: '/covers/inside-china.svg',
      readerHref: toAssetReaderHref('/samples/sample-book.epub', 'Sample Book')
    },
    {
      title: 'A Theory of Justice',
      author: 'John Rawls',
      status: '英文原版 · 建议启用导读',
      progress: '可作为 bridge 验证样本',
      coverUrl: '/covers/theory-of-justice.svg',
      readerHref: toAssetReaderHref('/samples/sample-book.epub', 'Sample Book')
    }
  ];

  const starterImports = [
    {
      title: '论法的精神',
      author: 'Montesquieu',
      status: '新导入',
      progress: '等待元数据整理',
      coverUrl: '/covers/spirit-of-law.svg',
      readerHref: toAssetReaderHref('/samples/sample-outline.pdf', 'Sample Outline')
    },
    {
      title: '叫魂',
      author: '孔飞力',
      status: '最近整理',
      progress: '封面与作者信息待接真实数据',
      coverUrl: '/covers/soulstealers.svg',
      readerHref: toAssetReaderHref('/samples/sample-book.epub', 'Sample Book')
    }
  ];

  const readerValidationRank = (record: PersistedLibraryBook) => {
    const normalized = record.format.trim().toUpperCase();
    if (normalized === 'PDF') return 0;
    if (normalized === 'EPUB') return 1;
    if (normalized === 'FB2' || normalized === 'MOBI' || normalized === 'AZW3') return 2;
    return 3;
  };

  const sortRecordsForLibraryShelf = (records: PersistedLibraryBook[]) =>
    [...records].sort((left, right) => {
      const leftOpenedAt = left.lastOpenedAt ?? 0;
      const rightOpenedAt = right.lastOpenedAt ?? 0;
      const byRecency = rightOpenedAt - leftOpenedAt;
      if (byRecency !== 0) return byRecency;

      const byFormat = readerValidationRank(left) - readerValidationRank(right);
      if (byFormat !== 0) return byFormat;
      return right.importedAt - left.importedAt;
    });

  let importedBooks: LibraryShelfBook[] = [];
  let importInput: HTMLInputElement | null = null;
  let readestLibraryCount = 0;
  let showReadestMigration = false;
  let migrationBusy = false;
  let desktopLibraryMode = false;
  let libraryViewMode: 'grid' | 'list' = 'grid';
  let continueReadingBooks: LibraryShelfBook[] = [];
  let libraryShelfBooks: LibraryShelfBook[] = [];

  const formatLastOpenedLabel = (timestamp: number | null | undefined) => {
    if (typeof timestamp !== 'number' || timestamp <= 0) return '';

    const deltaMs = Date.now() - timestamp;
    const deltaMinutes = Math.max(1, Math.round(deltaMs / 60000));

    if (deltaMinutes < 60) return `${deltaMinutes} 分钟前阅读`;
    if (deltaMinutes < 60 * 24) return `${Math.round(deltaMinutes / 60)} 小时前阅读`;
    return `${Math.round(deltaMinutes / (60 * 24))} 天前阅读`;
  };

  const mapLibraryRecord = async (record: PersistedLibraryBook): Promise<LibraryShelfBook> => {
    const progressFraction =
      typeof record.progressFraction === 'number'
        ? Math.max(0, Math.min(1, record.progressFraction))
        : null;

    const readingStatusLabel =
      progressFraction === null
        ? ''
        : progressFraction >= 1
          ? '已读完'
          : progressFraction > 0
            ? '在读'
            : '未开始';

    const sourceLabel = record.id.startsWith('readest-')
      ? 'Readest'
      : record.sourcePath
        ? '本机导入'
        : '书库';

    return {
      title: record.title,
      author: record.author,
      format: record.format,
      description: record.description || '',
      language: record.language || '',
      publisher: record.publisher || '',
      status: record.status,
      progress: record.progress,
      progressPercentLabel:
        progressFraction !== null
          ? `${Math.max(0, Math.min(100, Math.round(progressFraction * 100)))}%`
          : '',
      readingStatusLabel,
      sourceLabel,
      availabilityLabel: '本地可读',
      sourcePath: record.sourcePath || record.filePath,
      coverUrl: await toLibraryCoverUrl(record),
      readerHref: toReaderAssetHref(record),
      restartHref: toReaderStartHref(record),
      lastOpenedAt: record.lastOpenedAt,
      lastOpenedLabel: formatLastOpenedLabel(record.lastOpenedAt)
    };
  };

  const getContinueReadingBooks = (books: LibraryShelfBook[]) =>
    books
      .filter((book) => typeof book.lastOpenedAt === 'number' && book.lastOpenedAt > 0)
      .slice(0, 4);

  const getLibraryShelfBooks = (
    books: LibraryShelfBook[],
    continueReading: LibraryShelfBook[]
  ) => {
    const continueKeys = new Set(
      continueReading.map((book) => book.readerHref || `${book.title}::${book.author}`)
    );

    return books.filter((book) => {
      const key = book.readerHref || `${book.title}::${book.author}`;
      return !continueKeys.has(key);
    });
  };

  const loadLibrary = async () => {
    if (!canPersistLibrary()) return;
    desktopLibraryMode = true;

    const records = await loadPersistedLibraryBooks();
    const readestSummary = await detectReadestLibrary();
    readestLibraryCount = readestSummary.count;

    if (records.length === 0 && readestSummary.available) {
      await triggerReadestMigration({ autoOpenFirstBook: false, reloadAfterImport: false });
      const migratedRecords = await loadPersistedLibraryBooks();
      importedBooks = await Promise.all(
        sortRecordsForLibraryShelf(migratedRecords).map(mapLibraryRecord)
      );
      showReadestMigration = migratedRecords.length === 0;
      return;
    }

    importedBooks = await Promise.all(sortRecordsForLibraryShelf(records).map(mapLibraryRecord));
    showReadestMigration = readestSummary.available;
  };

  onMount(() => {
    void loadLibrary();
  });

  $: continueReadingBooks = getContinueReadingBooks(importedBooks);
  $: libraryShelfBooks = getLibraryShelfBooks(importedBooks, continueReadingBooks);

  const handleOpenReaderLink = async (href: string) => {
    const opened = await openReaderTarget(href);
    if (!opened && typeof window !== 'undefined') {
      window.location.href = href;
    }
  };

  const handleOpenSourcePath = async (filePath: string) => {
    try {
      await openLibraryBookPath(filePath);
    } catch (error) {
      console.error('Failed to open the original book path', error);
    }
  };

  const triggerImportPicker = async () => {
    if (canPersistLibrary()) {
      try {
        const result = await importBooksFromDesktopPicker();
        if (result.kind !== 'imported') return;

        const records = sortRecordsForLibraryShelf(result.records);
        const mappedRecords = await Promise.all(records.map(mapLibraryRecord));
        importedBooks = [...mappedRecords, ...importedBooks];
        showReadestMigration = false;
        await handleOpenReaderLink(result.firstReaderHref);
      } catch (error) {
        console.error('Failed to open the desktop import picker', error);
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
    await handleOpenReaderLink(toAssetReaderHref(objectUrl, file.name));

    input.value = '';
  };

  const triggerReadestMigration = async ({
    autoOpenFirstBook = true,
    reloadAfterImport = true
  }: {
    autoOpenFirstBook?: boolean;
    reloadAfterImport?: boolean;
  } = {}) => {
    if (!canPersistLibrary() || migrationBusy) return;

    migrationBusy = true;
    try {
      const result = await importBooksFromReadest();
      const records = sortRecordsForLibraryShelf(result.records);
      if (reloadAfterImport) {
        await loadLibrary();
      }
      showReadestMigration = true;

      if (autoOpenFirstBook && result.kind === 'imported') {
        await handleOpenReaderLink(result.firstReaderHref);
      }
    } finally {
      migrationBusy = false;
    }
  };

  const handleReadestMigrationClick = () => {
    void triggerReadestMigration();
  };

  const handleLibraryViewModeChange = (nextViewMode: 'grid' | 'list') => {
    libraryViewMode = nextViewMode;
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

    {#if showReadestMigration}
      <section class="migration-banner" aria-label="readest migration">
        <div class="migration-copy">
          <strong>发现 Readest 书库</strong>
          <span>本机找到 {readestLibraryCount} 本书，可继续同步进 br1 书库。</span>
        </div>
        <button type="button" class="migration-button" on:click={handleReadestMigrationClick}>
          {migrationBusy ? '迁移中…' : `从 Readest 导入`}
        </button>
      </section>
    {/if}

    <OverlayScrollbarsComponent
      defer
      element="div"
      class="library-scroll"
      options={{ scrollbars: { autoHide: 'scroll', theme: 'os-theme-readest' } }}
    >
      {#if importedBooks.length}
        {#if continueReadingBooks.length}
          <ContinueReadingShelf
            sectionTitle="继续阅读"
            books={continueReadingBooks}
            onOpenLink={handleOpenReaderLink}
            onOpenSourcePath={handleOpenSourcePath}
          />
        {/if}

        <BookshelfPreview
          sectionTitle="你的书库"
          books={libraryShelfBooks}
          viewMode={libraryViewMode}
          showImportTile={true}
          onOpenLink={handleOpenReaderLink}
          onImportBooks={triggerImportPicker}
          onChangeViewMode={handleLibraryViewModeChange}
        />
      {/if}

      {#if desktopLibraryMode}
        {#if !importedBooks.length}
          <section class="empty-library" aria-label="empty library">
            <div class="empty-copy">
              <strong>你的书库还是空的</strong>
              <span>
                可以从本机导入新书，或者先把已有的 Readest 书库迁进来。
              </span>
            </div>
            <div class="empty-actions">
              <button type="button" class="empty-action" on:click={triggerImportPicker}>
                从本机导入
              </button>
              {#if readestLibraryCount > 0}
                <button
                  type="button"
                  class="empty-action secondary"
                  on:click={handleReadestMigrationClick}
                >
                  {migrationBusy ? '迁移中…' : `导入 Readest 的 ${readestLibraryCount} 本书`}
                </button>
              {/if}
            </div>
          </section>
        {/if}
      {:else}
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
      {/if}
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

  .migration-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 10px 14px;
    margin-top: 10px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 82%, white 18%);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 90%, white 10%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      0 8px 24px rgba(42, 30, 15, 0.05);
  }

  .migration-copy {
    display: grid;
    gap: 3px;
  }

  .migration-copy strong {
    font-family: var(--font-chrome);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--text-primary);
  }

  .migration-copy span {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .migration-button {
    border: 0;
    border-radius: 999px;
    padding: 10px 14px;
    background: color-mix(in srgb, var(--text-primary) 94%, white 6%);
    color: white;
    font-family: var(--font-chrome);
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    box-shadow: 0 10px 20px rgba(42, 30, 15, 0.12);
  }

  .empty-library {
    display: grid;
    gap: 14px;
    align-content: start;
    padding: 26px 18px;
    border: 1px dashed color-mix(in srgb, var(--line-soft) 88%, white 12%);
    background: color-mix(in srgb, var(--surface-panel) 78%, white 22%);
  }

  .empty-copy {
    display: grid;
    gap: 4px;
  }

  .empty-copy strong {
    font-family: var(--font-chrome);
    font-size: 15px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--text-primary);
  }

  .empty-copy span {
    max-width: 52ch;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .empty-action {
    justify-self: start;
    border: 0;
    border-radius: 999px;
    padding: 10px 14px;
    background: color-mix(in srgb, var(--surface-reader) 80%, white 20%);
    color: var(--text-primary);
    font-family: var(--font-chrome);
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    box-shadow:
      inset 0 0 0 1px var(--border-light),
      0 10px 20px rgba(42, 30, 15, 0.06);
  }

  .empty-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .empty-action.secondary {
    background: transparent;
    box-shadow: inset 0 0 0 1px rgba(76, 57, 34, 0.12);
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

    .migration-banner {
      grid-template-columns: 1fr;
      align-items: start;
    }
  }
</style>

<script lang="ts">
  import type { ContinueReadingBook } from '$lib/library/types';

  export let sectionTitle = '继续阅读';
  export let sectionDescription = '回到上次停下来的地方。';
  export let primaryActionLabel = '继续';
  export let books: ContinueReadingBook[] = [];
  export let onOpenLink: ((href: string) => void | Promise<void>) | null = null;
  export let onOpenSourcePath: ((filePath: string) => void | Promise<void>) | null = null;
  export let onImportBooks: (() => void | Promise<void>) | null = null;
  export let onRepairBook: ((book: ContinueReadingBook) => void | Promise<void>) | null = null;
  export let bulkActionLabel = '';
  export let bulkActionDisabled = false;
  export let onBulkAction: (() => void | Promise<void>) | null = null;
  let expandedKey = '';

  const handleLinkClick = (event: MouseEvent, href: string | undefined) => {
    if (!href || !onOpenLink) return;
    event.preventDefault();
    void onOpenLink(href);
  };

  const handleActionClick = (event: MouseEvent, href: string | undefined) => {
    event.preventDefault();
    event.stopPropagation();
    if (!href || !onOpenLink) return;
    void onOpenLink(href);
  };

  const toggleDetails = (event: MouseEvent, key: string) => {
    event.preventDefault();
    event.stopPropagation();
    expandedKey = expandedKey === key ? '' : key;
  };

  const handleSourceOpen = (event: MouseEvent, filePath: string | undefined) => {
    event.preventDefault();
    event.stopPropagation();
    if (!filePath || !onOpenSourcePath) return;
    void onOpenSourcePath(filePath);
  };

  const handleImportBooks = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!onImportBooks) return;
    void onImportBooks();
  };

  const handleRepairBook = (event: MouseEvent, book: ContinueReadingBook) => {
    event.preventDefault();
    event.stopPropagation();
    if (!onRepairBook) return;
    void onRepairBook(book);
  };

  const handleBulkAction = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!onBulkAction || bulkActionDisabled) return;
    void onBulkAction();
  };

  const isMissingOriginalFile = (availabilityLabel: string | undefined) =>
    availabilityLabel?.includes('原文件缺失') ?? false;

  const isMissingLibraryCopy = (availabilityLabel: string | undefined) =>
    availabilityLabel?.includes('书库副本缺失') ?? false;

  const getRepairLabel = (
    originalFileMissing: boolean,
    libraryCopyMissing: boolean,
    sourceLabel: string | undefined
  ) => {
    if (libraryCopyMissing && sourceLabel?.includes('Readest')) return '重新同步';
    if (libraryCopyMissing) return '修复副本';
    if (originalFileMissing) return '重新关联';
    return '重新导入';
  };
</script>

<section class="continue-shelf">
  <header class="shelf-head">
    <div class="heading">
      <h2>{sectionTitle}</h2>
      <p>{sectionDescription}</p>
    </div>
    {#if onBulkAction && bulkActionLabel}
      <button
        type="button"
        class="header-action"
        disabled={bulkActionDisabled}
        on:click={handleBulkAction}
      >
        {bulkActionLabel}
      </button>
    {/if}
  </header>

  <div class="rows" aria-label={sectionTitle}>
    {#each books as book}
      {@const bookKey = book.readerHref || `${book.title}::${book.author}`}
      {@const originalFileMissing = isMissingOriginalFile(book.availabilityLabel)}
      {@const libraryCopyMissing = isMissingLibraryCopy(book.availabilityLabel)}
      <article class="row">
        <svelte:element
          this={book.readerHref ? 'a' : 'div'}
          class="row-link"
          href={book.readerHref}
          role={book.readerHref ? 'link' : undefined}
          aria-label={book.readerHref ? `Continue reading ${book.title}` : undefined}
          on:click={(event: MouseEvent) => handleLinkClick(event, book.readerHref)}
        >
          <div class="cover-shell">
            {#if book.coverUrl}
              <img class="cover-image" src={book.coverUrl} alt="" loading="lazy" />
            {:else}
              <div class="cover-fallback" aria-hidden="true">
                <span>{book.title}</span>
              </div>
            {/if}
          </div>
          <div class="copy">
            <div class="title-row">
              <strong>{book.title}</strong>
              {#if book.readingStatusLabel}
                <span class:finished={book.readingStatusLabel === '已读完'} class="status-pill">
                  {book.readingStatusLabel}
                </span>
              {/if}
              {#if book.sourceLabel}
                <span class="source-pill">{book.sourceLabel}</span>
              {/if}
            </div>
            <span>{book.author}</span>
            <p>{book.lastOpenedLabel || book.status}</p>
          </div>
          <div class="trailing">
            <small>{book.progress}</small>
            {#if book.progressPercentLabel}
              <span class="progress-pill">{book.progressPercentLabel}</span>
            {/if}
            <div class="actions">
              {#if book.restartHref}
                <button
                  type="button"
                  class="secondary-pill"
                  on:click={(event: MouseEvent) => handleActionClick(event, book.restartHref)}
                >
                  从头开始
                </button>
              {/if}
              <button
                type="button"
                class="secondary-pill"
                on:click={(event: MouseEvent) => toggleDetails(event, bookKey)}
              >
                详情
              </button>
              {#if book.sourcePath && !originalFileMissing && !libraryCopyMissing}
                <button
                  type="button"
                  class="secondary-pill"
                  on:click={(event: MouseEvent) => handleSourceOpen(event, book.sourcePath)}
                >
                  原文件
                </button>
              {:else if originalFileMissing || libraryCopyMissing}
                <button
                  type="button"
                  class="secondary-pill warning-pill"
                  on:click={(event: MouseEvent) => {
                    if (onRepairBook) {
                      handleRepairBook(event, book);
                    } else {
                      handleImportBooks(event);
                    }
                  }}
                >
                  {getRepairLabel(originalFileMissing, libraryCopyMissing, book.sourceLabel)}
                </button>
              {/if}
              <span class:warning={libraryCopyMissing} class="resume-pill">
                {libraryCopyMissing ? '需修复' : primaryActionLabel}
              </span>
            </div>
          </div>
        </svelte:element>
        {#if expandedKey === bookKey}
          <div class="detail-panel" aria-label={`Details for ${book.title}`}>
            {#if originalFileMissing || libraryCopyMissing}
              <div class="detail-warning">
                <strong>{book.availabilityLabel}</strong>
                <span>
                  {book.compatibilityLabel || '请重新导入这本书，恢复本地书库中的可用文件和原文件入口。'}
                </span>
              </div>
            {/if}
            <div class="detail-grid">
              <span>作者</span>
              <strong>{book.author}</strong>
              <span>进度</span>
              <strong>{book.progressPercentLabel || book.progress}</strong>
              <span>状态</span>
              <strong>{book.status}</strong>
              <span>格式</span>
              <strong>{book.format}</strong>
              <span>语言</span>
              <strong>{book.language || '未知'}</strong>
              <span>出版者</span>
              <strong>{book.publisher || '未记录'}</strong>
              <span>来源</span>
              <strong>{book.sourceLabel || '未知来源'}</strong>
              <span>可用性</span>
              <strong>{book.availabilityLabel || '未标记'}</strong>
              <span>兼容信息</span>
              <strong>{book.compatibilityLabel || '标准本地书籍'}</strong>
              <span>恢复定位</span>
              <strong>{book.progressLocation || '未记录'}</strong>
              <span>原文件</span>
              <strong>{book.sourcePath || '未记录'}</strong>
              <span>导入时间</span>
              <strong>{book.importedAtLabel || '未记录'}</strong>
              <span>最近阅读</span>
              <strong>{book.lastOpenedLabel || '刚导入'}</strong>
            </div>
            {#if book.description}
              <div class="detail-description">
                <span>简介</span>
                <p>{book.description}</p>
              </div>
            {/if}
          </div>
        {/if}
      </article>
    {/each}
  </div>
</section>

<style>
  .continue-shelf {
    display: grid;
    gap: 10px;
  }

  .shelf-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 16px;
    padding-inline: 2px;
  }

  .heading {
    display: grid;
    gap: 3px;
  }

  .header-action {
    border: 1px solid color-mix(in srgb, var(--line-strong) 84%, white 16%);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 88%, white 12%);
    color: var(--text-primary);
    font: 600 12px/1 var(--font-chrome);
    padding: 9px 14px;
    cursor: pointer;
    transition:
      transform 140ms ease,
      box-shadow 140ms ease,
      opacity 140ms ease;
    box-shadow: 0 8px 16px rgba(42, 30, 15, 0.08);
  }

  .header-action:hover:enabled {
    transform: translateY(-1px);
    box-shadow: 0 12px 22px rgba(42, 30, 15, 0.12);
  }

  .header-action:disabled {
    cursor: wait;
    opacity: 0.6;
    transform: none;
    box-shadow: none;
  }

  h2 {
    margin: 0;
    font-size: 15px;
    font-family: var(--font-chrome);
    font-weight: 600;
    color: var(--text-primary);
  }

  .heading p {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .rows {
    display: grid;
    gap: 10px;
  }

  .row {
    min-width: 0;
  }

  .row-link {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 86%, white 14%);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 90%, white 10%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.34),
      0 10px 24px rgba(42, 30, 15, 0.05);
    text-decoration: none;
    color: inherit;
  }

  .cover-shell {
    width: 40px;
    height: 58px;
    border-radius: 10px;
    overflow: hidden;
    box-shadow:
      0 10px 20px rgba(42, 30, 15, 0.08),
      inset 0 0 0 1px rgba(255, 255, 255, 0.28);
    background: color-mix(in srgb, var(--surface-reader) 85%, white 15%);
  }

  .cover-image,
  .cover-fallback {
    display: block;
    width: 100%;
    height: 100%;
  }

  .cover-image {
    object-fit: cover;
  }

  .cover-fallback {
    display: grid;
    place-items: center;
    padding: 6px;
    text-align: center;
    font: 600 8px/1.2 "Source Serif 4", Georgia, "Noto Serif SC", serif;
    color: color-mix(in srgb, var(--text-primary) 82%, white 18%);
  }

  .copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .copy strong,
  .copy span,
  .copy p,
  .trailing small {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .copy strong {
    font-family: var(--font-chrome);
    font-size: 14px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--text-primary);
  }

  .copy span {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .copy p {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .status-pill {
    flex: 0 0 auto;
    border-radius: 999px;
    padding: 4px 8px;
    background: color-mix(in srgb, var(--surface-panel) 84%, white 16%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    font-family: var(--font-chrome);
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    color: var(--text-secondary);
  }

  .status-pill.finished {
    background: color-mix(in srgb, #dbeed8 84%, white 16%);
    color: #456246;
    box-shadow: inset 0 0 0 1px rgba(69, 98, 70, 0.12);
  }

  .source-pill {
    flex: 0 0 auto;
    border-radius: 999px;
    padding: 4px 8px;
    background: color-mix(in srgb, #dde7f7 82%, white 18%);
    box-shadow: inset 0 0 0 1px rgba(84, 109, 156, 0.12);
    font-family: var(--font-chrome);
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    color: #516587;
  }

  .trailing {
    display: grid;
    justify-items: end;
    gap: 6px;
    min-width: 160px;
  }

  .trailing small {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    flex-wrap: wrap;
  }

  .progress-pill,
  .secondary-pill,
  .resume-pill {
    border-radius: 999px;
    font-family: var(--font-chrome);
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
  }

  .progress-pill {
    padding: 4px 8px;
    background: color-mix(in srgb, var(--surface-panel) 86%, white 14%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    color: var(--text-secondary);
  }

  .secondary-pill {
    border: 0;
    padding: 5px 9px;
    background: transparent;
    box-shadow: inset 0 0 0 1px rgba(76, 57, 34, 0.12);
    color: var(--text-secondary);
  }

  .secondary-pill.warning-pill {
    background: color-mix(in srgb, #cf7a35 12%, white 88%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, #cf7a35 22%, white 78%);
    color: color-mix(in srgb, #7c4619 88%, black 12%);
  }

  .resume-pill {
    padding: 5px 9px;
    background: color-mix(in srgb, var(--surface-reader) 82%, white 18%);
    box-shadow:
      inset 0 0 0 1px var(--border-light),
      0 6px 12px rgba(42, 30, 15, 0.04);
    color: var(--text-primary);
  }

  .resume-pill.warning {
    background: color-mix(in srgb, #cf7a35 18%, white 82%);
    color: color-mix(in srgb, #7c4619 86%, black 14%);
  }

  .detail-panel {
    margin-top: 8px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 88%, white 12%);
    background: color-mix(in srgb, var(--surface-reader) 84%, white 16%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      0 10px 24px rgba(42, 30, 15, 0.04);
    padding: 10px 12px;
  }

  .detail-warning {
    display: grid;
    gap: 4px;
    margin-bottom: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    background: color-mix(in srgb, #cf7a35 10%, white 90%);
    color: color-mix(in srgb, var(--text-primary) 90%, #7c4619 10%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, #cf7a35 18%, white 82%);
  }

  .detail-warning strong,
  .detail-warning span {
    font-size: 12px;
    line-height: 1.45;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 8px 12px;
    align-items: baseline;
  }

  .detail-grid span {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-grid strong {
    min-width: 0;
    font-family: var(--font-chrome);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.35;
    color: var(--text-primary);
  }

  .detail-description {
    display: grid;
    gap: 6px;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid color-mix(in srgb, var(--line-soft) 88%, white 12%);
  }

  .detail-description span {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-description p {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  @media (max-width: 720px) {
    .row-link {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .trailing {
      grid-column: 2;
      justify-items: start;
      min-width: 0;
    }

    .actions {
      justify-content: flex-start;
    }
  }
</style>

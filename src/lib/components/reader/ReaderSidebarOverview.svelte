<!-- This child only renders the reader's overview/navigation surface. The
 parent still owns sidebar shell state and tab routing; this component only
 renders the current preview card and TOC navigation callbacks. -->
<script lang="ts">
  import {
    READER_EMPTY_TITLE,
    createEmptyReaderPreviewState,
    getReaderFormatDisplayLabel,
    getReaderLayoutDisplayLabel,
    getReaderLocationDisplayLabel
  } from '$lib/reader';
  import type { ReaderPreviewState, ReaderTocItem } from '$lib/reader';

  export let coverUrl = '';
  export let preview: ReaderPreviewState = createEmptyReaderPreviewState();
  export let toc: ReaderTocItem[] = [];
  export let activeHref = '';
  export let bookmarkCount = 0;
  export let highlightCount = 0;
  export let noteCount = 0;
  export let onGoToLibrary: (() => void) | null = null;
  export let onOpenSourcePath: (() => void) | null = null;
  export let onNavigate: ((href: string) => void) | null = null;

  let bookMenuOpen = false;

  $: hasOpenedBook = !!preview.progressLocation || preview.title !== READER_EMPTY_TITLE;
  $: previewFormatDisplayLabel = getReaderFormatDisplayLabel(preview.formatLabel);
  $: previewLayoutDisplayLabel = getReaderLayoutDisplayLabel(preview.layoutLabel);
  $: previewLocationDisplayLabel = getReaderLocationDisplayLabel(preview.locationLabel);

  const toggleBookMenu = () => {
    bookMenuOpen = !bookMenuOpen;
  };

  const closeBookMenu = () => {
    bookMenuOpen = false;
  };

  const runBookMenuAction = (action: (() => void) | null | undefined) => {
    closeBookMenu();
    action?.();
  };

  const handleWindowPointerDown = (event: MouseEvent) => {
    if (!bookMenuOpen) return;
    const target = event.target;
    if (target instanceof Element && target.closest('.book-menu-anchor')) return;
    closeBookMenu();
  };

  const handleWindowKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') closeBookMenu();
  };
</script>

<svelte:window on:mousedown={handleWindowPointerDown} on:keydown={handleWindowKeydown} />

<div class="book-chip" aria-label="当前书概览">
  <div class="book-visual" aria-hidden="true">
    {#if coverUrl}
      <img class="book-cover-image" src={coverUrl} alt="" loading="lazy" />
    {:else}
      <div class="book-spine"></div>
    {/if}
  </div>
  <div class="book-copy">
    <span class="book-kicker">{previewFormatDisplayLabel} · {previewLayoutDisplayLabel}</span>
    <strong>{preview.title}</strong>
    <span>{preview.author}</span>
    <span>{preview.chapterLabel}</span>
    <div class="book-stats">
      <span>{preview.progressLabel}</span>
      <span>{previewLocationDisplayLabel}</span>
    </div>
    <div class="book-meta-row">
      <span>{toc.length} 章节</span>
      <span>{bookmarkCount} 书签</span>
      <span>{highlightCount} 高亮</span>
      <span>{noteCount} 笔记</span>
    </div>
    <div class="book-actions-row">
      <button type="button" class="book-action-chip primary" on:click={() => onGoToLibrary?.()}>
        回到书库
      </button>
      <div class="book-menu-anchor">
        <button
          type="button"
          class:active={bookMenuOpen}
          class="book-action-chip menu-trigger"
          aria-label="更多书籍操作"
          aria-expanded={bookMenuOpen}
          on:click={toggleBookMenu}
        >
          ⋯
        </button>

        {#if bookMenuOpen}
          <div class="book-action-menu" role="menu" aria-label="书籍更多操作">
            <button type="button" role="menuitem" on:click={() => runBookMenuAction(onGoToLibrary)}>
              回到书库
            </button>
            {#if onOpenSourcePath}
              <button type="button" role="menuitem" on:click={() => runBookMenuAction(onOpenSourcePath)}>
                打开原文件
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
    {#if !hasOpenedBook}
      <p class="book-empty">打开一本书后，这里会显示更完整的书籍信息。</p>
    {/if}
  </div>
</div>

<nav class="toc" aria-label="目录预览">
  {#if toc.length}
    {#each toc as item}
      <button
        type="button"
        class:active={item.href === activeHref}
        data-href={item.href}
        style={`--toc-level:${item.level};`}
        on:click={() => onNavigate?.(item.href)}
      >
        {item.label}
      </button>
    {/each}
  {:else}
    <p class="empty">打开书后，这里会显示最小章节列表。</p>
  {/if}
</nav>

<style>
  .book-chip {
    display: grid;
    grid-template-columns: 56px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    padding: 12px;
    border: 1px solid color-mix(in srgb, var(--border-light) 88%, transparent 12%);
    border-radius: 18px;
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
  }

  .book-visual {
    display: grid;
    width: 56px;
    min-height: 76px;
  }

  .book-cover-image,
  .book-spine {
    width: 56px;
    min-height: 76px;
    border-radius: 10px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      0 0 0 1px rgba(84, 62, 34, 0.08);
  }

  .book-cover-image {
    object-fit: cover;
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
  }

  .book-spine {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0)),
      linear-gradient(180deg, #c8a878, #a98350);
  }

  .book-copy {
    display: grid;
    gap: 3px;
    min-width: 0;
    font-family: var(--font-chrome);
  }

  .book-copy strong {
    font-size: 12px;
    line-height: 1.3;
  }

  .book-copy span {
    color: var(--text-muted);
    font-size: 11px;
    line-height: 1.45;
  }

  .book-kicker {
    color: var(--text-secondary);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .book-stats,
  .book-meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .book-meta-row span {
    padding: 3px 6px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    color: var(--text-secondary);
    font-size: 10px;
    line-height: 1;
  }

  .book-actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .book-action-chip {
    position: relative;
    min-height: 26px;
    padding: 0 10px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 84%, white 16%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    color: var(--text-primary);
    font: inherit;
    font-size: 11px;
    line-height: 1;
  }

  .book-action-chip:hover {
    background: color-mix(in srgb, var(--surface-panel) 76%, white 24%);
  }

  .book-action-chip.primary {
    background: color-mix(in srgb, var(--surface-panel) 78%, white 22%);
  }

  .book-action-chip.menu-trigger {
    min-width: 30px;
    padding: 0 9px;
  }

  .book-action-chip.menu-trigger.active {
    background: color-mix(in srgb, var(--surface-panel) 74%, white 26%);
  }

  .book-menu-anchor {
    position: relative;
  }

  .book-action-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    display: grid;
    min-width: 132px;
    padding: 6px;
    border: 1px solid var(--border-light);
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 242, 231, 0.98));
    box-shadow:
      0 18px 40px rgba(56, 40, 18, 0.12),
      0 3px 12px rgba(56, 40, 18, 0.08);
    z-index: 4;
  }

  .book-action-menu button {
    justify-content: flex-start;
    width: 100%;
    min-width: 0;
    min-height: 30px;
    padding: 7px 10px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: 12px;
    text-align: left;
  }

  .book-action-menu button:hover {
    background: color-mix(in srgb, var(--surface-panel) 80%, white 20%);
  }

  .book-empty {
    margin: 0;
    color: var(--text-muted);
    font-size: 11px;
    line-height: 1.45;
  }

  .toc {
    display: grid;
    gap: 3px;
  }

  .toc button {
    width: 100%;
    padding: 8px 10px;
    padding-left: calc(10px + var(--toc-level, 0) * 10px);
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    border-radius: 6px;
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.4;
    text-align: left;
  }

  .toc button.active {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--surface-reader) 82%, white 18%);
    box-shadow: inset 2px 0 0 #b18952;
  }

  .empty {
    margin: 0;
    padding: 2px 2px 0;
    color: var(--text-muted);
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.5;
  }

  button:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--reader-shell-accent, #8c6a3b) 72%, white 28%);
    outline-offset: 2px;
  }
</style>

<script lang="ts">
  import { tick } from 'svelte';
  import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
  import type { ReaderTocItem } from '$lib/reader';

  export let toc: ReaderTocItem[] = [];
  export let activeHref = '';
  export let onNavigate: ((href: string) => void) | null = null;

  let lastScrolledHref = '';

  const scrollActiveIntoView = async () => {
    if (!activeHref || activeHref === lastScrolledHref) return;
    await tick();

    const target = document.querySelector<HTMLButtonElement>(`.toc button[data-href="${CSS.escape(activeHref)}"]`);
    target?.scrollIntoView({ block: 'nearest' });
    lastScrolledHref = activeHref;
  };

  $: void scrollActiveIntoView();
</script>

<aside class="reader-sidebar" aria-label="reader navigation preview">
  <header class="sidebar-head">
    <div class="sidebar-tools">
      <button type="button" class="ghost-button" aria-label="toggle sidebar">☰</button>
      <div class="sidebar-labels">
        <span class="eyebrow">Contents</span>
        <strong>目录</strong>
      </div>
      <button type="button" class="ghost-button" aria-label="pin sidebar">⌖</button>
    </div>
  </header>

  <div class="tabs" aria-label="sidebar tabs preview">
    <span class="tab active">目录</span>
    <span class="tab">搜索</span>
    <span class="tab">笔记</span>
  </div>

  <OverlayScrollbarsComponent
    defer
    element="div"
    class="sidebar-scroll"
    options={{ scrollbars: { autoHide: 'scroll', theme: 'os-theme-readest' } }}
  >
    <div class="book-chip" aria-hidden="true">
      <div class="book-spine"></div>
      <div class="book-copy">
        <strong>当前阅读</strong>
        <span>{toc.length ? `${toc.length} sections available` : 'Open a book to populate the sidebar'}</span>
      </div>
    </div>

    <nav class="toc" aria-label="table of contents preview">
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
        <p class="empty">打开样例书后，这里会显示最小章节列表。</p>
      {/if}
    </nav>
  </OverlayScrollbarsComponent>
</aside>

<style>
  .reader-sidebar {
    display: grid;
    align-content: start;
    gap: 10px;
    min-height: 0;
    height: 100%;
    padding: 10px 10px 8px;
    border: 1px solid rgba(64, 47, 24, 0.08);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 96%, white 4%);
  }

  .sidebar-head {
    display: grid;
    gap: 8px;
  }

  .sidebar-tools {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) 28px;
    gap: 8px;
    align-items: center;
  }

  .ghost-button {
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    font: inherit;
    line-height: 1;
  }

  .ghost-button:hover {
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
    color: var(--text-primary);
  }

  .sidebar-labels {
    display: grid;
    gap: 1px;
    min-width: 0;
  }

  .eyebrow {
    color: var(--text-muted);
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .sidebar-labels strong {
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 13px;
    line-height: 1.2;
  }

  .tabs {
    display: flex;
    gap: 0;
    padding: 1px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px rgba(64, 47, 24, 0.08);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .tab {
    flex: 1 1 0;
    padding: 5px 8px;
    border-radius: 999px;
    color: var(--text-muted);
    text-align: center;
    font-size: 10px;
    letter-spacing: 0.03em;
  }

  .tab.active {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--surface-panel) 66%, white 34%);
    box-shadow:
      inset 0 0 0 1px rgba(64, 47, 24, 0.08),
      0 1px 2px rgba(35, 25, 13, 0.05);
  }

  .toc {
    display: grid;
    gap: 3px;
    padding-top: 10px;
  }

  :global(.sidebar-scroll) {
    min-height: 0;
    height: 100%;
    overscroll-behavior: contain;
  }

  :global(.sidebar-scroll .os-scrollbar.os-theme-readest) {
    --os-size: 8px;
    --os-padding-perpendicular: 1px;
    --os-padding-axis: 1px;
    --os-track-bg: transparent;
    --os-handle-border-radius: 999px;
    --os-handle-bg: rgba(95, 85, 72, 0.12);
    --os-handle-bg-hover: rgba(95, 85, 72, 0.18);
    --os-handle-bg-active: rgba(95, 85, 72, 0.22);
  }

  .book-chip {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    padding: 10px;
    border: 1px solid rgba(64, 47, 24, 0.07);
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
  }

  .book-spine {
    width: 8px;
    min-height: 42px;
    border-radius: 4px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0)),
      linear-gradient(180deg, #c8a878, #a98350);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      0 0 0 1px rgba(84, 62, 34, 0.08);
  }

  .book-copy {
    display: grid;
    gap: 3px;
    min-width: 0;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
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

  .toc button {
    width: 100%;
    padding: 8px 10px;
    padding-left: calc(10px + var(--toc-level, 0) * 10px);
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    border-radius: 6px;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
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
    padding: 8px 10px 0;
    color: var(--text-muted);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 12px;
    line-height: 1.5;
  }
</style>

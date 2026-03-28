<script lang="ts">
  import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';

  const toc = [
    '第 1 章 国家与秩序',
    '第 2 章 制度与权力',
    '第 3 章 衰败的起点'
  ];
</script>

<aside class="reader-sidebar" aria-label="reader navigation preview">
  <header class="sidebar-head">
    <div class="sidebar-tools">
      <span class="eyebrow">Reader</span>
      <button type="button" aria-label="pin sidebar">⌖</button>
    </div>
    <strong>目录</strong>
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
    <nav class="toc" aria-label="table of contents preview">
      {#each toc as item, index}
        <a href="/reader" class:active={index === 2}>{item}</a>
      {/each}
    </nav>
  </OverlayScrollbarsComponent>
</aside>

<style>
  .reader-sidebar {
    display: grid;
    align-content: start;
    gap: 12px;
    min-height: 0;
    height: 100%;
    padding: 12px 12px 10px;
    border: 1px solid rgba(64, 47, 24, 0.1);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 94%, white 6%);
  }

  .sidebar-head {
    display: grid;
    gap: 6px;
  }

  .sidebar-tools {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
  }

  .sidebar-tools button {
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    font: inherit;
  }

  .eyebrow {
    color: var(--text-muted);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .sidebar-head strong {
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 14px;
    line-height: 1.2;
  }

  .tabs {
    display: flex;
    gap: 0;
    padding: 1px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
    box-shadow: inset 0 0 0 1px rgba(64, 47, 24, 0.08);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .tab {
    flex: 1 1 0;
    padding: 6px 8px;
    border-radius: 999px;
    color: var(--text-muted);
    text-align: center;
    font-size: 11px;
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
    gap: 2px;
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

  .toc a {
    padding: 8px 10px;
    color: var(--text-secondary);
    text-decoration: none;
    border-radius: 8px;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 12px;
    line-height: 1.45;
  }

  .toc a.active {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--surface-reader) 84%, white 16%);
  }
</style>

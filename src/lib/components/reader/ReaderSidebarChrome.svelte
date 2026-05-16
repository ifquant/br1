<!-- This child only renders the sidebar chrome. The parent still owns the
 active tab and workspace state so tab switches do not quietly split route or
 persistence ownership across multiple components. -->
<script lang="ts">
  import type { SidebarTab } from '$lib/reader';

  export let activeTab: SidebarTab = 'toc';
  export let isWindowMode = false;
  export let isPinned = true;
  export let onToggleSidebar: (() => void) | null = null;
  export let onTogglePin: (() => void) | null = null;
  export let onClose: (() => void) | null = null;
  export let onSelectTab: ((tab: SidebarTab) => void) | null = null;

  const tabs: Array<{ value: SidebarTab; label: string }> = [
    { value: 'toc', label: '目录' },
    { value: 'search', label: '搜索' },
    { value: 'assist', label: '查找' },
    { value: 'bookmarks', label: '书签' },
    { value: 'highlights', label: '高亮' },
    { value: 'notes', label: '笔记' }
  ];
</script>

<header class="sidebar-head">
  <div class="sidebar-tools">
    <button
      type="button"
      class="ghost-button"
      aria-label="切换侧栏"
      title="切换侧栏"
      on:click={() => onToggleSidebar?.()}
    >
      ☰
    </button>
    <div class="sidebar-labels">
      <span class="eyebrow">导航</span>
      <strong>目录</strong>
    </div>
    <div class="sidebar-actions">
      {#if isWindowMode}
        <button
          type="button"
          class:active={isPinned}
          class="ghost-button pin-button"
          aria-label={isPinned ? '取消固定侧栏' : '固定侧栏'}
          title={isPinned ? '取消固定侧栏' : '固定侧栏'}
          on:click={() => onTogglePin?.()}
        >
          {isPinned ? '📌' : '⌖'}
        </button>
      {/if}
      <button
        type="button"
        class="ghost-button"
        aria-label="隐藏侧栏"
        title="隐藏侧栏"
        on:click={() => onClose?.()}
      >
        ×
      </button>
    </div>
  </div>
</header>

<div class="tabs" role="tablist" aria-label="阅读侧栏标签">
  {#each tabs as tab}
    <button
      type="button"
      role="tab"
      class:active={activeTab === tab.value}
      class="tab"
      aria-selected={activeTab === tab.value}
      on:click={() => onSelectTab?.(tab.value)}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .sidebar-head {
    display: grid;
    gap: 8px;
    padding: 16px var(--sidebar-content-inset) 10px;
    border-bottom: 1px solid color-mix(in srgb, var(--border-light) 72%, transparent 28%);
  }

  .sidebar-tools {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
  }

  .sidebar-actions {
    display: inline-flex;
    gap: 4px;
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

  .pin-button.active {
    background: color-mix(in srgb, var(--surface-reader) 86%, white 14%);
    color: var(--text-primary);
    box-shadow: inset 0 0 0 1px var(--border-light);
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
    font-family: var(--font-chrome);
  }

  .sidebar-labels strong {
    font-family: var(--font-chrome);
    font-size: 13px;
    line-height: 1.2;
  }

  .tabs {
    display: flex;
    gap: 0;
    margin: 10px var(--sidebar-content-inset) 0;
    padding: 1px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    font-family: var(--font-chrome);
  }

  .tab {
    flex: 1 1 0;
    padding: 5px 8px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    text-align: center;
    font-size: 10px;
    letter-spacing: 0.03em;
    font: inherit;
  }

  .tab.active {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--surface-panel) 66%, white 34%);
    box-shadow:
      inset 0 0 0 1px var(--border-light),
      0 1px 2px rgba(35, 25, 13, 0.05);
  }

  .tab:hover {
    color: var(--text-primary);
  }

  button:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--reader-shell-accent, #8c6a3b) 72%, white 28%);
    outline-offset: 2px;
  }
</style>

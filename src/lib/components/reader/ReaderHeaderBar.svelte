<script lang="ts">
  import { startCurrentWindowDrag } from '$lib/services';
  import type { ReaderPreviewState, SidebarTab } from '$lib/reader';

  export let preview: ReaderPreviewState;
  export let isWindowMode = false;
  export let sidebarVisible = true;
  export let isVisible = true;
  export let activeSidebarTab: SidebarTab = 'toc';
  export let isCurrentLocationBookmarked = false;
  export let onGoToLibrary: (() => void) | null = null;
  export let onToggleBookmark: (() => void) | null = null;
  export let onOpenPicker: (() => void) | null = null;
  export let onToggleSidebar: (() => void) | null = null;
  export let onTogglePin: (() => void) | null = null;
  export let onOpenSidebarTab: ((tab: SidebarTab) => void) | null = null;

  let menuOpen = false;

  const toggleMenu = () => {
    menuOpen = !menuOpen;
  };

  const closeMenu = () => {
    menuOpen = false;
  };

  const runMenuAction = (action: (() => void) | null | undefined) => {
    closeMenu();
    action?.();
  };

  const handleWindowPointerDown = (event: MouseEvent) => {
    if (!menuOpen) return;
    const target = event.target;
    if (target instanceof Element && target.closest('.menu-anchor')) return;
    closeMenu();
  };

  const handleWindowKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  };
</script>

<svelte:window on:mousedown={handleWindowPointerDown} on:keydown={handleWindowKeydown} />

<header class:window-mode={isWindowMode} class:visible={isVisible} class="reader-head">
  {#if isWindowMode}
    <div class="leading-tools">
      <button
        type="button"
        aria-label={sidebarVisible ? 'Hide contents panel' : 'Show contents panel'}
        title={sidebarVisible ? 'Hide contents panel' : 'Show contents panel'}
        on:click={() => onToggleSidebar?.()}
      >
        ☰
      </button>
    </div>
  {/if}

  <div
    role="presentation"
    class:window-mode={isWindowMode}
    class="head-meta"
    data-tauri-drag-region={isWindowMode ? true : undefined}
    on:mousedown={isWindowMode ? startCurrentWindowDrag : undefined}
  >
    <div class="title-row">
      <strong>{preview.title}</strong>
      <div class="subtitle-row">
        <small>{preview.author}</small>
        <span>{preview.chapterLabel}</span>
      </div>
    </div>
  </div>

  <div class="controls" aria-label="reader controls preview">
    <button type="button" aria-label="Go to library" title="Go to library" on:click={() => onGoToLibrary?.()}>⌂</button>
    <button
      type="button"
      class:active={isCurrentLocationBookmarked}
      aria-label={isCurrentLocationBookmarked ? 'Remove bookmark at current position' : 'Add bookmark at current position'}
      title={isCurrentLocationBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      on:click={() => onToggleBookmark?.()}
    >
      {isCurrentLocationBookmarked ? '★' : '☆'}
    </button>
    <button
      type="button"
      class:active={activeSidebarTab === 'search' && sidebarVisible}
      aria-label="Show search panel"
      title="Show search panel"
      on:click={() => onOpenSidebarTab?.('search')}
    >
      ⌕
    </button>
    <button
      type="button"
      class:active={activeSidebarTab === 'notes' && sidebarVisible}
      aria-label="Show notes panel"
      title="Show notes panel"
      on:click={() => onOpenSidebarTab?.('notes')}
    >
      ✎
    </button>
    <div class="menu-anchor">
      <button
        type="button"
        class:active={menuOpen}
        aria-label="More actions"
        aria-expanded={menuOpen}
        title="More actions"
        on:click={toggleMenu}
      >
        ⋯
      </button>

      {#if menuOpen}
        <div class="header-menu" role="menu" aria-label="reader quick actions">
          <button type="button" role="menuitem" on:click={() => runMenuAction(onOpenPicker)}>
            Open book
          </button>
          {#if isWindowMode}
            <button type="button" role="menuitem" on:click={() => runMenuAction(onTogglePin)}>
              {sidebarVisible ? 'Unpin sidebar' : 'Pin sidebar'}
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  .reader-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    padding: 0;
  }

  .reader-head.window-mode {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    align-items: center;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    min-height: 44px;
    padding: 4px 20px 2px 16px;
    background: transparent;
    opacity: 0;
    transform: translateY(-6px);
    transition:
      opacity 180ms ease,
      transform 180ms ease;
    pointer-events: none;
  }

  .reader-head.window-mode.visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .leading-tools {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    min-width: 0;
    -webkit-app-region: no-drag;
  }

  .leading-tools button {
    width: 30px;
    height: 30px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 13px;
    line-height: 1;
  }

  .leading-tools button:hover {
    background: color-mix(in srgb, var(--surface-panel) 86%, white 14%);
    color: var(--text-primary);
  }

  .head-meta {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .head-meta.window-mode {
    align-content: center;
    min-height: 100%;
    padding-left: 42px;
    padding-right: 16px;
    cursor: grab;
    text-align: center;
  }

  .title-row {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .title-row strong,
  .title-row small,
  .subtitle-row span {
    font-family: var(--font-chrome);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title-row strong {
    font-size: 14px;
    line-height: 1.3;
  }

  .window-mode .title-row {
    justify-items: center;
  }

  .title-row small {
    color: var(--text-muted);
    font-size: 12px;
  }

  .subtitle-row {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
    min-width: 0;
    color: var(--text-muted);
  }

  .subtitle-row span {
    min-width: 0;
    font-size: 12px;
    color: color-mix(in srgb, var(--text-secondary) 90%, white 10%);
  }

  .subtitle-row span::before {
    content: "•";
    margin-right: 8px;
    color: color-mix(in srgb, var(--text-muted) 70%, white 30%);
  }

  .controls {
    display: flex;
    gap: 4px;
    flex-wrap: nowrap;
    -webkit-app-region: no-drag;
  }

  .window-mode .controls {
    justify-content: flex-end;
  }

  .menu-anchor {
    position: relative;
  }

  .controls button {
    min-width: 30px;
    height: 30px;
    padding: 0 7px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 13px;
    line-height: 1;
  }

  .controls button:hover {
    background: color-mix(in srgb, var(--surface-panel) 86%, white 14%);
    color: var(--text-primary);
  }

  .controls button.active {
    background: color-mix(in srgb, var(--surface-panel) 82%, white 18%);
    color: var(--text-primary);
    box-shadow: inset 0 0 0 1px var(--border-light);
  }

  .header-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    display: grid;
    min-width: 156px;
    padding: 6px;
    border: 1px solid var(--border-light);
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 242, 231, 0.98));
    box-shadow:
      0 18px 40px rgba(56, 40, 18, 0.12),
      0 3px 12px rgba(56, 40, 18, 0.08);
  }

  .header-menu button {
    justify-content: flex-start;
    width: 100%;
    min-width: 0;
    height: auto;
    padding: 9px 12px;
    border-radius: 10px;
    font-size: 12px;
    text-align: left;
  }
</style>

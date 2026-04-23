<script lang="ts">
  import { startCurrentWindowDrag } from '$lib/services';
  import type {
    ReaderPreviewState,
    ReaderSettings,
    SidebarTab,
    ReaderTtsSessionState
  } from '$lib/reader';
  import {
    getReaderTtsPrimaryActionLabel,
    getReaderTtsSessionStatusLabel,
    getReaderTtsStatusDetail
  } from '$lib/reader';

  export let preview: ReaderPreviewState;
  export let isWindowMode = false;
  export let sidebarVisible = true;
  export let isVisible = true;
  export let activeSidebarTab: SidebarTab = 'toc';
  export let isCurrentLocationBookmarked = false;
  export let settings: ReaderSettings;
  export let ttsSession: ReaderTtsSessionState;
  export let onGoToLibrary: (() => void) | null = null;
  export let onToggleBookmark: (() => void) | null = null;
  export let onOpenPicker: (() => void) | null = null;
  export let onToggleSidebar: (() => void) | null = null;
  export let onTogglePin: (() => void) | null = null;
  export let onOpenSidebarTab: ((tab: SidebarTab) => void) | null = null;
  export let onUpdateSettings: ((patch: Partial<ReaderSettings>) => void) | null = null;
  export let onSetChromeMode: ((mode: ReaderSettings['chromeMode']) => void) | null = null;
  export let onTtsStart: (() => void) | null = null;
  export let onTtsPause: (() => void) | null = null;
  export let onTtsResume: (() => void) | null = null;
  export let onTtsStop: (() => void) | null = null;

  let menuOpen = false;
  $: ttsStatusLabel = getReaderTtsSessionStatusLabel(ttsSession);
  $: ttsStatusDetail = getReaderTtsStatusDetail(ttsSession);
  $: ttsPrimaryActionLabel = getReaderTtsPrimaryActionLabel(ttsSession);
  $: ttsPrimaryAriaLabel =
    ttsSession.status === 'unavailable' ? ttsStatusDetail : ttsPrimaryActionLabel;
  $: ttsPrimaryDisabled =
    ttsSession.status === 'unavailable' ||
    (ttsSession.status === 'idle' && !ttsSession.speechLabel) ||
    (ttsSession.status === 'error' && !ttsSession.speechLabel);

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

  const handleTtsPrimaryAction = () => {
    if (ttsSession.status === 'speaking') {
      onTtsPause?.();
      return;
    }

    if (ttsSession.status === 'paused') {
      onTtsResume?.();
      return;
    }

    onTtsStart?.();
  };

  const handleTtsStopAction = () => {
    onTtsStop?.();
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
  <div
    class:window-mode={isWindowMode}
    class:focus-width={settings.viewWidthMode === 'focus'}
    class:wide-width={settings.viewWidthMode === 'wide'}
    class="reader-head-frame"
  >
    {#if isWindowMode}
      <div class="leading-tools">
        <button
          type="button"
          aria-label={sidebarVisible ? '隐藏目录面板' : '显示目录面板'}
          title={sidebarVisible ? '隐藏目录面板' : '显示目录面板'}
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

    <div class="controls" aria-label="阅读控制">
      <button type="button" aria-label="回到书库" title="回到书库" on:click={() => onGoToLibrary?.()}>⌂</button>
      <button
        type="button"
        class:active={isCurrentLocationBookmarked}
        aria-label={isCurrentLocationBookmarked ? '移除当前位置书签' : '添加当前位置书签'}
        title={isCurrentLocationBookmarked ? '移除书签' : '添加书签'}
        on:click={() => onToggleBookmark?.()}
      >
        {isCurrentLocationBookmarked ? '★' : '☆'}
      </button>
      <button
        type="button"
        class:active={activeSidebarTab === 'bookmarks' && sidebarVisible}
        aria-label="显示书签面板"
        title="显示书签面板"
        on:click={() => onOpenSidebarTab?.('bookmarks')}
      >
        🔖
      </button>
      <button
        type="button"
        class:active={activeSidebarTab === 'search' && sidebarVisible}
        aria-label="显示搜索面板"
        title="显示搜索面板"
        on:click={() => onOpenSidebarTab?.('search')}
      >
        ⌕
      </button>
      <button
        type="button"
        class:active={activeSidebarTab === 'notes' && sidebarVisible}
        aria-label="显示笔记面板"
        title="显示笔记面板"
        on:click={() => onOpenSidebarTab?.('notes')}
      >
        ✎
      </button>
      <button
        type="button"
        class:active={activeSidebarTab === 'assist' && sidebarVisible}
        aria-label="显示百科面板"
        title="显示百科面板"
        on:click={() => onOpenSidebarTab?.('assist')}
      >
        W
      </button>
      <div class="tts-group" aria-label="朗读控制">
        <button
          type="button"
          class:active={ttsSession.status === 'speaking'}
          class:error={ttsSession.status === 'error'}
          disabled={ttsPrimaryDisabled}
          aria-label={ttsPrimaryAriaLabel}
          title={ttsPrimaryAriaLabel}
          on:click={handleTtsPrimaryAction}
        >
          {ttsSession.status === 'unavailable'
            ? '🔇'
            : ttsSession.status === 'idle'
              ? '🔊'
              : ttsSession.status === 'speaking'
                ? '⏸'
                : ttsSession.status === 'paused'
                  ? '▶'
                  : '⚠'}
        </button>
        {#if ttsSession.status === 'speaking' || ttsSession.status === 'paused'}
          <button
            type="button"
            aria-label="停止朗读"
            title="停止朗读"
            on:click={handleTtsStopAction}
          >
            ⏹
          </button>
        {/if}
        <span class:error={ttsSession.status === 'error'} class="tts-status" title={ttsStatusDetail}>
          {ttsStatusLabel}
        </span>
      </div>
      <div class="menu-anchor">
        <button
          type="button"
          class:active={menuOpen}
          aria-label="更多操作"
          aria-expanded={menuOpen}
          title="更多操作"
          on:click={toggleMenu}
        >
          ⋯
        </button>

        {#if menuOpen}
          <div class="header-menu" role="menu" aria-label="阅读视图菜单">
            <div class="menu-section" role="presentation">
              <span class="menu-section-label">阅读设置</span>
              <div class="menu-option-stack" role="presentation">
                <div class="menu-subsection" role="presentation">
                  <span class="menu-subsection-label">阅读模式</span>
                  <div class="menu-option-group" role="group" aria-label="阅读模式">
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.flowMode === 'paginated'}
                      class:active-option={settings.flowMode === 'paginated'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ flowMode: 'paginated' }))}
                    >
                      分页
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.flowMode === 'scrolled'}
                      class:active-option={settings.flowMode === 'scrolled'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ flowMode: 'scrolled' }))}
                    >
                      滚动
                    </button>
                  </div>
                </div>
                <div class="menu-subsection" role="presentation">
                  <span class="menu-subsection-label">阅读氛围</span>
                  <div class="menu-option-group" role="group" aria-label="阅读氛围">
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.themePreset === 'paper'}
                      class:active-option={settings.themePreset === 'paper'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ themePreset: 'paper' }))}
                    >
                      纸白
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.themePreset === 'warm'}
                      class:active-option={settings.themePreset === 'warm'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ themePreset: 'warm' }))}
                    >
                      暖纸
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.themePreset === 'soft'}
                      class:active-option={settings.themePreset === 'soft'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ themePreset: 'soft' }))}
                    >
                      柔和
                    </button>
                  </div>
                </div>
                <div class="menu-subsection" role="presentation">
                  <span class="menu-subsection-label">字体</span>
                  <div class="menu-option-group" role="group" aria-label="阅读字体">
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.fontFamily === 'serif'}
                      class:active-option={settings.fontFamily === 'serif'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ fontFamily: 'serif' }))}
                    >
                      衬线
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.fontFamily === 'sans'}
                      class:active-option={settings.fontFamily === 'sans'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ fontFamily: 'sans' }))}
                    >
                      无衬线
                    </button>
                  </div>
                </div>
                <div class="menu-subsection" role="presentation">
                  <span class="menu-subsection-label">字号</span>
                  <div class="menu-option-group" role="group" aria-label="字号">
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.fontScale === 'sm'}
                      class:active-option={settings.fontScale === 'sm'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ fontScale: 'sm' }))}
                    >
                      小
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.fontScale === 'md'}
                      class:active-option={settings.fontScale === 'md'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ fontScale: 'md' }))}
                    >
                      中
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.fontScale === 'lg'}
                      class:active-option={settings.fontScale === 'lg'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ fontScale: 'lg' }))}
                    >
                      大
                    </button>
                  </div>
                </div>
                <div class="menu-subsection" role="presentation">
                  <span class="menu-subsection-label">行距</span>
                  <div class="menu-option-group" role="group" aria-label="行距">
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.lineHeight === 'tight'}
                      class:active-option={settings.lineHeight === 'tight'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ lineHeight: 'tight' }))}
                    >
                      紧凑
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.lineHeight === 'standard'}
                      class:active-option={settings.lineHeight === 'standard'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ lineHeight: 'standard' }))}
                    >
                      标准
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.lineHeight === 'relaxed'}
                      class:active-option={settings.lineHeight === 'relaxed'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ lineHeight: 'relaxed' }))}
                    >
                      舒展
                    </button>
                  </div>
                </div>
                <div class="menu-subsection" role="presentation">
                  <span class="menu-subsection-label">页边距</span>
                  <div class="menu-option-group" role="group" aria-label="页边距">
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.pageMargins === 'narrow'}
                      class:active-option={settings.pageMargins === 'narrow'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ pageMargins: 'narrow' }))}
                    >
                      窄
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.pageMargins === 'standard'}
                      class:active-option={settings.pageMargins === 'standard'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ pageMargins: 'standard' }))}
                    >
                      中
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.pageMargins === 'wide'}
                      class:active-option={settings.pageMargins === 'wide'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ pageMargins: 'wide' }))}
                    >
                      宽
                    </button>
                  </div>
                </div>
                <div class="menu-subsection" role="presentation">
                  <span class="menu-subsection-label">界面显隐</span>
                  <div class="menu-option-group" role="group" aria-label="界面显隐">
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.chromeMode === 'auto'}
                      class:active-option={settings.chromeMode === 'auto'}
                      on:click={() => runMenuAction(() => onSetChromeMode?.('auto'))}
                    >
                      自动
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.chromeMode === 'always'}
                      class:active-option={settings.chromeMode === 'always'}
                      on:click={() => runMenuAction(() => onSetChromeMode?.('always'))}
                    >
                      总是显示
                    </button>
                  </div>
                </div>
                <div class="menu-subsection" role="presentation">
                  <span class="menu-subsection-label">阅读宽度</span>
                  <div class="menu-option-group" role="group" aria-label="阅读宽度">
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.viewWidthMode === 'focus'}
                      class:active-option={settings.viewWidthMode === 'focus'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ viewWidthMode: 'focus' }))}
                    >
                      专注
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.viewWidthMode === 'standard'}
                      class:active-option={settings.viewWidthMode === 'standard'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ viewWidthMode: 'standard' }))}
                    >
                      标准
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={settings.viewWidthMode === 'wide'}
                      class:active-option={settings.viewWidthMode === 'wide'}
                      on:click={() => runMenuAction(() => onUpdateSettings?.({ viewWidthMode: 'wide' }))}
                    >
                      宽阔
                    </button>
                  </div>
                </div>
                <div class="menu-subsection" role="presentation">
                  <span class="menu-subsection-label">阅读辅助</span>
                  <div class="menu-option-stack" role="presentation">
                    <div class="menu-option-group" role="group" aria-label="阅读尺">
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={settings.readingRulerMode === 'off'}
                        class:active-option={settings.readingRulerMode === 'off'}
                        on:click={() =>
                          runMenuAction(() => onUpdateSettings?.({ readingRulerMode: 'off' }))
                        }
                      >
                        关闭阅读尺
                      </button>
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={settings.readingRulerMode === 'on'}
                        class:active-option={settings.readingRulerMode === 'on'}
                        on:click={() =>
                          runMenuAction(() => onUpdateSettings?.({ readingRulerMode: 'on' }))
                        }
                      >
                        开启阅读尺
                      </button>
                    </div>
                    <div class="menu-option-group" role="group" aria-label="聚焦模式">
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={settings.focusAidMode === 'off'}
                        class:active-option={settings.focusAidMode === 'off'}
                        on:click={() => runMenuAction(() => onUpdateSettings?.({ focusAidMode: 'off' }))}
                      >
                        关闭聚焦
                      </button>
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={settings.focusAidMode === 'line'}
                        class:active-option={settings.focusAidMode === 'line'}
                        on:click={() =>
                          runMenuAction(() => onUpdateSettings?.({ focusAidMode: 'line' }))
                        }
                      >
                        行聚焦
                      </button>
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={settings.focusAidMode === 'paragraph'}
                        class:active-option={settings.focusAidMode === 'paragraph'}
                        on:click={() =>
                          runMenuAction(() => onUpdateSettings?.({ focusAidMode: 'paragraph' }))
                        }
                      >
                        段落聚焦
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="menu-divider" role="separator"></div>

            <div class="menu-section" role="presentation">
              <span class="menu-section-label">操作</span>
              <div class="menu-option-group" role="group" aria-label="阅读操作">
                <button
                  type="button"
                  role="menuitem"
                  on:click={() => runMenuAction(onOpenPicker)}
                >
                  导入书籍
                </button>
                {#if isWindowMode}
                  <button type="button" role="menuitem" on:click={() => runMenuAction(onTogglePin)}>
                    {sidebarVisible ? '取消固定侧栏' : '固定侧栏'}
                  </button>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</header>

<style>
  .reader-head {
    width: 100%;
  }

  .reader-head-frame {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    padding: 0;
    width: 100%;
  }

  .reader-head.window-mode {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    opacity: 0;
    transform: translateY(-6px);
    transition:
      opacity 180ms ease,
      transform 180ms ease;
    pointer-events: none;
  }

  .reader-head-frame.window-mode {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    align-items: center;
    width: min(100%, var(--reader-window-frame-width, 1080px));
    margin: 0 auto;
    min-height: 44px;
    padding: 4px 20px 2px 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--reader-shell-border, var(--border-light)) 78%, transparent 22%);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--reader-shell-panel, var(--surface-panel)) 92%, transparent 8%);
    box-shadow: 0 8px 24px -20px var(--reader-shell-shadow, rgba(55, 39, 18, 0.1));
    backdrop-filter: blur(10px);
  }

  .reader-head-frame.window-mode.focus-width {
    width: min(100%, var(--reader-window-frame-width-focus, 920px));
  }

  .reader-head-frame.window-mode.wide-width {
    width: min(100%, var(--reader-window-frame-width-wide, 1320px));
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
    color: var(--reader-shell-muted, var(--text-secondary));
    font: inherit;
    font-size: 13px;
    line-height: 1;
  }

  .leading-tools button:hover {
    background: color-mix(in srgb, var(--reader-shell-raised, var(--surface-panel)) 88%, white 12%);
    color: var(--reader-shell-text, var(--text-primary));
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
    color: var(--reader-shell-text, var(--text-primary));
  }

  .window-mode .title-row {
    justify-items: center;
  }

  .title-row small {
    color: var(--reader-shell-muted, var(--text-muted));
    font-size: 12px;
  }

  .subtitle-row {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
    min-width: 0;
    color: var(--reader-shell-muted, var(--text-muted));
  }

  .subtitle-row span {
    min-width: 0;
    font-size: 12px;
    color: color-mix(in srgb, var(--reader-shell-text, var(--text-secondary)) 82%, white 18%);
  }

  .subtitle-row span::before {
    content: "•";
    margin-right: 8px;
    color: color-mix(in srgb, var(--reader-shell-muted, var(--text-muted)) 70%, white 30%);
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
    color: var(--reader-shell-muted, var(--text-secondary));
    font: inherit;
    font-size: 13px;
    line-height: 1;
  }

  .controls button:hover {
    background: color-mix(in srgb, var(--reader-shell-raised, var(--surface-panel)) 88%, white 12%);
    color: var(--reader-shell-text, var(--text-primary));
  }

  .controls button.active {
    background: color-mix(in srgb, var(--reader-shell-raised, var(--surface-panel)) 92%, white 8%);
    color: var(--reader-shell-accent, var(--text-primary));
    box-shadow: inset 0 0 0 1px var(--reader-shell-border, var(--border-light));
  }

  .tts-group {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    margin-left: 4px;
    padding-left: 8px;
    border-left: 1px solid color-mix(in srgb, var(--reader-shell-border, var(--border-light)) 76%, transparent 24%);
  }

  .tts-group .tts-status {
    color: var(--reader-shell-muted, var(--text-muted));
    font-family: var(--font-chrome);
    font-size: 11px;
    line-height: 1;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  .tts-group .tts-status.error {
    color: #9c4a2f;
  }

  .tts-group button.error {
    color: #9c4a2f;
  }

  .header-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    display: grid;
    min-width: 156px;
    padding: 6px;
    border: 1px solid var(--reader-shell-border, var(--border-light));
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--reader-shell-raised, var(--surface-panel)) 95%, white 5%);
    box-shadow:
      0 18px 40px var(--reader-shell-shadow, rgba(56, 40, 18, 0.12)),
      0 3px 12px color-mix(in srgb, var(--reader-shell-shadow, rgba(56, 40, 18, 0.08)) 72%, transparent 28%);
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

  .menu-section {
    display: grid;
    gap: 6px;
    padding: 4px 6px 8px;
  }

  .menu-section-label {
    color: var(--reader-shell-muted, var(--text-muted));
    font-family: var(--font-chrome);
    font-size: 11px;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .menu-option-stack {
    display: grid;
    gap: 10px;
  }

  .menu-subsection {
    display: grid;
    gap: 4px;
  }

  .menu-subsection-label {
    color: color-mix(in srgb, var(--reader-shell-text, var(--text-secondary)) 78%, white 22%);
    font-family: var(--font-chrome);
    font-size: 11px;
    line-height: 1.2;
  }

  .menu-option-group {
    display: grid;
    gap: 4px;
  }

  .menu-divider {
    height: 1px;
    margin: 2px 6px 4px;
    background: color-mix(in srgb, var(--reader-shell-border, var(--border-light)) 84%, transparent 16%);
  }

  .header-menu button.active-option {
    background: color-mix(in srgb, var(--reader-shell-raised, var(--surface-panel)) 92%, white 8%);
    color: var(--reader-shell-accent, var(--text-primary));
    box-shadow: inset 0 0 0 1px var(--reader-shell-border, var(--border-light));
  }
</style>

<!-- Ownership: this reader surface explains one part of the reading workflow
 to the user. It may render state from the route or helper modules, but it should
 not silently become a second owner of persistence or route semantics. -->
<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import type {
    ReaderControlRequest,
    ReaderNote,
    ReaderPreviewState,
    ReaderSettings,
    SidebarTab,
    ReaderSearchState,
    ReaderSelectionState,
    ReaderTocItem
  } from '$lib/reader';
  import {
    createEmptyReaderPreviewState,
    createDefaultReaderSettings,
    getReaderShellPalette,
    hydrateReaderSettings,
    READER_FILE_INPUT_ACCEPT,
    saveReaderSettings
  } from '$lib/reader';
  import type { ReaderTtsSessionState } from '$lib/reader';
  import ReaderFooterBar from './ReaderFooterBar.svelte';
  import ReaderHeaderBar from './ReaderHeaderBar.svelte';
  import ReaderTtsMiniBar from './ReaderTtsMiniBar.svelte';
  import ReaderViewport from './ReaderViewport.svelte';
  const dispatch = createEventDispatcher<{
    controlrequest: ReaderControlRequest;
    gotolibrary: void;
    notefocus: string;
    selectionchange: ReaderSelectionState | null;
    readerstate: ReaderPreviewState;
    searchchange: ReaderSearchState;
    searchcachekeychange: string;
    tocchange: ReaderTocItem[];
    togglebookmark: void;
    togglesidebar: void;
    togglepin: void;
    switchsidebartab: SidebarTab;
  }>();

  export let controlRequest: ReaderControlRequest | null = null;
  export let autoOpenPicker = false;
  export let isWindowMode = false;
  export let sidebarVisible = true;
  export let activeSidebarTab: SidebarTab = 'toc';
  export let isCurrentLocationBookmarked = false;
  export let landmarkRole: 'main' | 'region' = 'main';
  export let landmarkLabel = 'reader stage';
  export let ttsSession: ReaderTtsSessionState;
  export let ttsMiniBarVisible = false;
  export let ttsMiniBarStatusLabel = '';
  export let ttsMiniBarContextSummary = '';
  export let ttsMiniBarTargetLabel = '';
  export let ttsMiniBarLocationSummary = '';
  export let ttsMiniBarPrimaryActionLabel = '开始朗读';
  export let ttsMiniBarCanRunPrimaryAction = false;
  export let ttsMiniBarCanStop = false;
  export let ttsMiniBarCanJumpToPlaybackLocation = false;
  export let ttsMiniBarCanOpenTranslationMode = false;
  export let ttsMiniBarCanResumeFollowingCurrent = false;
  export let ttsMiniBarCanPinCurrentTarget = false;
  export let ttsMiniBarModeSwitchLabel = '';
  export let ttsMiniBarCanSwitchMode = false;
  export let notes: ReaderNote[] = [];
  export let onTtsStart: (() => void) | null = null;
  export let onTtsPause: (() => void) | null = null;
  export let onTtsResume: (() => void) | null = null;
  export let onTtsStop: (() => void) | null = null;
  export let onOpenTtsWorkspace: (() => void) | null = null;
  export let onJumpToTtsPlaybackLocation: (() => void) | null = null;
  export let onOpenTranslationModeFromMiniBar: (() => void) | null = null;
  export let onResumeFollowingCurrentTtsTargetFromMiniBar: (() => void) | null = null;
  export let onPinCurrentTtsTargetFromMiniBar: (() => void) | null = null;
  export let onSwitchTtsModeFromMiniBar: (() => void) | null = null;

  let readerPreview: ReaderPreviewState = createEmptyReaderPreviewState();
  let importInput: HTMLInputElement | null = null;
  let hasAttemptedAutoPicker = false;
  let chromeVisible = true;
  let chromeTimer: ReturnType<typeof setTimeout> | null = null;
  let settings: ReaderSettings = createDefaultReaderSettings();

  const triggerImportPicker = async () => {
    if (!importInput) return;
    await tick();
    if (typeof importInput.showPicker === 'function') {
      try {
        await importInput.showPicker();
        return;
      } catch (error) {
        console.warn('showPicker() failed, falling back to click()', error);
      }
    }
    importInput.click();
  };

  $: if (autoOpenPicker && !hasAttemptedAutoPicker) {
    hasAttemptedAutoPicker = true;
    void triggerImportPicker();
  }

  $: if (!autoOpenPicker) {
    hasAttemptedAutoPicker = false;
  }

  let controlNonce = 0;

  const issueFileControl = (file: File) => {
    controlNonce += 1;
    dispatch('controlrequest', {
      type: 'file',
      nonce: controlNonce,
      file
    });
  };

  const handleImportChange = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const [file] = input.files ?? [];
    if (!file) return;
    issueFileControl(file);
    input.value = '';
  };

  const toggleSidebar = () => {
    dispatch('togglesidebar');
  };

  const goToLibrary = () => {
    dispatch('gotolibrary');
  };

  const toggleBookmark = () => {
    dispatch('togglebookmark');
  };

  const togglePinned = () => {
    dispatch('togglepin');
  };

  const openSidebarTab = (tab: SidebarTab) => {
    dispatch('switchsidebartab', tab);
  };

  const updateSettings = (patch: Partial<ReaderSettings>) => {
    settings = {
      ...settings,
      ...patch
    };
    if (typeof localStorage === 'undefined') return;
    saveReaderSettings(localStorage, settings);
  };

  const setChromeMode = (mode: ReaderSettings['chromeMode']) => {
    updateSettings({ chromeMode: mode });
    chromeVisible = true;
    clearChromeTimer();
    if (mode === 'auto') {
      scheduleChromeHide();
    }
  };

  const clearChromeTimer = () => {
    if (chromeTimer) clearTimeout(chromeTimer);
    chromeTimer = null;
  };

  // Stage chrome visibility is a presentation concern. Auto-hide may react to
  // window mode and sidebar presence, but persistence and mode selection still
  // belong to the route-owned reader state.
  const scheduleChromeHide = () => {
    if (!isWindowMode || sidebarVisible || settings.chromeMode === 'always') return;
    clearChromeTimer();
    chromeTimer = setTimeout(() => {
      chromeVisible = false;
    }, 1200);
  };

  const showChrome = () => {
    chromeVisible = true;
    scheduleChromeHide();
  };

  const handleStagePointerMove = (event: MouseEvent) => {
    if (!isWindowMode) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const nearTop = offsetY <= 88;
    const nearBottom = rect.bottom - event.clientY <= 72;
    if (nearTop || nearBottom) {
      showChrome();
    }
  };

  const handleStageLeave = () => {
    scheduleChromeHide();
  };

  $: if (!isWindowMode) {
    chromeVisible = true;
    clearChromeTimer();
  }

  $: if (isWindowMode && (sidebarVisible || settings.chromeMode === 'always')) {
    chromeVisible = true;
    clearChromeTimer();
  }

  $: if (isWindowMode && !sidebarVisible && settings.chromeMode === 'auto' && chromeVisible) {
    scheduleChromeHide();
  }

  const getStageThemeVars = () => {
    const shell = getReaderShellPalette(settings.themePreset);
    return [
      `--reader-shell-backdrop:${shell.shellBackdrop}`,
      `--reader-shell-panel:${shell.shellPanel}`,
      `--reader-shell-raised:${shell.shellRaised}`,
      `--reader-shell-text:${shell.shellText}`,
      `--reader-shell-muted:${shell.shellMuted}`,
      `--reader-shell-border:${shell.shellBorder}`,
      `--reader-shell-accent:${shell.shellAccent}`,
      `--reader-shell-shadow:${shell.shellShadow}`,
      `--surface-panel:${shell.shellPanel}`,
      `--surface-page:${shell.shellRaised}`,
      `--text-primary:${shell.shellText}`,
      `--text-secondary:${shell.shellText}`,
      `--text-muted:${shell.shellMuted}`,
      `--border-light:${shell.shellBorder}`
    ].join(';');
  };

  onMount(() => {
    if (typeof localStorage === 'undefined') return;
    settings = hydrateReaderSettings(localStorage);
  });
</script>

<section
  class:paper-atmosphere={settings.themePreset === 'paper'}
  class:warm-atmosphere={settings.themePreset === 'warm'}
  class:soft-atmosphere={settings.themePreset === 'soft'}
  class:window-mode={isWindowMode}
  class="reader-stage"
  style={getStageThemeVars()}
  role={landmarkRole}
  aria-label={landmarkLabel}
  on:mousemove={handleStagePointerMove}
  on:mouseleave={handleStageLeave}
  on:focusin={showChrome}
>
  <input
    bind:this={importInput}
    class="import-input"
    type="file"
    accept={READER_FILE_INPUT_ACCEPT}
    on:change={handleImportChange}
  />

  <ReaderHeaderBar
    preview={readerPreview}
    {isWindowMode}
    {sidebarVisible}
    isVisible={chromeVisible}
    {activeSidebarTab}
    {isCurrentLocationBookmarked}
    {settings}
    {ttsSession}
    onGoToLibrary={goToLibrary}
    onToggleBookmark={toggleBookmark}
    onOpenPicker={triggerImportPicker}
    onToggleSidebar={toggleSidebar}
    onTogglePin={isWindowMode ? togglePinned : null}
    onOpenSidebarTab={openSidebarTab}
    onUpdateSettings={updateSettings}
    onSetChromeMode={setChromeMode}
    {onTtsStart}
    {onTtsPause}
    {onTtsResume}
    {onTtsStop}
  />

  <article
    class:window-mode={isWindowMode}
    class:focus-width={settings.viewWidthMode === 'focus'}
    class:wide-width={settings.viewWidthMode === 'wide'}
    class="canvas"
  >
    <ReaderViewport
      title="阅读表面"
      {controlRequest}
      hint="正文优先，控制层尽量退到边缘。"
      {isWindowMode}
      {notes}
      {settings}
      on:readerstate={({ detail }) => {
        readerPreview = detail;
        dispatch('readerstate', detail);
      }}
      on:notefocus={({ detail }) => {
        dispatch('notefocus', detail);
      }}
      on:selectionchange={({ detail }) => {
        dispatch('selectionchange', detail);
      }}
      on:tocchange={({ detail }) => {
        dispatch('tocchange', detail);
      }}
      on:searchchange={({ detail }) => {
        dispatch('searchchange', detail);
      }}
      on:searchcachekeychange={({ detail }) => {
        dispatch('searchcachekeychange', detail);
      }}
    />
  </article>

  {#if ttsMiniBarVisible}
    <ReaderTtsMiniBar
      statusLabel={ttsMiniBarStatusLabel}
      contextSummary={ttsMiniBarContextSummary}
      targetLabel={ttsMiniBarTargetLabel}
      locationSummary={ttsMiniBarLocationSummary}
      primaryActionLabel={ttsMiniBarPrimaryActionLabel}
      canRunPrimaryAction={ttsMiniBarCanRunPrimaryAction}
      canStop={ttsMiniBarCanStop}
      canJumpToPlaybackLocation={ttsMiniBarCanJumpToPlaybackLocation}
      canOpenTranslationMode={ttsMiniBarCanOpenTranslationMode}
      canResumeFollowingCurrent={ttsMiniBarCanResumeFollowingCurrent}
      canPinCurrentTarget={ttsMiniBarCanPinCurrentTarget}
      modeSwitchLabel={ttsMiniBarModeSwitchLabel}
      canSwitchMode={ttsMiniBarCanSwitchMode}
      onRunPrimaryAction={() => {
        if (ttsSession.status === 'speaking') {
          onTtsPause?.();
          return;
        }
        if (ttsSession.status === 'paused') {
          onTtsResume?.();
          return;
        }
        onTtsStart?.();
      }}
      onStop={onTtsStop}
      onOpenWorkspace={onOpenTtsWorkspace}
      onJumpToPlaybackLocation={onJumpToTtsPlaybackLocation}
      onOpenTranslationMode={onOpenTranslationModeFromMiniBar}
      onResumeFollowingCurrent={onResumeFollowingCurrentTtsTargetFromMiniBar}
      onPinCurrentTarget={onPinCurrentTtsTargetFromMiniBar}
      onSwitchMode={onSwitchTtsModeFromMiniBar}
    />
  {/if}

  <ReaderFooterBar
    preview={readerPreview}
    {isWindowMode}
    isVisible={chromeVisible}
    viewWidthMode={settings.viewWidthMode}
    on:controlrequest={({ detail }: CustomEvent<ReaderControlRequest>) => {
      dispatch('controlrequest', detail);
    }}
  />
</section>

<style>
  .reader-stage {
    --reader-stage-fill:
      linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 94%, white 6%);
    display: grid;
    gap: 12px;
    min-width: 0;
    width: 100%;
    color: var(--reader-shell-text, var(--text-primary));
  }

  .reader-stage.paper-atmosphere {
    --reader-stage-fill:
      linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 94%, white 6%);
  }

  .reader-stage.warm-atmosphere {
    --reader-stage-fill:
      linear-gradient(180deg, rgba(255, 248, 238, 0.18), rgba(255, 244, 229, 0)),
      color-mix(in srgb, #f4ead6 78%, white 22%);
  }

  .reader-stage.soft-atmosphere {
    --reader-stage-fill:
      linear-gradient(180deg, rgba(246, 247, 244, 0.22), rgba(236, 241, 236, 0)),
      color-mix(in srgb, #e5ece4 68%, white 32%);
  }

  .reader-stage.window-mode {
    position: relative;
    gap: 0;
    min-height: calc(100vh - 26px);
    height: calc(100vh - 26px);
    overflow: hidden;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--reader-shell-backdrop, var(--surface-reader)) 92%, white 8%);
  }

  .import-input {
    display: none;
  }

  .canvas {
    display: grid;
    min-height: 0;
    width: 100%;
    box-sizing: border-box;
    padding: 8px 14px 0;
    border: 1px solid var(--reader-shell-border, var(--border-light));
    background: var(--reader-stage-fill);
  }

  .canvas.window-mode {
    display: grid;
    min-height: calc(100vh - 26px);
    height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    width: min(100%, var(--reader-window-frame-width, 1080px));
    margin-inline: auto;
  }

  .canvas.window-mode.focus-width {
    width: min(100%, var(--reader-window-frame-width-focus, 920px));
  }

  .canvas.window-mode.wide-width {
    width: min(100%, var(--reader-window-frame-width-wide, 1320px));
  }
</style>

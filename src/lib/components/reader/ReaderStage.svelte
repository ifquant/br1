<!-- Ownership: this reader surface explains one part of the reading workflow
 to the user. It may render state from the route or helper modules, but it should
 not silently become a second owner of persistence or route semantics. -->
<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import type {
    ReaderControlRequest,
    ReaderFocusedReadingMode,
    ReaderFocusedReadingState,
    ReaderInlineTranslationState,
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
  import ReaderFocusedReadingOverlay from './ReaderFocusedReadingOverlay.svelte';
  import ReaderHeaderBar from './ReaderHeaderBar.svelte';
  import ReaderAnnotationPopup from './ReaderAnnotationPopup.svelte';
  import ReaderFootnotePopup from './ReaderFootnotePopup.svelte';
  import ReaderInlineTranslationLayer from './ReaderInlineTranslationLayer.svelte';
  import ReaderTtsMiniBar from './ReaderTtsMiniBar.svelte';
  import ReaderViewport from './ReaderViewport.svelte';

  type ReaderInlineTranslationCandidatesEvent = {
    candidates: Array<{
      id: string;
      sourceText: string;
      sourceLabel: string;
    }>;
    status: 'ready' | 'waiting' | 'unsupported';
    message: string;
    formatLabel: string;
  };

  type ReaderFootnoteRequest = {
    label: string;
    href: string;
    excerptHtml: string;
    excerptText: string;
    fallbackNavigationTarget: string;
  };

  const dispatch = createEventDispatcher<{
    controlrequest: ReaderControlRequest;
    gotolibrary: void;
    notefocus: string;
    selectionchange: ReaderSelectionState | null;
    readerstate: ReaderPreviewState;
    inlinetranslationcandidates: ReaderInlineTranslationCandidatesEvent;
    footnoterequest: ReaderFootnoteRequest | null;
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
  export let focusedReadingState: ReaderFocusedReadingState | null = null;
  export let focusedReadingSummary = '';
  export let focusedReadingRsvpPlaying = false;
  export let inlineTranslationVisible = false;
  export let inlineTranslationState: ReaderInlineTranslationState | null = null;
  export let inlineTranslationSummary = '';
  export let inlineTranslationStatusMessage = '等待可翻译正文。';
  export let inlineTranslationCapabilityMessage = '';
  export let annotationSelection: ReaderSelectionState | null = null;
  export let annotationSelectionSummary = '';
  export let annotationSelectionDetail = '';
  export let annotationSupportsActions = true;
  export let annotationSupportMessage = '';
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
  export let onStartParagraphFocus: (() => void) | null = null;
  export let onStartRsvpLite: (() => void) | null = null;
  export let onExitFocusedReading: (() => void) | null = null;
  export let onToggleFocusedReadingRsvpPlayback: (() => void) | null = null;
  export let onFocusedReadingSlowerPace: (() => void) | null = null;
  export let onFocusedReadingFasterPace: (() => void) | null = null;
  export let onFocusedReadingPreviousWord: (() => void) | null = null;
  export let onFocusedReadingNextWord: (() => void) | null = null;
  export let onToggleInlineTranslationEnabled: (() => void) | null = null;
  export let onToggleInlineTranslationSourceVisibility: (() => void) | null = null;
  export let onToggleInlineTranslationTranslationVisibility: (() => void) | null = null;
  export let onAddHighlightFromSelection: (() => void) | null = null;
  export let onAddNoteFromSelection: (() => void) | null = null;
  export let onLookupSelection: (() => void) | null = null;
  export let onTranslateSelection: (() => void) | null = null;
  export let onReadAloudSelection: (() => void) | null = null;
  export let onCopySelection: (() => void) | null = null;

  let readerPreview: ReaderPreviewState = createEmptyReaderPreviewState();
  let importInput: HTMLInputElement | null = null;
  let stageShell: HTMLElement | null = null;
  let hasAttemptedAutoPicker = false;
  let chromeVisible = true;
  let chromeTimer: ReturnType<typeof setTimeout> | null = null;
  let settings: ReaderSettings = createDefaultReaderSettings();
  let focusedReadingMode: ReaderFocusedReadingMode = 'off';
  let annotationPopupPlacement: 'selection' | 'bottom-center' = 'bottom-center';
  let annotationPopupPosition: { top: number; left: number } | null = null;
  let popupRefreshNonce = 0;
  let footnoteRequest: ReaderFootnoteRequest | null = null;
  let handledControlRequestNonce = 0;
  let hasMounted = false;
  let hasAppliedInitialKeyboardFocus = false;
  let lastFocusedReadingMode: ReaderFocusedReadingMode = 'off';
  let supportsFocusedReadingKeyboardEntry = false;

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

  const closeFootnotePopup = () => {
    footnoteRequest = null;
  };

  const jumpToFootnoteLocation = () => {
    const href = footnoteRequest?.fallbackNavigationTarget.trim();
    if (!href) return;
    closeFootnotePopup();
    dispatch('controlrequest', {
      type: 'href',
      nonce: ++controlNonce,
      href
    });
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

  const focusStageShell = () => {
    stageShell?.focus({ preventScroll: true });
  };

  const isEditableKeyboardTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return !!target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]'
    );
  };

  const isReaderKeyboardContext = (event: KeyboardEvent) => {
    if (!stageShell) return false;
    if (isEditableKeyboardTarget(event.target)) return false;
    const activeElement = document.activeElement;
    if (isEditableKeyboardTarget(activeElement)) return false;
    if (activeElement === document.body) return true;
    return activeElement instanceof Node && stageShell.contains(activeElement);
  };

  // Focused-reading entry stays local to the reader shell. The reader listens
  // at window scope so keyboard-first sessions can use the shortcut before a
  // specific control is focused, but it only reacts while this reader route is
  // mounted and the active element still belongs to the reader surface.
  const handleReaderKeyboardEntry = (event: KeyboardEvent) => {
    if (!supportsFocusedReadingKeyboardEntry) return;
    if (focusedReadingMode !== 'off' || event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.altKey || !event.shiftKey) return;
    if (!isReaderKeyboardContext(event)) return;
    const normalizedKey = event.key.toLowerCase();

    if (normalizedKey === 'p') {
      event.preventDefault();
      onStartParagraphFocus?.();
      return;
    }

    if (normalizedKey === 'r') {
      event.preventDefault();
      onStartRsvpLite?.();
    }
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

  $: focusedReadingMode = focusedReadingState?.mode ?? 'off';
  $: supportsFocusedReadingKeyboardEntry =
    typeof onStartParagraphFocus === 'function' && typeof onStartRsvpLite === 'function';
  $: if (
    hasMounted &&
    !hasAppliedInitialKeyboardFocus &&
    readerPreview.title &&
    document.activeElement === document.body
  ) {
    hasAppliedInitialKeyboardFocus = true;
    void tick().then(() => focusStageShell());
  }
  $: if (hasMounted && lastFocusedReadingMode !== 'off' && focusedReadingMode === 'off') {
    void tick().then(() => focusStageShell());
  }
  $: lastFocusedReadingMode = focusedReadingMode;
  $: if (controlRequest && controlRequest.nonce !== handledControlRequestNonce) {
    handledControlRequestNonce = controlRequest.nonce;
    closeFootnotePopup();
  }

  $: {
    annotationSelection;
    annotationSupportsActions;
    readerPreview.formatLabel;
    schedulePopupRefresh();
  }

  $: {
    footnoteRequest;
    schedulePopupRefresh();
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

  // TXT selections live in the same DOM tree as the Svelte stage, so we can
  // anchor near the actual range rect. Foliate-backed selections may cross
  // iframe boundaries, so other formats intentionally fall back to a stable
  // bottom-center placement instead of pretending the coordinates are exact.
  const measureTxtSelectionPopupPosition = () => {
    if (!stageShell) return null;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    const commonNode =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : (range.commonAncestorContainer as Element | null);
    const reader = stageShell.querySelector('.plain-text-reader');
    if (!(reader instanceof HTMLElement) || !(commonNode instanceof Node) || !reader.contains(commonNode)) {
      return null;
    }

    const selectionRect = range.getBoundingClientRect();
    if (selectionRect.width === 0 && selectionRect.height === 0) return null;
    const stageRect = stageShell.getBoundingClientRect();
    return {
      left: Math.min(
        stageRect.right - 28,
        Math.max(stageRect.left + 28, selectionRect.left + selectionRect.width / 2)
      ),
      top: Math.max(stageRect.top + 18, selectionRect.top - 14)
    };
  };

  const measureBottomCenterPopupPosition = () => {
    if (!stageShell) return null;
    const stageRect = stageShell.getBoundingClientRect();
    return {
      left: stageRect.left + stageRect.width / 2,
      top: stageRect.bottom - 26
    };
  };

  const updateAnnotationPopupPresentation = () => {
    if (!annotationSelection?.text.trim()) {
      annotationPopupPosition = null;
      return;
    }

    if (readerPreview.formatLabel === 'TXT') {
      annotationPopupPlacement = 'selection';
      annotationPopupPosition = measureTxtSelectionPopupPosition() ?? measureBottomCenterPopupPosition();
      return;
    }

    annotationPopupPlacement = 'bottom-center';
    annotationPopupPosition = measureBottomCenterPopupPosition();
  };

  const schedulePopupRefresh = () => {
    const refreshNonce = ++popupRefreshNonce;
    void tick().then(() => {
      if (refreshNonce !== popupRefreshNonce) return;
      updateAnnotationPopupPresentation();
    });
  };

  onMount(() => {
    if (typeof localStorage === 'undefined') return;
    settings = hydrateReaderSettings(localStorage);
  });

  onMount(() => {
    hasMounted = true;
    window.addEventListener('resize', schedulePopupRefresh);
    return () => {
      hasMounted = false;
      window.removeEventListener('resize', schedulePopupRefresh);
    };
  });
</script>

<svelte:window on:keydown={handleReaderKeyboardEntry} />

<section
  bind:this={stageShell}
  class:paper-atmosphere={settings.themePreset === 'paper'}
  class:warm-atmosphere={settings.themePreset === 'warm'}
  class:soft-atmosphere={settings.themePreset === 'soft'}
  class:window-mode={isWindowMode}
  class="reader-stage"
  style={getStageThemeVars()}
  role={landmarkRole}
  aria-label={landmarkLabel}
  tabindex="-1"
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

  <div aria-hidden={focusedReadingMode !== 'off'} inert={focusedReadingMode !== 'off'}>
    <ReaderHeaderBar
      preview={readerPreview}
      {isWindowMode}
      {sidebarVisible}
      isVisible={chromeVisible}
      {activeSidebarTab}
      {isCurrentLocationBookmarked}
      {settings}
      {ttsSession}
      {focusedReadingMode}
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
      {onStartParagraphFocus}
      {onStartRsvpLite}
      {onExitFocusedReading}
    />
  </div>

  <article
    aria-hidden={focusedReadingMode !== 'off'}
    class:window-mode={isWindowMode}
    class:focus-width={settings.viewWidthMode === 'focus'}
    class:wide-width={settings.viewWidthMode === 'wide'}
    class="canvas"
    inert={focusedReadingMode !== 'off'}
  >
    <ReaderViewport
      title="阅读表面"
      {controlRequest}
      hint="正文优先，控制层尽量退到边缘。"
      {isWindowMode}
      {notes}
      onFootnoteRequest={(detail) => {
        footnoteRequest = detail ?? null;
      }}
      {settings}
      on:readerstate={({ detail }) => {
        closeFootnotePopup();
        readerPreview = detail;
        dispatch('readerstate', detail);
      }}
      on:inlinetranslationcandidates={({ detail }) => {
        dispatch('inlinetranslationcandidates', detail);
      }}
      on:notefocus={({ detail }) => {
        dispatch('notefocus', detail);
      }}
      on:footnoterequest={({ detail }) => {
        footnoteRequest = detail ?? null;
      }}
      on:selectionchange={({ detail }) => {
        schedulePopupRefresh();
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
    {#if inlineTranslationVisible && inlineTranslationState}
      <ReaderInlineTranslationLayer
        state={inlineTranslationState}
        summary={inlineTranslationSummary}
        statusMessage={inlineTranslationStatusMessage}
        capabilityMessage={inlineTranslationCapabilityMessage}
        onToggleEnabled={onToggleInlineTranslationEnabled}
        onToggleSourceVisibility={onToggleInlineTranslationSourceVisibility}
        onToggleTranslationVisibility={onToggleInlineTranslationTranslationVisibility}
      />
    {/if}
    <!-- The stage owns popup presentation, but the route still owns the real
     selection actions so highlights/notes/TTS keep using one coordination path. -->
    <ReaderAnnotationPopup
      visible={!!annotationSelection?.text.trim() && focusedReadingMode === 'off'}
      placement={annotationPopupPlacement}
      position={annotationPopupPosition}
      selectionSummary={annotationSelectionSummary}
      selectionDetail={annotationSelectionDetail}
      supportsAnnotationActions={annotationSupportsActions}
      supportMessage={annotationSupportMessage}
      onHighlight={onAddHighlightFromSelection}
      onNote={onAddNoteFromSelection}
      onLookup={onLookupSelection}
      onTranslate={onTranslateSelection}
      onTts={onReadAloudSelection}
      onCopy={onCopySelection}
    />
    <ReaderFootnotePopup
      visible={!!footnoteRequest && focusedReadingMode === 'off'}
      label={footnoteRequest?.label ?? '脚注'}
      excerptHtml={footnoteRequest?.excerptHtml ?? ''}
      excerptText={footnoteRequest?.excerptText ?? ''}
      fallbackHref={footnoteRequest?.fallbackNavigationTarget ?? ''}
      onClose={closeFootnotePopup}
      onJump={jumpToFootnoteLocation}
    />
  </article>

  {#if focusedReadingState && focusedReadingState.mode !== 'off'}
    <ReaderFocusedReadingOverlay
      state={focusedReadingState}
      summary={focusedReadingSummary}
      isRsvpPlaying={focusedReadingRsvpPlaying}
      onExit={onExitFocusedReading}
      onTogglePlayback={onToggleFocusedReadingRsvpPlayback}
      onSlowerPace={onFocusedReadingSlowerPace}
      onFasterPace={onFocusedReadingFasterPace}
      onPreviousWord={onFocusedReadingPreviousWord}
      onNextWord={onFocusedReadingNextWord}
    />
  {/if}

  <div aria-hidden={focusedReadingMode !== 'off'} inert={focusedReadingMode !== 'off'}>
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
  </div>
</section>

<style>
  .reader-stage {
    --reader-stage-fill:
      linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 94%, white 6%);
    position: relative;
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
    position: relative;
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

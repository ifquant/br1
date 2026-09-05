<!-- Ownership: this reader surface explains one part of the reading workflow
 to the user. It may render state from the route or helper modules, but it should
 not silently become a second owner of persistence or route semantics. -->
<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
  import type { ReaderFootnoteAction, ReaderFootnoteAnnotation, ReaderFootnoteRecordAction, ReaderFootnoteRequest, ReaderFootnoteSelection } from '$lib/reader/footnoteExcerpt';
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
    READER_SHORTCUTS,
    createEmptyReaderPreviewState,
    createDefaultReaderSettings,
    getReaderShortcutBindingLabel,
    getReaderShellPalette,
    hydrateReaderSettings,
    READER_FILE_INPUT_ACCEPT,
    resolveReaderKeyboardShortcut,
    resolveReaderMouseShortcut,
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

  const dispatch = createEventDispatcher<{
    controlrequest: ReaderControlRequest;
    gotolibrary: void;
    notefocus: string;
    selectionchange: ReaderSelectionState | null;
    readerstate: ReaderPreviewState;
    inlinetranslationcandidates: ReaderInlineTranslationCandidatesEvent;
    footnoterequest: ReaderFootnoteRequest | null;
    footnoteselectionchange: ReaderSelectionState | null;
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
  export let notesOwnerKey = '';
  export let notesSnapshotKey = '';
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
  export let onSwitchFocusedReadingToParagraph: (() => void) | null = null;
  export let onSwitchFocusedReadingToRsvp: (() => void) | null = null;
  export let onRestartFocusedReadingRsvp: (() => void) | null = null;
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
  export let onFootnoteAction: ((action: ReaderFootnoteAction, selection: ReaderFootnoteSelection) => Promise<string | void>) | null = null;
  export let onFootnoteRecordAction: ((action: ReaderFootnoteRecordAction, id: string, isCurrent: () => boolean) => Promise<string | void>) | null = null;

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
  let footnoteSelectionRevision = 0;
  let footnotePreviewRoot: Element | null = null;
  let footnoteSelection: ReaderFootnoteSelection | null = null;
  let footnoteSelectionRange: Range | null = null;
  let footnoteActionRevision = 0;
  let footnoteActionPending = false;
  let footnoteActionMessage = '';
  let footnoteActionFailed = false;
  let handledControlRequestNonce = 0;
  let hasMounted = false;
  let hasAppliedInitialKeyboardFocus = false;
  let lastFocusedReadingMode: ReaderFocusedReadingMode = 'off';
  let supportsFocusedReadingKeyboardEntry = false;
  let shortcutsHelpOpen = false;
  let shortcutsDialog: HTMLElement | null = null;
  let usesCommandKey = false;
  let readerModalOpen = false;
  const shortcutSections: Array<(typeof READER_SHORTCUTS)[number]['section']> = [
    '通用',
    '导航',
    '专注阅读'
  ];

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

  const issuePageControl = (type: 'prev' | 'next') => {
    dispatch('controlrequest', {
      type,
      nonce: ++controlNonce
    });
  };

  const openSidebarTab = (tab: SidebarTab) => {
    dispatch('switchsidebartab', tab);
  };

  const setFootnoteRequest = (request: ReaderFootnoteRequest | null) => {
    if (request === footnoteRequest) return;
    const previous = footnoteRequest;
    footnoteRequest = request;
    footnoteSelectionRevision += 1;
    footnotePreviewRoot = null;
    footnoteSelection = null;
    footnoteSelectionRange = null;
    footnoteActionRevision += 1;
    footnoteActionPending = false;
    footnoteActionMessage = '';
    footnoteActionFailed = false;
    dispatch('footnoteselectionchange', null);
    previous?.dismiss?.();
  };

  const closeFootnotePopup = () => setFootnoteRequest(null);
  onDestroy(closeFootnotePopup);

  const handleFootnoteSelection = async (root: Element, range: Range | null) => {
    const request = footnoteRequest;
    const sameRange = (left: Range, right: Range) =>
      left.startContainer === right.startContainer && left.startOffset === right.startOffset &&
      left.endContainer === right.endContainer && left.endOffset === right.endOffset;
    // Native selectionchange can repeat without a real reselection. Keep the
    // same lease so a toolbar focus event cannot supersede its own action.
    if (range && footnoteSelectionRange && root === footnotePreviewRoot &&
      sameRange(range, footnoteSelectionRange) && footnoteSelection?.isCurrent()) return;
    const revision = ++footnoteSelectionRevision;
    footnotePreviewRoot = root;
    footnoteSelection = null;
    footnoteSelectionRange = null;
    footnoteActionMessage = '';
    footnoteActionFailed = false;
    // This channel cannot activate the route's generic annotation controls.
    dispatch('footnoteselectionchange', null);
    if (!request?.isCurrent?.() || !range || !root.isConnected || readerModalOpen) return;
    const snapshot = range.cloneRange();
    const text = snapshot.toString().trim();
    if (!text) return;
    const isCurrent = () => {
      if (revision !== footnoteSelectionRevision || request !== footnoteRequest || !request.isCurrent?.() ||
        root !== footnotePreviewRoot || !root.isConnected || readerModalOpen) return false;
      // Check the actual boundaries even if selectionchange is still queued.
      const selection = root.ownerDocument.getSelection();
      const current = selection?.rangeCount === 1 ? selection.getRangeAt(0) : null;
      return !!current && !current.collapsed && sameRange(current, snapshot) &&
        root.contains(current.startContainer) && root.contains(current.endContainer);
    };
    const lease: ReaderFootnoteSelection = {
      text,
      source: null,
      isCurrent,
      validate: async () => {
        if (!isCurrent() || !request.resolveSelection) return null;
        const result = await request.resolveSelection(root, snapshot);
        return isCurrent() ? result : null;
      }
    };
    footnoteSelectionRange = snapshot;
    footnoteSelection = lease;
    const result = await lease.validate();
    if (!isCurrent()) return;
    footnoteSelection = { ...lease, source: result };
    dispatch('footnoteselectionchange', result);
  };

  const runFootnoteOperation = async (operation: () => Promise<string | void>, isCurrent: () => boolean) => {
    if (!isCurrent() || footnoteActionPending) return;
    const revision = ++footnoteActionRevision;
    footnoteActionPending = true;
    footnoteActionMessage = '';
    footnoteActionFailed = false;
    try {
      const message = await operation();
      if (revision === footnoteActionRevision && isCurrent()) footnoteActionMessage = message || '';
    } catch (error) {
      if (revision === footnoteActionRevision && isCurrent()) {
        footnoteActionFailed = true;
        footnoteActionMessage = error instanceof Error ? error.message : '操作失败，请重试';
      }
    } finally {
      if (revision === footnoteActionRevision) footnoteActionPending = false;
    }
  };

  const runFootnoteAction = async (action: ReaderFootnoteAction) => {
    const selection = footnoteSelection;
    if (!onFootnoteAction || !selection) return;
    if ((action === 'highlight' || action === 'note') && !selection.source) return;
    await runFootnoteOperation(() => onFootnoteAction!(action, selection), selection.isCurrent);
  };

  const resolveFootnoteAnnotations = async (root: Element, records: ReaderNote[]): Promise<ReaderFootnoteAnnotation[]> => {
    const request = footnoteRequest;
    if (!request?.resolveAnnotations || !request.isCurrent?.() || readerModalOpen || !root.isConnected) return [];
    footnotePreviewRoot = root;
    const mapped = await request.resolveAnnotations(root, records);
    return request === footnoteRequest && request.isCurrent?.() && root === footnotePreviewRoot &&
      root.isConnected && !readerModalOpen ? mapped : [];
  };

  const runFootnoteRecordAction = async (action: ReaderFootnoteRecordAction, id: string, root: Element) => {
    const request = footnoteRequest;
    const record = notes.find((note) => note.id === id);
    if (!onFootnoteRecordAction || !record) return;
    const text = root.textContent;
    // Record actions outlive the text selection, but never the displayed source
    // payload. Re-map the record before handing it to the only persistence owner.
    const isCurrent = () => request === footnoteRequest && !!request?.isCurrent?.() &&
      root === footnotePreviewRoot && root.isConnected && root.textContent === text && !readerModalOpen;
    await runFootnoteOperation(async () => {
      const mapped = await resolveFootnoteAnnotations(root, [record]);
      if (!isCurrent() || !mapped.some(({ note }) => note.id === id) ||
        !notes.some((note) => note.id === id && note.cfi === record.cfi)) return;
      return onFootnoteRecordAction!(action, id, isCurrent);
    }, isCurrent);
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

  const openShortcutsHelp = () => {
    shortcutsHelpOpen = true;
    void tick().then(() => shortcutsDialog?.focus({ preventScroll: true }));
  };

  const closeShortcutsHelp = () => {
    shortcutsHelpOpen = false;
    void tick().then(focusStageShell);
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

  const runReaderShortcut = (action: ReturnType<typeof resolveReaderKeyboardShortcut>) => {
    if (!action) return;
    if (action === 'show-help') openShortcutsHelp();
    if (action === 'toggle-bookmark') toggleBookmark();
    if (action === 'paragraph-focus' && supportsFocusedReadingKeyboardEntry) {
      onStartParagraphFocus?.();
    }
    if (action === 'rsvp-lite' && supportsFocusedReadingKeyboardEntry) onStartRsvpLite?.();
    if (action === 'previous-page') issuePageControl('prev');
    if (action === 'next-page') issuePageControl('next');
  };

  // One window listener owns reader shortcuts. Editable controls and modal
  // surfaces are hard boundaries so typing cannot trigger reader actions.
  const handleReaderKeyboardEntry = (event: KeyboardEvent) => {
    if (shortcutsHelpOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeShortcutsHelp();
      }
      return;
    }
    if (focusedReadingMode !== 'off' || event.defaultPrevented) return;
    if (!isReaderKeyboardContext(event)) return;
    const action = resolveReaderKeyboardShortcut(event, readerPreview.rtl);
    if (!action) return;
    event.preventDefault();
    runReaderShortcut(action);
  };

  const handleReaderMouseBinding = (event: MouseEvent) => {
    if (shortcutsHelpOpen || focusedReadingMode !== 'off') return;
    if (isEditableKeyboardTarget(event.target)) return;
    const action = resolveReaderMouseShortcut(event.button);
    if (!action) return;
    event.preventDefault();
    runReaderShortcut(action);
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
  $: readerModalOpen = focusedReadingMode !== 'off' || shortcutsHelpOpen;
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
  $: if (readerModalOpen) closeFootnotePopup();

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
    usesCommandKey = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
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
  on:mousedown={handleReaderMouseBinding}
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

  <div aria-hidden={readerModalOpen} inert={readerModalOpen}>
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
      onOpenShortcutsHelp={openShortcutsHelp}
      onOpenMenu={closeFootnotePopup}
    />
  </div>

  <article
    aria-hidden={readerModalOpen}
    class:window-mode={isWindowMode}
    class:focus-width={settings.viewWidthMode === 'focus'}
    class:wide-width={settings.viewWidthMode === 'wide'}
    class="canvas"
    inert={readerModalOpen}
  >
    <ReaderViewport
      title="阅读表面"
      {controlRequest}
      hint="正文优先，控制层尽量退到边缘。"
      {isWindowMode}
      {notes}
      {notesOwnerKey}
      {notesSnapshotKey}
      onFootnoteRequest={setFootnoteRequest}
      {settings}
      on:readerstate={({ detail }) => {
        // Progress/layout refresh is not navigation. Viewport owns dismissal
        // at control admission and reason-aware renderer movement boundaries.
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
        setFootnoteRequest(detail ?? null);
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
      visible={!!annotationSelection?.text.trim() && !readerModalOpen && !footnoteRequest}
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
    {#key footnoteRequest}
      <ReaderFootnotePopup
        visible={!!footnoteRequest && !readerModalOpen}
        label={footnoteRequest?.label ?? '脚注'}
        excerptHtml={footnoteRequest?.excerptHtml ?? ''}
        excerptText={footnoteRequest?.excerptText ?? ''}
        fallbackHref={footnoteRequest?.fallbackNavigationTarget ?? ''}
        onClose={closeFootnotePopup}
        onJump={jumpToFootnoteLocation}
        onSelection={handleFootnoteSelection}
        selection={footnoteSelection}
        onAction={onFootnoteAction ? runFootnoteAction : null}
        actionPending={footnoteActionPending}
        actionMessage={footnoteActionMessage}
        actionFailed={footnoteActionFailed}
        {notes}
        resolveAnnotations={resolveFootnoteAnnotations}
        onRecordAction={onFootnoteRecordAction ? runFootnoteRecordAction : null}
      />
    {/key}
  </article>

  {#if focusedReadingState && focusedReadingState.mode !== 'off'}
    <ReaderFocusedReadingOverlay
      state={focusedReadingState}
      summary={focusedReadingSummary}
      isRsvpPlaying={focusedReadingRsvpPlaying}
      onExit={onExitFocusedReading}
      onSwitchToParagraph={onSwitchFocusedReadingToParagraph}
      onSwitchToRsvp={onSwitchFocusedReadingToRsvp}
      onRestartRsvp={onRestartFocusedReadingRsvp}
      onTogglePlayback={onToggleFocusedReadingRsvpPlayback}
      onSlowerPace={onFocusedReadingSlowerPace}
      onFasterPace={onFocusedReadingFasterPace}
      onPreviousWord={onFocusedReadingPreviousWord}
      onNextWord={onFocusedReadingNextWord}
    />
  {/if}

  {#if shortcutsHelpOpen}
    <div
      class="shortcuts-backdrop"
      role="presentation"
      on:mousedown={(event) => {
        if (event.target === event.currentTarget) closeShortcutsHelp();
      }}
    >
      <div
        bind:this={shortcutsDialog}
        class="shortcuts-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-shortcuts-title"
        tabindex="-1"
      >
        <header>
          <h2 id="reader-shortcuts-title">快捷键</h2>
          <button type="button" aria-label="关闭快捷键帮助" title="关闭" on:click={closeShortcutsHelp}>
            ×
          </button>
        </header>
        <div class="shortcuts-groups">
          {#each shortcutSections as section, sectionIndex}
            <section aria-labelledby={`reader-shortcuts-section-${sectionIndex}`}>
              <h3 id={`reader-shortcuts-section-${sectionIndex}`}>{section}</h3>
              <dl>
                {#each READER_SHORTCUTS.filter((shortcut) => shortcut.section === section) as shortcut}
                  <div>
                    <dt>{shortcut.description}</dt>
                    <dd>
                      {#each shortcut.bindings as binding}
                        <kbd>{getReaderShortcutBindingLabel(binding, usesCommandKey, readerPreview.rtl)}</kbd>
                      {/each}
                    </dd>
                  </div>
                {/each}
              </dl>
            </section>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <div aria-hidden={readerModalOpen} inert={readerModalOpen}>
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

  .shortcuts-backdrop {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: grid;
    place-items: center;
    box-sizing: border-box;
    padding: 24px;
    background: rgba(20, 22, 24, 0.46);
  }

  .shortcuts-dialog {
    width: min(560px, 100%);
    max-height: min(720px, calc(100vh - 48px));
    overflow: auto;
    box-sizing: border-box;
    padding: 20px;
    border: 1px solid var(--reader-shell-border, var(--border-light));
    border-radius: 8px;
    background: var(--reader-shell-raised, var(--surface-page));
    box-shadow: 0 18px 54px var(--reader-shell-shadow, rgba(0, 0, 0, 0.2));
    color: var(--reader-shell-text, var(--text-primary));
  }

  .shortcuts-dialog > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--reader-shell-border, var(--border-light));
  }

  .shortcuts-dialog h2,
  .shortcuts-dialog h3,
  .shortcuts-dialog dl,
  .shortcuts-dialog dd {
    margin: 0;
  }

  .shortcuts-dialog h2 {
    font-size: 1.1rem;
  }

  .shortcuts-dialog h3 {
    margin-bottom: 6px;
    font-size: 0.82rem;
    color: var(--reader-shell-muted, var(--text-muted));
  }

  .shortcuts-dialog button {
    width: 32px;
    height: 32px;
    border: 0;
    background: transparent;
    color: inherit;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
  }

  .shortcuts-dialog button:hover,
  .shortcuts-dialog button:focus-visible {
    background: color-mix(in srgb, var(--reader-shell-accent) 12%, transparent);
    outline: none;
  }

  .shortcuts-groups {
    display: grid;
    gap: 20px;
    padding-top: 18px;
  }

  .shortcuts-dialog dl > div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 16px;
    min-height: 38px;
    border-bottom: 1px solid color-mix(in srgb, var(--reader-shell-border) 58%, transparent);
  }

  .shortcuts-dialog dd {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
  }

  .shortcuts-dialog kbd {
    min-width: 26px;
    box-sizing: border-box;
    padding: 3px 7px;
    border: 1px solid var(--reader-shell-border, var(--border-light));
    border-radius: 4px;
    background: var(--reader-shell-panel, var(--surface-panel));
    color: inherit;
    font: inherit;
    font-size: 0.78rem;
    text-align: center;
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

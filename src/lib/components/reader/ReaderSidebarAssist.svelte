<!-- This child only presents the sidebar assist host. The parent still owns
 route-level tab selection plus the current book's assistance history and
 mutation callbacks, so this wrapper must stay a thin view boundary. -->
<script lang="ts">
  import './readerSidebarPanel.css';
  import ReaderAssistWorkspace from './ReaderAssistWorkspace.svelte';
  import type {
    ReaderAssistanceHistoryEntry,
    ReaderAssistanceState,
    ReaderPreviewState,
    ReaderSidebarCallbacks,
    ReaderSidebarNotesState,
    ReaderTranslationProviderStatus
  } from '$lib/reader';
  import { createEmptyReaderAssistanceState, createEmptyReaderPreviewState } from '$lib/reader';

  export let preview: ReaderPreviewState = createEmptyReaderPreviewState();
  export let notesState: ReaderSidebarNotesState = {
    activeCfi: '',
    selection: null,
    notes: []
  };
  export let assistance: ReaderAssistanceState = createEmptyReaderAssistanceState();
  export let assistanceHistory: ReaderAssistanceHistoryEntry[] = [];
  export let selectedLookupHistoryEntryId = '';
  export let selectedTranslationHistoryEntryId = '';
  export let translationProviderStatuses: ReaderTranslationProviderStatus[] = [];
  export let callbacks: Pick<ReaderSidebarCallbacks, 'onRequestLookup' | 'onRequestTranslation'> = {
    onRequestLookup: null,
    onRequestTranslation: null
  };
  export let onSelectAssistanceHistoryEntry:
    | ((mode: 'lookup' | 'translation', entryId: string) => void)
    | null = null;
  export let onClearAssistanceHistory:
    | ((mode: 'lookup' | 'translation') => void)
    | null = null;
</script>

<section class="reader-sidebar-panel" aria-label="查找面板">
  <ReaderAssistWorkspace
    title="AI 阅读助手"
    summary="保留原有 assist 入口，但内部改成和 notebook 共用的助手工作台。"
    {preview}
    {notesState}
    {assistance}
    history={assistanceHistory}
    {selectedLookupHistoryEntryId}
    {selectedTranslationHistoryEntryId}
    {translationProviderStatuses}
    {callbacks}
    onSelectHistoryEntry={onSelectAssistanceHistoryEntry}
    onClearHistory={onClearAssistanceHistory}
  />
</section>

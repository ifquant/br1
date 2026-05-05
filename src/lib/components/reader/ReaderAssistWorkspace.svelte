<script lang="ts">
  import type {
    ReaderAssistanceHistoryEntry,
    ReaderAssistanceState,
    ReaderLookupProvider,
    ReaderPreviewState,
    ReaderSidebarCallbacks,
    ReaderSidebarNotesState,
    ReaderTranslationProvider,
    ReaderTranslationProviderStatus
  } from '$lib/reader';
  import {
    createEmptyReaderAssistanceState,
    getReaderAssistanceProviderDisplayLabel,
    getReaderAssistanceRequestContextLabel,
    getReaderAssistanceRequestSubject,
    getReaderTranslationProviderDisplayLabel,
    normalizeAssistanceTerm,
    normalizeAssistanceText
  } from '$lib/reader';

  const TRANSLATION_PROVIDER_OPTIONS: ReaderTranslationProvider[] = ['deepl', 'yandex'];

  export let preview: ReaderPreviewState;
  export let notesState: ReaderSidebarNotesState;
  export let assistance: ReaderAssistanceState = createEmptyReaderAssistanceState();
  export let history: ReaderAssistanceHistoryEntry[] = [];
  export let selectedLookupHistoryEntryId = '';
  export let selectedTranslationHistoryEntryId = '';
  export let translationProviderStatuses: ReaderTranslationProviderStatus[] = [];
  export let callbacks: Pick<ReaderSidebarCallbacks, 'onRequestLookup' | 'onRequestTranslation'> = {
    onRequestLookup: null,
    onRequestTranslation: null
  };
  export let onSelectHistoryEntry:
    | ((mode: 'lookup' | 'translation', entryId: string) => void)
    | null = null;
  export let onClearHistory:
    | ((mode: 'lookup' | 'translation') => void)
    | null = null;
  export let title = 'AI 阅读助手';
  export let summary =
    '把词典、维基百科和翻译请求收成一个工作台，而不是继续挤在 sidebar result panel 里。';
  export let lockedMode: 'lookup' | 'translation' | null = null;

  let assistLookupTerm = '';
  let assistLookupTermSeededForBookKey = '';
  let assistMode: 'lookup' | 'translation' = lockedMode ?? 'lookup';
  let assistLookupProvider: ReaderLookupProvider = 'wikipedia';
  let assistTranslationProvider: ReaderTranslationProvider = 'deepl';
  let assistTranslationText = '';
  let assistTranslationTargetLanguage = 'zh';
  let restoredSelectedMode: 'lookup' | 'translation' | null = null;
  let lookupArchiveExpanded = true;
  let translationArchiveExpanded = true;

  $: bookKey = `${preview.title}::${preview.chapterLabel}`;
  $: activeTranslationProviderStatus =
    translationProviderStatuses.find((status) => status.provider === assistTranslationProvider) || null;
  $: activeAssistanceRequest = assistance.activeRequest;
  $: assistanceResultProvider =
    assistance.result?.provider ||
    (activeAssistanceRequest?.kind === 'translation'
      ? activeAssistanceRequest.provider
      : assistLookupProvider);
  $: restoredSelectedMode = selectedTranslationHistoryEntryId.trim()
    ? 'translation'
    : selectedLookupHistoryEntryId.trim()
      ? 'lookup'
      : null;
  $: if (lockedMode && assistMode !== lockedMode) {
    assistMode = lockedMode;
  }
  $: if (!lockedMode && restoredSelectedMode && assistMode !== restoredSelectedMode) {
    assistMode = restoredSelectedMode;
  }
  $: if (assistLookupTermSeededForBookKey !== bookKey) {
    assistLookupTerm = normalizeAssistanceTerm(notesState.selection?.text || preview.chapterLabel);
    assistTranslationText = normalizeAssistanceText(
      notesState.selection?.text || preview.chapterLabel || preview.title
    );
    assistMode = lockedMode ?? 'lookup';
    assistLookupProvider = 'wikipedia';
    assistTranslationProvider = 'deepl';
    assistTranslationTargetLanguage = 'zh';
    assistLookupTermSeededForBookKey = bookKey;
  }
  $: translationSourceText = normalizeAssistanceText(
    assistTranslationText || notesState.selection?.text || preview.chapterLabel || preview.title
  );
  $: lookupHistory = history.filter((entry) => entry.request.kind === 'lookup');
  $: translationHistory = history.filter((entry) => entry.request.kind === 'translation');
  $: latestLookupHistoryEntry = lookupHistory[0] ?? null;
  $: latestTranslationHistoryEntry = translationHistory[0] ?? null;
  $: visibleHistory = history.filter((entry) =>
    assistMode === 'translation' ? entry.request.kind === 'translation' : entry.request.kind === 'lookup'
  );
  $: archiveExpanded = assistMode === 'translation' ? translationArchiveExpanded : lookupArchiveExpanded;
  $: selectedHistoryEntryId =
    assistMode === 'translation' ? selectedTranslationHistoryEntryId : selectedLookupHistoryEntryId;
  $: {
    const selectedEntryStillVisible = visibleHistory.some((entry) => entry.id === selectedHistoryEntryId);
    if (selectedHistoryEntryId && !selectedEntryStillVisible) {
      onSelectHistoryEntry?.(assistMode, '');
    }
  }
  $: selectedHistoryEntry =
    visibleHistory.find((entry) => entry.id === selectedHistoryEntryId) ?? null;
  $: archivedTranslationSourceText =
    selectedHistoryEntry?.request.kind === 'translation'
      ? normalizeAssistanceText(selectedHistoryEntry.request.text)
      : '';

  const formatHistoryTimestamp = (value: number) => {
    const date = new Date(value);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const getHistoryStatusLabel = (entry: ReaderAssistanceHistoryEntry): string => {
    if (entry.status === 'loading') return '请求中';
    if (entry.status === 'ready') return '已返回结果';
    if (entry.status === 'empty') return '没有命中';
    if (entry.status === 'offline') return '当前离线';
    return '请求失败';
  };

  const replayHistoryEntry = (entry: ReaderAssistanceHistoryEntry) => {
    onSelectHistoryEntry?.(entry.request.kind, entry.id);
    if (entry.request.kind === 'translation') {
      assistMode = 'translation';
      assistTranslationProvider = entry.request.provider;
      assistTranslationText = entry.request.text;
      assistTranslationTargetLanguage = entry.request.targetLanguage;
      callbacks.onRequestTranslation?.(
        entry.request.provider,
        entry.request.text,
        entry.request.targetLanguage
      );
      return;
    }

    assistMode = 'lookup';
    assistLookupProvider = entry.request.provider;
    assistLookupTerm = entry.request.term;
    callbacks.onRequestLookup?.(entry.request.provider, entry.request.term);
  };

  const selectHistoryEntry = (entry: ReaderAssistanceHistoryEntry) => {
    onSelectHistoryEntry?.(entry.request.kind, entry.id);
    if (entry.request.kind === 'translation') {
      assistMode = 'translation';
      assistTranslationProvider = entry.request.provider;
      assistTranslationText = entry.request.text;
      assistTranslationTargetLanguage = entry.request.targetLanguage;
      return;
    }

    assistMode = 'lookup';
    assistLookupProvider = entry.request.provider;
    assistLookupTerm = entry.request.term;
  };

  const fillAssistLookupTerm = (term: string) => {
    assistLookupTerm = normalizeAssistanceTerm(term);
  };

  const fillAssistTranslationText = (text: string) => {
    assistTranslationText = normalizeAssistanceText(text);
  };

  const requestAssistLookup = () => {
    const term = normalizeAssistanceTerm(
      assistLookupTerm || notesState.selection?.text || preview.chapterLabel
    );
    callbacks.onRequestLookup?.(assistLookupProvider, term);
  };

  const requestAssistTranslation = () => {
    const text = normalizeAssistanceText(
      assistTranslationText || notesState.selection?.text || preview.chapterLabel || preview.title
    );
    callbacks.onRequestTranslation?.(
      assistTranslationProvider,
      text,
      assistTranslationTargetLanguage.trim() || 'zh'
    );
  };

  const setArchiveExpanded = (mode: 'lookup' | 'translation', expanded: boolean) => {
    if (mode === 'translation') {
      translationArchiveExpanded = expanded;
      return;
    }

    lookupArchiveExpanded = expanded;
  };
</script>

<section class="assist-workspace" aria-label={title}>
  <div class="assist-summary">
    <strong>{title}</strong>
    <span>{summary}</span>
  </div>

  {#if !lockedMode}
    <div class="assist-archive-overview" aria-label="本书 AI 记录摘要">
      <button
        type="button"
        class:active={assistMode === 'lookup'}
        class="assist-archive-card"
        on:click={() => {
          assistMode = 'lookup';
          lookupArchiveExpanded = true;
        }}
      >
        <strong>查找记录</strong>
        <span>{lookupHistory.length > 0 ? `当前书 ${lookupHistory.length} 条` : '当前书还没有查找记录'}</span>
        <small>
          {#if latestLookupHistoryEntry}
            最近一条：{getReaderAssistanceRequestSubject(latestLookupHistoryEntry.request) || '未命名请求'} · {formatHistoryTimestamp(latestLookupHistoryEntry.updatedAt)}
          {:else}
            查词和百科结果会按当前书保留在这里。
          {/if}
        </small>
      </button>
      <button
        type="button"
        class:active={assistMode === 'translation'}
        class="assist-archive-card"
        on:click={() => {
          assistMode = 'translation';
          translationArchiveExpanded = true;
        }}
      >
        <strong>翻译记录</strong>
        <span>
          {translationHistory.length > 0 ? `当前书 ${translationHistory.length} 条` : '当前书还没有翻译记录'}
        </span>
        <small>
          {#if latestTranslationHistoryEntry}
            最近一条：{getReaderAssistanceRequestSubject(latestTranslationHistoryEntry.request) || '未命名请求'} · {formatHistoryTimestamp(latestTranslationHistoryEntry.updatedAt)}
          {:else}
            当前书的翻译请求和结果会按语言上下文保留在这里。
          {/if}
        </small>
      </button>
    </div>
  {/if}

  <div class="assist-context">
    <span>
      {#if notesState.selection?.text?.trim() && assistMode === 'translation'}
        当前选区：{normalizeAssistanceText(notesState.selection.text)}
      {:else if notesState.selection?.text?.trim()}
        当前选区：{normalizeAssistanceTerm(notesState.selection.text)}
      {:else}
        {assistMode === 'translation'
          ? '先在正文里选中一段文本，或直接输入要翻译的内容。'
          : '先在正文里选中一段文本，或直接输入词条。'}
      {/if}
    </span>
    <span>当前章节：{preview.chapterLabel}</span>
    {#if assistMode === 'translation'}
      <span>
        目标语言：{assistTranslationTargetLanguage.toUpperCase()}。
        {#if activeTranslationProviderStatus && !activeTranslationProviderStatus.configured}
          {activeTranslationProviderStatus.label}
        {:else}
          当前 provider：{getReaderTranslationProviderDisplayLabel(assistTranslationProvider)}。
        {/if}
      </span>
    {:else if assistLookupProvider === 'dictionary'}
      <span>词典目前仅支持英文词条。</span>
    {/if}
  </div>

  {#if !lockedMode}
    <div class="assist-actions">
      <button
        type="button"
        class:active={assistMode === 'lookup'}
        class="assist-chip"
        aria-pressed={assistMode === 'lookup'}
        on:click={() => {
          assistMode = 'lookup';
        }}
      >
        查找
      </button>
      <button
        type="button"
        class:active={assistMode === 'translation'}
        class="assist-chip"
        aria-pressed={assistMode === 'translation'}
        on:click={() => {
          assistMode = 'translation';
        }}
      >
        翻译
      </button>
    </div>
  {/if}

  {#if assistMode === 'translation'}
    <label class="assist-field">
      <span class="sr-only">翻译文本</span>
      <textarea
        rows="5"
        maxlength="8000"
        placeholder="输入要翻译的文本，或先在正文里选中一段内容"
        value={assistTranslationText}
        on:input={(event) =>
          fillAssistTranslationText((event.currentTarget as HTMLTextAreaElement).value)}
      ></textarea>
    </label>
  {:else}
    <label class="assist-field">
      <span class="sr-only">{assistLookupProvider === 'dictionary' ? '词典词条' : '维基百科词条'}</span>
      <input
        type="search"
        maxlength="120"
        placeholder={assistLookupProvider === 'dictionary' ? '输入英文词条，或先选中文本' : '输入词条，或先选中文本'}
        value={assistLookupTerm}
        on:input={(event) => fillAssistLookupTerm((event.currentTarget as HTMLInputElement).value)}
        on:keydown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            requestAssistLookup();
          }
        }}
      />
    </label>
  {/if}

  <div class="assist-actions">
    <button
      type="button"
      class="assist-chip"
      disabled={!notesState.selection?.text?.trim()}
      on:click={() => {
        if (assistMode === 'translation') {
          fillAssistTranslationText(notesState.selection?.text || '');
        } else {
          fillAssistLookupTerm(notesState.selection?.text || '');
        }
      }}
    >
      填入选区
    </button>
    <button
      type="button"
      class="assist-chip"
      on:click={() => {
        if (assistMode === 'translation') {
          fillAssistTranslationText(preview.chapterLabel || preview.title);
        } else {
          fillAssistLookupTerm(preview.chapterLabel);
        }
      }}
    >
      填入章节
    </button>
    {#if assistMode === 'translation'}
      <button
        type="button"
        class:active={assistTranslationTargetLanguage === 'zh'}
        class="assist-chip"
        aria-pressed={assistTranslationTargetLanguage === 'zh'}
        on:click={() => {
          assistTranslationTargetLanguage = 'zh';
        }}
      >
        中文
      </button>
      <button
        type="button"
        class:active={assistTranslationTargetLanguage === 'en'}
        class="assist-chip"
        aria-pressed={assistTranslationTargetLanguage === 'en'}
        on:click={() => {
          assistTranslationTargetLanguage = 'en';
        }}
      >
        English
      </button>
      {#each TRANSLATION_PROVIDER_OPTIONS as provider}
        <button
          type="button"
          class:active={assistTranslationProvider === provider}
          class="assist-chip"
          aria-pressed={assistTranslationProvider === provider}
          on:click={() => {
            assistTranslationProvider = provider;
          }}
        >
          {getReaderTranslationProviderDisplayLabel(provider)}
        </button>
      {/each}
    {:else}
      <button
        type="button"
        class:active={assistLookupProvider === 'wikipedia'}
        class="assist-chip"
        aria-pressed={assistLookupProvider === 'wikipedia'}
        on:click={() => {
          assistLookupProvider = 'wikipedia';
        }}
      >
        维基百科
      </button>
      <button
        type="button"
        class:active={assistLookupProvider === 'dictionary'}
        class="assist-chip"
        aria-pressed={assistLookupProvider === 'dictionary'}
        on:click={() => {
          assistLookupProvider = 'dictionary';
        }}
      >
        词典
      </button>
    {/if}
    <button
      type="button"
      class="primary-assist-action"
      disabled={
        assistMode === 'translation'
          ? !normalizeAssistanceText(
              assistTranslationText || notesState.selection?.text || preview.chapterLabel || preview.title
            )
          : !normalizeAssistanceTerm(assistLookupTerm || notesState.selection?.text || preview.chapterLabel)
      }
      on:click={assistMode === 'translation' ? requestAssistTranslation : requestAssistLookup}
    >
      {#if assistMode === 'translation'}
        翻译为 {assistTranslationTargetLanguage.toUpperCase()}
      {:else if assistLookupProvider === 'dictionary'}
        查词典
      {:else}
        查维基百科
      {/if}
    </button>
  </div>

  <div class="assist-result" aria-label={assistMode === 'translation' ? '翻译结果' : '查找结果'}>
    <div class="assist-history" aria-label={assistMode === 'translation' ? '最近翻译' : '最近求助'}>
      <div class="assist-history-head">
        <strong>{assistMode === 'translation' ? '最近翻译' : '最近求助'}</strong>
        <span>
          {assistMode === 'translation'
            ? '保留本书最近的翻译请求，方便回看和再次发起。'
            : '保留本书最近的查词和百科请求，方便回看和再次发起。'}
        </span>
        <div class="assist-history-head-actions">
          {#if visibleHistory.length > 0}
            <button
              type="button"
              class="assist-chip"
              on:click={() => setArchiveExpanded(assistMode, !archiveExpanded)}
            >
              {archiveExpanded ? '收起记录列表' : '展开记录列表'}
            </button>
            <button
              type="button"
              class="assist-chip clear-history"
              on:click={() => onClearHistory?.(assistMode)}
            >
              {assistMode === 'translation' ? '清除本书翻译记录' : '清除本书求助记录'}
            </button>
          {/if}
        </div>
      </div>
      {#if selectedHistoryEntry}
        <article class="assist-active-record" aria-label="当前正在查看的 AI 记录">
          <strong>当前正在查看</strong>
          <span>{getReaderAssistanceRequestSubject(selectedHistoryEntry.request) || '未命名请求'}</span>
          <small>
            {getReaderAssistanceRequestContextLabel(selectedHistoryEntry.request)} · {getHistoryStatusLabel(selectedHistoryEntry)} · {formatHistoryTimestamp(selectedHistoryEntry.updatedAt)}
          </small>
        </article>
      {/if}
      {#if visibleHistory.length > 0 && archiveExpanded}
        <div class="assist-history-list">
          {#each visibleHistory as entry}
            <article class:selected={selectedHistoryEntryId === entry.id} class="assist-history-item">
              <div class="assist-history-copy">
                <strong>{getReaderAssistanceRequestSubject(entry.request) || '未命名请求'}</strong>
                <span>
                  {getReaderAssistanceProviderDisplayLabel(entry.request.provider)} · {getHistoryStatusLabel(entry)} · {formatHistoryTimestamp(entry.updatedAt)}
                </span>
                <small>{getReaderAssistanceRequestContextLabel(entry.request)}</small>
                <small>
                  {#if entry.status === 'ready' && entry.result}
                    {entry.result.title}
                  {:else if entry.error}
                    {entry.error}
                  {:else if entry.request.chapterLabel}
                    {entry.request.chapterLabel}
                  {:else}
                    {assistMode === 'translation' ? '等待翻译结果。' : '等待查找结果。'}
                  {/if}
                </small>
              </div>
              <div class="assist-history-actions">
                <button type="button" class="assist-chip" on:click={() => selectHistoryEntry(entry)}>
                  {selectedHistoryEntryId === entry.id ? '正在查看' : '查看记录'}
                </button>
                <button type="button" class="assist-chip" on:click={() => replayHistoryEntry(entry)}>
                  再次发起
                </button>
              </div>
            </article>
          {/each}
        </div>
      {:else if visibleHistory.length > 0}
        <p class="assist-history-collapsed-copy">
          {assistMode === 'translation'
            ? '翻译记录列表已收起；当前书的最近翻译仍然保留在这个 section 里。'
            : '查找记录列表已收起；当前书的最近求助仍然保留在这个 section 里。'}
        </p>
      {:else}
        <p class="assist-history-empty">
          {assistMode === 'translation'
            ? '还没有这本书的翻译记录。发起一次翻译后，这里会保留最近请求。'
            : '还没有这本书的查找记录。发起一次查词或百科后，这里会保留最近请求。'}
        </p>
      {/if}
    </div>
    <div class="assist-translation-status">
      <strong>翻译提供方状态</strong>
      <span>翻译配置由桌面端托管，renderer 只读取状态，不保存密钥。</span>
      <div class="assist-translation-status-list">
        {#each translationProviderStatuses as provider}
          <div class:missing-key={!provider.configured} class="assist-translation-status-row">
            <span>{getReaderTranslationProviderDisplayLabel(provider.provider)}</span>
            <span>{provider.label}</span>
          </div>
        {/each}
      </div>
    </div>
    {#if assistMode === 'translation'}
      <div class="assist-translation-panels" aria-label="翻译阅读面板">
        <article class="assist-translation-card">
          <strong>原文</strong>
          <p>
            {#if selectedHistoryEntry?.request.kind === 'translation'}
              {archivedTranslationSourceText || '这条历史记录没有保留原文。'}
            {:else}
              {translationSourceText || '先在正文里选中文本，或输入要翻译的内容。'}
            {/if}
          </p>
        </article>
        <article class="assist-translation-card result">
          <strong>译文</strong>
          {#if selectedHistoryEntry?.request.kind === 'translation'}
            <span>历史记录 · {getReaderAssistanceRequestContextLabel(selectedHistoryEntry.request)}</span>
            {#if selectedHistoryEntry.status === 'loading'}
              <p>
                正在向{getReaderTranslationProviderDisplayLabel(selectedHistoryEntry.request.provider)}请求翻译结果。
              </p>
            {:else if selectedHistoryEntry.status === 'ready' && selectedHistoryEntry.result}
              <span>
                {selectedHistoryEntry.result.sourceLabel ||
                  getReaderTranslationProviderDisplayLabel(selectedHistoryEntry.request.provider)}
              </span>
              <p>{selectedHistoryEntry.result.body}</p>
            {:else if selectedHistoryEntry.status === 'empty'}
              <p>这条历史请求没有返回可翻译内容。</p>
            {:else if selectedHistoryEntry.status === 'offline'}
              <p>{selectedHistoryEntry.error || '这条历史请求当时处于离线状态。'}</p>
            {:else}
              <p>{selectedHistoryEntry.error || '这条历史请求失败了。'}</p>
            {/if}
          {:else if assistance.status === 'loading'}
            <p>
              正在向{getReaderTranslationProviderDisplayLabel(
                activeAssistanceRequest?.kind === 'translation'
                  ? activeAssistanceRequest.provider
                  : assistTranslationProvider
              )}请求翻译结果。
            </p>
          {:else if
            assistance.status === 'ready' &&
            assistance.result &&
            activeAssistanceRequest?.kind === 'translation'}
            <span>
              {assistance.result.sourceLabel ||
                getReaderTranslationProviderDisplayLabel(
                  activeAssistanceRequest.provider
                )}
            </span>
            <p>{assistance.result.body}</p>
          {:else if assistance.status === 'empty'}
            <p>没有可翻译的内容。</p>
          {:else if assistance.status === 'offline'}
            <p>{assistance.error || '桌面运行时或网络不可用。'}</p>
          {:else if assistance.status === 'error'}
            <p>{assistance.error || '翻译请求失败。'}</p>
          {:else}
            <p>发起翻译后，译文会显示在这里；如果没有选区，会回退到当前章节标题。</p>
          {/if}
        </article>
      </div>
    {:else if assistance.status === 'loading'}
      <strong>正在查询</strong>
      <span>
        {#if activeAssistanceRequest?.kind === 'translation'}
          正在向{getReaderTranslationProviderDisplayLabel(activeAssistanceRequest.provider)}请求翻译结果。
        {:else}
          正在向{assistLookupProvider === 'dictionary' ? '词典' : '维基百科'}请求结果。
        {/if}
      </span>
    {:else if selectedHistoryEntry}
      <strong>{selectedHistoryEntry.result?.title || '历史记录'}</strong>
      <span>
        历史记录 · {getReaderAssistanceProviderDisplayLabel(selectedHistoryEntry.request.provider)} · {getReaderAssistanceRequestContextLabel(selectedHistoryEntry.request)}
      </span>
      {#if selectedHistoryEntry.status === 'ready' && selectedHistoryEntry.result}
        <p>{selectedHistoryEntry.result.body}</p>
        {#if selectedHistoryEntry.result.url}
          <a href={selectedHistoryEntry.result.url} target="_blank" rel="noreferrer">打开词条</a>
        {/if}
      {:else if selectedHistoryEntry.status === 'empty'}
        <p>这条历史请求没有返回结果。</p>
      {:else if selectedHistoryEntry.status === 'offline'}
        <p>{selectedHistoryEntry.error || '这条历史请求当时处于离线状态。'}</p>
      {:else}
        <p>{selectedHistoryEntry.error || '这条历史请求失败了。'}</p>
      {/if}
    {:else if assistance.status === 'ready' && assistance.result}
      <strong>{assistance.result.title}</strong>
      <span>
        {assistance.result.sourceLabel ||
          (assistanceResultProvider === 'dictionary'
            ? 'Dictionary'
            : assistanceResultProvider === 'wikipedia'
              ? 'Wikipedia'
              : getReaderTranslationProviderDisplayLabel(assistanceResultProvider))}
      </span>
      <p>{assistance.result.body}</p>
      {#if assistance.result.url}
        <a href={assistance.result.url} target="_blank" rel="noreferrer">打开词条</a>
      {/if}
    {:else if assistance.status === 'empty'}
      <strong>没有找到结果</strong>
      <span>
        {activeAssistanceRequest?.kind === 'translation'
          ? '没有可翻译的内容。'
          : assistLookupProvider === 'dictionary'
            ? '词典没有返回对应词条。'
            : '维基百科没有返回对应词条。'}
      </span>
    {:else if assistance.status === 'offline'}
      <strong>当前不可用</strong>
      <span>{assistance.error || '桌面运行时或网络不可用。'}</span>
    {:else if assistance.status === 'error'}
      <strong>查询失败</strong>
      <span>
        {assistance.error ||
          (activeAssistanceRequest?.kind === 'translation'
            ? '翻译请求失败。'
            : assistLookupProvider === 'dictionary'
              ? '词典查询失败。'
              : '维基百科查询失败。')}
      </span>
    {:else}
      <strong>等待查询</strong>
      <span>输入词条后可以直接发起{assistLookupProvider === 'dictionary' ? '词典' : '维基百科'}查找。</span>
    {/if}
  </div>
</section>

<style>
  .assist-workspace {
    display: grid;
    gap: 14px;
  }

  .assist-summary {
    display: grid;
    gap: 6px;
  }

  .assist-summary strong {
    color: var(--text-primary);
    font: 700 14px/1.25 var(--font-chrome);
    letter-spacing: 0.02em;
  }

  .assist-summary span,
  .assist-context span {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.55;
  }

  .assist-context {
    display: grid;
    gap: 6px;
    padding: 12px;
    border: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-reader) 82%, white 18%);
  }

  .assist-archive-overview {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .assist-archive-card {
    display: grid;
    gap: 6px;
    text-align: left;
    padding: 12px;
    border: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
    cursor: pointer;
  }

  .assist-archive-card.active {
    border-color: color-mix(in srgb, var(--accent-warm, #8c6a3b) 32%, white 68%);
    background: color-mix(in srgb, var(--surface-reader) 74%, white 26%);
  }

  .assist-archive-card strong {
    color: var(--text-primary);
    font: 700 13px/1.3 var(--font-chrome);
  }

  .assist-archive-card span,
  .assist-archive-card small {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.55;
  }

  .assist-field input,
  .assist-field textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-panel) 90%, white 10%);
    color: var(--text-primary);
    font: inherit;
    padding: 10px 12px;
  }

  .assist-field textarea {
    resize: vertical;
    min-height: 120px;
  }

  .assist-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .assist-chip,
  .primary-assist-action {
    min-height: 34px;
    border: 1px solid var(--border-light);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 88%, white 12%);
    color: var(--text-secondary);
    font: 700 12px/1 var(--font-chrome);
    letter-spacing: 0.04em;
    padding: 0 12px;
    cursor: pointer;
  }

  .assist-chip:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .assist-chip.active {
    color: color-mix(in srgb, var(--accent-warm, #8c6a3b) 78%, black 22%);
    border-color: color-mix(in srgb, var(--accent-warm, #8c6a3b) 32%, white 68%);
    background: color-mix(in srgb, var(--surface-reader) 72%, white 28%);
  }

  .primary-assist-action {
    background: color-mix(in srgb, var(--accent-warm, #8c6a3b) 20%, var(--surface-reader) 80%);
    color: color-mix(in srgb, var(--accent-warm, #8c6a3b) 78%, black 22%);
  }

  .primary-assist-action:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  .assist-translation-status {
    display: grid;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
  }

  .assist-history {
    display: grid;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
  }

  .assist-history-head {
    display: grid;
    gap: 4px;
  }

  .assist-history-head-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
  }

  .assist-history-head .clear-history {
    justify-self: start;
  }

  .assist-translation-status strong,
  .assist-history strong,
  .assist-result strong {
    color: var(--text-primary);
    font: 700 13px/1.3 var(--font-chrome);
  }

  .assist-translation-status > span,
  .assist-translation-status-row > span,
  .assist-result span {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.5;
  }

  .assist-history-list {
    display: grid;
    gap: 8px;
  }

  .assist-active-record {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border: 1px solid color-mix(in srgb, var(--accent-warm, #8c6a3b) 22%, white 78%);
    background: color-mix(in srgb, var(--surface-reader) 80%, white 20%);
  }

  .assist-active-record span,
  .assist-active-record small,
  .assist-history-collapsed-copy {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.55;
  }

  .assist-history-item {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid var(--border-light);
      background: color-mix(in srgb, var(--surface-reader) 84%, white 16%);
  }

  .assist-history-item.selected {
    border-color: color-mix(in srgb, var(--accent-warm, #8c6a3b) 32%, white 68%);
    background: color-mix(in srgb, var(--surface-reader) 74%, white 26%);
  }

  .assist-history-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: flex-start;
    justify-content: flex-end;
  }

  .assist-history-copy {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .assist-history-copy strong,
  .assist-history-copy span,
  .assist-history-copy small {
    overflow-wrap: anywhere;
  }

  .assist-history-copy small,
  .assist-history-empty {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.55;
  }

  .assist-translation-status-list {
    display: grid;
    gap: 6px;
  }

  .assist-translation-status-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  .assist-translation-status-row.missing-key > span:last-child {
    color: #8b3b2f;
  }

  .assist-translation-panels {
    display: grid;
    gap: 10px;
  }

  @media (max-width: 760px) {
    .assist-archive-overview {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .assist-translation-card {
    display: grid;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-reader) 88%, white 12%);
  }

  .assist-translation-card.result {
    background: color-mix(in srgb, var(--surface-panel) 90%, white 10%);
  }

  .assist-translation-card strong {
    color: var(--text-primary);
    font: 700 12px/1.2 var(--font-chrome);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .assist-result {
    display: grid;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-reader) 76%, white 24%);
  }

  .assist-result p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.7;
    white-space: pre-wrap;
  }

  .assist-translation-card span,
  .assist-translation-card p {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.6;
    margin: 0;
    white-space: pre-wrap;
  }

  .assist-result a {
    color: color-mix(in srgb, var(--accent-warm, #8c6a3b) 80%, black 20%);
    font: 700 12px/1.3 var(--font-chrome);
    text-decoration: none;
  }

  .assist-chip:focus-visible,
  .primary-assist-action:focus-visible,
  .assist-field input:focus-visible,
  .assist-field textarea:focus-visible,
  .assist-result a:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent-warm, #8c6a3b) 72%, white 28%);
    outline-offset: 3px;
  }
</style>

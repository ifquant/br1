<script lang="ts">
  import type {
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
    getReaderTranslationProviderDisplayLabel,
    normalizeAssistanceTerm,
    normalizeAssistanceText
  } from '$lib/reader';

  const TRANSLATION_PROVIDER_OPTIONS: ReaderTranslationProvider[] = ['deepl', 'yandex'];

  export let preview: ReaderPreviewState;
  export let notesState: ReaderSidebarNotesState;
  export let assistance: ReaderAssistanceState = createEmptyReaderAssistanceState();
  export let translationProviderStatuses: ReaderTranslationProviderStatus[] = [];
  export let callbacks: Pick<ReaderSidebarCallbacks, 'onRequestLookup' | 'onRequestTranslation'> = {
    onRequestLookup: null,
    onRequestTranslation: null
  };
  export let title = 'AI 阅读助手';
  export let summary =
    '把词典、维基百科和翻译请求收成一个工作台，而不是继续挤在 sidebar result panel 里。';

  let assistLookupTerm = '';
  let assistLookupTermSeededForBookKey = '';
  let assistMode: 'lookup' | 'translation' = 'lookup';
  let assistLookupProvider: ReaderLookupProvider = 'wikipedia';
  let assistTranslationProvider: ReaderTranslationProvider = 'deepl';
  let assistTranslationText = '';
  let assistTranslationTargetLanguage = 'zh';

  $: bookKey = `${preview.title}::${preview.chapterLabel}`;
  $: activeTranslationProviderStatus =
    translationProviderStatuses.find((status) => status.provider === assistTranslationProvider) || null;
  $: activeAssistanceRequest = assistance.activeRequest;
  $: assistanceResultProvider =
    assistance.result?.provider ||
    (activeAssistanceRequest?.kind === 'translation'
      ? activeAssistanceRequest.provider
      : assistLookupProvider);
  $: if (assistLookupTermSeededForBookKey !== bookKey) {
    assistLookupTerm = normalizeAssistanceTerm(notesState.selection?.text || preview.chapterLabel);
    assistTranslationText = normalizeAssistanceText(
      notesState.selection?.text || preview.chapterLabel || preview.title
    );
    assistMode = 'lookup';
    assistLookupProvider = 'wikipedia';
    assistTranslationProvider = 'deepl';
    assistTranslationTargetLanguage = 'zh';
    assistLookupTermSeededForBookKey = bookKey;
  }

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
</script>

<section class="assist-workspace" aria-label={title}>
  <div class="assist-summary">
    <strong>{title}</strong>
    <span>{summary}</span>
  </div>

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

  <div class="assist-result" aria-label="查找结果">
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
    {#if assistance.status === 'loading'}
      <strong>正在查询</strong>
      <span>
        {#if activeAssistanceRequest?.kind === 'translation'}
          正在向{getReaderTranslationProviderDisplayLabel(activeAssistanceRequest.provider)}请求翻译结果。
        {:else}
          正在向{assistLookupProvider === 'dictionary' ? '词典' : '维基百科'}请求结果。
        {/if}
      </span>
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
      <span>
        {assistMode === 'translation'
          ? '输入文本后可以直接发起翻译；如果没有选区，会回退到当前章节标题。'
          : `输入词条后可以直接发起${assistLookupProvider === 'dictionary' ? '词典' : '维基百科'}查找。`}
      </span>
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

  .assist-translation-status strong,
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

<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type {
    CatalogImportExecutionResult,
    CatalogConnectorKind,
    CatalogConnectorStatus,
    CatalogImportIntent,
    CatalogImportIntentRequest,
    CatalogPage,
    CatalogSource,
    CatalogSourceAuthKind,
    CatalogSourceSettingsInput
  } from '$lib/services/catalogs';
  import {
    createUnavailableCatalogConnectorStatus,
    getCatalogConnectorStatus,
    importCatalogEntryToLibrary,
    listCatalogSources,
    browseCatalogSource,
    searchCatalogSource,
    requestCatalogImportIntent,
    removeCatalogSourceSettings,
    saveCatalogSourceSettings
  } from '$lib/services/catalogs';

  const createEmptyCatalogDraft = (): CatalogSourceSettingsInput => ({
    kind: 'opds',
    title: '',
    baseUrl: '',
    description: '',
    authKind: 'none',
    authLabel: '',
    authConfigured: false,
    authRequired: false,
    tags: []
  });

  let connectorStatus: CatalogConnectorStatus = createUnavailableCatalogConnectorStatus();
  let sources: CatalogSource[] = [];
  let selectedSourceId = '';
  let currentPage: CatalogPage | null = null;
  let currentQuery = '';
  let currentImportIntent: CatalogImportIntent | null = null;
  let currentImportRequest: CatalogImportIntentRequest | null = null;
  let currentImportResult: CatalogImportExecutionResult | null = null;
  let pageBusy = false;
  let saveBusy = false;
  let removeBusy = false;
  let importBusy = false;
  let notice = '';
  let draft: CatalogSourceSettingsInput = createEmptyCatalogDraft();

  $: selectedSource = sources.find((source) => source.id === selectedSourceId) ?? null;
  $: selectedSourceRemovable =
    !!selectedSource &&
    !selectedSource.id.startsWith('fixture-') &&
    !selectedSource.id.startsWith('catalog-settings-error');
  $: sourceTagsText = draft.tags.join(', ');
  $: pageEntries = currentPage?.entries ?? [];
  $: canSearchSelectedSource =
    !!selectedSource &&
    !!currentPage?.search &&
    selectedSource.connectivity.status !== 'invalid' &&
    selectedSource.connectivity.status !== 'offline';
  $: selectedSourceSummary = selectedSource
    ? `${selectedSource.kind === 'calibreOpds' ? 'Calibre OPDS' : 'OPDS'} · ${selectedSource.connectivity.label}`
    : '先选择一个书源。';
  $: browserSummary = currentPage?.error
    ? currentPage.error.message
    : currentPage
      ? `${pageEntries.length} 条结果 · 当前浏览是安全快照，不是 live 网络抓取。`
      : '选择书源后会在这里显示目录页面、搜索结果和导入意图。';
  $: browserStateHint = currentPage?.authChallenge
    ? '先在桌面端配置凭据，再回到这里执行浏览和导入。'
    : currentPage?.error?.code === 'unsupported'
      ? '这个书源的元数据可以保存，但当前版本不会对 live URL 发起抓取或导入。'
      : currentPage?.error?.code === 'invalidSource'
        ? '当前书源配置无效，请回到左侧设置面板修正书源元数据。'
        : currentPage?.error
          ? '当前书源返回了产品级错误状态；修正桌面端配置后可以重新浏览。'
          : '';

  const refreshSources = async (preferredSourceId?: string) => {
    sources = await listCatalogSources();
    if (preferredSourceId && sources.some((source) => source.id === preferredSourceId)) {
      selectedSourceId = preferredSourceId;
    } else if (!selectedSourceId || !sources.some((source) => source.id === selectedSourceId)) {
      selectedSourceId = sources[0]?.id ?? '';
    }
    syncDraftFromSelectedSource();
  };

  const syncDraftFromSelectedSource = () => {
    if (!selectedSource) {
      draft = createEmptyCatalogDraft();
      return;
    }

    draft = {
      id: selectedSource.id.startsWith('fixture-') ? undefined : selectedSource.id,
      kind: selectedSource.kind,
      title: selectedSource.title,
      baseUrl: selectedSource.baseUrl,
      description: selectedSource.description ?? '',
      authKind: selectedSource.auth.kind,
      authLabel: selectedSource.auth.label,
      authConfigured: selectedSource.auth.configured,
      authRequired: selectedSource.auth.required,
      tags: [...selectedSource.tags]
    };
  };

  const browseSelectedSource = async (pageHref?: string) => {
    if (!selectedSourceId) return;
    pageBusy = true;
    currentImportIntent = null;
    currentImportRequest = null;
    currentImportResult = null;
    try {
      currentPage = await browseCatalogSource({
        sourceId: selectedSourceId,
        pageHref
      });
    } finally {
      pageBusy = false;
    }
  };

  const searchSelectedCatalog = async () => {
    if (!selectedSourceId) return;
    if (!currentQuery.trim()) {
      await browseSelectedSource(currentPage?.pagination.selfHref);
      return;
    }
    pageBusy = true;
    currentImportIntent = null;
    currentImportRequest = null;
    currentImportResult = null;
    try {
      currentPage = await searchCatalogSource({
        sourceId: selectedSourceId,
        query: currentQuery,
        pageHref: currentPage?.pagination.selfHref
      });
    } finally {
      pageBusy = false;
    }
  };

  const prepareImportIntent = async (entryId: string) => {
    if (!selectedSourceId) return;
    currentImportRequest = {
      sourceId: selectedSourceId,
      entryId,
      pageHref: currentPage?.pagination.selfHref
    };
    currentImportResult = null;
    currentImportIntent = await requestCatalogImportIntent(currentImportRequest);
  };

  const entryImportableCount = (entry: CatalogPage['entries'][number]) =>
    entry.links.filter((link) => link.supportsImport).length;

  const entryImportabilityLabel = (entry: CatalogPage['entries'][number]) => {
    const importableLinks = entry.links.filter((link) => link.supportsImport);
    if (importableLinks.length === 0) {
      return '只有浏览链接';
    }

    const [firstLink] = importableLinks;
    const mediaType = firstLink.mediaType?.trim() || '';
    if (mediaType.includes('epub')) return '可导入 EPUB';
    if (mediaType.includes('pdf')) return '可导入 PDF';
    return '可导入条目';
  };

  const importCurrentCatalogEntry = async () => {
    if (!currentImportRequest || currentImportIntent?.status !== 'ready') return;
    importBusy = true;
    notice = '';
    try {
      const result = await importCatalogEntryToLibrary(currentImportRequest);
      currentImportResult = result;
      notice = result.message;
    } finally {
      importBusy = false;
    }
  };

  const saveDraft = async () => {
    saveBusy = true;
    notice = '';
    try {
      const response = await saveCatalogSourceSettings(draft);
      if (response.error) {
        notice = response.error.message;
        return;
      }

      const preferredId = response.source?.id || draft.id;
      await refreshSources(preferredId);
      if (preferredId) {
        await browseSelectedSource();
      }
      notice = preferredId ? '书源设置已保存。' : '书源设置已更新。';
    } finally {
      saveBusy = false;
    }
  };

  const removeSelectedSource = async () => {
    if (!selectedSourceRemovable || !selectedSource) return;
    removeBusy = true;
    notice = '';
    try {
      const response = await removeCatalogSourceSettings(selectedSource.id);
      if (response.error) {
        notice = response.error.message;
        return;
      }
      currentPage = null;
      currentImportIntent = null;
      currentImportRequest = null;
      currentImportResult = null;
      await refreshSources();
      if (selectedSourceId) {
        await browseSelectedSource();
      }
      notice = '书源设置已移除。';
    } finally {
      removeBusy = false;
    }
  };

  const startNewSourceDraft = () => {
    draft = createEmptyCatalogDraft();
    notice = '正在创建新的用户书源；当前表单只保存元数据，不保存凭据。';
  };

  const selectSource = async (sourceId: string) => {
    if (sourceId === selectedSourceId) return;
    selectedSourceId = sourceId;
    syncDraftFromSelectedSource();
    currentQuery = '';
    currentImportIntent = null;
    currentImportRequest = null;
    currentImportResult = null;
    await browseSelectedSource();
  };

  onMount(() => {
    void (async () => {
      connectorStatus = await getCatalogConnectorStatus();
      await refreshSources();
      if (selectedSourceId) {
        await browseSelectedSource();
      }
    })();
  });
</script>

<svelte:head>
  <title>书源目录 | br1</title>
</svelte:head>

<section class="catalog-page">
  <header class="catalog-hero">
    <div class="catalog-copy">
      <span class="catalog-kicker">Catalogs</span>
      <h1>书源目录</h1>
      <p>
        把现有 OPDS / Calibre substrate 收成真正的产品面。当前支持安全快照浏览、搜索，以及桌面侧受管导入，不把 renderer 变成任意网络代理。
      </p>
    </div>
    <div class="catalog-hero-actions">
      <a class="catalog-link" href="/library">回到书库</a>
      <button type="button" class="catalog-link secondary" on:click={() => goto('/library')}>
        返回书库工作台
      </button>
    </div>
  </header>

  <section class="connector-status" aria-label="书源连接器状态">
    <strong>连接器状态</strong>
    <span>{connectorStatus.message}</span>
      <small>
      {#if connectorStatus.status === 'available'}
        当前能力：{connectorStatus.capabilities.join(' / ')} · 搜索：{connectorStatus.supportsSearch ? '支持' : '不支持'} · 导入：{connectorStatus.supportsImportIntent ? '支持' : '不支持'}
      {:else}
        当前环境不会直接发起 live catalog 抓取；桌面端负责所有安全 browse/search/import 调用。
      {/if}
    </small>
  </section>

  {#if notice}
    <section class="catalog-notice" aria-live="polite">
      <span>{notice}</span>
      <button type="button" on:click={() => (notice = '')}>知道了</button>
    </section>
  {/if}

  <div class="catalog-grid">
    <aside class="catalog-sidebar">
      <section class="catalog-panel">
        <div class="panel-head">
          <strong>已保存书源</strong>
          <button type="button" on:click={startNewSourceDraft}>新增书源</button>
        </div>
        <div class="source-list" aria-label="书源列表">
          {#if sources.length}
            {#each sources as source}
              <button
                type="button"
                class:selected={source.id === selectedSourceId}
                class="source-card"
                on:click={() => void selectSource(source.id)}
              >
                <strong>{source.title}</strong>
                <span>{source.kind === 'calibreOpds' ? 'Calibre OPDS' : 'OPDS'}</span>
                <small>{source.connectivity.label}</small>
                <div class="source-meta">
                  <span>{source.auth.label}</span>
                  <span>{source.tags.join(' · ') || '无标签'}</span>
                </div>
              </button>
            {/each}
          {:else}
            <p class="empty-copy">当前没有可显示的书源。</p>
          {/if}
        </div>
      </section>

      <section class="catalog-panel" aria-label="书源设置">
        <div class="panel-head">
          <strong>书源设置</strong>
          <span>{selectedSourceSummary}</span>
        </div>
        <label class="field">
          <span>连接器</span>
          <select bind:value={draft.kind}>
            <option value="opds">OPDS</option>
            <option value="calibreOpds">Calibre OPDS</option>
          </select>
        </label>
        <label class="field">
          <span>标题</span>
          <input type="text" bind:value={draft.title} placeholder="例如：我的 OPDS 书库" />
        </label>
        <label class="field">
          <span>Base URL</span>
          <input type="text" bind:value={draft.baseUrl} placeholder="例如：fixture://opds/root.xml" />
        </label>
        <label class="field">
          <span>说明</span>
          <textarea rows="3" bind:value={draft.description} placeholder="说明这个书源的用途和访问边界"></textarea>
        </label>
        <label class="field">
          <span>认证方式</span>
          <select bind:value={draft.authKind}>
            <option value="none">无认证</option>
            <option value="basic">Basic</option>
            <option value="bearer">Bearer</option>
            <option value="cookie">Cookie</option>
          </select>
        </label>
        <label class="field">
          <span>认证标签</span>
          <input type="text" bind:value={draft.authLabel} placeholder="只展示状态，不保存凭据" />
        </label>
        <label class="field">
          <span>标签</span>
          <input
            type="text"
            value={sourceTagsText}
            placeholder="用逗号分隔，例如：fixture, opds"
            on:input={(event) => {
              draft.tags = (event.currentTarget as HTMLInputElement).value
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean);
            }}
          />
        </label>
        <label class="checkbox-field">
          <input type="checkbox" bind:checked={draft.authRequired} />
          <span>浏览前需要认证</span>
        </label>
        <label class="checkbox-field">
          <input type="checkbox" bind:checked={draft.authConfigured} />
          <span>凭据已在桌面端配置</span>
        </label>
        <div class="field-actions">
          <button type="button" class="primary" disabled={saveBusy} on:click={() => void saveDraft()}>
            {saveBusy ? '保存中…' : '保存书源设置'}
          </button>
          <button type="button" disabled={!selectedSourceRemovable || removeBusy} on:click={() => void removeSelectedSource()}>
            {removeBusy ? '移除中…' : '移除书源设置'}
          </button>
          <button type="button" on:click={syncDraftFromSelectedSource}>回到当前书源</button>
        </div>
      </section>
    </aside>

    <section class="catalog-browser">
      <section class="catalog-panel browser-panel">
        <div class="panel-head">
          <strong>目录浏览</strong>
          <span>{browserSummary}</span>
        </div>

        <div class="browser-actions">
          <button type="button" disabled={!selectedSourceId || pageBusy} on:click={() => void browseSelectedSource()}>
            {pageBusy ? '加载中…' : '浏览根页面'}
          </button>
          <input
            type="search"
            bind:value={currentQuery}
            placeholder="搜索当前目录快照"
            on:keydown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void searchSelectedCatalog();
              }
            }}
          />
          <button type="button" disabled={!selectedSourceId || !currentQuery.trim() || pageBusy} on:click={() => void searchSelectedCatalog()}>
            搜索
          </button>
          <button
            type="button"
            disabled={!selectedSourceId || !currentPage?.pagination.previousHref || pageBusy}
            on:click={() => void browseSelectedSource(currentPage?.pagination.previousHref)}
          >
            上一页
          </button>
          <button
            type="button"
            disabled={!selectedSourceId || !currentPage?.pagination.nextHref || pageBusy}
            on:click={() => void browseSelectedSource(currentPage?.pagination.nextHref)}
          >
            下一页
          </button>
        </div>

        {#if currentPage?.authChallenge}
          <div class="catalog-state auth">
            <strong>当前书源需要认证</strong>
            <span>{currentPage.authChallenge.message}</span>
          </div>
        {/if}

        {#if currentPage?.error}
          <div class="catalog-state error">
            <strong>{currentPage.error.code}</strong>
            <span>{currentPage.error.message}</span>
            {#if browserStateHint}
              <small>{browserStateHint}</small>
            {/if}
          </div>
        {/if}

        {#if currentPage}
          <div class="page-meta">
            <span>页面：{currentPage.pagination.title || currentPage.pagination.pageId}</span>
            <span>条目：{pageEntries.length}</span>
            {#if currentPage.search}
              <span>搜索模板：{currentPage.search.queryParameter}</span>
            {/if}
          </div>
        {/if}

        <div class="entry-list" aria-label="书源目录结果">
          {#if pageEntries.length}
            {#each pageEntries as entry}
              <article class="entry-card">
                <div class="entry-copy">
                  <strong>{entry.title}</strong>
                  <span>{entry.authors.map((author) => author.name).join(' · ') || '作者未知'}</span>
                  {#if entry.summary}
                    <p>{entry.summary}</p>
                  {/if}
                  <div class="entry-meta">
                    <span>{entry.availability}</span>
                    {#if entry.language}<span>{entry.language}</span>{/if}
                    {#if entry.categories.length}<span>{entry.categories.join(' · ')}</span>{/if}
                    <span>{entryImportabilityLabel(entry)}</span>
                  </div>
                </div>
                <div class="entry-actions">
                  <button
                    type="button"
                    disabled={entryImportableCount(entry) === 0}
                    on:click={() => void prepareImportIntent(entry.id)}
                  >
                    {entryImportableCount(entry) > 0 ? '生成导入意图' : '当前不可导入'}
                  </button>
                  {#if entry.links.length}
                    <small>{entryImportableCount(entry)} 个 acquisition 链接</small>
                  {/if}
                </div>
              </article>
            {/each}
          {:else}
            <p class="empty-copy">
              {#if currentPage?.error}
                当前书源没有可浏览结果。
              {:else if selectedSourceId}
                当前目录没有条目；可以切换书源、翻页，或者搜索当前安全快照。
              {:else}
                先选择一个书源。
              {/if}
            </p>
          {/if}
        </div>
      </section>

      <section class="catalog-panel" aria-label="导入意图">
        <div class="panel-head">
          <strong>导入意图</strong>
          <span>导入动作始终在桌面端完成，renderer 不直接下载 acquisition 链接。</span>
        </div>
        {#if currentImportIntent}
          <div class:blocked={currentImportIntent.status === 'blocked'} class="intent-card">
            <strong>{currentImportIntent.title}</strong>
            <span>{currentImportIntent.status === 'ready' ? 'ready' : 'blocked'}</span>
            {#if currentImportIntent.status === 'ready'}
              <p>文件提示：{currentImportIntent.fileNameHint || '未提供'}</p>
              <p>媒体类型：{currentImportIntent.mediaType || '未知'}</p>
              <p>acquisition: {currentImportIntent.acquisitionHref}</p>
              <div class="field-actions">
                <button type="button" class="primary" disabled={importBusy} on:click={() => void importCurrentCatalogEntry()}>
                  {importBusy ? '导入中…' : '导入到书库'}
                </button>
                <button
                  type="button"
                  disabled={!currentImportRequest}
                  on:click={() => currentImportRequest && void prepareImportIntent(currentImportRequest.entryId)}
                >
                  重新生成导入意图
                </button>
              </div>
            {:else}
              <p>{currentImportIntent.blockedReason}</p>
            {/if}
          </div>
        {:else}
          <p class="empty-copy">先从目录结果里选择一本书，生成导入意图。</p>
        {/if}

        {#if currentImportResult}
          <div class:blocked={currentImportResult.status === 'blocked'} class="intent-card import-result">
            <strong>{currentImportResult.status === 'imported' ? '导入结果' : '导入已阻止'}</strong>
            <span>{currentImportResult.message}</span>
            {#if currentImportResult.status === 'imported'}
              <p>已导入 {currentImportResult.records.length} 本图书到受管书库。</p>
              <div class="field-actions">
                <button type="button" class="primary" on:click={() => goto('/library')}>
                  打开书库
                </button>
                <button
                  type="button"
                  disabled={!currentImportResult?.firstReaderHref}
                  on:click={() =>
                    currentImportResult?.firstReaderHref &&
                    goto(currentImportResult.firstReaderHref)}
                >
                  直接打开首本图书
                </button>
              </div>
            {/if}
          </div>
        {/if}
      </section>
    </section>
  </div>
</section>

<style>
  .catalog-page {
    display: grid;
    gap: 18px;
    padding: 20px 24px 28px;
  }

  .catalog-hero,
  .connector-status,
  .catalog-notice,
  .catalog-panel {
    border: 1px solid var(--line-soft);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 88%, white 12%);
    box-shadow: 0 14px 32px rgba(42, 30, 15, 0.05);
  }

  .catalog-hero,
  .connector-status,
  .catalog-notice,
  .catalog-panel {
    padding: 16px 18px;
  }

  .catalog-hero {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
  }

  .catalog-copy,
  .connector-status,
  .panel-head,
  .entry-copy,
  .intent-card,
  .catalog-state {
    display: grid;
    gap: 6px;
  }

  .catalog-kicker {
    color: var(--text-muted);
    font: 700 11px/1 var(--font-chrome);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1,
  p {
    margin: 0;
  }

  .catalog-hero-actions,
  .field-actions,
  .browser-actions,
  .entry-actions,
  .source-meta,
  .page-meta,
  .catalog-notice {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  .catalog-link,
  button,
  select,
  input,
  textarea {
    font: inherit;
  }

  .catalog-link,
  button {
    appearance: none;
    border: 1px solid var(--line-soft);
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
    color: var(--text-primary);
    text-decoration: none;
    padding: 9px 12px;
    cursor: pointer;
  }

  .catalog-link.secondary,
  button.secondary {
    background: transparent;
  }

  .catalog-grid {
    display: grid;
    grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);
    gap: 18px;
  }

  .catalog-sidebar,
  .catalog-browser,
  .source-list,
  .field,
  .entry-list {
    display: grid;
    gap: 12px;
  }

  .field span,
  .checkbox-field span,
  .panel-head span,
  .entry-copy span,
  .entry-copy p,
  .entry-meta span,
  .connector-status span,
  .connector-status small,
  .catalog-state span,
  .intent-card p,
  .intent-card span,
  .empty-copy,
  small {
    color: var(--text-secondary);
    line-height: 1.55;
  }

  .field input,
  .field select,
  .field textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--line-soft);
    background: color-mix(in srgb, var(--surface-panel) 92%, white 8%);
    color: var(--text-primary);
    padding: 10px 12px;
  }

  .checkbox-field {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .source-card,
  .entry-card,
  .intent-card,
  .catalog-state,
  .page-meta {
    display: grid;
    gap: 6px;
    border: 1px solid var(--line-soft);
    background: color-mix(in srgb, var(--surface-panel) 90%, white 10%);
    padding: 12px;
    text-align: left;
  }

  .source-card.selected {
    border-color: color-mix(in srgb, var(--accent-reading) 48%, white 52%);
    background: color-mix(in srgb, var(--surface-panel) 82%, white 18%);
  }

  .entry-card {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 14px;
  }

  .intent-card.blocked,
  .catalog-state.error {
    border-color: rgba(139, 59, 47, 0.22);
    background: rgba(139, 59, 47, 0.08);
  }

  .catalog-state.auth {
    border-color: rgba(142, 95, 42, 0.22);
    background: rgba(142, 95, 42, 0.08);
  }

  .primary {
    background: color-mix(in srgb, var(--accent-reading) 18%, var(--surface-panel) 82%);
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 980px) {
    .catalog-grid {
      grid-template-columns: 1fr;
    }

    .catalog-hero {
      grid-template-columns: 1fr;
      display: grid;
    }

    .entry-card {
      grid-template-columns: 1fr;
    }
  }
</style>

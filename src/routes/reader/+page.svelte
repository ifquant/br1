<script lang="ts">
  import { page } from '$app/stores';
  import { ReaderSidebar, ReaderStage } from '$lib/components';
  import type { ReaderControlRequest, ReaderPreviewState, ReaderTocItem } from '$lib/reader';
  import { startCurrentWindowDrag } from '$lib/services';

  let toc: ReaderTocItem[] = [];
  let activeHref = '';
  let controlRequest: ReaderControlRequest | null = null;
  let controlNonce = 0;
  let lastAutoKey = '';
  let sidebarVisible = true;

  $: source = $page.url.searchParams.get('source') ?? '';
  $: sourceUrl = $page.url.searchParams.get('url') ?? '';
  $: sourcePath = $page.url.searchParams.get('path') ?? '';
  $: sourceLabel = $page.url.searchParams.get('label') ?? '';
  $: isWindowMode = $page.url.searchParams.get('mode') === 'window';
  $: autoOpenSample = source === 'sample';
  $: autoOpenPicker = source === 'picker';
  $: autoOpenAsset = source === 'asset' && !!sourceUrl;
  $: autoOpenLibraryFile = source === 'library-file' && !!sourcePath;

  $: autoOpenKey = autoOpenLibraryFile
    ? `${source}:${sourcePath}:${sourceLabel}`
    : autoOpenAsset
      ? `${source}:${sourceUrl}:${sourceLabel}`
      : source;

  $: if (autoOpenSample && autoOpenKey !== lastAutoKey) {
    controlNonce += 1;
    controlRequest = { type: 'sample', nonce: controlNonce };
    lastAutoKey = autoOpenKey;
  }

  $: if (autoOpenAsset && autoOpenKey !== lastAutoKey) {
    controlNonce += 1;
    controlRequest = {
      type: 'asset',
      nonce: controlNonce,
      url: sourceUrl,
      label: sourceLabel || 'imported book'
    };
    lastAutoKey = autoOpenKey;
  }

  $: if (autoOpenLibraryFile && autoOpenKey !== lastAutoKey) {
    controlNonce += 1;
    controlRequest = {
      type: 'library-file',
      nonce: controlNonce,
      path: sourcePath,
      label: sourceLabel || 'imported book'
    };
    lastAutoKey = autoOpenKey;
  }

  $: if (!autoOpenSample && !autoOpenAsset && !autoOpenLibraryFile) {
    lastAutoKey = '';
  }

  const issueHrefControl = (href: string) => {
    controlNonce += 1;
    controlRequest = { type: 'href', href, nonce: controlNonce };
  };

  const toggleSidebar = () => {
    sidebarVisible = !sidebarVisible;
  };
</script>

<section class:window-mode={isWindowMode} class="reader-shell">
  {#if isWindowMode}
    <header
      class="window-chrome"
      role="banner"
      data-tauri-drag-region
      aria-label="reader window chrome"
    >
      <div
        role="presentation"
        class="window-drag-strip"
        data-tauri-drag-region
        on:mousedown={startCurrentWindowDrag}
      ></div>
      <div class="traffic-light-gutter" aria-hidden="true"></div>
      <div role="presentation" class="window-title" data-tauri-drag-region on:mousedown={startCurrentWindowDrag}>
        <span>Bridge Reader</span>
        <small>Reading window</small>
      </div>
      <div class="window-actions" aria-hidden="true">
        <span></span>
        <span></span>
      </div>
    </header>
  {/if}

  <div class:window-mode={isWindowMode} class:sidebar-hidden={isWindowMode && !sidebarVisible} class="workspace">
    {#if !isWindowMode || sidebarVisible}
      <ReaderSidebar
        {toc}
        {activeHref}
        {isWindowMode}
        onNavigate={issueHrefControl}
        onClose={isWindowMode ? toggleSidebar : null}
      />
    {/if}
    <ReaderStage
      {controlRequest}
      {autoOpenSample}
      {autoOpenPicker}
      {isWindowMode}
      {sidebarVisible}
      on:togglesidebar={toggleSidebar}
      on:controlrequest={({ detail }: CustomEvent<ReaderControlRequest>) => {
        controlRequest = detail;
      }}
      on:readerstate={({ detail }: CustomEvent<ReaderPreviewState>) => {
        activeHref = detail.chapterHref;
      }}
      on:tocchange={({ detail }: CustomEvent<ReaderTocItem[]>) => {
        toc = detail;
      }}
    />

    {#if !isWindowMode}
      <aside class="bridge-placeholder" aria-label="bridge panel placeholder">
        <header class="bridge-head">
          <span class="label">Bridge</span>
          <button type="button" aria-label="bridge options">⋯</button>
        </header>

        <div class="bridge-card">
          <strong>解释这段</strong>
          <p>这里保留 `br1` 的桥梁层挂载位。先把它作为右侧 contextual surface 摆正，不提前接 AI 行为。</p>
        </div>

        <div class="bridge-card secondary">
          <strong>为什么重要</strong>
          <p>后续 bridge 可以从当前位置、章节关系和高亮沉淀里给出解释，而不是挤进正文主舞台。</p>
        </div>
      </aside>
    {/if}
  </div>
</section>

<style>
  .reader-shell {
    min-height: 100%;
    padding: 0;
  }

  .reader-shell.window-mode {
    min-height: 100vh;
    padding-top: 0;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-page) 95%, white 5%);
  }

  .window-chrome {
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr) 92px;
    align-items: center;
    position: relative;
    min-height: 26px;
    padding: 10px 18px 0;
    background: transparent;
    user-select: none;
  }

  .window-drag-strip {
    position: absolute;
    inset: 0;
  }

  .traffic-light-gutter {
    position: relative;
    z-index: 1;
    min-height: 16px;
  }

  .window-title {
    display: grid;
    justify-items: center;
    gap: 0;
    min-width: 0;
    position: relative;
    z-index: 1;
    text-align: center;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    opacity: 0.72;
  }

  .window-title span,
  .window-title small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .window-title span {
    color: color-mix(in srgb, var(--text-primary) 84%, white 16%);
    font-size: 10px;
    line-height: 1.2;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .window-title small {
    color: var(--text-muted);
    font-size: 9px;
    letter-spacing: 0.04em;
    text-transform: none;
  }

  .window-actions {
    display: inline-flex;
    justify-content: end;
    gap: 8px;
    min-height: 16px;
    position: relative;
    z-index: 1;
  }

  .window-actions span {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 80%, white 20%);
    opacity: 0.65;
  }

  .workspace {
    display: grid;
    grid-template-columns: 248px minmax(0, 1fr) 276px;
    gap: 14px;
    min-height: calc(100vh - 32px);
  }

  .workspace.window-mode {
    gap: 0;
    min-height: calc(100vh - 26px);
    grid-template-columns: minmax(208px, 224px) minmax(0, 1fr);
  }

  .workspace.window-mode.sidebar-hidden {
    grid-template-columns: minmax(0, 1fr);
  }

  .bridge-placeholder {
    display: grid;
    align-content: start;
    gap: 10px;
    padding: 12px;
    border: 1px solid rgba(64, 47, 24, 0.1);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 92%, white 8%);
  }

  .label {
    color: var(--text-muted);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .bridge-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
    padding: 2px 2px 8px;
  }

  .bridge-head button {
    width: 26px;
    height: 26px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    font: inherit;
  }

  .bridge-card {
    display: grid;
    gap: 6px;
    padding: 14px 14px 12px;
    border: 1px solid rgba(64, 47, 24, 0.08);
    background: color-mix(in srgb, var(--surface-reader) 76%, white 24%);
  }

  .bridge-card.secondary {
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
  }

  .bridge-card strong {
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 13px;
    line-height: 1.3;
  }

  .bridge-card p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.65;
    font-size: 13px;
  }

  @media (max-width: 1120px) {
    .workspace {
      grid-template-columns: 236px minmax(0, 1fr);
    }

    .workspace.window-mode {
      grid-template-columns: 208px minmax(0, 1fr);
    }

    .bridge-placeholder {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 960px) {
    .workspace {
      grid-template-columns: 1fr;
    }

    .window-chrome {
      grid-template-columns: 56px minmax(0, 1fr) 56px;
      padding-inline: 10px;
    }
  }
</style>

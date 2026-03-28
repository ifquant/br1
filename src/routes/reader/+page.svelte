<script lang="ts">
  import { page } from '$app/stores';
  import { ReaderSidebar, ReaderWorkspace } from '$lib/components';
  import type { ReaderControlRequest, ReaderPreviewState, ReaderTocItem } from '$lib/reader';

  let toc: ReaderTocItem[] = [];
  let activeHref = '';
  let controlRequest: ReaderControlRequest | null = null;
  let controlNonce = 0;
  let lastAutoSource = '';

  $: source = $page.url.searchParams.get('source') ?? '';
  $: isWindowMode = $page.url.searchParams.get('mode') === 'window';
  $: autoOpenSample = source === 'sample';
  $: autoOpenPicker = source === 'picker';

  $: if (autoOpenSample && source !== lastAutoSource) {
    controlNonce += 1;
    controlRequest = { type: 'sample', nonce: controlNonce };
    lastAutoSource = source;
  }

  $: if (!autoOpenSample) {
    lastAutoSource = '';
  }

  const issueHrefControl = (href: string) => {
    controlNonce += 1;
    controlRequest = { type: 'href', href, nonce: controlNonce };
  };
</script>

<section class:window-mode={isWindowMode} class="reader-shell">
  {#if isWindowMode}
    <header class="window-chrome" data-tauri-drag-region aria-label="reader window chrome">
      <div class="traffic-light-gutter" aria-hidden="true"></div>
      <div class="window-title" data-tauri-drag-region>
        <span>Bridge Reader</span>
        <small>Reading window</small>
      </div>
      <div class="window-actions" aria-hidden="true">
        <span></span>
        <span></span>
      </div>
    </header>
  {/if}

  <div class:window-mode={isWindowMode} class="workspace">
    <ReaderSidebar {toc} {activeHref} onNavigate={issueHrefControl} />
    <ReaderWorkspace
      {controlRequest}
      {autoOpenSample}
      {autoOpenPicker}
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

    <aside class:window-mode={isWindowMode} class="bridge-placeholder" aria-label="bridge panel placeholder">
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
      linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-page) 95%, white 5%);
  }

  .window-chrome {
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr) 72px;
    align-items: center;
    min-height: 32px;
    padding: 8px 14px 6px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-page) 96%, white 4%);
    border-bottom: 1px solid rgba(64, 47, 24, 0.06);
    user-select: none;
  }

  .traffic-light-gutter {
    min-height: 14px;
  }

  .window-title {
    display: grid;
    justify-items: center;
    gap: 1px;
    min-width: 0;
    text-align: center;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .window-title span,
  .window-title small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .window-title span {
    color: color-mix(in srgb, var(--text-primary) 84%, white 16%);
    font-size: 11px;
    line-height: 1.2;
    letter-spacing: 0.02em;
  }

  .window-title small {
    color: var(--text-muted);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .window-actions {
    display: inline-flex;
    justify-content: end;
    gap: 6px;
  }

  .window-actions span {
    width: 18px;
    height: 18px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
    box-shadow: inset 0 0 0 1px rgba(64, 47, 24, 0.06);
  }

  .workspace {
    display: grid;
    grid-template-columns: 248px minmax(0, 1fr) 276px;
    gap: 14px;
    min-height: calc(100vh - 32px);
  }

  .workspace.window-mode {
    gap: 0;
    min-height: calc(100vh - 46px);
    grid-template-columns: 236px minmax(0, 1fr) 244px;
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

  .bridge-placeholder.window-mode {
    border-top: 0;
    border-right: 0;
    border-bottom: 0;
    padding-top: 14px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 95%, white 5%);
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
      grid-template-columns: 220px minmax(0, 1fr);
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

<script lang="ts">
  import ReaderAssistWorkspace from './ReaderAssistWorkspace.svelte';
  import type {
    ReaderAssistanceState,
    ReaderPreviewState,
    ReaderSidebarCallbacks,
    ReaderSidebarNotesState,
    ReaderTranslationProviderStatus
  } from '$lib/reader';
  import { createEmptyReaderAssistanceState } from '$lib/reader';

  export let visible = false;
  export let pinned = false;
  export let activeTab: 'notes' | 'highlights' | 'assistant' = 'notes';
  export let preview: ReaderPreviewState;
  export let notesState: ReaderSidebarNotesState;
  export let supportsTextAnnotations = false;
  export let textAnnotationSupportMessage = '';
  export let assistance: ReaderAssistanceState = createEmptyReaderAssistanceState();
  export let translationProviderStatuses: ReaderTranslationProviderStatus[] = [];
  export let callbacks: Pick<
    ReaderSidebarCallbacks,
    | 'onAddHighlight'
    | 'onAddNote'
    | 'onOpenNote'
    | 'onEditNote'
    | 'onDeleteNote'
    | 'onRequestLookup'
    | 'onRequestTranslation'
  > = {
    onAddHighlight: null,
    onAddNote: null,
    onOpenNote: null,
    onEditNote: null,
    onDeleteNote: null,
    onRequestLookup: null,
    onRequestTranslation: null
  };
  export let onClose: (() => void) | null = null;
  export let onTogglePin: (() => void) | null = null;
  export let onTabChange: ((tab: 'notes' | 'highlights' | 'assistant') => void) | null = null;

  $: noteEntries = notesState.notes.filter((note) => note.kind !== 'highlight');
  $: highlightEntries = notesState.notes.filter((note) => note.kind === 'highlight');
  $: selectionText = notesState.selection?.text.trim() || '';

  const formatTimestamp = (value: number) => {
    const date = new Date(value);
    return `${date.getMonth() + 1}/${date.getDate()} ${date
      .getHours()
      .toString()
      .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const setTab = (tab: 'notes' | 'highlights' | 'assistant') => {
    if (tab === activeTab) return;
    onTabChange?.(tab);
  };
</script>

{#if visible}
  <aside class="reader-notebook" aria-label="笔记工作台">
    <header class="notebook-head">
      <div class="notebook-copy">
        <span class="notebook-kicker">Reader Workspace</span>
        <strong>笔记工作台</strong>
        <span>{preview.title} · {preview.chapterLabel}</span>
      </div>
      <div class="notebook-actions">
        <button
          type="button"
          class:pinned={pinned}
          class="notebook-action"
          aria-label={pinned ? '取消固定笔记工作台' : '固定笔记工作台'}
          aria-pressed={pinned}
          on:click={() => onTogglePin?.()}
        >
          {pinned ? '已固定' : '固定'}
        </button>
        <button type="button" class="notebook-action close" aria-label="关闭笔记工作台" on:click={() => onClose?.()}>
          ×
        </button>
      </div>
    </header>

    <div class="notebook-summary" aria-label="笔记工作台摘要">
      <span>{highlightEntries.length} 高亮</span>
      <span>{noteEntries.length} 笔记</span>
      <span>{assistance.status === 'ready' ? '助手已有结果' : assistance.status === 'loading' ? '助手查询中' : '助手待命'}</span>
      <span>{selectionText ? '已选中文本' : '未选中文本'}</span>
    </div>

    <div class="notebook-tabs" role="tablist" aria-label="笔记工作台标签">
      <button
        type="button"
        role="tab"
        class:active={activeTab === 'notes'}
        aria-selected={activeTab === 'notes'}
        on:click={() => setTab('notes')}
      >
        笔记
      </button>
      <button
        type="button"
        role="tab"
        class:active={activeTab === 'highlights'}
        aria-selected={activeTab === 'highlights'}
        on:click={() => setTab('highlights')}
      >
        高亮
      </button>
      <button
        type="button"
        role="tab"
        class:active={activeTab === 'assistant'}
        aria-selected={activeTab === 'assistant'}
        on:click={() => setTab('assistant')}
      >
        AI 助手
      </button>
    </div>

    <div class="notebook-scroll">
      {#if supportsTextAnnotations && selectionText}
        <section class="selection-card" aria-label="当前选中文本预览">
          <strong>{notesState.selection?.chapterLabel || '当前选中内容'}</strong>
          <p>{selectionText}</p>
          <div class="selection-actions">
            <button type="button" class="ghost-action" on:click={() => callbacks.onAddHighlight?.()}>
              先高亮当前选中内容
            </button>
            <button type="button" class="primary-action" on:click={() => callbacks.onAddNote?.()}>
              为当前选中内容记笔记
            </button>
          </div>
        </section>
      {:else}
        <section class="selection-card muted" aria-label="笔记工作台提示">
          <strong>{supportsTextAnnotations ? '先在正文里选中文本' : '当前格式暂不支持正文批注'}</strong>
          <p>{supportsTextAnnotations ? '工作台会围绕选区、高亮和笔记组织阅读痕迹。' : textAnnotationSupportMessage}</p>
        </section>
      {/if}

      {#if activeTab === 'notes'}
        <section class="workspace-list" aria-label="笔记列表">
          {#if noteEntries.length}
            {#each noteEntries as note}
              <article class:active-entry={note.cfi === notesState.activeCfi} class="workspace-card">
                <button type="button" class="workspace-link" on:click={() => callbacks.onOpenNote?.(note.cfi)}>
                  <strong>{note.chapterLabel || '未命名章节'}</strong>
                  <span>{formatTimestamp(note.createdAt)}</span>
                </button>
                <p class="workspace-text">{note.text}</p>
                {#if note.note}
                  <p class="workspace-note">{note.note}</p>
                {/if}
                <div class="workspace-actions">
                  <button type="button" class="ghost-action" on:click={() => callbacks.onEditNote?.(note.id)}>
                    编辑
                  </button>
                  <button type="button" class="ghost-action danger" on:click={() => callbacks.onDeleteNote?.(note.id)}>
                    删除
                  </button>
                </div>
              </article>
            {/each}
          {:else}
            <p class="empty-state">还没有笔记。选中一段正文后，这里会成为持续整理的工作台。</p>
          {/if}
        </section>
      {:else if activeTab === 'highlights'}
        <section class="workspace-list" aria-label="高亮列表">
          {#if highlightEntries.length}
            {#each highlightEntries as note}
              <article class:active-entry={note.cfi === notesState.activeCfi} class="workspace-card highlight">
                <button type="button" class="workspace-link" on:click={() => callbacks.onOpenNote?.(note.cfi)}>
                  <strong>{note.chapterLabel || '未命名章节'}</strong>
                  <span>{formatTimestamp(note.createdAt)}</span>
                </button>
                <p class="workspace-text">{note.text}</p>
                <div class="workspace-actions">
                  <button type="button" class="ghost-action danger" on:click={() => callbacks.onDeleteNote?.(note.id)}>
                    删除
                  </button>
                </div>
              </article>
            {/each}
          {:else}
            <p class="empty-state">还没有高亮。先从选区里保存几条高亮，再回到这里做持续整理。</p>
          {/if}
        </section>
      {:else}
        <ReaderAssistWorkspace
          title="AI 阅读助手"
          summary="把查词、百科和翻译结果放到 notebook 里的独立工作台，而不是只做一个 sidebar 结果区。"
          {preview}
          {notesState}
          {assistance}
          {translationProviderStatuses}
          callbacks={{
            onRequestLookup: callbacks.onRequestLookup,
            onRequestTranslation: callbacks.onRequestTranslation
          }}
        />
      {/if}
    </div>
  </aside>
{/if}

<style>
  .reader-notebook {
    display: grid;
    grid-template-rows: auto auto auto minmax(0, 1fr);
    min-width: 0;
    min-height: 0;
    border: 1px solid rgba(64, 47, 24, 0.1);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 92%, white 8%);
    box-shadow: 0 16px 32px rgba(42, 30, 15, 0.08);
  }

  .notebook-head,
  .notebook-summary,
  .notebook-tabs {
    padding-inline: 14px;
  }

  .notebook-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    padding-top: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(64, 47, 24, 0.1);
  }

  .notebook-copy {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .notebook-kicker {
    color: var(--text-muted);
    font: 700 10px/1 var(--font-chrome);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .notebook-copy strong {
    font-size: 16px;
    line-height: 1.25;
  }

  .notebook-copy span:last-child {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.5;
  }

  .notebook-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .notebook-action,
  .notebook-tabs button,
  .ghost-action,
  .primary-action {
    min-height: 32px;
    border: 1px solid var(--border-light);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 88%, white 12%);
    color: var(--text-secondary);
    font: 700 12px/1 var(--font-chrome);
    letter-spacing: 0.04em;
    cursor: pointer;
  }

  .notebook-action {
    padding: 0 12px;
  }

  .notebook-action.pinned,
  .notebook-tabs button.active,
  .primary-action {
    color: color-mix(in srgb, var(--accent-warm, #8c6a3b) 78%, black 22%);
    border-color: color-mix(in srgb, var(--accent-warm, #8c6a3b) 32%, white 68%);
    background: color-mix(in srgb, var(--surface-reader) 72%, white 28%);
  }

  .notebook-action.close {
    width: 32px;
    padding: 0;
    border-radius: 999px;
  }

  .notebook-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(64, 47, 24, 0.08);
  }

  .notebook-summary span {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
  }

  .notebook-tabs {
    display: flex;
    gap: 8px;
    padding-top: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(64, 47, 24, 0.08);
  }

  .notebook-tabs button,
  .ghost-action,
  .primary-action {
    padding: 0 12px;
  }

  .notebook-scroll {
    display: grid;
    align-content: start;
    gap: 14px;
    min-height: 0;
    overflow: auto;
    padding: 14px;
  }

  .selection-card,
  .workspace-card {
    display: grid;
    gap: 8px;
    padding: 14px;
    border: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-reader) 76%, white 24%);
  }

  .selection-card.muted {
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
  }

  .selection-card strong,
  .workspace-link strong {
    font-size: 13px;
    line-height: 1.35;
  }

  .selection-card p,
  .workspace-text,
  .workspace-note,
  .empty-state {
    margin: 0;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.65;
  }

  .selection-actions,
  .workspace-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .workspace-list {
    display: grid;
    gap: 12px;
  }

  .workspace-card.highlight {
    background: color-mix(in srgb, var(--surface-panel) 90%, white 10%);
  }

  .workspace-card.active-entry {
    border-color: color-mix(in srgb, var(--accent-warm, #8c6a3b) 32%, white 68%);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-warm, #8c6a3b) 18%, white 82%);
  }

  .workspace-link {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: baseline;
    padding: 0;
    border: 0;
    background: transparent;
    text-align: left;
    color: inherit;
    cursor: pointer;
  }

  .workspace-link span {
    color: var(--text-muted);
    font-size: 11px;
    white-space: nowrap;
  }

  .ghost-action.danger {
    color: #8b3b2f;
  }

  .notebook-action:focus-visible,
  .notebook-tabs button:focus-visible,
  .ghost-action:focus-visible,
  .primary-action:focus-visible,
  .workspace-link:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent-warm, #8c6a3b) 72%, white 28%);
    outline-offset: 3px;
  }
</style>

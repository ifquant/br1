<!-- Ownership: this popup only presents the intercepted footnote payload. The
 stage still decides whether to close or jump, so navigation policy stays in one
 reader coordination layer. -->
<script lang="ts">
  import { tick } from 'svelte';
  import { Overlayer } from 'foliate-js/overlayer.js';
  import type { ReaderNote } from '$lib/reader/types';
  import type { ReaderFootnoteAction, ReaderFootnoteAnnotation, ReaderFootnoteRecordAction, ReaderFootnoteSelection } from '$lib/reader/footnoteExcerpt';
  export let visible = false;
  export let label = '脚注';
  export let excerptHtml = '';
  export let excerptText = '';
  export let fallbackHref = '';
  export let onClose: (() => void) | null = null;
  export let onJump: (() => void) | null = null;
  export let onSelection: ((root: Element, range: Range | null) => void) | null = null;
  export let selection: ReaderFootnoteSelection | null = null;
  export let onAction: ((action: ReaderFootnoteAction) => void) | null = null;
  export let actionPending = false;
  export let actionMessage = '';
  export let actionFailed = false;
  export let notes: ReaderNote[] = [];
  export let resolveAnnotations: ((root: Element, notes: ReaderNote[]) => Promise<ReaderFootnoteAnnotation[]>) | null = null;
  export let onRecordAction: ((action: ReaderFootnoteRecordAction, id: string, root: Element) => Promise<void>) | null = null;
  let previewRoot: HTMLDivElement | null = null;
  let popupRoot: HTMLDivElement | null = null;
  let scroller: HTMLDivElement | null = null;
  let layer: InstanceType<typeof Overlayer> | null = null;
  let annotations: ReaderFootnoteAnnotation[] = [];
  let annotationRevision = 0;
  let activeRecordId = '';
  let redrawFrame = 0;

  const scheduleRedraw = () => {
    if (!popupRoot || redrawFrame) return;
    redrawFrame = requestAnimationFrame(() => {
      redrawFrame = 0;
      if (!popupRoot) return;
      // Parallel panes can be side by side or stacked. Keep each popup inside
      // its own visible pane, and hide it while that pane is offscreen.
      const bounds = popupRoot.closest('.reader-stage')?.getBoundingClientRect();
      const left = Math.max(0, bounds?.left ?? 0) + 12;
      const top = Math.max(0, bounds?.top ?? 0) + 12;
      const right = Math.min(window.innerWidth, bounds?.right ?? window.innerWidth) - 12;
      const bottom = Math.min(window.innerHeight, bounds?.bottom ?? window.innerHeight) - 12;
      const width = Math.max(0, Math.min(420, right - left));
      const height = Math.max(0, bottom - top);
      Object.assign(popupRoot.style, {
        width: `${width}px`, maxHeight: `${height}px`,
        right: `${window.innerWidth - right}px`, bottom: `${window.innerHeight - bottom}px`,
        visibility: width && height ? 'visible' : 'hidden'
      });
      if (layer && scroller && previewRoot) {
        // Keep a few lines available under crowded controls without padding
        // short excerpts up to the long-note minimum.
        scroller.style.minHeight = `${Math.min(72, previewRoot.scrollHeight)}px`;
        // Measure text, not a scroll extent containing the old SVG itself.
        layer.element.style.width = `${Math.max(scroller.clientWidth, previewRoot.scrollWidth)}px`;
        layer.element.style.height = `${Math.max(scroller.clientHeight, previewRoot.scrollHeight)}px`;
      }
      layer?.redraw();
    });
  };

  const watchPopup = (element: HTMLDivElement) => {
    popupRoot = element;
    const observer = new ResizeObserver(scheduleRedraw);
    observer.observe(element);
    const stage = element.closest('.reader-stage');
    if (stage) observer.observe(stage);
    if (scroller) observer.observe(scroller);
    if (previewRoot) observer.observe(previewRoot);
    element.ownerDocument.addEventListener('scroll', scheduleRedraw, true);
    window.addEventListener('resize', scheduleRedraw);
    scheduleRedraw();
    return { destroy() {
      observer.disconnect();
      element.ownerDocument.removeEventListener('scroll', scheduleRedraw, true);
      window.removeEventListener('resize', scheduleRedraw);
      cancelAnimationFrame(redrawFrame);
      redrawFrame = 0;
      if (popupRoot === element) popupRoot = null;
    } };
  };

  const attachLayer = (element: HTMLDivElement) => {
    const current = new Overlayer(element.ownerDocument);
    current.element.dataset.footnoteAnnotations = '';
    // This sibling must never enter previewRoot's text/provenance traversal.
    element.append(current.element);
    layer = current;
    return { destroy() {
      annotationRevision += 1;
      current.element.remove();
      if (layer === current) layer = null;
    } };
  };

  const updateAnnotations = async (
    root: Element, records: ReaderNote[], resolve: NonNullable<typeof resolveAnnotations>, current: InstanceType<typeof Overlayer>
  ) => {
    const revision = ++annotationRevision;
    // Keep unchanged records mounted while their batch is refreshed, including
    // keyboard focus in the inspector. Removed or retargeted IDs disappear now.
    annotations = annotations.filter(({ note }) => {
      if (records.some((record) => record.id === note.id && record.cfi === note.cfi)) return true;
      current.remove(note.id);
      return false;
    });
    const mapped = await resolve(root, records);
    if (revision !== annotationRevision || !root.isConnected || root !== previewRoot || current !== layer || !visible) return;
    for (const { note } of annotations) current.remove(note.id);
    annotations = mapped;
    for (const entry of mapped) {
      current.add(entry.note.id, entry.range, (rects: DOMRect[]) => {
        if (!scroller) return Overlayer.highlight([]);
        const box = scroller.getBoundingClientRect();
        const dx = box.left + scroller.clientLeft - scroller.scrollLeft;
        const dy = box.top + scroller.clientTop - scroller.scrollTop;
        // Overlayer keeps viewport rects for hitTest; only drawing coordinates
        // are translated into the bordered, scrolling popup's content space.
        const drawing = Overlayer.highlight(rects.map((rect) => ({
          left: rect.left - dx, right: rect.right - dx, top: rect.top - dy, bottom: rect.bottom - dy,
          width: rect.width, height: rect.height
        })), { color: entry.note.kind === 'highlight' ? 'rgba(218,193,112,0.42)' : 'rgba(125,172,186,0.38)' });
        drawing.dataset.noteId = entry.note.id;
        return drawing;
      });
    }
    scheduleRedraw();
  };

  const inspectAnnotation = (event: MouseEvent) => {
    if (!scroller || !layer || !previewRoot || !previewRoot.ownerDocument.getSelection()?.isCollapsed) return;
    const box = scroller.getBoundingClientRect();
    const left = box.left + scroller.clientLeft;
    const top = box.top + scroller.clientTop;
    if (event.clientX < left || event.clientX >= left + scroller.clientWidth ||
      event.clientY < top || event.clientY >= top + scroller.clientHeight) return;
    // Refresh synchronously before hit-testing a click after a queued scroll.
    layer.redraw();
    const [id] = layer.hitTest({ x: event.clientX, y: event.clientY });
    if (typeof id === 'string' && annotations.some(({ note }) => note.id === id)) activeRecordId = id;
  };

  const handleSelectionChange = () => {
    if (!visible || !previewRoot) return;
    const selection = previewRoot.ownerDocument.getSelection();
    const range = selection?.rangeCount === 1 && !selection.isCollapsed ? selection.getRangeAt(0) : null;
    onSelection?.(previewRoot, range && previewRoot.contains(range.startContainer) &&
      previewRoot.contains(range.endContainer) ? range.cloneRange() : null);
  };

  $: hasPreview = !!excerptHtml.trim() || !!excerptText.trim();
  $: if (visible && previewRoot && layer && resolveAnnotations) void updateAnnotations(previewRoot, notes, resolveAnnotations, layer);
  $: if (activeRecordId && !notes.some((note) => note.id === activeRecordId)) activeRecordId = '';
  $: activeRecord = notes.find((note) => note.id === activeRecordId);
  $: { activeRecordId; actionMessage; if (layer) void tick().then(scheduleRedraw); }
</script>

<svelte:document on:selectionchange={handleSelectionChange} />

{#if visible}
  <div class="footnote-dialog" use:watchPopup role="dialog" aria-modal="false" aria-label="脚注预览">
    {#if activeRecord && annotations.some(({ note }) => note.id === activeRecordId)}
      <section class="record-inspector" aria-label="脚注批注">
        <div class="record-choices" aria-label="脚注批注记录">
          {#each annotations as { note }, index (note.id)}
            <button type="button" aria-pressed={activeRecordId === note.id} on:click={() => activeRecordId = note.id}>
              {note.kind === 'highlight' ? '高亮' : '笔记'} {index + 1}
            </button>
          {/each}
        </div>
        <p>{activeRecord.note || activeRecord.text}</p>
        {#if annotations.find(({ note }) => note.id === activeRecordId)?.clipped}<small>部分原文</small>{/if}
        <div class="record-actions">
          <!-- Keep keyboard focus during a save; the busy gate still rejects
            repeat activation without disabling the focused native button. -->
          {#if activeRecord.kind === 'note'}<button type="button" disabled={!onRecordAction} aria-disabled={actionPending || !onRecordAction} on:click={() => !actionPending && previewRoot && onRecordAction?.('edit', activeRecordId, previewRoot)}>编辑笔记</button>{/if}
          <button type="button" disabled={!onRecordAction} aria-disabled={actionPending || !onRecordAction} on:click={() => !actionPending && previewRoot && onRecordAction?.('delete', activeRecordId, previewRoot)}>删除批注</button>
          <button type="button" on:click={() => activeRecordId = ''}>关闭批注</button>
        </div>
      </section>
    {/if}
    <div class="footnote-popup">
    <div class="popup-copy">
      <strong>脚注预览</strong>
      <span>{label}</span>
    </div>

    {#if hasPreview}
      <div class="footnote-scroll" bind:this={scroller} use:attachLayer on:click={inspectAnnotation} role="presentation">
        <div class="footnote-body" bind:this={previewRoot}>
          {#if excerptHtml}
            {@html excerptHtml}
          {:else}
            <p>{excerptText}</p>
          {/if}
        </div>
      </div>
    {:else}
      <p class="footnote-fallback">{fallbackHref.trim() ? '无法预览，可跳转到正文位置' : '无法预览'}</p>
    {/if}

    {#if onAction}
      <div class="selection-actions" role="toolbar" tabindex="-1" aria-label="脚注选区操作" on:mousedown|preventDefault>
        <button type="button" disabled={actionPending || !selection?.source} on:click={() => onAction?.('highlight')}>高亮</button>
        <button type="button" disabled={actionPending || !selection?.source} on:click={() => onAction?.('note')}>笔记</button>
        <button type="button" disabled={actionPending || !selection} on:click={() => onAction?.('copy')}>复制</button>
        <button type="button" disabled={actionPending || !selection} on:click={() => onAction?.('search')}>书内搜索</button>
        <button type="button" disabled={actionPending || !selection} on:click={() => onAction?.('dictionary')}>词典</button>
        <button type="button" disabled={actionPending || !selection} on:click={() => onAction?.('wikipedia')}>百科</button>
        <button type="button" disabled={actionPending || !selection} on:click={() => onAction?.('translate')}>翻译</button>
        <button type="button" disabled={actionPending || !selection} on:click={() => onAction?.('share')}>分享</button>
        <button type="button" aria-label="查看脚注批注" disabled={!annotations.length} on:click={() => activeRecordId = annotations[0].note.id}>批注</button>
        <button type="button" disabled title="脚注选区不支持朗读">朗读</button>
      </div>
    {/if}
    {#if onAction}
      <p class="action-message" class:action-failed={actionFailed} role={actionPending || actionMessage ? (actionFailed ? 'alert' : 'status') : undefined}>
        {actionPending ? '正在处理…' : actionMessage}
      </p>
    {/if}
    <div class="popup-actions">
      <button type="button" class="primary-action" on:click={() => onClose?.()}>关闭脚注</button>
      {#if fallbackHref.trim()}
        <button type="button" on:click={() => onJump?.()}>跳转到正文位置</button>
      {/if}
    </div>
    </div>
  </div>
{/if}

<style>
  .footnote-dialog {
    position: fixed;
    right: 12px;
    bottom: 12px;
    z-index: 36;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: min(420px, calc(100vw - 24px));
    max-height: calc(100dvh - 24px);
    box-sizing: border-box;
    overflow: auto;
    visibility: hidden;
  }

  .footnote-popup {
    display: flex;
    flex-direction: column;
    flex: 0 1 auto;
    min-height: 0;
    overflow: auto;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
    padding: 16px;
    border: 1px solid color-mix(in srgb, var(--reader-shell-border, rgba(84, 62, 34, 0.16)) 90%, white 10%);
    border-radius: 20px;
    box-shadow:
      0 18px 40px color-mix(in srgb, var(--reader-shell-shadow, rgba(36, 25, 12, 0.18)) 78%, transparent 22%),
      inset 0 1px 0 rgba(255, 255, 255, 0.72);
    color: var(--reader-shell-text, #2d2418);
  }

  .popup-copy {
    display: grid;
    gap: 4px;
  }

  .popup-copy strong {
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--reader-shell-accent, #7a5730);
  }

  .popup-copy span,
  .footnote-fallback {
    margin: 0;
    color: var(--reader-shell-muted, #6c5a45);
    font-size: 13px;
    line-height: 1.55;
  }

  .footnote-scroll {
    position: relative;
    flex-shrink: 1;
    min-height: 0;
    max-height: min(38vh, 260px);
    overflow: auto;
    isolation: isolate;
  }

  .footnote-body {
    overflow-wrap: anywhere;
    display: grid;
    gap: 8px;
    font-size: 15px;
    line-height: 1.65;
  }

  .footnote-popup > :not(.footnote-scroll) { flex-shrink: 0; }

  .footnote-body :global(p),
  .footnote-body :global(li) {
    margin: 0;
  }

  .popup-actions,
  .selection-actions,
  .record-choices,
  .record-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .popup-actions button,
  .selection-actions button,
  .record-inspector button {
    border: 1px solid color-mix(in srgb, var(--reader-shell-border, rgba(84, 62, 34, 0.16)) 90%, white 10%);
    border-radius: 999px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.78);
    color: var(--reader-shell-text, #2d2418);
    font: inherit;
    cursor: pointer;
  }

  .selection-actions button:disabled { opacity: 0.45; cursor: default; }
  .selection-actions button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
  .action-message { margin: 0; min-height: 1.5em; font-size: 13px; line-height: 1.5; }
  .action-failed { color: #a22222; }
  .record-inspector {
    flex: 0 0 auto;
    min-height: 0;
    max-height: min(28vh, 240px);
    box-sizing: border-box;
    overflow: auto;
    padding: 12px;
    border: 1px solid var(--reader-shell-border, #999);
    border-radius: 8px;
    color: var(--reader-shell-text, #222);
    font-size: 13px;
  }
  /* Shell panels are translucent; an opaque base keeps book text from showing
    through the popup or the record controls. */
  .footnote-popup,
  .record-inspector {
    background: linear-gradient(var(--reader-shell-panel, white), var(--reader-shell-panel, white)),
      var(--reader-shell-backdrop, white);
  }
  .record-inspector p { margin: 8px 0; overflow-wrap: anywhere; }
  .record-inspector button[aria-pressed='true'] { outline: 2px solid currentColor; }

  .popup-actions button.primary-action {
    background: color-mix(in srgb, var(--reader-shell-accent, #8c6a3b) 14%, white 86%);
    border-color: color-mix(in srgb, var(--reader-shell-accent, #8c6a3b) 36%, white 64%);
  }

  @media (max-width: 720px) {
    .footnote-popup {
      right: 10px;
      left: 10px;
      bottom: 10px;
      width: auto;
    }
  }
</style>

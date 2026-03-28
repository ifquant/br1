<script lang="ts">
  import { startCurrentWindowDrag } from '$lib/services';
  import type { ReaderPreviewState } from '$lib/reader';

  export let preview: ReaderPreviewState;
  export let isWindowMode = false;
  export let onOpenPicker: (() => void) | null = null;
</script>

<header class:window-mode={isWindowMode} class="reader-head">
  <div
    role="presentation"
    class:window-mode={isWindowMode}
    class="head-meta"
    data-tauri-drag-region={isWindowMode ? true : undefined}
    on:mousedown={isWindowMode ? startCurrentWindowDrag : undefined}
  >
    <div class="title-row">
      <strong>{preview.title}</strong>
      <div class="subtitle-row">
        <small>{preview.author}</small>
        <span>{preview.chapterLabel}</span>
      </div>
    </div>
  </div>

  <div class="controls" aria-label="reader controls preview">
    <button type="button" aria-label="Open book" title="Open book" on:click={() => onOpenPicker?.()}>⌂</button>
    <button type="button" aria-label="Typography" title="Typography">Aa</button>
    <button type="button" aria-label="Text to speech" title="Text to speech">🔊</button>
    <button type="button" aria-label="More actions" title="More actions">⋯</button>
  </div>
</header>

<style>
  .reader-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    padding: 0;
  }

  .reader-head.window-mode {
    min-height: 44px;
    padding: 0 20px 2px 16px;
    background: transparent;
  }

  .head-meta {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .head-meta.window-mode {
    align-content: center;
    min-height: 100%;
    padding-left: 2px;
    padding-right: 16px;
    cursor: grab;
  }

  .title-row {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .title-row strong,
  .title-row small,
  .subtitle-row span {
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title-row strong {
    font-size: 14px;
    line-height: 1.3;
  }

  .title-row small {
    color: var(--text-muted);
    font-size: 12px;
  }

  .subtitle-row {
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 0;
    color: var(--text-muted);
  }

  .subtitle-row span {
    min-width: 0;
    font-size: 12px;
    color: color-mix(in srgb, var(--text-secondary) 90%, white 10%);
  }

  .subtitle-row span::before {
    content: "•";
    margin-right: 8px;
    color: color-mix(in srgb, var(--text-muted) 70%, white 30%);
  }

  .controls {
    display: flex;
    gap: 4px;
    flex-wrap: nowrap;
    -webkit-app-region: no-drag;
  }

  .controls button {
    min-width: 30px;
    height: 30px;
    padding: 0 7px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 13px;
    line-height: 1;
  }

  .controls button:hover {
    background: color-mix(in srgb, var(--surface-panel) 86%, white 14%);
    color: var(--text-primary);
  }
</style>

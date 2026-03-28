<script lang="ts">
  import { createReaderMountBoundary } from '$lib/reader';
  import ReaderViewport from './ReaderViewport.svelte';

  const mountBoundary = createReaderMountBoundary('idle');
</script>

<section class="reader-workspace">
  <header class="reader-head">
    <div class="head-meta">
      <div class="eyebrow">Reading</div>
      <div class="title-row">
        <strong>政治秩序与政治衰败</strong>
        <small>Francis Fukuyama</small>
      </div>
    </div>

    <div class="controls" aria-label="reader controls preview">
      <button type="button">Aa</button>
      <button type="button">🔊</button>
      <button type="button">☰</button>
    </div>
  </header>

  <article class="canvas">
    <ReaderViewport
      title="Reader Engine Boundary"
      state={mountBoundary.state}
      hint="中央主舞台先对齐 Readest 的阅读画布比例和安静度；下一步再把真正的阅读引擎挂进来。"
    />
  </article>

  <footer class="footer-bar" aria-label="reader footer controls preview">
    <span>34%</span>
    <span>Chapter 3</span>
    <span>EPUB · Serif · 110%</span>
  </footer>
</section>

<style>
  .reader-workspace {
    display: grid;
    gap: 12px;
    min-width: 0;
  }

  .reader-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
  }

  .eyebrow {
    color: var(--text-muted);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .head-meta {
    display: grid;
    gap: 4px;
  }

  .title-row {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .title-row strong,
  .title-row small {
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

  .controls {
    display: flex;
    gap: 4px;
    flex-wrap: nowrap;
  }

  .controls button {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
  }

  .canvas {
    display: grid;
    min-height: 0;
    padding: 12px 18px 0;
    border: 1px solid rgba(64, 47, 24, 0.08);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 94%, white 6%);
  }

  .footer-bar {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 10px 12px;
    border: 1px solid rgba(64, 47, 24, 0.08);
    background: color-mix(in srgb, var(--surface-panel) 94%, white 6%);
    color: var(--text-secondary);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 11px;
    letter-spacing: 0.02em;
  }

  @media (max-width: 900px) {
    .reader-head {
      display: grid;
      align-items: start;
    }
  }
</style>

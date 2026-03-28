<section class="reader-shell">
  <header class="reader-head">
    <div>
      <div class="eyebrow">Reader</div>
      <h1>阅读工作区骨架</h1>
    </div>
    <div class="controls" aria-label="reader controls preview">
      <button type="button">目录</button>
      <button type="button">TTS</button>
      <button type="button">Bridge</button>
    </div>
  </header>

  <div class="workspace">
    <article class="canvas">
      <p>
        这里先保留阅读画布骨架。后续会把 Readest 的阅读器能力迁进来，包括内容渲染、进度恢复、
        TTS、主题和排版控制。
      </p>
      <p>
        当前阶段故意不把 bridge、AI 请求或复杂 store 混进来，先把 Svelte 版应用骨架和挂载边界搭正。
      </p>
    </article>

    <aside class="bridge-placeholder" aria-label="bridge panel placeholder">
      <span class="label">Bridge Surface</span>
      <p>默认右侧 contextual panel。后续接 bridge orchestrator 和本地沉淀。</p>
    </aside>
  </div>
</section>

<style>
  .reader-shell {
    display: grid;
    gap: 20px;
    min-height: 100%;
  }

  .reader-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: end;
  }

  .eyebrow {
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1 {
    margin: 6px 0 0;
    font-size: 30px;
    line-height: 1.1;
  }

  .controls {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .controls button {
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid var(--line-strong);
    background: var(--surface-panel);
    color: var(--text-primary);
    font: inherit;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.9fr);
    gap: 16px;
    min-height: 60vh;
  }

  .canvas,
  .bridge-placeholder {
    padding: 24px;
    border: 1px solid var(--line-soft);
  }

  .canvas {
    background: var(--surface-reader);
    font-size: 17px;
    line-height: 1.85;
  }

  .bridge-placeholder {
    display: grid;
    align-content: start;
    gap: 10px;
    background: var(--surface-panel);
  }

  .label {
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .bridge-placeholder p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.65;
  }

  @media (max-width: 960px) {
    .workspace {
      grid-template-columns: 1fr;
    }
  }
</style>

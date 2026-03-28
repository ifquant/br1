<section class="reader-workspace">
  <header class="reader-head">
    <div>
      <div class="eyebrow">Reader</div>
      <h1>阅读器工作区</h1>
      <p>先对齐 Readest 的阅读器分层：内容导航、正文画布、底部控制带。</p>
    </div>

    <div class="controls" aria-label="reader controls preview">
      <button type="button">目录</button>
      <button type="button">TTS</button>
      <button type="button">主题</button>
    </div>
  </header>

  <article class="canvas">
    <div class="book-meta">
      <span>政治秩序与政治衰败</span>
      <small>Francis Fukuyama</small>
    </div>

    <p>
      这里继续保持“真正的正文最大”的原则。下一步接入阅读引擎时，正文画布会取代这块占位内容，
      左侧目录和底部控制层则继续保留为稳定结构。
    </p>
    <p>
      这一层先不提前接 bridge 逻辑，只把它留在右侧作为 `br1` 相对 Readest 的产品扩展挂载点。
    </p>
  </article>

  <footer class="footer-bar" aria-label="reader footer controls preview">
    <span>进度 34%</span>
    <span>页码 / 章节 / 布局</span>
    <span>字体 / 主题 / 行距</span>
  </footer>
</section>

<style>
  .reader-workspace {
    display: grid;
    gap: 14px;
    min-width: 0;
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
    font-size: clamp(28px, 3vw, 36px);
    line-height: 1.08;
  }

  p {
    margin: 8px 0 0;
    color: var(--text-secondary);
    line-height: 1.7;
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

  .canvas {
    display: grid;
    align-content: start;
    gap: 16px;
    min-height: 60vh;
    padding: 28px;
    border: 1px solid var(--line-soft);
    background: var(--surface-reader);
    font-size: 17px;
    line-height: 1.85;
  }

  .book-meta {
    display: grid;
    gap: 2px;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .book-meta small {
    color: var(--text-muted);
  }

  .footer-bar {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 14px 18px;
    border: 1px solid var(--line-soft);
    background: var(--surface-panel);
    color: var(--text-secondary);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  @media (max-width: 900px) {
    .reader-head {
      display: grid;
      align-items: start;
    }
  }
</style>

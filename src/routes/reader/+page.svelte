<script lang="ts">
  import { ReaderSidebar, ReaderWorkspace } from '$lib/components';
</script>

<section class="reader-shell">
  <div class="workspace">
    <ReaderSidebar />
    <ReaderWorkspace />

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
  </div>
</section>

<style>
  .reader-shell {
    min-height: 100%;
  }

  .workspace {
    display: grid;
    grid-template-columns: 248px minmax(0, 1fr) 276px;
    gap: 14px;
    min-height: calc(100vh - 32px);
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

    .bridge-placeholder {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 960px) {
    .workspace {
      grid-template-columns: 1fr;
    }
  }
</style>

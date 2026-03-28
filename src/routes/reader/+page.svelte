<script lang="ts">
  import { ReaderSidebar, ReaderWorkspace } from '$lib/components';
</script>

<section class="reader-shell">
  <div class="workspace">
    <ReaderSidebar />
    <ReaderWorkspace />

    <aside class="bridge-placeholder" aria-label="bridge panel placeholder">
      <span class="label">Bridge Surface</span>
      <p>这里保留 `br1` 的右侧桥梁面板挂载位。先不接 AI，只把它和 Readest 风格的 reader 分层摆对。</p>
      <div class="bridge-actions" aria-label="bridge actions preview">
        <button type="button">解释这段</button>
        <button type="button">为什么重要</button>
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
    grid-template-columns: minmax(220px, 0.65fr) minmax(0, 1.7fr) minmax(280px, 0.9fr);
    gap: 16px;
  }

  .bridge-placeholder {
    display: grid;
    align-content: start;
    gap: 10px;
    padding: 18px;
    border: 1px solid var(--line-soft);
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

  .bridge-actions {
    display: grid;
    gap: 10px;
  }

  .bridge-actions button {
    min-height: 44px;
    border: 1px solid var(--line-soft);
    background: var(--surface-reader);
    color: var(--text-primary);
    font: inherit;
  }

  @media (max-width: 1120px) {
    .workspace {
      grid-template-columns: minmax(220px, 0.65fr) minmax(0, 1fr);
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

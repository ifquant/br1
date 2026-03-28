<script lang="ts">
  export let query = '搜索书库、作者、标签';
</script>

<header class="library-header">
  <div class="search-shell" aria-label="search placeholder">
    <span class="search-icon" aria-hidden="true">⌕</span>
    <span class="search-copy">{query}</span>
  </div>

  <div class="actions" aria-label="library actions preview">
    <button type="button" class="ghost" aria-label="import books">＋</button>
    <button type="button" class="ghost" aria-label="view menu">◌</button>
    <button type="button" class="ghost" aria-label="settings">≡</button>
  </div>
</header>

<style>
  .library-header {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 48px;
    padding: 0 0 10px;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    border-bottom: 1px solid var(--line-soft);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 0 0 auto;
  }

  .search-shell {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1 1 auto;
    min-width: 0;
    height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 80%, white 20%);
    color: var(--text-muted);
    box-shadow: inset 0 0 0 1px var(--line-soft);
  }

  .search-icon {
    font-size: 14px;
    line-height: 1;
    opacity: 0.72;
  }

  .search-copy {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 400;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: 999px;
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 16px;
    cursor: pointer;
  }

  button.ghost:hover {
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
    color: var(--text-primary);
  }

  @media (max-width: 900px) {
    .search-shell {
      min-width: 0;
    }
  }
</style>

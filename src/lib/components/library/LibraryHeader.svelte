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
    gap: 14px;
    min-height: 52px;
    padding: 10px 0 14px;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
  }

  .search-shell {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1 1 auto;
    min-width: 0;
    height: 38px;
    padding: 0 14px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 76%, white 24%);
    color: var(--text-muted);
    box-shadow: inset 0 0 0 1px var(--line-soft);
  }

  .search-icon {
    font-size: 15px;
    line-height: 1;
  }

  .search-copy {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border-radius: 999px;
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 18px;
    cursor: pointer;
  }

  button.ghost:hover {
    background: color-mix(in srgb, var(--surface-panel) 84%, white 16%);
    color: var(--text-primary);
  }

  @media (max-width: 900px) {
    .search-shell {
      min-width: 0;
    }
  }
</style>

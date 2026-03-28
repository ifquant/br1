<script lang="ts">
  export let query = '搜索书库、作者、标签';

  const actions = [
    { label: 'Import books', glyph: '+', className: 'plus' },
    { label: 'View menu', glyph: '◫', className: 'view' },
    { label: 'Settings', glyph: '≣', className: 'menu' }
  ];
</script>

<header class="library-header">
  <div class="search-shell" aria-label="search placeholder">
    <span class="search-icon" aria-hidden="true">⌕</span>
    <span class="search-copy">{query}</span>
  </div>

  <div class="actions" aria-label="library actions preview">
    {#each actions as action}
      <button type="button" class={`ghost ${action.className}`} aria-label={action.label}>
        <span aria-hidden="true">{action.glyph}</span>
      </button>
    {/each}
  </div>
</header>

<style>
  .library-header {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 0 0 8px;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    border-bottom: 1px solid var(--line-soft);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 0 0 auto;
  }

  .search-shell {
    display: flex;
    align-items: center;
    gap: 9px;
    flex: 1 1 auto;
    min-width: 0;
    height: 32px;
    padding: 0 12px 0 11px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 70%, white 30%);
    color: var(--text-muted);
    box-shadow:
      inset 0 0 0 1px rgba(76, 57, 34, 0.08),
      0 1px 0 rgba(255, 255, 255, 0.3);
  }

  .search-icon {
    font-size: 12px;
    line-height: 1;
    opacity: 0.62;
  }

  .search-copy {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: -0.01em;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border-radius: 999px;
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }

  button span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    transform: translateY(-0.5px);
  }

  button.plus span {
    font-size: 18px;
  }

  button.view span {
    font-size: 13px;
  }

  button.menu span {
    font-size: 15px;
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

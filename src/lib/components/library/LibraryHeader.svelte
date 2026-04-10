<script lang="ts">
  export let query = '';
  export let placeholder = '在 5 本书籍中搜索...';

  const actions = [
    {
      label: 'Import books',
      className: 'plus',
      svg: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.25v11.5M4.25 10h11.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7"/></svg>`
    },
    {
      label: 'View menu',
      className: 'view',
      svg: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="5" cy="10" r="1.35" fill="currentColor"/><circle cx="10" cy="10" r="1.35" fill="currentColor"/><circle cx="15" cy="10" r="1.35" fill="currentColor"/></svg>`
    },
    {
      label: 'Settings',
      className: 'menu',
      svg: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 6.25h11M4.5 10h11M4.5 13.75h11" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.45"/></svg>`
    }
  ];
</script>

<header class="library-header">
  <div class="search-shell" aria-label="search placeholder">
    <span class="search-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20">
        <circle cx="8.25" cy="8.25" r="4.6" fill="none" stroke="currentColor" stroke-width="1.55"></circle>
        <path d="M11.75 11.75L15.6 15.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.55"></path>
      </svg>
    </span>
    <input
      type="search"
      value={query}
      placeholder={placeholder}
      spellcheck="false"
      readonly
      aria-label="Search books"
    />
  </div>

  <div class="actions" aria-label="library actions preview">
    {#each actions as action}
      <button type="button" class={`ghost ${action.className}`} aria-label={action.label}>
        <span aria-hidden="true">{@html action.svg}</span>
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
    font-family: var(--font-chrome);
    border-bottom: 1px solid var(--line-soft);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0;
    flex: 0 0 auto;
  }

  .search-shell {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    min-width: 0;
    height: 30px;
    padding: 0 12px 0 33px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 62%, white 38%);
    color: var(--text-muted);
    box-shadow:
      inset 0 0 0 1px var(--border-light),
      0 1px 0 rgba(255, 255, 255, 0.34);
  }

  .search-icon {
    position: absolute;
    left: 11px;
    top: 50%;
    width: 13px;
    height: 13px;
    font-size: 12px;
    line-height: 1;
    opacity: 0.62;
    transform: translateY(-50%);
  }

  .search-icon svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: -0.01em;
    font-family: inherit;
    pointer-events: none;
    appearance: none;
  }

  input::placeholder {
    color: color-mix(in srgb, var(--text-muted) 86%, white 14%);
    opacity: 1;
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
    font-size: 13px;
    cursor: pointer;
  }

  button span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    line-height: 1;
    transform: translateY(-0.25px);
  }

  button span :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
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

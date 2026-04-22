<script lang="ts">
  type EmptyAction = {
    label: string;
    secondary?: boolean;
    onClick: () => void | Promise<void>;
  };

  type EmptyFilterChip = {
    label: string;
    onClick: () => void | Promise<void>;
  };

  export let ariaLabel = '空态';
  export let title = '';
  export let message = '';
  export let filterChips: EmptyFilterChip[] = [];
  export let actions: EmptyAction[] = [];

  const handleClick = (handler: () => void | Promise<void>) => {
    void handler();
  };
</script>

<section class="empty-library" aria-label={ariaLabel}>
  <div class="empty-copy">
    <strong>{title}</strong>
    <span>{message}</span>
  </div>

  {#if filterChips.length > 0}
    <div class="empty-filter-chips" aria-label="空态筛选条件">
      {#each filterChips as chip}
        <button
          type="button"
          class="empty-filter-chip"
          aria-label={`移除空态筛选：${chip.label}`}
          on:click={() => handleClick(chip.onClick)}
        >
          <span>{chip.label}</span>
          <small>移除</small>
        </button>
      {/each}
    </div>
  {/if}

  {#if actions.length > 0}
    <div class="empty-actions">
      {#each actions as action}
        <button
          type="button"
          class:secondary={action.secondary}
          class="empty-action"
          on:click={() => handleClick(action.onClick)}
        >
          {action.label}
        </button>
      {/each}
    </div>
  {/if}
</section>

<style>
  .empty-library {
    display: grid;
    gap: 14px;
    align-content: start;
    padding: 26px 18px;
    border: 1px dashed color-mix(in srgb, var(--line-soft) 88%, white 12%);
    background: color-mix(in srgb, var(--surface-panel) 78%, white 22%);
  }

  .empty-copy {
    display: grid;
    gap: 4px;
  }

  .empty-copy strong {
    font-family: var(--font-chrome);
    font-size: 15px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--text-primary);
  }

  .empty-copy span {
    max-width: 52ch;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .empty-action {
    justify-self: start;
    border: 0;
    border-radius: 999px;
    padding: 10px 14px;
    background: color-mix(in srgb, var(--surface-reader) 80%, white 20%);
    color: var(--text-primary);
    font-family: var(--font-chrome);
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    box-shadow:
      inset 0 0 0 1px var(--border-light),
      0 10px 20px rgba(42, 30, 15, 0.06);
  }

  .empty-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .empty-filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .empty-filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid color-mix(in srgb, var(--accent-warm) 24%, white 76%);
    border-radius: 999px;
    padding: 7px 10px;
    background: color-mix(in srgb, var(--surface-reader) 78%, white 22%);
    color: color-mix(in srgb, #73481f 86%, var(--text-secondary) 14%);
    font-family: var(--font-chrome);
    font-size: 11px;
    font-weight: 650;
    line-height: 1;
  }

  .empty-filter-chip small {
    color: color-mix(in srgb, currentColor 68%, transparent);
    font-size: 9px;
    font-weight: 700;
  }

  .empty-action.secondary {
    background: transparent;
    box-shadow: inset 0 0 0 1px rgba(76, 57, 34, 0.12);
  }
</style>

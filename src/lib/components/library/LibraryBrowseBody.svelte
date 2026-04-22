<script lang="ts">
  import ContinueReadingShelf from './ContinueReadingShelf.svelte';
  import LibraryEmptyState from './LibraryEmptyState.svelte';
  import LibraryGroupedBrowsePanel from './LibraryGroupedBrowsePanel.svelte';
  import type {
    LibraryBrowseAction,
    LibraryBrowseBodyModel,
    LibraryBrowseState,
    LibraryShelfBook
  } from '$lib/library/types';
  export let model: LibraryBrowseBodyModel = {};
  export let groupedBrowseMode = false;
  export let browseState: LibraryBrowseState = {
    groupBy: 'none',
    groupScope: '',
    trail: []
  };
  export let browseBooks: LibraryShelfBook[] = [];
  export let viewMode: 'grid' | 'list' = 'grid';
  export let shelfBooks: LibraryShelfBook[] = [];
  export let shelfSectionTitle = '书架';
  export let onDispatchBrowseAction: (action: LibraryBrowseAction) => void | Promise<void>;
  export let onOpenLink: (href: string) => void | Promise<void>;
  export let onImportBooks: (() => void | Promise<void>) | null = null;
  export let onOpenSourcePath: ((filePath: string) => void | Promise<void>) | null = null;
  export let onUpdateBookMetadata:
    | ((
        book: LibraryShelfBook,
        metadata: {
          title: string;
          author: string;
          description?: string;
          language?: string;
          publisher?: string;
          collection?: string;
          tags?: string[];
        }
      ) => void | Promise<void>)
    | null = null;
  export let onRemoveBook: ((book: LibraryShelfBook) => void | Promise<void>) | null = null;
  export let onFilterStatus:
    | ((status: 'reading' | 'unstarted' | 'finished') => void | Promise<void>)
    | null = null;
  export let onFilterFormat: ((format: string) => void | Promise<void>) | null = null;
  export let onFilterCollection: ((collection: string) => void | Promise<void>) | null = null;
  export let onFilterTag: ((tag: string) => void | Promise<void>) | null = null;

  $: workflowNotice = model.workflowNotice ?? null;
  $: recoveryShelf = model.recoveryShelf ?? null;
  $: continueShelf = model.continueShelf ?? null;
  $: recentShelf = model.recentShelf ?? null;
  $: initialEmptyState = model.initialEmptyState ?? null;
  $: beforePanelEmptyStates = model.beforePanelEmptyStates ?? [];
  $: afterPanelEmptyStates = model.afterPanelEmptyStates ?? [];
</script>

{#if initialEmptyState}
  <LibraryEmptyState
    ariaLabel={initialEmptyState.ariaLabel}
    title={initialEmptyState.title}
    message={initialEmptyState.message}
    filterChips={initialEmptyState.filterChips ?? []}
    actions={initialEmptyState.actions ?? []}
  />
{:else}
  {#if workflowNotice}
    <section class="reading-workflow-note" aria-label="阅读流程提示">
      <strong>{workflowNotice.title}</strong>
      <span>{workflowNotice.message}</span>
    </section>
  {/if}

  {#if !groupedBrowseMode && recoveryShelf && recoveryShelf.books.length > 0}
    <ContinueReadingShelf
      sectionTitle={recoveryShelf.sectionTitle}
      sectionDescription={recoveryShelf.sectionDescription}
      primaryActionLabel={recoveryShelf.primaryActionLabel}
      books={recoveryShelf.books}
      bulkActionLabel={recoveryShelf.bulkActionLabel ?? ''}
      bulkActionDisabled={recoveryShelf.bulkActionDisabled ?? false}
      operationSummary={recoveryShelf.operationSummary ?? ''}
      onOpenLink={onOpenLink}
      onOpenSourcePath={recoveryShelf.onOpenSourcePath ?? null}
      onImportBooks={recoveryShelf.onImportBooks ?? null}
      onBulkAction={recoveryShelf.onBulkAction ?? null}
      onRepairBook={recoveryShelf.onRepairBook ?? null}
      onRemoveBook={recoveryShelf.onRemoveBook ?? null}
    />
  {/if}

  {#if !groupedBrowseMode && continueShelf && continueShelf.books.length > 0}
    <ContinueReadingShelf
      sectionTitle={continueShelf.sectionTitle}
      sectionDescription={continueShelf.sectionDescription}
      primaryActionLabel={continueShelf.primaryActionLabel}
      books={continueShelf.books}
      onOpenLink={onOpenLink}
      onOpenSourcePath={continueShelf.onOpenSourcePath ?? null}
      onImportBooks={continueShelf.onImportBooks ?? null}
      onRepairBook={continueShelf.onRepairBook ?? null}
      onRemoveBook={continueShelf.onRemoveBook ?? null}
    />
  {/if}

  {#if !groupedBrowseMode && recentShelf && recentShelf.books.length > 0}
    <ContinueReadingShelf
      sectionTitle={recentShelf.sectionTitle}
      sectionDescription={recentShelf.sectionDescription}
      primaryActionLabel={recentShelf.primaryActionLabel}
      books={recentShelf.books}
      onOpenLink={onOpenLink}
      onOpenSourcePath={recentShelf.onOpenSourcePath ?? null}
      onImportBooks={recentShelf.onImportBooks ?? null}
      onRepairBook={recentShelf.onRepairBook ?? null}
      onRemoveBook={recentShelf.onRemoveBook ?? null}
    />
  {/if}

  {#each beforePanelEmptyStates as emptyState}
    <LibraryEmptyState
      ariaLabel={emptyState.ariaLabel}
      title={emptyState.title}
      message={emptyState.message}
      filterChips={emptyState.filterChips ?? []}
      actions={emptyState.actions ?? []}
    />
  {/each}

  <LibraryGroupedBrowsePanel
    {browseState}
    {browseBooks}
    {viewMode}
    shelfBooks={shelfBooks}
    {shelfSectionTitle}
    {onDispatchBrowseAction}
    {onOpenLink}
    {onImportBooks}
    {onOpenSourcePath}
    {onUpdateBookMetadata}
    {onRemoveBook}
    {onFilterStatus}
    {onFilterFormat}
    {onFilterCollection}
    {onFilterTag}
  />

  {#each afterPanelEmptyStates as emptyState}
    <LibraryEmptyState
      ariaLabel={emptyState.ariaLabel}
      title={emptyState.title}
      message={emptyState.message}
      filterChips={emptyState.filterChips ?? []}
      actions={emptyState.actions ?? []}
    />
  {/each}
{/if}

<style>
  .reading-workflow-note {
    display: grid;
    gap: 4px;
    padding: 12px 14px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 84%, white 16%);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 86%, white 14%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      0 10px 24px rgba(42, 30, 15, 0.04);
  }

  .reading-workflow-note strong {
    font-family: var(--font-chrome);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--text-primary);
  }

  .reading-workflow-note span {
    font-size: 12px;
    line-height: 1.45;
    color: var(--text-secondary);
  }
</style>

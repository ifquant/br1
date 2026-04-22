<script lang="ts">
  import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
  import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-svelte';
  import LibraryBrowseBody from './LibraryBrowseBody.svelte';
  import LibraryPageChrome from './LibraryPageChrome.svelte';
  import type {
    LibraryActiveFilterChip,
    LibraryBrowseAction,
    LibraryPageSurfaceModel,
    LibraryShelfBook
  } from '$lib/library/types';

  export let model: LibraryPageSurfaceModel;
  export let scrollRef: OverlayScrollbarsComponentRef<'div'> | null = null;
  export let onDispatchBrowseAction: (action: LibraryBrowseAction) => void | Promise<void>;
  export let onRunNoticeAction: (() => void | Promise<void>) | null = null;
  export let onClearNotice: (() => void | Promise<void>) | null = null;
  export let onReadestMigration: (() => void | Promise<void>) | null = null;
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
  export let onQueryChange: ((query: string) => void | Promise<void>) | null = null;
  export let onFilterChange:
    | ((filterBy: 'all' | 'reading' | 'unstarted' | 'finished') => void | Promise<void>)
    | null = null;
  export let onFormatFilterChange: ((format: string) => void | Promise<void>) | null = null;
  export let onCollectionFilterChange: ((collection: string) => void | Promise<void>) | null = null;
  export let onTagFilterChange: ((tag: string) => void | Promise<void>) | null = null;
  export let onClearFilterChip:
    | ((id: LibraryActiveFilterChip['id']) => void | Promise<void>)
    | null = null;
  export let onClearFilters: (() => void | Promise<void>) | null = null;
  export let onJumpTrail: ((index: number) => void | Promise<void>) | null = null;
  export let onSortChange:
    | ((
        sortBy: 'recent' | 'added' | 'title' | 'author' | 'format'
      ) => void | Promise<void>)
    | null = null;
  export let onViewModeChange: ((viewMode: 'grid' | 'list') => void | Promise<void>) | null = null;

  const handleQueryChange = (event: CustomEvent<{ query: string }>) => {
    if (!onQueryChange) return;
    void onQueryChange(event.detail.query);
  };

  const handleImportBooks = () => {
    if (!onImportBooks) return;
    void onImportBooks();
  };

  const handleFilterChange = (
    event: CustomEvent<{ filterBy: 'all' | 'reading' | 'unstarted' | 'finished' }>
  ) => {
    if (!onFilterChange) return;
    void onFilterChange(event.detail.filterBy);
  };

  const handleFormatFilterChange = (event: CustomEvent<{ format: string }>) => {
    if (!onFormatFilterChange) return;
    void onFormatFilterChange(event.detail.format);
  };

  const handleCollectionFilterChange = (event: CustomEvent<{ collection: string }>) => {
    if (!onCollectionFilterChange) return;
    void onCollectionFilterChange(event.detail.collection);
  };

  const handleTagFilterChange = (event: CustomEvent<{ tag: string }>) => {
    if (!onTagFilterChange) return;
    void onTagFilterChange(event.detail.tag);
  };

  const handleClearFilterChip = (event: CustomEvent<{ id: LibraryActiveFilterChip['id'] }>) => {
    if (!onClearFilterChip) return;
    void onClearFilterChip(event.detail.id);
  };

  const handleClearFilters = () => {
    if (!onClearFilters) return;
    void onClearFilters();
  };

  const handleJumpTrail = (event: CustomEvent<{ index: number }>) => {
    if (!onJumpTrail) return;
    void onJumpTrail(event.detail.index);
  };

  const handleSortChange = (
    event: CustomEvent<{ sortBy: 'recent' | 'added' | 'title' | 'author' | 'format' }>
  ) => {
    if (!onSortChange) return;
    void onSortChange(event.detail.sortBy);
  };

  const handleViewModeChange = (event: CustomEvent<{ viewMode: 'grid' | 'list' }>) => {
    if (!onViewModeChange) return;
    void onViewModeChange(event.detail.viewMode);
  };
</script>

<div class="library-surface">
  <LibraryPageChrome
    model={model.chrome}
    {onDispatchBrowseAction}
    {onRunNoticeAction}
    {onClearNotice}
    {onReadestMigration}
    on:querychange={handleQueryChange}
    on:importbooks={handleImportBooks}
    on:filterchange={handleFilterChange}
    on:formatfilterchange={handleFormatFilterChange}
    on:collectionfilterchange={handleCollectionFilterChange}
    on:tagfilterchange={handleTagFilterChange}
    on:clearfilterchip={handleClearFilterChip}
    on:clearfilters={handleClearFilters}
    on:jumptrail={handleJumpTrail}
    on:sortchange={handleSortChange}
    on:viewmodechange={handleViewModeChange}
  >
    <OverlayScrollbarsComponent
      bind:this={scrollRef}
      defer
      element="div"
      class="library-scroll"
      options={{ scrollbars: { autoHide: 'leave', theme: 'os-theme-readest' } }}
    >
      <LibraryBrowseBody
        model={model.body.body}
        groupedBrowseMode={model.body.groupedBrowseMode}
        browseState={model.body.browseState}
        browseBooks={model.body.browseBooks}
        viewMode={model.body.viewMode}
        shelfBooks={model.body.shelfBooks}
        shelfSectionTitle={model.body.shelfSectionTitle}
        {onDispatchBrowseAction}
        onOpenLink={onOpenLink}
        onImportBooks={onImportBooks}
        onOpenSourcePath={model.supportsDesktopBookActions ? onOpenSourcePath : null}
        onUpdateBookMetadata={model.supportsDesktopBookActions ? onUpdateBookMetadata : null}
        onRemoveBook={model.supportsDesktopBookActions ? onRemoveBook : null}
        onFilterStatus={onFilterStatus}
        onFilterFormat={onFilterFormat}
        onFilterCollection={onFilterCollection}
        onFilterTag={onFilterTag}
      />
    </OverlayScrollbarsComponent>
  </LibraryPageChrome>
</div>

<style>
  .library-surface {
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    border: 1px solid var(--line-soft);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 88%, white 12%);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.18) inset,
      0 18px 44px rgba(42, 30, 15, 0.06);
    padding: 14px 18px 0;
  }

  :global(.library-scroll) {
    min-height: 0;
    overflow: hidden;
    display: grid;
    align-content: start;
    gap: 18px;
    padding: 10px 2px 18px;
    overscroll-behavior: contain;
  }

  :global(.library-scroll .os-scrollbar.os-theme-readest) {
    --os-size: 10px;
    --os-padding-perpendicular: 2px;
    --os-padding-axis: 2px;
    --os-track-bg: transparent;
    --os-track-bg-hover: transparent;
    --os-track-bg-active: transparent;
    --os-track-border: none;
    --os-track-border-hover: none;
    --os-track-border-active: none;
    --os-handle-border-radius: 999px;
    --os-handle-bg: rgba(95, 85, 72, 0.12);
    --os-handle-bg-hover: rgba(95, 85, 72, 0.18);
    --os-handle-bg-active: rgba(95, 85, 72, 0.22);
    --os-handle-min-size: 28px;
    --os-handle-interactive-area-offset: 1px;
  }

  :global(.library-scroll .os-scrollbar-vertical.os-theme-readest) {
    --os-size: 8px;
  }

  @media (max-width: 900px) {
    .library-surface {
      padding: 12px 14px 0;
      border-left: 0;
      border-right: 0;
      box-shadow: none;
    }

    :global(.library-scroll) {
      gap: 16px;
      padding-bottom: 16px;
    }
  }
</style>

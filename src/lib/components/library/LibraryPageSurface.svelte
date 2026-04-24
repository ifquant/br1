<script lang="ts">
  import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
  import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-svelte';
  import LibraryBrowseBody from './LibraryBrowseBody.svelte';
  import LibraryPageChrome from './LibraryPageChrome.svelte';
  import type {
    LibraryActiveFilterChip,
    LibraryPageActions,
    LibraryPageSurfaceModel,
  } from '$lib/library/types';

  export let model: LibraryPageSurfaceModel;
  export let actions: LibraryPageActions;
  export let scrollRef: OverlayScrollbarsComponentRef<'div'> | null = null;

  const handleQueryChange = (event: CustomEvent<{ query: string }>) => {
    if (!actions.onQueryChange) return;
    void actions.onQueryChange(event.detail.query);
  };

  const handleImportBooks = () => {
    if (!actions.onImportBooks) return;
    void actions.onImportBooks();
  };

  const handleExportSyncSnapshot = () => {
    if (!actions.onExportSyncSnapshot) return;
    void actions.onExportSyncSnapshot();
  };

  const handleImportSyncSnapshot = () => {
    if (!actions.onImportSyncSnapshot) return;
    void actions.onImportSyncSnapshot();
  };

  const handleExportKoReaderSync = () => {
    if (!actions.onExportKoReaderSync) return;
    void actions.onExportKoReaderSync();
  };

  const handleImportKoReaderSync = () => {
    if (!actions.onImportKoReaderSync) return;
    void actions.onImportKoReaderSync();
  };

  const handlePushKoReaderRemoteSync = () => {
    if (!actions.onPushKoReaderRemoteSync) return;
    void actions.onPushKoReaderRemoteSync();
  };

  const handlePullKoReaderRemoteSync = () => {
    if (!actions.onPullKoReaderRemoteSync) return;
    void actions.onPullKoReaderRemoteSync();
  };

  const handlePushRemoteSync = () => {
    if (!actions.onPushRemoteSync) return;
    void actions.onPushRemoteSync();
  };

  const handlePullRemoteSync = () => {
    if (!actions.onPullRemoteSync) return;
    void actions.onPullRemoteSync();
  };

  const handleFilterChange = (
    event: CustomEvent<{ filterBy: 'all' | 'reading' | 'unstarted' | 'finished' }>
  ) => {
    if (!actions.onFilterChange) return;
    void actions.onFilterChange(event.detail.filterBy);
  };

  const handleFormatFilterChange = (event: CustomEvent<{ format: string }>) => {
    if (!actions.onFormatFilterChange) return;
    void actions.onFormatFilterChange(event.detail.format);
  };

  const handleCollectionFilterChange = (event: CustomEvent<{ collection: string }>) => {
    if (!actions.onCollectionFilterChange) return;
    void actions.onCollectionFilterChange(event.detail.collection);
  };

  const handleTagFilterChange = (event: CustomEvent<{ tag: string }>) => {
    if (!actions.onTagFilterChange) return;
    void actions.onTagFilterChange(event.detail.tag);
  };

  const handleClearFilterChip = (event: CustomEvent<{ id: LibraryActiveFilterChip['id'] }>) => {
    if (!actions.onClearFilterChip) return;
    void actions.onClearFilterChip(event.detail.id);
  };

  const handleClearFilters = () => {
    if (!actions.onClearFilters) return;
    void actions.onClearFilters();
  };

  const handleJumpTrail = (event: CustomEvent<{ index: number }>) => {
    if (!actions.onJumpTrail) return;
    void actions.onJumpTrail(event.detail.index);
  };

  const handleSortChange = (
    event: CustomEvent<{ sortBy: 'recent' | 'added' | 'title' | 'author' | 'format' }>
  ) => {
    if (!actions.onSortChange) return;
    void actions.onSortChange(event.detail.sortBy);
  };

  const handleViewModeChange = (event: CustomEvent<{ viewMode: 'grid' | 'list' }>) => {
    if (!actions.onViewModeChange) return;
    void actions.onViewModeChange(event.detail.viewMode);
  };
</script>

<div class="library-surface">
  <LibraryPageChrome
    model={model.chrome}
    onDispatchBrowseAction={actions.onDispatchBrowseAction}
    onRunNoticeAction={actions.onRunNoticeAction}
    onClearNotice={actions.onClearNotice}
    onReadestMigration={actions.onReadestMigration}
    on:querychange={handleQueryChange}
    on:importbooks={handleImportBooks}
    on:exportsyncsnapshot={handleExportSyncSnapshot}
    on:importsyncsnapshot={handleImportSyncSnapshot}
    on:exportkoreadersync={handleExportKoReaderSync}
    on:importkoreadersync={handleImportKoReaderSync}
    on:pushkoreaderremotesync={handlePushKoReaderRemoteSync}
    on:pullkoreaderremotesync={handlePullKoReaderRemoteSync}
    on:pushremotesync={handlePushRemoteSync}
    on:pullremotesync={handlePullRemoteSync}
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
        onDispatchBrowseAction={actions.onDispatchBrowseAction}
        onOpenLink={actions.onOpenLink}
        onOpenSourcePath={model.supportsDesktopBookActions ? actions.onOpenSourcePath : null}
        onUpdateBookMetadata={model.supportsDesktopBookActions ? actions.onUpdateBookMetadata : null}
        onRemoveBook={model.supportsDesktopBookActions ? actions.onRemoveBook : null}
        onFilterStatus={actions.onFilterStatus}
        onFilterFormat={actions.onFilterFormat}
        onFilterCollection={actions.onFilterCollection}
        onFilterTag={actions.onFilterTag}
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

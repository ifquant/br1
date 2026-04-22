<script lang="ts">
  import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-svelte';
  import LibraryPageSurface from './LibraryPageSurface.svelte';
  import type {
    LibraryActiveFilterChip,
    LibraryBrowseAction,
    LibraryPageSurfaceModel,
    LibraryShelfBook
  } from '$lib/library/types';

  export let model: LibraryPageSurfaceModel;
  export let fileInput: HTMLInputElement | null = null;
  export let scrollRef: OverlayScrollbarsComponentRef<'div'> | null = null;
  export let fileAccept = '';
  export let onImportChange: ((event: Event) => void | Promise<void>) | null = null;
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

  const handleImportChange = (event: Event) => {
    if (!onImportChange) return;
    void onImportChange(event);
  };
</script>

<div class="library-page">
  <input
    bind:this={fileInput}
    class="import-input"
    type="file"
    accept={fileAccept}
    on:change={handleImportChange}
  />

  <LibraryPageSurface
    {model}
    bind:scrollRef
    {onDispatchBrowseAction}
    {onRunNoticeAction}
    {onClearNotice}
    {onReadestMigration}
    {onOpenLink}
    {onImportBooks}
    {onOpenSourcePath}
    {onUpdateBookMetadata}
    {onRemoveBook}
    {onFilterStatus}
    {onFilterFormat}
    {onFilterCollection}
    {onFilterTag}
    {onQueryChange}
    {onFilterChange}
    {onFormatFilterChange}
    {onCollectionFilterChange}
    {onTagFilterChange}
    {onClearFilterChip}
    {onClearFilters}
    {onJumpTrail}
    {onSortChange}
    {onViewModeChange}
  />
</div>

<style>
  .library-page {
    min-height: 100%;
    display: grid;
  }

  .import-input {
    display: none;
  }
</style>

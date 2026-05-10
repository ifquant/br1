<!-- Ownership: this library component hosts the hidden import input and forwards the final
surface model into the scrollable page renderer. It should stay as a thin bridge between
route bindings and the reusable page surface. -->
<script lang="ts">
  import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-svelte';
  import LibraryPageSurface from './LibraryPageSurface.svelte';
  import type {
    LibraryPageActions,
    LibraryPageSurfaceModel,
  } from '$lib/library/types';

  export let model: LibraryPageSurfaceModel;
  export let actions: LibraryPageActions;
  export let fileInput: HTMLInputElement | null = null;
  export let scrollRef: OverlayScrollbarsComponentRef<'div'> | null = null;
  export let fileAccept = '';

  const handleImportChange = (event: Event) => {
    if (!actions.onImportChange) return;
    void actions.onImportChange(event);
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
    {actions}
    bind:scrollRef
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

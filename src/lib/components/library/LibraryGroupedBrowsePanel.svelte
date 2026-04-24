<script lang="ts">
  import BookshelfPreview from './BookshelfPreview.svelte';
  import LibraryBrowseNavigator from './LibraryBrowseNavigator.svelte';
  import LibraryBrowseOverview from './LibraryBrowseOverview.svelte';
  import LibraryBrowseTrailLandings from './LibraryBrowseTrailLandings.svelte';
  import {
    buildLibraryBrowseSurfaceModel,
    getLibraryBlockedTrailGroupExplanations,
    getLibraryBrowseActionAvailability,
    getLibraryBrowseActionReasonLabel,
    getLibraryLandingGroupBy,
    getLibraryTrailActionExplanations,
    getLibraryTrailSiblingExplanations
  } from '$lib/library/navigation';
  import type {
    LibraryBrowseAction,
    BookshelfPreviewBook,
    LibraryGroupBy,
    LibraryBrowseState,
    LibraryShelfBook,
    LibraryTrailLanding
  } from '$lib/library/types';

  export let browseState: LibraryBrowseState = {
    groupBy: 'none',
    groupScope: '',
    trail: []
  };
  export let viewMode: 'grid' | 'list' = 'grid';
  export let browseBooks: LibraryShelfBook[] = [];
  export let shelfBooks: BookshelfPreviewBook[] = [];
  export let shelfSectionTitle = '书架';
  export let onDispatchBrowseAction: (action: LibraryBrowseAction) => void | Promise<void>;
  export let onOpenLink: (href: string) => void | Promise<void>;
  export let onOpenSourcePath: ((filePath: string) => void | Promise<void>) | null = null;
  export let onUpdateBookMetadata:
    | ((
        book: BookshelfPreviewBook,
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
  export let onRemoveBook: ((book: BookshelfPreviewBook) => void | Promise<void>) | null = null;
  export let onFilterStatus:
    | ((status: 'reading' | 'unstarted' | 'finished') => void | Promise<void>)
    | null = null;
  export let onFilterFormat: ((format: string) => void | Promise<void>) | null = null;
  export let onFilterCollection: ((collection: string) => void | Promise<void>) | null = null;
  export let onFilterTag: ((tag: string) => void | Promise<void>) | null = null;

  $: currentGroupBy = browseState.groupBy === 'none' ? 'author' : browseState.groupBy;
  $: currentGroupLabel = browseState.groupScope;
  $: shelfGroupBy = browseState.groupBy;
  $: browseSurface = buildLibraryBrowseSurfaceModel(browseState, browseBooks, shelfBooks);

  const isActionAvailable = (action: LibraryBrowseAction) =>
    getLibraryBrowseActionAvailability(browseState, action).kind === 'allowed';

  const getActionReasonLabel = (action: LibraryBrowseAction) =>
    getLibraryBrowseActionReasonLabel(browseState, action);

  const getTrailAvailability = (index: number) =>
    isActionAvailable({
      type: 'jump-trail',
      index
    });

  const getTrailReasonLabel = (index: number) =>
    getActionReasonLabel({
      type: 'jump-trail',
      index
    });

  const getCurrentSiblingAvailability = (label: string, groupBy: LibraryGroupBy) =>
    isActionAvailable({
      type: 'switch-sibling',
      groupBy,
      label,
      trail: browseState.trail
    });

  const getCurrentSiblingReasonLabel = (label: string, groupBy: LibraryGroupBy) =>
    getActionReasonLabel({
      type: 'switch-sibling',
      groupBy,
      label,
      trail: browseState.trail
    });

  const isPivotAvailable = (groupBy: LibraryGroupBy, value: string) =>
    isActionAvailable({
      type: 'enter-group',
      groupBy,
      label: value
    });

  const getPivotReasonLabel = (groupBy: LibraryGroupBy, value: string) =>
    getActionReasonLabel({
      type: 'enter-group',
      groupBy,
      label: value
    });

  const getTrailLandingGroupBy = (landing: LibraryTrailLanding) =>
    getLibraryLandingGroupBy(browseState, currentGroupBy, landing.index);

  const isTrailSiblingAvailable = (label: string, groupBy: LibraryGroupBy, trailIndex: number) =>
    isActionAvailable({
      type: 'switch-sibling',
      groupBy,
      label,
      trail: browseState.trail.slice(0, trailIndex)
    });

  const getTrailSiblingReasonLabel = (
    label: string,
    groupBy: LibraryGroupBy,
    trailIndex: number
  ) =>
    getActionReasonLabel({
      type: 'switch-sibling',
      groupBy,
      label,
      trail: browseState.trail.slice(0, trailIndex)
    });

  const isEnterFromTrailAvailable = (
    trailIndex: number,
    label: string,
    groupBy: LibraryGroupBy
  ) =>
    isActionAvailable({
      type: 'enter-from-trail',
      trailIndex,
      groupBy,
      label
    });

  const getEnterFromTrailReasonLabel = (
    trailIndex: number,
    label: string,
    groupBy: LibraryGroupBy
  ) =>
    getActionReasonLabel({
      type: 'enter-from-trail',
      trailIndex,
      groupBy,
      label
    });

  const isEnterGroupAvailable = (label: string, groupBy: LibraryGroupBy) =>
    isActionAvailable({
      type: 'enter-group',
      groupBy,
      label
    });

  const getEnterGroupReasonLabel = (label: string, groupBy: LibraryGroupBy) =>
    getActionReasonLabel({
      type: 'enter-group',
      groupBy,
      label
    });
</script>

{#if browseSurface.overview}
  <LibraryBrowseNavigator
    eyebrow="当前浏览导航"
    title={browseSurface.overview.title}
    summary={browseSurface.overview.summary}
    trail={browseState.trail}
    {currentGroupBy}
    currentGroupLabel={currentGroupLabel}
    siblings={browseSurface.siblingGroups}
    trailAvailability={browseState.trail.map((_, index) => getTrailAvailability(index))}
    trailReasonLabels={browseState.trail.map((_, index) => getTrailReasonLabel(index))}
    trailGuardExplanations={browseSurface.trailGuardExplanations}
    siblingAvailability={browseSurface.siblingGroups.map((sibling) =>
      getCurrentSiblingAvailability(sibling.label, currentGroupBy))}
    siblingReasonLabels={browseSurface.siblingGroups.map((sibling) =>
      getCurrentSiblingReasonLabel(sibling.label, currentGroupBy))}
    siblingGuardExplanations={browseSurface.siblingGuardExplanations}
    pivotGuardExplanations={browseSurface.pivotGuardExplanations}
    pivots={browseSurface.overview.pivots}
    {isPivotAvailable}
    {getPivotReasonLabel}
    onJumpTrail={(index) => onDispatchBrowseAction({ type: 'jump-trail', index })}
    onSelectSibling={(label, groupBy) =>
      onDispatchBrowseAction({
        type: 'switch-sibling',
        groupBy,
        label,
        trail: browseState.trail
      })}
    onSelectPivot={(groupBy, value) =>
      onDispatchBrowseAction({
        type: 'enter-group',
        groupBy,
        label: value
      })}
  />
{/if}

<LibraryBrowseTrailLandings
  landings={browseSurface.trailLandings}
  {viewMode}
  getLandingGroupBy={getTrailLandingGroupBy}
  getTrailActionExplanations={(landing) =>
    getLibraryTrailActionExplanations(browseState, landing)}
  getTrailSiblingExplanations={(landing) =>
    getLibraryTrailSiblingExplanations(
      browseState,
      landing.siblingGroups,
      landing.index,
      currentGroupBy
    )}
  isJumpAvailable={getTrailAvailability}
  getJumpReasonLabel={getTrailReasonLabel}
  onJumpTrail={(index) => onDispatchBrowseAction({ type: 'jump-trail', index })}
  isSiblingAvailable={isTrailSiblingAvailable}
  getSiblingReasonLabel={getTrailSiblingReasonLabel}
  onSelectSibling={(label, groupBy, trailIndex) =>
    onDispatchBrowseAction({
      type: 'switch-sibling',
      groupBy,
      label,
      trail: browseState.trail.slice(0, trailIndex)
    })}
  getBlockedGroupExplanations={(landing, groupBy) =>
    getLibraryBlockedTrailGroupExplanations(browseState, landing, groupBy)}
  {isEnterFromTrailAvailable}
  {getEnterFromTrailReasonLabel}
  onEnterFromTrail={(trailIndex, label, groupBy) =>
    onDispatchBrowseAction({
      type: 'enter-from-trail',
      trailIndex,
      groupBy,
      label
    })}
  {onOpenLink}
/>

{#if browseSurface.overview}
  <LibraryBrowseOverview
    overview={browseSurface.overview}
    groupBy={currentGroupBy}
    siblingGroups={browseSurface.siblingGroups}
    siblingGuardExplanations={browseSurface.siblingGuardExplanations}
    pivotGuardExplanations={browseSurface.pivotGuardExplanations}
    isSiblingAvailable={getCurrentSiblingAvailability}
    getSiblingReasonLabel={getCurrentSiblingReasonLabel}
    onSelectSibling={(label, groupBy) =>
      onDispatchBrowseAction({
        type: 'switch-sibling',
        groupBy,
        label,
        trail: browseState.trail
      })}
    {isPivotAvailable}
    {getPivotReasonLabel}
    onSelectPivot={(groupBy, value) =>
      onDispatchBrowseAction({
        type: 'enter-group',
        groupBy,
        label: value
      })}
  />
{/if}

{#if browseSurface.subgroupShelves.length > 0}
  <section class="group-browse-subgroups" aria-label="当前分组的继续浏览入口">
    {#each browseSurface.subgroupShelves as subgroupSurface}
      <div class="group-browse-subgroup-shelf">
        <div class="group-browse-subgroup-copy">
          <strong>{subgroupSurface.shelf.title}</strong>
          <span>{subgroupSurface.shelf.description}</span>
        </div>
        <BookshelfPreview
          sectionTitle={subgroupSurface.shelf.title}
          books={shelfBooks}
          {viewMode}
          groupBy={subgroupSurface.shelf.groupBy}
          activeGroupLabel=""
          blockedGroupExplanations={subgroupSurface.blockedGroupExplanations}
          groupEnterHintSurface="subgroup"
          onEnterGroupAvailable={isEnterGroupAvailable}
          onEnterGroupReasonLabel={getEnterGroupReasonLabel}
          onEnterGroup={(label, groupBy) =>
            onDispatchBrowseAction({
              type: 'enter-group',
              groupBy,
              label
            })}
          {onOpenLink}
        />
      </div>
    {/each}
  </section>
{/if}

<BookshelfPreview
  sectionTitle={shelfSectionTitle}
  books={shelfBooks}
  {viewMode}
  groupBy={shelfGroupBy}
  activeGroupLabel={currentGroupLabel}
  blockedGroupExplanations={browseSurface.shelfGroupCardExplanations}
  groupEnterHintSurface="group-card"
  onEnterGroupAvailable={isEnterGroupAvailable}
  onEnterGroupReasonLabel={getEnterGroupReasonLabel}
  onEnterGroup={(label, groupBy) =>
    onDispatchBrowseAction({
      type: 'enter-group',
      groupBy,
      label
    })}
  {onOpenLink}
  {onOpenSourcePath}
  {onUpdateBookMetadata}
  {onRemoveBook}
  {onFilterStatus}
  {onFilterFormat}
  {onFilterCollection}
  {onFilterTag}
/>

<style>
  .group-browse-subgroups {
    display: grid;
    gap: 18px;
  }

  .group-browse-subgroup-shelf {
    display: grid;
    gap: 12px;
    padding: 16px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 86%, white 14%);
    background: color-mix(in srgb, var(--surface-panel) 84%, white 16%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.24),
      0 10px 24px rgba(42, 30, 15, 0.04);
  }

  .group-browse-subgroup-copy {
    display: grid;
    gap: 4px;
  }

  .group-browse-subgroup-copy strong {
    color: var(--text-primary);
    font: 600 14px/1.2 var(--font-chrome);
  }

  .group-browse-subgroup-copy span {
    max-width: 54ch;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
  }
</style>

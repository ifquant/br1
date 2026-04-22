<script lang="ts">
  import BookshelfPreview from './BookshelfPreview.svelte';
  import LibraryBrowseNavigator from './LibraryBrowseNavigator.svelte';
  import LibraryBrowseOverview from './LibraryBrowseOverview.svelte';
  import LibraryBrowseTrailLandings from './LibraryBrowseTrailLandings.svelte';
  import type {
    BookshelfPreviewBook,
    LibraryBrowseGuardExplanation,
    LibraryBrowseSurfaceModel,
    LibraryGroupBy,
    LibraryGroupSegment,
    LibraryShelfBook,
    LibraryTrailLanding
  } from '$lib/library/types';

  export let browseSurface: LibraryBrowseSurfaceModel;
  export let trail: LibraryGroupSegment[] = [];
  export let currentGroupBy: LibraryGroupBy = 'author';
  export let currentGroupLabel = '';
  export let viewMode: 'grid' | 'list' = 'grid';
  export let shelfBooks: BookshelfPreviewBook[] = [];
  export let shelfSectionTitle = '书架';
  export let shelfGroupBy: 'none' | LibraryGroupBy = 'none';
  export let showImportTile = false;
  export let onOpenLink: (href: string) => void | Promise<void>;
  export let onImportBooks: (() => void | Promise<void>) | null = null;
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
  export let getTrailAvailability: (index: number) => boolean;
  export let getTrailReasonLabel: (index: number) => string;
  export let onJumpTrail: (index: number) => void | Promise<void>;
  export let getCurrentSiblingAvailability: (label: string, groupBy: LibraryGroupBy) => boolean;
  export let getCurrentSiblingReasonLabel: (label: string, groupBy: LibraryGroupBy) => string;
  export let onSelectCurrentSibling: (
    label: string,
    groupBy: LibraryGroupBy
  ) => void | Promise<void>;
  export let isPivotAvailable: (groupBy: LibraryGroupBy, value: string) => boolean;
  export let getPivotReasonLabel: (groupBy: LibraryGroupBy, value: string) => string;
  export let onSelectPivot: (groupBy: LibraryGroupBy, value: string) => void | Promise<void>;
  export let getLandingGroupBy: (landing: LibraryTrailLanding) => LibraryGroupBy;
  export let getTrailActionExplanations: (
    landing: LibraryTrailLanding
  ) => LibraryBrowseGuardExplanation[];
  export let getTrailSiblingExplanations: (
    landing: LibraryTrailLanding
  ) => LibraryBrowseGuardExplanation[];
  export let isTrailSiblingAvailable: (
    label: string,
    groupBy: LibraryGroupBy,
    trailIndex: number
  ) => boolean;
  export let getTrailSiblingReasonLabel: (
    label: string,
    groupBy: LibraryGroupBy,
    trailIndex: number
  ) => string;
  export let onSelectTrailSibling: (
    label: string,
    groupBy: LibraryGroupBy,
    trailIndex: number
  ) => void | Promise<void>;
  export let getBlockedTrailGroupExplanations: (
    landing: LibraryTrailLanding,
    groupBy: LibraryGroupBy
  ) => LibraryBrowseGuardExplanation[];
  export let isEnterFromTrailAvailable: (
    trailIndex: number,
    label: string,
    groupBy: LibraryGroupBy
  ) => boolean;
  export let getEnterFromTrailReasonLabel: (
    trailIndex: number,
    label: string,
    groupBy: LibraryGroupBy
  ) => string;
  export let onEnterFromTrail: (
    trailIndex: number,
    label: string,
    groupBy: LibraryGroupBy
  ) => void | Promise<void>;
  export let isEnterGroupAvailable: (label: string, groupBy: LibraryGroupBy) => boolean;
  export let getEnterGroupReasonLabel: (label: string, groupBy: LibraryGroupBy) => string;
  export let onEnterGroup: (label: string, groupBy: LibraryGroupBy) => void | Promise<void>;
</script>

{#if browseSurface.overview}
  <LibraryBrowseNavigator
    eyebrow="当前浏览导航"
    title={browseSurface.overview.title}
    summary={browseSurface.overview.summary}
    {trail}
    {currentGroupBy}
    currentGroupLabel={currentGroupLabel}
    siblings={browseSurface.siblingGroups}
    trailAvailability={trail.map((_, index) => getTrailAvailability(index))}
    trailReasonLabels={trail.map((_, index) => getTrailReasonLabel(index))}
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
    {onJumpTrail}
    onSelectSibling={onSelectCurrentSibling}
    {onSelectPivot}
  />
{/if}

<LibraryBrowseTrailLandings
  landings={browseSurface.trailLandings}
  {viewMode}
  {getLandingGroupBy}
  {getTrailActionExplanations}
  {getTrailSiblingExplanations}
  isJumpAvailable={getTrailAvailability}
  getJumpReasonLabel={getTrailReasonLabel}
  {onJumpTrail}
  isSiblingAvailable={isTrailSiblingAvailable}
  getSiblingReasonLabel={getTrailSiblingReasonLabel}
  onSelectSibling={onSelectTrailSibling}
  getBlockedGroupExplanations={getBlockedTrailGroupExplanations}
  {isEnterFromTrailAvailable}
  {getEnterFromTrailReasonLabel}
  {onEnterFromTrail}
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
    onSelectSibling={onSelectCurrentSibling}
    {isPivotAvailable}
    {getPivotReasonLabel}
    onSelectPivot={onSelectPivot}
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
          showImportTile={false}
          blockedGroupExplanations={subgroupSurface.blockedGroupExplanations}
          groupEnterHintSurface="subgroup"
          onEnterGroupAvailable={isEnterGroupAvailable}
          onEnterGroupReasonLabel={getEnterGroupReasonLabel}
          {onEnterGroup}
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
  {showImportTile}
  blockedGroupExplanations={browseSurface.shelfGroupCardExplanations}
  groupEnterHintSurface="group-card"
  onEnterGroupAvailable={isEnterGroupAvailable}
  onEnterGroupReasonLabel={getEnterGroupReasonLabel}
  {onEnterGroup}
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

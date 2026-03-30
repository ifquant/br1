<script lang="ts">
  type Book = {
    title: string;
    author: string;
    status: string;
    progress: string;
    progressPercentLabel?: string;
    coverUrl?: string;
    readerHref?: string;
    restartHref?: string;
    lastOpenedLabel?: string;
  };

  export let sectionTitle = '继续阅读';
  export let books: Book[] = [];
  export let onOpenLink: ((href: string) => void | Promise<void>) | null = null;

  const handleLinkClick = (event: MouseEvent, href: string | undefined) => {
    if (!href || !onOpenLink) return;
    event.preventDefault();
    void onOpenLink(href);
  };

  const handleActionClick = (event: MouseEvent, href: string | undefined) => {
    event.preventDefault();
    event.stopPropagation();
    if (!href || !onOpenLink) return;
    void onOpenLink(href);
  };
</script>

<section class="continue-shelf">
  <header class="shelf-head">
    <div class="heading">
      <h2>{sectionTitle}</h2>
      <p>回到上次停下来的地方。</p>
    </div>
  </header>

  <div class="rows" aria-label={sectionTitle}>
    {#each books as book}
      <article class="row">
        <svelte:element
          this={book.readerHref ? 'a' : 'div'}
          class="row-link"
          href={book.readerHref}
          role={book.readerHref ? 'link' : undefined}
          aria-label={book.readerHref ? `Continue reading ${book.title}` : undefined}
          on:click={(event: MouseEvent) => handleLinkClick(event, book.readerHref)}
        >
          <div class="cover-shell">
            {#if book.coverUrl}
              <img class="cover-image" src={book.coverUrl} alt="" loading="lazy" />
            {:else}
              <div class="cover-fallback" aria-hidden="true">
                <span>{book.title}</span>
              </div>
            {/if}
          </div>
          <div class="copy">
            <strong>{book.title}</strong>
            <span>{book.author}</span>
            <p>{book.lastOpenedLabel || book.status}</p>
          </div>
          <div class="trailing">
            <small>{book.progress}</small>
            {#if book.progressPercentLabel}
              <span class="progress-pill">{book.progressPercentLabel}</span>
            {/if}
            <div class="actions">
              {#if book.restartHref}
                <button
                  type="button"
                  class="secondary-pill"
                  on:click={(event: MouseEvent) => handleActionClick(event, book.restartHref)}
                >
                  从头开始
                </button>
              {/if}
              <span class="resume-pill">继续</span>
            </div>
          </div>
        </svelte:element>
      </article>
    {/each}
  </div>
</section>

<style>
  .continue-shelf {
    display: grid;
    gap: 10px;
  }

  .shelf-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 16px;
    padding-inline: 2px;
  }

  .heading {
    display: grid;
    gap: 3px;
  }

  h2 {
    margin: 0;
    font-size: 15px;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-weight: 600;
    color: var(--text-primary);
  }

  .heading p {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .rows {
    display: grid;
    gap: 10px;
  }

  .row {
    min-width: 0;
  }

  .row-link {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 86%, white 14%);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 90%, white 10%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.34),
      0 10px 24px rgba(42, 30, 15, 0.05);
    text-decoration: none;
    color: inherit;
  }

  .cover-shell {
    width: 40px;
    height: 58px;
    border-radius: 10px;
    overflow: hidden;
    box-shadow:
      0 10px 20px rgba(42, 30, 15, 0.08),
      inset 0 0 0 1px rgba(255, 255, 255, 0.28);
    background: color-mix(in srgb, var(--surface-reader) 85%, white 15%);
  }

  .cover-image,
  .cover-fallback {
    display: block;
    width: 100%;
    height: 100%;
  }

  .cover-image {
    object-fit: cover;
  }

  .cover-fallback {
    display: grid;
    place-items: center;
    padding: 6px;
    text-align: center;
    font: 600 8px/1.2 "Source Serif 4", Georgia, "Noto Serif SC", serif;
    color: color-mix(in srgb, var(--text-primary) 82%, white 18%);
  }

  .copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .copy strong,
  .copy span,
  .copy p,
  .trailing small {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .copy strong {
    font: 600 14px/1.2 "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    color: var(--text-primary);
  }

  .copy span {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .copy p {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .trailing {
    display: grid;
    justify-items: end;
    gap: 6px;
    min-width: 160px;
  }

  .trailing small {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    flex-wrap: wrap;
  }

  .progress-pill,
  .secondary-pill,
  .resume-pill {
    border-radius: 999px;
    font: 600 11px/1 "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .progress-pill {
    padding: 4px 8px;
    background: color-mix(in srgb, var(--surface-panel) 86%, white 14%);
    box-shadow: inset 0 0 0 1px rgba(76, 57, 34, 0.08);
    color: var(--text-secondary);
  }

  .secondary-pill {
    border: 0;
    padding: 5px 9px;
    background: transparent;
    box-shadow: inset 0 0 0 1px rgba(76, 57, 34, 0.12);
    color: var(--text-secondary);
  }

  .resume-pill {
    padding: 5px 9px;
    background: color-mix(in srgb, var(--surface-reader) 82%, white 18%);
    box-shadow:
      inset 0 0 0 1px rgba(76, 57, 34, 0.08),
      0 6px 12px rgba(42, 30, 15, 0.04);
    color: var(--text-primary);
  }

  @media (max-width: 720px) {
    .row-link {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .trailing {
      grid-column: 2;
      justify-items: start;
      min-width: 0;
    }

    .actions {
      justify-content: flex-start;
    }
  }
</style>

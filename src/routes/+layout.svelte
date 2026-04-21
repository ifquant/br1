<script lang="ts">
  import 'overlayscrollbars/styles/overlayscrollbars.css';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { derived } from 'svelte/store';
  import { openReaderTarget, toExternalLibraryFileReaderTarget } from '$lib/services';
  import { invokeTauri, isTauriDesktop } from '$lib/services/platform';

  type AssociatedBookOpenInputRejection = {
    input: string;
    reason: string;
  };

  type AssociatedBookOpenRejectionReport = {
    rejectedInputs: AssociatedBookOpenInputRejection[];
  };

  const ASSOCIATED_BOOK_OPEN_REJECTION_EVENT = 'br1:associated-book-open-inputs-rejected';

  const navItems = [
    { href: '/library', label: 'Library' },
    { href: '/reader', label: 'Reader' }
  ];

  const isLibraryRoute = derived(page, ($page) => $page.url.pathname === '/library');
  const isReaderWindowRoute = derived(
    page,
    ($page) =>
      $page.url.pathname === '/reader' && $page.url.searchParams.get('mode') === 'window'
  );

  let associatedBookOpenNotice = '';
  let associatedBookOpenNoticeDetails = '';
  let associatedBookOpenNoticeTimer: ReturnType<typeof setTimeout> | null = null;

  const clearAssociatedBookOpenNotice = () => {
    associatedBookOpenNotice = '';
    associatedBookOpenNoticeDetails = '';
    if (associatedBookOpenNoticeTimer !== null) {
      clearTimeout(associatedBookOpenNoticeTimer);
      associatedBookOpenNoticeTimer = null;
    }
  };

  const showAssociatedBookOpenNotice = (report: AssociatedBookOpenRejectionReport) => {
    const rejectedInputs = report.rejectedInputs ?? [];
    if (rejectedInputs.length === 0) {
      return;
    }

    const preview = rejectedInputs
      .slice(0, 3)
      .map((entry) => entry.input || entry.reason)
      .join(', ');
    const remaining = rejectedInputs.length - 3;

    associatedBookOpenNotice = `Ignored ${rejectedInputs.length} open-with input${rejectedInputs.length === 1 ? '' : 's'}.`;
    associatedBookOpenNoticeDetails = `${preview}${remaining > 0 ? `, and ${remaining} more` : ''}`;

    if (associatedBookOpenNoticeTimer !== null) {
      clearTimeout(associatedBookOpenNoticeTimer);
    }
    associatedBookOpenNoticeTimer = setTimeout(() => {
      clearAssociatedBookOpenNotice();
    }, 10000);
  };

  const flushAssociatedBookOpenRequests = async () => {
    const requests = await invokeTauri<Array<{ path: string }>>('consume_associated_book_open_requests');
    for (const request of requests) {
      const target = toExternalLibraryFileReaderTarget(request.path);
      const opened = await openReaderTarget(target);
      if (!opened) {
        await goto(target.href);
      }
    }
  };

  onMount(() => {
    if (!isTauriDesktop()) return;

    let disposed = false;
    let flushChain = Promise.resolve();
    let openRequestUnlistenPromise: Promise<(() => void) | void> | null = null;
    let rejectionUnlistenPromise: Promise<(() => void) | void> | null = null;

    const queueFlush = () => {
      flushChain = flushChain
        .then(async () => {
          if (disposed) return;
          await flushAssociatedBookOpenRequests();
        })
        .catch((error) => {
          console.error('Failed to flush associated-book open requests', error);
        });
    };

    (async () => {
      const [{ getCurrentWindow }, { listen }] = await Promise.all([
        import('@tauri-apps/api/window'),
        import('@tauri-apps/api/event')
      ]);
      if (disposed) return;

      const currentWindow = getCurrentWindow();
      if (currentWindow.label !== 'main') {
        return;
      }

      queueFlush();
      rejectionUnlistenPromise = listen<AssociatedBookOpenRejectionReport>(
        ASSOCIATED_BOOK_OPEN_REJECTION_EVENT,
        ({ payload }) => {
          showAssociatedBookOpenNotice(payload);
        }
      );
      openRequestUnlistenPromise = listen('br1:associated-book-open-requested', () => {
        queueFlush();
      });
    })().catch((error) => {
      console.error('Failed to install associated-book open listeners', error);
    });

    return () => {
      disposed = true;
      clearAssociatedBookOpenNotice();
      void openRequestUnlistenPromise?.then((unlisten) => {
        if (typeof unlisten === 'function') {
          unlisten();
        }
      });
      void rejectionUnlistenPromise?.then((unlisten) => {
        if (typeof unlisten === 'function') {
          unlisten();
        }
      });
    };
  });
</script>

<svelte:head>
  <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="br1" />
</svelte:head>

<div class:reader-window-root={$isReaderWindowRoute} class="app-root">
  {#if associatedBookOpenNotice}
    <div class="associated-book-banner" role="status" aria-live="polite">
      <div class="associated-book-banner-copy">
        <strong>{associatedBookOpenNotice}</strong>
        <span>{associatedBookOpenNoticeDetails}</span>
      </div>
      <button type="button" class="associated-book-banner-dismiss" on:click={clearAssociatedBookOpenNotice}>
        Dismiss
      </button>
    </div>
  {/if}

  {#if !$isLibraryRoute && !$isReaderWindowRoute}
    <header class="app-header">
      <div class="brand">
        <span class="mark">br1</span>
        <div class="copy">
          <strong>Bridge Reader</strong>
          <small>Readest-inspired shell on Tauri + SvelteKit</small>
        </div>
      </div>

      <nav class="top-nav" aria-label="primary">
        {#each navItems as item}
          <a class:active={$page.url.pathname === item.href} href={item.href}>{item.label}</a>
        {/each}
      </nav>
    </header>
  {/if}

  <div class="app-frame">
    {#if !$isLibraryRoute && !$isReaderWindowRoute}
      <aside class="side-rail" aria-label="workspace sections">
        <span class="rail-label">Workspace</span>
        {#each navItems as item}
          <a class:active={$page.url.pathname === item.href} href={item.href}>{item.label}</a>
        {/each}
      </aside>
    {/if}

    <main class:reader-window-main={$isReaderWindowRoute} class:library-main={$isLibraryRoute} class="app-main">
      <slot />
    </main>
  </div>
</div>

<style>
  :root {
    --font-chrome: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    --font-reading: "Iowan Old Style", "Palatino Linotype", "Noto Serif SC", Georgia, serif;
    --border-light: rgba(64, 47, 24, 0.08);
    --border-medium: rgba(64, 47, 24, 0.12);
    --surface-page: #f3eee4;
    --surface-panel: #efe7da;
    --surface-reader: #faf6ee;
    --text-primary: #17130f;
    --text-secondary: #5f5548;
    --text-muted: #7c7062;
    --line-soft: var(--border-medium);
    --line-strong: rgba(64, 47, 24, 0.24);
    --accent-reading: #8e5f2a;
  }
  :global([data-theme~="dark"]) {
    --surface-page: #1f1b16;
    --surface-panel: #2a241d;
    --surface-reader: #201b16;
    --text-primary: #f3eee4;
    --text-secondary: #d4c8b5;
    --text-muted: #aa9c87;
    --line-soft: rgba(255, 245, 228, 0.12);
    --line-strong: rgba(255, 245, 228, 0.24);
    --accent-reading: #d39b54;
  }

  :global(body) {
    margin: 0;
    font-family: var(--font-reading);
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .app-root {
    background: var(--surface-page);
    color: var(--text-primary);
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr;
  }

  .app-root.reader-window-root {
    grid-template-rows: 1fr;
    width: 100%;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-page) 96%, white 4%);
  }

  .associated-book-banner {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    padding: 12px 20px;
    border-bottom: 1px solid var(--line-soft);
    background: color-mix(in srgb, var(--surface-panel) 86%, white 14%);
    font-family: var(--font-chrome);
  }

  .associated-book-banner-copy {
    display: grid;
    gap: 3px;
  }

  .associated-book-banner-copy strong {
    font-size: 14px;
  }

  .associated-book-banner-copy span {
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .associated-book-banner-dismiss {
    appearance: none;
    border: 1px solid var(--line-soft);
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    padding: 8px 12px;
    cursor: pointer;
  }

  .app-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    padding: 14px 20px;
    border-bottom: 1px solid var(--line-soft);
    background: color-mix(in srgb, var(--surface-page) 92%, white 8%);
  }

  .brand {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--surface-panel);
    border: 1px solid var(--line-soft);
    font-family: var(--font-chrome);
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .copy {
    display: grid;
    gap: 2px;
    font-family: var(--font-chrome);
  }

  .copy small {
    color: var(--text-muted);
  }

  .top-nav,
  .side-rail {
    font-family: var(--font-chrome);
  }

  .top-nav {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .top-nav a,
  .side-rail a {
    color: var(--text-secondary);
    text-decoration: none;
  }

  .top-nav a {
    padding: 10px 12px;
  }

  .top-nav a.active,
  .side-rail a.active {
    color: var(--text-primary);
  }

  .app-frame {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    min-height: 0;
    width: 100%;
  }

  .app-frame:has(.library-main) {
    grid-template-columns: minmax(0, 1fr);
  }

  .app-frame:has(.reader-window-main) {
    grid-template-columns: minmax(0, 1fr);
  }

  .side-rail {
    display: grid;
    align-content: start;
    gap: 6px;
    padding: 20px 14px;
    border-right: 1px solid var(--line-soft);
    background: color-mix(in srgb, var(--surface-panel) 86%, white 14%);
  }

  .rail-label {
    margin-bottom: 8px;
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .side-rail a {
    padding: 10px 12px;
    border: 1px solid transparent;
  }

  .side-rail a.active {
    border-color: var(--line-soft);
    background: var(--surface-reader);
  }

  .app-main {
    padding: 24px;
    min-width: 0;
  }

  .app-main.library-main {
    padding: 12px 18px 18px;
  }

  .app-main.reader-window-main {
    padding: 0;
    width: 100%;
    background: transparent;
  }

  @media (max-width: 900px) {
    .app-frame {
      grid-template-columns: 1fr;
    }

    .side-rail {
      display: none;
    }

    .app-main {
      padding: 20px;
    }

    .app-main.library-main {
      padding: 0;
    }
  }
</style>

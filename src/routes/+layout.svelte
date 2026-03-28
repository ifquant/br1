<script lang="ts">
  import { page } from '$app/stores';

  const navItems = [
    { href: '/library', label: 'Library' },
    { href: '/reader', label: 'Reader' }
  ];

  // 模仿 readest-app 的主题初始化逻辑：在加载前设置 data-theme
  if (typeof document !== 'undefined') {
    const themeMode = localStorage.getItem('themeMode');
    const themeColor = localStorage.getItem('themeColor');
    if (themeMode && themeColor) {
      document.documentElement.setAttribute('data-theme', `${themeColor}-${themeMode}`);
    }
  }
</script>

<svelte:head>
  <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Readest" />
</svelte:head>

<div class="app-root">
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

  <div class="app-frame">
    <aside class="side-rail" aria-label="workspace sections">
      <span class="rail-label">Workspace</span>
      {#each navItems as item}
        <a class:active={$page.url.pathname === item.href} href={item.href}>{item.label}</a>
      {/each}
    </aside>

    <main class="app-main">
      <slot />
    </main>
  </div>
</div>

<style>
  :root {
    --surface-page: #f3eee4;
    --surface-panel: #efe7da;
    --surface-reader: #faf6ee;
    --text-primary: #17130f;
    --text-secondary: #5f5548;
    --text-muted: #7c7062;
    --line-soft: rgba(64, 47, 24, 0.12);
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
    font-family:
      "Iowan Old Style",
      "Palatino Linotype",
      "Noto Serif SC",
      Georgia,
      serif;
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
    font-family:
      "IBM Plex Sans",
      "Helvetica Neue",
      "Noto Sans SC",
      sans-serif;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .copy {
    display: grid;
    gap: 2px;
    font-family:
      "IBM Plex Sans",
      "Helvetica Neue",
      "Noto Sans SC",
      sans-serif;
  }

  .copy small {
    color: var(--text-muted);
  }

  .top-nav,
  .side-rail {
    font-family:
      "IBM Plex Sans",
      "Helvetica Neue",
      "Noto Sans SC",
      sans-serif;
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
  }
</style>

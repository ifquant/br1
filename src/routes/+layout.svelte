<script>
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
  <slot />
</div>

<style>
  :root {
    --bg: #f6f6f6;
    --fg: #0f0f0f;
    --accent: #646cff;
  }
  :global([data-theme~="dark"]) {
    --bg: #2f2f2f;
    --fg: #f6f6f6;
    --accent: #24c8db;
  }
  .app-root {
    background: var(--bg);
    color: var(--fg);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>
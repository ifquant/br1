<script lang="ts">
  const quickLinks = [
    {
      href: '/library',
      title: 'Library',
      description: '书库入口和继续阅读列表。后续对齐 Readest 的导入、分组和最近阅读能力。'
    },
    {
      href: '/reader',
      title: 'Reader',
      description: '阅读工作区骨架。后续接入 Foliate、TTS、bridge 和阅读状态恢复。'
    }
  ];
</script>

<section class="welcome">
  <div class="eyebrow">br1 / Tauri + SvelteKit</div>
  <h1>Svelte 版阅读器应用骨架</h1>
  <p>
    这一层先解决路由、壳结构和后续迁移落位，不在这里提前混入阅读引擎、AI bridge 或复杂状态。
  </p>

  <div class="actions">
    {#each quickLinks as link}
      <a class="card" href={link.href}>
        <span class="label">{link.title}</span>
        <span class="desc">{link.description}</span>
      </a>
    {/each}
  </div>
</section>

<style>
  .welcome {
    display: grid;
    gap: 16px;
    max-width: 960px;
  }

  .eyebrow {
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: clamp(32px, 5vw, 52px);
    line-height: 1.05;
    font-weight: 600;
  }

  p {
    max-width: 64ch;
    margin: 0;
    color: var(--text-secondary);
    font-size: 16px;
    line-height: 1.7;
  }

  .actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    margin-top: 12px;
  }

  .card {
    display: grid;
    gap: 10px;
    padding: 18px;
    border: 1px solid var(--line-soft);
    background: var(--surface-panel);
    color: inherit;
    text-decoration: none;
    transition:
      transform 120ms ease,
      border-color 120ms ease,
      background 120ms ease;
  }

  .card:hover {
    transform: translateY(-1px);
    border-color: var(--accent-reading);
    background: var(--surface-reader);
  }

  .label {
    font-size: 20px;
    font-weight: 600;
  }

  .desc {
    color: var(--text-secondary);
    line-height: 1.6;
  }
</style>

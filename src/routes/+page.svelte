<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    void goto('/library', { replaceState: true });
  });
</script>

<section class="redirecting">
  <div class="eyebrow">br1 / 书库</div>
  <h1>正在进入书库</h1>
  <p>对齐 Readest 后，根路由默认直接进入书库，减少额外的落地页层。</p>
  <a href="/library">如果没有自动跳转，点这里进入书库。</a>
</section>

<style>
  .redirecting {
    display: grid;
    gap: 14px;
    max-width: 720px;
  }

  .eyebrow {
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: clamp(30px, 4vw, 44px);
    line-height: 1.08;
  }

  p,
  a {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.7;
  }

  a {
    color: var(--accent-reading);
    text-decoration: none;
  }
</style>

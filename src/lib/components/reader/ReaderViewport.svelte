<script lang="ts">
  import {
    READER_ENGINE_HOST_ATTR,
    READER_ENGINE_STATUS_ATTR,
    type ReaderEngineMountState
  } from '$lib/reader';

  export let title = 'Foliate Mount Boundary';
  export let state: ReaderEngineMountState = 'idle';
  export let hint =
    '这里是后续阅读引擎接管的唯一宿主容器。toolbar、sidebar 和 bridge 都不应该直接侵入这个 DOM 边界。';
</script>

<section class="viewport-shell" aria-label="reader viewport shell">
  <header class="viewport-head">
    <div>
      <span class="label">{title}</span>
      <p>{hint}</p>
    </div>
    <span class="state" data-state={state}>{state}</span>
  </header>

  <div class="viewport-frame">
    <div class="viewport-guide">
      <span>Reader Engine Host</span>
      <small>未来由 `foliate-js` 或等价阅读引擎接管</small>
    </div>

    <div
      class="engine-host"
      data-role={READER_ENGINE_HOST_ATTR}
      data-engine-status={READER_ENGINE_STATUS_ATTR}
      aria-label="reader engine host placeholder"
    >
      <div class="engine-inner">
        <strong>mount target</strong>
        <p>正文渲染、翻页、选区、注释和阅读进度都应从这里向外通信，而不是反过来。</p>
      </div>
    </div>
  </div>
</section>

<style>
  .viewport-shell {
    display: grid;
    gap: 14px;
    min-width: 0;
  }

  .viewport-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: start;
  }

  .label {
    display: block;
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .viewport-head p {
    margin: 6px 0 0;
    color: var(--text-secondary);
    line-height: 1.65;
  }

  .state {
    padding: 8px 10px;
    border: 1px solid var(--line-soft);
    background: var(--surface-panel);
    color: var(--text-secondary);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.08em;
  }

  .state[data-state='idle'] {
    color: var(--text-primary);
  }

  .viewport-frame {
    display: grid;
    gap: 12px;
    min-height: 0;
  }

  .viewport-guide {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    color: var(--text-secondary);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
  }

  .viewport-guide small {
    color: var(--text-muted);
  }

  .engine-host {
    display: grid;
    place-items: center;
    min-height: 52vh;
    padding: 24px;
    border: 1px dashed var(--line-strong);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 86%, white 14%);
    outline: none;
  }

  .engine-inner {
    display: grid;
    gap: 8px;
    max-width: 44ch;
    text-align: center;
  }

  .engine-inner p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.7;
  }

  @media (max-width: 760px) {
    .viewport-head,
    .viewport-guide {
      display: grid;
    }
  }
</style>

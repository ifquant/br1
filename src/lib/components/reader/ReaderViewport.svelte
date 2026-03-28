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
    <div
      class="engine-host"
      data-role={READER_ENGINE_HOST_ATTR}
      data-engine-status={READER_ENGINE_STATUS_ATTR}
      aria-label="reader engine host placeholder"
    >
      <div class="engine-paper">
        <div class="paper-header">
          <span>Chapter 3</span>
          <small>Reader Engine Host</small>
        </div>

        <div class="paper-copy" aria-hidden="true">
          <p>当制度开始无法自我修复时，政治衰败并不是突然发生的，而是以缓慢、分层和难以立即察觉的方式积累出来。</p>
          <p>中央正文区必须先像真正的阅读画布，再去承接翻页、选区、注释、TTS 和 bridge 等更复杂的行为。</p>
          <p>这一块下一步会被 `foliate-js` 接管，现在先把主舞台的比例、留白和容器边界摆正。</p>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .viewport-shell {
    display: grid;
    gap: 10px;
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
    margin: 4px 0 0;
    color: var(--text-secondary);
    line-height: 1.55;
    font-size: 13px;
  }

  .state {
    padding: 6px 8px;
    border: 1px solid rgba(64, 47, 24, 0.08);
    background: color-mix(in srgb, var(--surface-panel) 92%, white 8%);
    color: var(--text-secondary);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.08em;
  }

  .state[data-state='idle'] {
    color: var(--text-primary);
  }

  .viewport-frame {
    min-height: 0;
  }

  .engine-host {
    display: grid;
    min-height: 66vh;
    padding: clamp(20px, 4vw, 42px) clamp(18px, 4vw, 48px);
    border: 1px solid rgba(64, 47, 24, 0.06);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 98%, white 2%);
    outline: none;
  }

  .engine-paper {
    display: grid;
    align-content: start;
    gap: 24px;
    width: min(100%, 760px);
    min-height: 100%;
    margin: 0 auto;
    padding: clamp(22px, 4vw, 42px) clamp(22px, 4vw, 56px);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0)),
      #f8f3e9;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.5) inset,
      0 20px 38px rgba(36, 25, 12, 0.08);
  }

  .paper-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    color: var(--text-muted);
    font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .paper-copy {
    display: grid;
    gap: 18px;
    font-size: clamp(18px, 2vw, 21px);
    line-height: 1.95;
    color: #2c241c;
  }

  .paper-copy p {
    margin: 0;
  }

  @media (max-width: 760px) {
    .viewport-head,
    .paper-header {
      display: grid;
    }

    .engine-host {
      min-height: 58vh;
      padding-inline: 10px;
    }
  }
</style>

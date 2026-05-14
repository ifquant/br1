# 0649 Define Reader Inline Translation Contract

## 背景

Readest 的 `useTextTranslation.ts` 把翻译做成阅读表面的能力：观察可见文本块、排队翻译、控制原文/译文显示，并把失败状态保留在当前阅读上下文里。`br1` 之前的翻译能力主要集中在 notebook 的 `翻译模式` 和 AI history 记录里，还缺少一个专门给正文内译文使用的状态合同。

## 主要目标

- 先建立纯 TypeScript 状态机，不直接碰 `ReaderViewport.svelte` 或 provider 网络调用。
- 让正文内译文可以记录候选块、翻译中、已翻译、失败重试、原文/译文可见性。
- 保证隐藏原文或译文只是 presentation 决策，不丢掉已经拿到的译文正文。

## 改动概览

- 新增 `src/lib/reader/inlineTranslation.ts`，集中处理 inline translation 的候选块 upsert、状态切换、错误记录和摘要文案。
- 在 `src/lib/reader/types.ts` 中增加 `ReaderInlineTranslationState` 和 block/status 类型。
- 从 `src/lib/reader/index.ts` 导出新 helper 和类型，供后续 viewport / stage / route 切片复用。
- 新增 `src/lib/reader/inlineTranslation.test.ts`，覆盖空文本过滤、重复 block 去重、可见性切换、失败重试状态和摘要文案。

## 关键知识

- 这个 helper 不拥有 DOM。后续 `ReaderViewport` 可以发现可见文本块，但正文观察、iframe 坐标和 Foliate 渲染细节不应该泄漏进状态机。
- 这个 helper 不拥有 provider。DeepL/Yandex 仍然必须走现有 Tauri-owned provider boundary，不能在 renderer 里新增任意网络请求。
- `showSource` 和 `showTranslation` 是独立开关。用户隐藏某一侧内容时，状态机仍然保留 source/translated payload，避免切换显示时重新翻译。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` PASS，0 errors and 0 warnings。
- `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-inline-translation-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-inline-translation-tests --noEmit false && node --test ./.tmp-inline-translation-tests/src/lib/reader/inlineTranslation.test.js` PASS，5 tests passed。
- `git diff --check` PASS。

## 未覆盖项

- 没有把 inline translation UI 挂到 reader stage。
- 没有观察 Foliate/EPUB iframe DOM，也没有把译文插入正文。
- 没有调用 DeepL/Yandex；provider 集成留给后续 P16 UI/viewport 切片。

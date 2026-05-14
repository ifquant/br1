# 0642 Guard Stale Active Translation Snapshots

## 背景

上一版把翻译 ownership 规则抽到了 `translationOwnership.ts`，但 live snapshot 的 active request 分支仍然少了一个边界检查：如果读者切换到新段落时旧翻译请求刚好完成，旧结果可能被写成新段落的 snapshot。

## 主要目标

确保 active translation result 只有在 `activeRequest.text` 与当前翻译源规范化后相等时，才能生成新的 live translation snapshot。

## 改动概览

- 在 `resolveReaderNextTranslationLiveSnapshot` 的 active request 分支增加 source text match guard。
- 新增回归测试，证明 stale active translation request 不会为新 source 生成 snapshot。
- 删除 `translationOwnership.ts` 中未使用的 `ReaderTranslationProvider` type import。

## 关键知识

- 异步请求完成顺序不等于 UI 当前状态。helper 不能因为 assistance state 是 `ready` 就默认它属于当前 source。
- Snapshot 写入前要验证 provenance；这里最小可用 provenance 是规范化后的 source text。

## 验证

- `./node_modules/.pnpm/node_modules/.bin/tsx --test ./src/lib/reader/translationOwnership.test.ts`（PASS）
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`（PASS）
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores live translation snapshots for the same book across reload|reader restores current-book archived translation provenance across reload|reader restores dedicated translation mode config per book across reload"`（PASS）

## 未覆盖项

- 没有改动 Task 3 的 TTS ownership。
- 没有改动 Task 4 的 workspace mode resolution。

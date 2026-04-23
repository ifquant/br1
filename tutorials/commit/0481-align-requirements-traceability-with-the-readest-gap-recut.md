# 0481 - 把 requirements traceability 对齐到新的 Readest gap phase 切分

上一刀把 `ROADMAP.md`、`STATE.md` 和新的 `READEST-GAP-AUDIT-2026-04.md` 都切到了新的 P0/P1/P2 执行模型。

但 `REQUIREMENTS.md` 的 traceability 表还停在旧的数字 phase：

- `Phase 1`
- `Phase 7`
- `Phase 11`
- `Phase 12`

这会给后续 agent 一个错误信号：好像旧数字 phase 仍然是当前执行主线。

## 这刀做了什么

1. 更新 [`/.planning/REQUIREMENTS.md`](/Users/dev/workspace2/hc_apps/br1/.planning/REQUIREMENTS.md)

   把旧数字 phase 映射改成当前 roadmap 的新切分：

   - `LIB-*` 映射到 `P0-4`
   - `RDR/FMT/DSK` 映射到 `P0-1 / P0-2 / P0-3 / P0-4`
   - `ANT/SRCH` 映射到 `P0-3`
   - `VIEW` 映射到 `P0-2`
   - `SVC` 映射到 `P2-*`
   - `QUAL/DSK-03` 映射到 `P0 exit audit`

2. 增加新的 Readest gap phase coverage 表

   这张表把上一刀新增的 P1/P2 phase 明确接到 gap area：

   - `P1-1`: Dictionary / Wikipedia / in-reading assistance
   - `P1-2`: TTS / focus aids / accessibility
   - `P1-3`: parallel read / code syntax highlighting
   - `P2-1`: OPDS / Calibre
   - `P2-2`: DeepL / Yandex
   - `P2-3`: cross-device sync
   - `P2-4`: KOReader sync

## 为什么这刀重要

这不是重新定义 requirements。

requirements 本体仍然保留原来的 v1/v2 语义；这刀只修 traceability。

修这个映射的原因是：

- `ROADMAP.md` 已经不再按旧数字 phase 执行
- `STATE.md` 已经明确 route-closure 不再是主线
- `READEST-GAP-AUDIT-2026-04.md` 已经把 P1/P2 拆成可执行 phases

如果 `REQUIREMENTS.md` 不同步，后续 planning 很容易重新被旧 `Phase 11 / Phase 12` 这种历史编号拉偏。

## 验证

- `pnpm check`
- `git diff --check`

## 结果

现在四份核心 planning 文档保持一致：

- `FEATURE-PARITY-AUDIT.md`
- `READEST-GAP-AUDIT-2026-04.md`
- `ROADMAP.md`
- `REQUIREMENTS.md`

下一步可以做 `P0 exit audit`，而不是继续修文档之间的显性不一致。

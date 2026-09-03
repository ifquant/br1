# 0709 - 居中 portrait auto-spread 的单页 PDF

## 背景

`S2-R03B6` 对应 Readest 提交 `3ce5a5c8e` 和嵌套 foliate-js 提交 `f6dced2aa`。问题发生在 portrait auto-spread：一个双页 spread 只显示左页或右页时，单边 `auto` margin 会把缩小后的页面推到半个视口，而不是居中。

## 改动

- foliate-js 在 portrait 模式为左右 frame 都返回对称的 inline auto margins。
- landscape 模式继续使用朝书脊方向的单边 auto margin，并显式清空另一侧，避免旋转后遗留旧样式。
- Playwright 使用真实 `sample-outline.pdf` 的双页 spread `1`，分别切换左页和右页并测量页面中心。
- 同一回归再切换为 landscape，验证两页同时显示、书脊相接、margin 已恢复。

## 两个知识点

1. `display: none` 隐藏 spread 的另一页后，原本用于双页对齐的单边 margin 不再成立；单页居中需要两侧 margin 对称。
2. frame 会跨 resize 重用，所以只设置新的 margin 不够，必须同时清空不再需要的另一侧属性。

## 验证

- portrait spread 回归：PASS（重复运行 3/3）
- B1-B6 PDF 联合回归：PASS（6/6）
- `pnpm check`：PASS（0 errors, 0 warnings）
- `pnpm test:reader-helpers`：PASS（71/71）
- `pnpm build`：PASS
- 两个仓库 `git diff --check`：PASS

## 未包含

- auto-spread 阈值或 page-turn 手势调整
- 新增 PDF fixture；现有 sample 的 spread `0` 是单页封面，双页几何使用 spread `1`

下一项是 `S2-R03B7 - Restore scrolled PDF highlights`。

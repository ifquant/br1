# 0705 - 保留连续滚动 PDF 的页内位置

## 背景

`S2-R03B2` 对应 Readest 提交 `dab92c8a4`。外层提交只显示 foliate-js submodule 更新，必须继续比较 `2204a28..9f12ba9` 才能看到真正的滚动锚点修复。

## 改动

- 在 foliate-js fixed-layout 引擎中，以“页索引 + 页内 fraction”替代只记页编号的恢复方式。
- 在 PDF 页面实际尺寸更新和滚动布局 resize 两条路径复用该锚点。
- 新增真实桌面布局浏览器回归：把未加载的第三页占位高度缩半并停在页内约 40%，确认真实尺寸落地及随后缩放到 125% 时，页内位置误差都小于 3%。
- 把 Readest foliate-js gitlink 的 old/new SHA 审计写成后续每个提交的固定规则。

## 验证

- `node --check ../foliate-js/fixed-layout.js`：PASS
- PDF 连续滚动位置回归：PASS（重复运行 3/3）
- B1/B2 PDF 联合回归：PASS（2/2）
- `pnpm check`：PASS（0 errors, 0 warnings）
- `pnpm test:reader-helpers`：PASS（71/71）
- `pnpm build`：PASS

## 未包含

- `S2-R03B3` 的 fractional-DPI PDF 页缝
- 后续滚轮、pinch、单页居中和 scrolled highlight 修复
- foliate-js 既有 package-lock/Rollup vendor 路径漂移

下一项是 `S2-R03B3 - Remove fractional-DPI PDF spread seams`。

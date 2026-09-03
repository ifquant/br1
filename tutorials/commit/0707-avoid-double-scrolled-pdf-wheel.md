# 0707 - 避免连续滚动 PDF 的滚轮双重位移

## 背景

`S2-R03B4` 对应 Readest 提交 `1b44b95d3`。外层提交把 `packages/foliate-js` 从 `24d9a0c0e` 更新到 `e366bdb79`；嵌套提交才包含实际的 wheel 处理修复。

## 根因

连续滚动页的 iframe 使用 `scrolling="no"`，浏览器会把其中的 wheel 输入原生链到外层阅读器。旧监听器同时对外层调用 `scrollBy()`，所以指针位于页面正文时原生滚动和脚本滚动叠加；指针位于页边距时事件直接落在宿主上，反而只有一次滚动。

## 改动

- 删除 iframe wheel 监听器中的宿主 `scrollBy()`。
- 保留关闭 iframe pointer events 的动作，让同一手势的后续 tick 直接到达宿主。
- 新增真实 PDF 回归：等待连续滚动页 iframe 恢复交互后，从其 document 发送 synthetic wheel，确认 pointer events 被关闭但宿主没有发生脚本位移。
- 审计表把 Readest 外层提交和 foliate-js 嵌套提交一并标为 `covered`。

## 两个知识点

1. 不可滚动 iframe 的 wheel 可以由浏览器原生 scroll chaining 交给祖先滚动容器，不需要手工转发。
2. Synthetic wheel 不触发浏览器默认滚动，适合隔离验证监听器是否额外执行了脚本滚动。

## 验证

- `node --check ../foliate-js/fixed-layout.js`：PASS
- 连续滚动 PDF wheel 回归：PASS（重复运行 3/3）
- B1-B4 PDF 联合回归：PASS（4/4）
- `pnpm check`：PASS（0 errors, 0 warnings）
- `pnpm test:reader-helpers`：PASS（71/71）
- `pnpm build`：PASS
- 两个仓库 `git diff --check`：PASS

## 未包含

- `S2-R03B5` 的 pinch 和 pan 手势协调
- 单页居中和连续滚动高亮修复
- foliate-js 既有 package-lock/Rollup vendor 路径漂移

下一项是 `S2-R03B5 - Stabilize scrolled PDF pinch and pan`。

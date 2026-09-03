# 0710 - 恢复连续滚动 PDF 的高亮

## 背景

`S2-R03B7` 对应 Readest 提交 `6f67be703` 和嵌套 foliate-js 提交 `9fde61a10`。paginated PDF 已在 B1 处理异步 text-layer 重建，但 scrolled page 仍在 Promise 完成前重绘旧 overlayer，导致高亮 Range 失效。

## 改动

- foliate-js 在 scrolled `frame.onZoom()` 完成后调用既有 overlayer refresh。
- Playwright 在真实 PDF 连续滚动模式创建高亮，保存旧 SVG 引用，再触发 scale-factor 重渲染。
- 回归同时证明旧 SVG 已断开、新 SVG 已连接、对象身份发生变化，并且 drawing 恢复。
- 测试在创建 selection 前等待初始 overlayer 替换、所有已加载 text layer 就绪和 renderer 连续 300ms 空闲，避免后续 `relocate` 清空选区。

## 两个知识点

1. overlayer map 指向新对象并不等于页面已恢复；还要证明旧节点断开、新节点接入且 drawing 重新生成。
2. PDF text layer 与滚动定位都是异步过程；测试必须等待真实生命周期边界，不能靠重复点击掩盖竞态。

## 验证

- scrolled highlight 回归：PASS（重复运行 10/10）
- B1-B7 PDF 联合回归：PASS（7/7）
- `pnpm check`：PASS（0 errors, 0 warnings）
- `pnpm test:reader-helpers`：PASS（71/71）
- `pnpm build`：PASS
- 两个仓库 `git diff --check`：PASS

## 未包含

- annotation 持久化或跨页高亮模型调整
- OS/WebView 级手势验证

下一项是 `S2-R03C - Verify packaged PDF runtime and text sharpness`。

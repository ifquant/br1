# 0712 - 对齐 PDF 页码、复制与跨页选择

## 背景

`S2-R03D` 对齐 Readest 提交 `3e9aacba1`、`a2f123ff9`、`4df8b37b7` 和 `9e1f72ae7`。这些提交分别处理 PDF 参考页码、复制时的断行重建、滚动模式跨页选择，以及物理页数和进度端点。

## 改动

- foliate 只在 PDF 自带有意义的 PageLabels 时暴露带物理索引的 `pageList`，并让数字页目标走现有导航解析路径。
- br1 页脚显示文档参考页码，同时保留完整物理页数；进度条的 0 和 100 端点不再因请求 nonce 碰撞被忽略。
- PDF 复制根据 text layer 几何关系区分普通换行、段落间隔、CJK 连写和小写连字符续行，并保留 Range 的局部边界。
- 桌面滚动 PDF 可以跨连续已加载页拖选；每页保留独立 DOM Range 和精确 CFI，界面仍把它作为一次选择、复制、批注或高亮操作。
- 重复高亮同一跨页选区时，全部已存在则整体取消；仅部分存在时只补缺失页，不制造重复 CFI。
- 跨页选择提交后，新的单页选择可以正常替换旧状态；翻页、跳转、模式变化和组件销毁会清理手势状态。

## 两个知识点

1. PDF 参考页码不是物理页索引。目录中的 `i`、`ii` 或正文 `1` 应用于显示和跳转，但总页数仍必须来自完整物理页序列。
2. 浏览器的原生 `Selection` 不能跨 iframe。固定布局 PDF 必须为每个页面保存一个 Range 和 CFI，再在应用状态中组成一次逻辑选择。

## 验证

- foliate PageLabels：PASS（2/2）
- `pnpm test:reader-helpers`：PASS（76/76）
- PDF 页码、进度端点、DOM Range 复制、滚动跨页与分页负例：PASS（5/5；bundled Chromium 145 按上游 Chromium 148 最低边界跳过原生拖选）
- 确定性滚动跨页重复回归：PASS（5/5）
- Chrome 152 真实 `page.mouse` 跨 iframe 拖选：PASS（5/5）
- `pnpm check`：PASS（0 errors, 0 warnings）
- `pnpm build`：PASS
- 两仓 `git diff --check`：PASS
- fresh Terra high fix re-review：PASS（无 findings）

## 证据边界

跨页选择只覆盖桌面滚动固定布局 PDF 的连续已加载页面。Playwright 同时覆盖 Chrome 152 的真实鼠标输入和确定性的 origin iframe 事件路径，但不等于物理鼠标在打包 Tauri WebView 中的人工验收；移动端选择手柄不在本任务范围。

下一项是 `S2-R03E - Close PDF metadata and chrome edges`。

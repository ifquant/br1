# 0704 - 恢复双页 PDF 重渲染后的批注

## 背景

Readest 提交 `3bbc2071c` 修复了双页 PDF 批注在重新渲染后消失的问题。br1 原先虽然能读取 PDF 文本选区，但产品层把 PDF 降级为仅复制；同时 PDF.js 重建文本层后，foliate overlayer 仍保存旧 DOM 的 `Range`。

## 改动

- 让 PDF 遵循已有格式能力表，复用 EPUB/MOBI 等格式的笔记和高亮流程。
- foliate renderer 重建 overlayer 后，`ReaderViewport` 通过现有 `syncNotesToView()` 恢复当前书批注。
- 新增真实浏览器回归：打开样例 PDF，进入双页，创建高亮，触发缩放重渲染，再确认 overlayer 已替换且高亮仍存在。
- 将 `3bbc2071c` 标为 `covered`，并把余下六个 PDF 提交拆成 `S2-R03B2` 至 `S2-R03B7`。

## 为什么不做 PDF 专用笔记状态

PDF 已能生成稳定 CFI。宿主只需在 `create-overlay` 时重放现有 notes，单独维护 PDF 批注缓存会造成两套状态和删除同步问题。

## 验证

- `pnpm check`：PASS（0 errors, 0 warnings）
- `pnpm test:reader-helpers`：PASS（71/71）
- PDF 批注与主题浏览器回归：PASS（4/4）
- `pnpm build`：PASS
- `node --check ../foliate-js/fixed-layout.js`：PASS

## 未包含

- 连续滚动 PDF 的位置、高亮与手势修复
- 分数 DPR 页缝、单页 portrait 居中和打包 PDF 清晰度验证

下一项是 `S2-R03B2 - Preserve continuous-scroll PDF position after rerender`。

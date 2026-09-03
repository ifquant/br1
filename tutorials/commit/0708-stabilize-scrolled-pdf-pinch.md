# 0708 - 稳定连续滚动 PDF 的 pinch 与 pan

## 背景

`S2-R03B5` 对应 Readest 提交 `f8916e128`。该提交把 foliate-js 从 `6f1a19018` 更新到 `0fa407c4c`，包含嵌套提交 `8bcb61e` 和 `0fa407c`。

仅更新引擎不足以完成对齐：Readest 原本已有触摸事件层调用 `pinchZoom()` 与 `pinchEnd()`，br1 没有调用者。因此本次同时补齐 fixed-layout 能力和 ReaderViewport 的最小触摸桥接。

## 改动

- foliate-js 对整个连续滚动容器做实时 pinch transform，并以视口中心为原点。
- 释放时记录中心页屏幕位置，正式重排后恢复同一页的 X/Y rect。
- 放大后的容器支持横向 overflow 和原生单指 pan，页间距也随 zoom 缩放。
- pinch 期间暂停现有 IntersectionObserver，结束后恢复观察。
- iframe 空闲时保持可交互，宿主滚动时临时关闭 pointer events。
- ReaderViewport 在现有 foliate `load` 边界绑定 PDF 双指事件，以 `event.touches` 汇集落在不同 PDF 元素上的全部活动触点，再用 `screenX/screenY` 计算比例。
- 实时预览和释放后的本地缩放都限制在 50%-500%；取消手势或切换阅读模式会清除 transform，且不会遗留缩放锚点。
- 缩放只属于当前 viewport；打开新书时重置为 100%，不写入全局 reader settings。

## 两个知识点

1. 实时 CSS transform 与正式布局重排是两个阶段；释放前记录屏幕 rect，才能让提交后的几何回到用户看到的位置。
2. 引擎公开方法没有调用者时不能算产品能力，端到端测试必须从 iframe 输入一直走到正式 scale-factor 提交。

## 验证

- `node --check ../foliate-js/fixed-layout.js`：PASS
- 连续滚动 PDF pinch 回归：PASS（重复运行 3/3）
- B1-B5 PDF 联合回归：PASS（5/5）
- `pnpm check`：PASS（0 errors, 0 warnings）
- `pnpm test:reader-helpers`：PASS（71/71）
- `pnpm build`：PASS
- 两个仓库 `git diff --check`：PASS

## 未包含

- 后续提交中的双指 scroll/pinch 激活阈值
- 每本书的 PDF 缩放持久化模型
- 跨两个 page iframe 的 pinch
- foliate-js 既有 package-lock/Rollup vendor 路径漂移

下一项是 `S2-R03B6 - Center lone portrait PDF pages`。

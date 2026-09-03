# 0706 - 消除分数 DPR 下的 PDF 双页白缝

## 背景

`S2-R03B3` 对应 Readest 提交 `a9c0f3d46`。外层提交把 `packages/foliate-js` 从 `981298cf4` 更新到 `24d9a0c0e`；嵌套提交才包含实际的 PDF canvas 尺寸修复。

## 根因

PDF 渲染 viewport 已乘以 `devicePixelRatio`，在 Windows 150% 缩放等环境中可能得到小数宽度。`canvas.width` 必须变为整数，如果 canvas 的布局宽度也跟随这个取整值，根文档再执行 `scale(1 / devicePixelRatio)` 后，画布会略窄于页框，双页书脊就可能露出一像素背景。

## 改动

- foliate-js 保留整数 bitmap 宽高，同时把未取整 viewport 写入 canvas CSS 宽高。
- 新增 DPR 1.5 的真实浏览器回归，打开双页 PDF 并读取两个实际 iframe 的 canvas 几何。
- 测试确认至少一个 bitmap 宽度发生向下取整，同时 CSS 宽度仍等于理想 viewport，除以 DPR 后与逻辑页框一致。
- 审计表把外层提交与 foliate-js 嵌套提交一并标为 `covered`。

## 两个知识点

1. Canvas 的 bitmap 尺寸和 CSS 布局尺寸是两个独立坐标系；高 DPI 渲染通常需要同时设置。
2. 视觉缝隙最好用几何不变量验证，截图像素颜色容易受抗锯齿和平台差异影响。

## 验证

- `node --check ../foliate-js/pdf.js`：PASS
- DPR 1.5 PDF 双页回归：PASS（重复运行 3/3）
- B1-B3 PDF 联合回归：PASS（3/3）
- `pnpm check`：PASS（0 errors, 0 warnings）
- `pnpm test:reader-helpers`：PASS（71/71）
- `pnpm build`：PASS
- 两个仓库 `git diff --check`：PASS

## 未包含

- `S2-R03B4` 的连续滚动 PDF 滚轮输入稳定性
- 后续 pinch、单页居中和连续滚动高亮修复
- foliate-js 既有 package-lock/Rollup vendor 路径漂移

下一项是 `S2-R03B4 - Stabilize scrolled PDF wheel input`。

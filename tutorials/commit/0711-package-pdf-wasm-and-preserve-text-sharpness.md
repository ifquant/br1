# 0711 - 打包 PDF WASM 并保持文字清晰、可选

## 背景

`S2-R03C` 对齐 Readest 提交 `9b4db4449`、`2a837cb50` 和 `3ca5d5879`。当前 PDF.js 5.6.205 已经让 worker 在运行时请求 JBIG2、OpenJPEG 与 QCMS WASM，但 br1 仍用文件白名单复制；foliate 的透明文本层也没有抵消系统字体放大。

## 改动

- `pnpm build` 先重建 PDF vendor，复制 `pdfjs-dist/wasm` 整目录及 fallback、license 文件。
- vendor 脚本从自身位置推导仓库路径，不再写死本机绝对路径。
- host preflight 检查 foliate 实际加载的 `pdf.worker.mjs`、三种 WASM 和 no-WASM fallback。
- 引入 Apache-2.0 的 Mozilla pdf.js 合成 JBIG2 fixture，并用真正的 debug macOS `br1.app` 打开它、采样非白 canvas 像素。
- foliate 测量 WebView 字体倍率并只修正 text-layer glyph scale；桌面 canvas 继续直接使用完整 `devicePixelRatio`。
- WebDriver harness 增加 packaged 模式，原有 dev 启动与参数路径保持不变。

## 两个知识点

1. 静态资源存在不等于桌面包可用；需要启动 `.app` 内二进制，经过真实 asset protocol、MIME、worker 和 WASM 加载链证明解码结果。
2. “完整复制”测试不应固定当前 WASM 名单；它应扫描 worker 的真实引用，使未来新增解码器自动进入校验范围。

## 验证

- debug macOS `.app` JBIG2 smoke：PASS（1/1）
- built-frontend vendor/runtime：PASS（3/3）
- 字体缩放与桌面全 DPR Playwright：PASS（2/2）
- foliate 字体缩放测试：PASS（2/2）
- `pnpm check`：PASS（0 errors, 0 warnings）
- `pnpm test:reader-helpers`：PASS（71/71）
- E2E TypeScript、shell syntax、两仓 `git diff --check`：PASS
- fresh Terra high review：PASS（无 findings）

## 证据边界

字体 1.25 倍回归通过确定性 `offsetHeight` 模拟证明补偿公式与真实 PDF text layer 写入，不等于在修改系统 accessibility 字体设置后的物理 WebView 验收。该设备级选择对齐仍保留为人工检查。

下一项是 `S2-R03D - Align PDF labels, copy, and cross-page selection`。

# 0703 Add Optional PDF Theme Colors

## 背景

Readest 的三个上游提交分别解决了 PDF 主题色渲染、默认关闭的用户开关，以及不支持 Canvas 2D filter 时隐藏入口。br1 已能打开 PDF，但此前 PDF 页面始终保留原始颜色，阅读氛围只作用于外层界面。

## 改动

- 在现有 `ReaderSettings` 中加入默认关闭的 `applyThemeToPdf`，继续复用同一套本地持久化和同步规范化链路。
- PDF 打开时把当前阅读主题的背景色和文字色传给 Foliate `pageColors`；关闭选项或离开 PDF 时清理颜色。
- 在 PDF 的“更多操作”菜单中加入可访问的复选菜单项，非 PDF 不显示。
- 把 Canvas filter 能力判断放进现有平台服务边界，并排除 Safari 及已知不支持的 macOS、iOS、Linux 原生 WebView。
- 增加浏览器回归，覆盖默认关闭、切换主题、重载持久化和 Safari 隐藏入口。

## 两个关键知识点

### 1. 设置值和平台能力是两件事

用户偏好可以持久化为 `true`，但运行时仍必须先通过平台能力判断。这样同一份同步设置迁移到不支持 Canvas filter 的设备时，不会显示一个无法工作的入口，也不会把不安全的渲染参数传给 PDF.js。

### 2. PDF 主题色由 PDF.js 重绘，不是外层 CSS 覆盖

普通 EPUB 文本可以通过 iframe 样式改变颜色；PDF 页面主要绘制在 canvas 上，外层背景色不会改变页面内容。Foliate 的 `pageColors` 会把前景色和背景色交给 PDF.js 的高对比度滤镜路径，因此必须在固定布局 renderer 边界设置。

## 验证

- `pnpm check`：PASS，0 errors / 0 warnings
- `pnpm test:reader-helpers`：PASS，71/71
- 同步模型测试：PASS，5/5
- PDF 主题 Playwright：PASS，3/3
- PDF 打开并重载 Playwright：PASS，1/1
- macOS Tauri WebDriver PDF 恢复和不支持入口隐藏：PASS，1/1

## 未包含

本提交只完成 `S2-R03A`。PDF 双页批注、连续滚动、清晰度、扫描件、跨页选择和元数据问题已拆到 `S2-R03B` 至 `S2-R03E`，下一项是 `S2-R03B`。

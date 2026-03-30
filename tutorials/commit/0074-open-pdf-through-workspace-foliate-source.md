## 背景

`br1` 的 EPUB 已经能打开，但 PDF 仍然失败。继续对比 `Readest` 后，发现问题不是 PDF.js 资源没带上，而是 `br1` 仍然通过 `node_modules` 这层缓存后的 `foliate-js` 代码在跑，导致刚修过的 `pdf.js` 根本没进入真实 reader 链路。

## 主要目标

- 让 `br1` 在开发模式下直接使用本地 `../foliate-js` 源码
- 让 PDF 真正按 `Readest` 的 `/vendor/pdfjs` 模式打开
- 把桌面 smoke 断言改成同时适用于 EPUB / PDF

## 改动概览

- 在 [`vite.config.js`](/Users/dev/workspace2/hc_apps/br1/vite.config.js) 中把 `foliate-js` alias 到本地 `../foliate-js`
- 允许 Vite 访问工作区外的 `foliate-js` 源目录，并补上 `construct-style-sheets-polyfill`
- 保留并提交 [`static/vendor/pdfjs`](/Users/dev/workspace2/hc_apps/br1/static/vendor/pdfjs) 这套静态资源，让 reader 真走 `/vendor/pdfjs/*`
- 调整 [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts) 的最后一条桌面 smoke：从“必须有 metadata.title”改成“无 stageError 且有真实 location state”
- 让 [`library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 继续把 PDF 放在验证优先顺序的前面，便于回归

## 关键知识

### 1. 本地 `file:` 依赖不等于“开发时一定走源码”

包管理器把本地目录链接进 `node_modules` 后，Vite 仍然可能把它当作依赖来做缓存转换。  
如果你想像 `Readest` 那样，调一个库文件立刻影响应用真实路径，最稳的方式是显式 alias 到源码目录。

### 2. 自动化断言要贴近真实产品语义

“书打开了”对 EPUB 和 PDF 的表现并不完全一样。  
PDF 可能没有你预期的 `metadata.title`，但只要：
- reader 没有 `stageError`
- `lastLocation` / `location.total` 出来了  
就已经说明打开链是通的。测试如果把“元数据存在”误写成“打开成功”的必要条件，就会产生假红。

## 补充知识

- 这次定位最有价值的一步，是对比“reader 实际打开 PDF 时新增了哪些资源”。当资源从 `node_modules/.pnpm/.../vendor/pdfjs/*.mjs?url` 切成 `@fs/.../foliate-js/*.js + /vendor/pdfjs/*.mjs`，说明真实路径终于对齐到我们想要的源码模式了。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `bash /Users/dev/workspace2/hc_apps/br1/scripts/automation/test-tauri-webdriver.sh "pnpm -C /Users/dev/workspace2/hc_apps/br1 exec wdio run /Users/dev/workspace2/hc_apps/br1/wdio.conf.ts --spec /Users/dev/workspace2/hc_apps/br1/.tmp-pdf-open-state.e2e.ts"` (PASS)
- `bash /Users/dev/workspace2/hc_apps/br1/scripts/automation/test-tauri-webdriver.sh "pnpm -C /Users/dev/workspace2/hc_apps/br1 exec wdio run /Users/dev/workspace2/hc_apps/br1/wdio.conf.ts --spec /Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts"` (PASS after updating the final assertion)

## 未覆盖项

- 这次没有把 PDF 导入结果持久化成更完整的阅读状态，只修了“打开并显示”主链
- 这次没有继续处理 PDF 的更深层功能，例如批注、TTS、章节元信息美化

# 0077：通过宿主代理模块接通 PDF.js，而不是继续修改 foliate-js

## 背景

你明确提出了一点：如果要更像 `Readest`，`foliate-js` 库本身不应该继续被 `br1` 特化，问题应该尽量在宿主应用里解决。

这次就是沿着这个判断继续做的。

在 `Readest` 里，`foliate-js/pdf.js` 会写：

```js
import '@pdfjs/pdf.min.mjs'
```

然后由宿主应用提供 `@pdfjs` 这层运行时契约。

但 `br1` 的宿主不是 `Readest` 的 Next/Vinext 组合，而是 `SvelteKit + Vite + Tauri`。直接照抄 `Readest` 那种“把 `@pdfjs` alias 到 public/vendor/pdfjs”在这里并不会直接成立，因为 `Vite` 不允许把 `public` 里的 JS 当普通源码模块静态导入。

所以这次不是回头再改 `foliate-js`，而是在 `br1` 宿主里加一层**代理模块**。

## 主要目标

- 保持 `foliate-js` 不再继续为 `br1` 特化
- 让 `br1` 继续使用 `setup-vendors` 生成的 `/vendor/pdfjs`
- 在 `Vite` 的限制下，把 `@pdfjs/pdf.min.mjs` 安全接回宿主资源

## 改动概览

- 更新 [`vite.config.js`](/Users/dev/workspace2/hc_apps/br1/vite.config.js)
  - 把 `@pdfjs/pdf.min.mjs` 精确 alias 到宿主代理模块
- 新增 [`pdfjs-host-entry.js`](/Users/dev/workspace2/hc_apps/br1/src/lib/vendor/pdfjs-host-entry.js)
  - 由这个源码模块在运行时动态 `import('/vendor/pdfjs/pdf.min.mjs')`
- 更新 [`setup-pdfjs-vendor.mjs`](/Users/dev/workspace2/hc_apps/br1/scripts/setup-pdfjs-vendor.mjs)
  - 重新把 `pdf.mjs` / `pdf.worker.mjs` 及其 map 纳入正式输出
  - 因为当前 `foliate-js/pdf.js` 仍会请求 `pdf.worker.mjs`

## 关键知识

### 1. `public` 目录里的 JS 和源码模块不是一回事

在 `Vite` 里，`public/` 或这里的 `static/` 目录更像“原样提供给浏览器的静态资源区”。

它们可以通过 URL 访问，比如：

```text
/vendor/pdfjs/pdf.min.mjs
```

但不能天然当成“参与 Vite 模块图解析的源码模块”来静态 `import`。  
这就是为什么直接把 `@pdfjs` alias 到 `public/vendor/pdfjs` 在 `Readest` 那边能跑，但在 `br1` 这边不能直接照搬。

### 2. 宿主代理模块是一种很典型的“适配层”

这次新增的 [`pdfjs-host-entry.js`](/Users/dev/workspace2/hc_apps/br1/src/lib/vendor/pdfjs-host-entry.js) 就是一个适配层：

- 对 `foliate-js` 来说，它还是在 import `@pdfjs/pdf.min.mjs`
- 对 `Vite` 来说，它导入的是一个正常的源码模块
- 对浏览器来说，真正被加载的是 `/vendor/pdfjs/pdf.min.mjs`

这类代理层的价值在于：

- 不用继续改上游库
- 也不用强迫 bundler 支持它本来不喜欢的 import 方式

## 验证

我实际运行了：

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 setup-vendors
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
bash /Users/dev/workspace2/hc_apps/br1/scripts/automation/test-tauri-webdriver.sh "pnpm -C /Users/dev/workspace2/hc_apps/br1 exec wdio run /Users/dev/workspace2/hc_apps/br1/wdio.conf.ts --spec /Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts"
```

结果：

- `setup-vendors` `PASS`
- `check` `PASS`
- 桌面 WDIO smoke `PASS`
  - 包括 `loads metadata after opening the first library book`

## 未覆盖项

- 这次没有继续调整 `reader` 的视觉或交互
- 这次没有修改 `foliate-js` 仓库本体
- 这次只解决了 `br1` 宿主如何以更接近 `Readest` 的方式接入 PDF.js

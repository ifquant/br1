# 0075：把 PDF vendor 流程正式化，改成更像 Readest 的 setup-vendors

这次提交不是在修一个新的阅读器 bug，而是在把已经跑通的 PDF 资源链收成正式流程。

之前 `br1` 的 `static/vendor/pdfjs` 虽然已经能工作，但更像“当前工作区里碰巧有一套对的文件”。这类状态短期能跑，长期很危险，因为没人能保证下次升级 `pdfjs-dist`、重装依赖、换机器或者清空目录后，还会自动得到同一套结果。

`Readest` 的做法更稳：它把 `public/vendor/pdfjs` 当成 **宿主应用自己的运行时契约**，然后用 `setup-vendors` 去生成这套目录。这样 `foliate-js` 只需要依赖“宿主一定会提供这些资源”，而不是假设每个接入方都会手工摆好目录。

## 这次改了什么

- 新增 [`scripts/setup-pdfjs-vendor.mjs`](/Users/dev/workspace2/hc_apps/br1/scripts/setup-pdfjs-vendor.mjs)
  - 负责清空并重建 `static/vendor/pdfjs`
  - 从 `pdfjs-dist` 复制 JS、WASM、`cmaps`、`standard_fonts`
  - 用 `postcss + postcss-nested` 展平 `foliate-js/vendor/pdfjs/*.css`
- 在 [`package.json`](/Users/dev/workspace2/hc_apps/br1/package.json) 新增一组和 `Readest` 对齐的脚本：
  - `prepare-public-vendor`
  - `copy-pdfjs-js`
  - `copy-pdfjs-wasm`
  - `copy-pdfjs-fonts`
  - `copy-flatten-pdfjs-annotation-layer-css`
  - `copy-flatten-pdfjs-text-layer-css`
  - `copy-flatten-pdfjs-css`
  - `copy-pdfjs`
  - `setup-pdfjs`
  - `setup-vendors`
- `static/vendor/pdfjs` 现在由脚本精确输出，不再保留以前手工状态里的多余文件

## 为什么这样更好

第一，职责更清楚。

`foliate-js` 提供 PDF 阅读能力，但 `br1` 作为宿主应用，要负责把运行时依赖摆到浏览器和 Tauri WebView 真能访问的位置。把这件事写成 `setup-vendors`，边界就清楚了。

第二，升级更稳。

以后如果升级 `pdfjs-dist`，你只需要重新跑一次：

```bash
pnpm setup-vendors
```

而不用手工判断哪些文件该保留、哪些文件是历史残留。

## 这次实现里可以学到的 2 个点

### 1. “库能跑”和“宿主能稳定集成”不是一回事

很多库在自己的示例或原始宿主里能正常工作，不代表你把它接到另一个应用里后也天然稳定。

这里的关键不是 `foliate-js` 会不会读 PDF，而是：

- `br1` 有没有把 `pdfjs` 的静态资源摆到宿主可访问的位置
- 有没有把 CSS、WASM、字体、`cmaps` 一起带上
- 这些资源是不是通过**可重复脚本**生成的

这就是“运行时宿主契约”。

### 2. 生成目录比手工维护目录更适合长期演进

当一个目录理论上是“构建产物”或“vendor 输出”时，最好让它来自脚本，而不是来自人工拷贝。

原因不是偷懒，而是：

- 脚本可以重复执行
- 脚本可以在 CI、测试、换机器时复用
- 脚本能把“目录里应该有什么”写成代码

这比“仓库里现在恰好有一套能跑的文件”可靠得多。

## 这次怎么验证

我实际运行了：

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 setup-vendors
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
bash /Users/dev/workspace2/hc_apps/br1/scripts/automation/test-tauri-webdriver.sh "pnpm -C /Users/dev/workspace2/hc_apps/br1 exec wdio run /Users/dev/workspace2/hc_apps/br1/wdio.conf.ts --spec /Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts"
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

结果：

- `setup-vendors` 可以完整重建 `static/vendor/pdfjs`
- `check` 通过
- 现有桌面 WDIO smoke 通过
- diff 没有格式问题

## 还没包含什么

- 这次没有改 `reader` 逻辑
- 这次没有回头清理 `foliate-js/pdf.js` 里之前为 Vite 宿主稳定性加的兼容逻辑
- 这次只把 `br1` 的 PDF vendor 流程正式化，还没有继续处理其他 vendor 资产

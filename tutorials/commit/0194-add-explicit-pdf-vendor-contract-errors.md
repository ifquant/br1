# 0194: 给 PDF vendor 合同补上明确错误出口

## 这次改动做了什么

这次是 `04-02` 的第一刀，目标不是改 PDF viewer 的视觉或交互，而是把 `pdf.js` host contract 收成一个更正式的入口。

之前 `br1` 的 `PDF` 入口虽然已经走：

- `pnpm setup-vendors`
- `static/vendor/pdfjs/*`
- `src/lib/vendor/pdfjs-host-entry.js`

但运行时如果 vendor 资产缺失，实际表现仍然比较底层：

- 可能是动态 import 失败
- 可能是 MIME 不对
- 可能是用户只看到 reader 打不开，却不知道该跑什么命令修

这次把 `pdfjs-host-entry.js` 改成了“带合同检查”的入口模块。

---

## 1. 现在 `pdfjs-host-entry.js` 会先检查什么

在真正 `import("/vendor/pdfjs/pdf.min.mjs")` 之前，现在会先检查这些关键资源：

- `/vendor/pdfjs/pdf.min.mjs`
- `/vendor/pdfjs/pdf.worker.min.mjs`
- `/vendor/pdfjs/jbig2.wasm`
- `/vendor/pdfjs/openjpeg.wasm`

如果其中任何一个缺失，就直接抛出明确错误：

- 告诉你 `PDF vendor assets are unavailable`
- 告诉你应该执行 `pnpm setup-vendors`

这比原来“把底层 import/fetch 异常直接冒泡”更适合人排障。

## 2. 为什么还要检查 MIME

之前你遇到过这种错误：

- `'application/json' is not a valid JavaScript MIME type`

这类问题本质上不是“代码逻辑坏了”，而是：

- 路径不对
- 资源没生成
- 服务端拿错了文件
- 或者静态目录里根本不是 JS

所以这次对 `.mjs` 入口额外检查了 `content-type`：

- 是 `javascript/ecmascript/text/plain` 之类可接受类型就继续
- 不是，就直接报 `Invalid MIME type for PDF vendor entry ...`

这样错误会更靠近真实根因。

---

## 3. 这次顺手学到的编程知识

### 知识点 1：动态 import 的“失败点”最好前移

很多系统里，最难排查的问题不是“功能真的坏”，而是：

- 错误发生得太晚
- 错误信息属于底层依赖，而不是你的产品语义

比如这里：

- 真正的问题是“PDF vendor 没准备好”
- 但如果你直接 `await import(...)`
- 用户看到的却可能只是奇怪的 MIME/import 异常

更稳的做法是：

- 在业务入口先检查合同
- 明确告诉调用方：缺什么、该怎么修

这类思路在前端静态资源、插件系统、模型文件、WASM 资源里都很常见。

### 知识点 2：外部依赖链最好有“正式合同入口”

如果一个能力依赖很多静态文件：

- worker
- wasm
- css
- 主模块

那最好不要把这些假设散落在多处代码里。

应该像这次一样收成一个入口：

- 入口负责检查合同
- 入口负责导入真正模块
- 上层业务只管“我要开 PDF”

这样后面你改 vendor 输出目录、换打包方式、加更多 wasm，都会更可控。

---

## 4. 这次如何验证

实际跑过：

```bash
pnpm setup-vendors
```

结果：`PASS`

```bash
pnpm check
```

结果：`PASS`

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'reopens a library-file pdf with restored progress inside the reader stage'"
```

结果：`FAIL`

说明：

- 这条 focused PDF 桌面回归当前仍然 timeout
- 这次提交没有试图掩盖这个问题
- 这一刀只先收口 vendor 合同与错误出口

```bash
git diff --check
```

结果：`PASS`

## 5. 这次还没处理什么

- 没有继续修 PDF focused 回归 timeout 的根因
- 没有改 reader 里的 PDF 视觉、分页或交互层
- 没有去动 EPUB 相关逻辑

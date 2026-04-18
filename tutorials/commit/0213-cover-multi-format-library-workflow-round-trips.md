# 0213: 覆盖多格式 library 工作流回流回归

本次提交把 `FB2 / MOBI / AZW3 / CBZ` 的证据，从“能导入并打开”推进到“能完成一次真实的 library -> reader -> library 往返”。

## 背景

前面的几刀已经补齐了两类证据：

- `web asset` 模式下，这四种格式都能打开。
- `desktop library-file` 模式下，这四种格式都能通过真实 `import_library_books` 导入后，在独立 reader 窗口里打开。

但这还不够。  
如果只证明“能打开”，那 `Multi-Format Support` 仍然容易停留在展示层：

- reader 能不能把阅读状态写回 `library.json`
- library 能不能把这本书从 `shelf` 移到 `continue/recent`
- 多格式是否都能走同一套阅读工作流

这些还没有被自动化锁住。

## 做了什么

### 1. 新增桌面 focused regression，覆盖四种格式的完整回流路径

在 [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts) 新增用例：

- `moves FB2, MOBI, AZW3, and CBZ imports into the library reading workflow after returning from reader`

这条回归对每种样本格式都走一遍：

1. 通过真实 `import_library_books` 导入样本文件
2. 在 library 里用 `library-file` 路径打开独立 reader
3. 等待 reader 真正进入打开状态
4. 点击 `Go to library`
5. 等待磁盘上的 `library.json` 出现更新后的 `lastOpenedAt`
6. 刷新 library 页面，确认这本书已经进入 `continue reading` 或 `recent reading`，并且不再停留在 `shelf`

这样锁住的就不只是 reader 打开，而是整个产品工作流。

### 2. 更新 Feature 审计表措辞

在 [`FEATURE-PARITY-AUDIT.md`](/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md) 里，把 `Multi-Format Support` 的当前证据改成：

- 不只是 `web asset` 打开
- 不只是 `desktop library-file` 打开
- 还包括“返回 library 后进入阅读工作流”的证据

这让总账更接近产品视角，而不是停留在格式解析层。

## 为什么这样做

`P0-1` 当前的目标不是继续堆格式样本，而是证明这些格式已经进入 `br1` 的正式阅读工作流。

对用户来说，真正重要的不是：

- “这个格式能不能临时在 reader 里显示”

而是：

- “导入后能不能像正常书一样进入我的书库工作流”
- “读过之后能不能被 library 识别成继续阅读/最近阅读”

这次回归补的就是这条更高价值的证据链。

## 验证

本次实际运行：

```bash
pnpm check
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'moves FB2, MOBI, AZW3, and CBZ imports into the library reading workflow after returning from reader' --mochaOpts.timeout 120000"
git diff --check
```

## 还没解决

这次仍然没有把 `Multi-Format Support` 改成 `Completed`，因为还有几类缺口：

- `TXT` 仍然只是 planned-not-implemented
- 多格式的 metadata / restore / annotation 一致性还没完全对齐
- 还没有补 `open with br1` 的 OS 级集成证据

所以这次是把证据推进到“多格式进入正式阅读工作流”，不是宣告整个格式主线已经收口。

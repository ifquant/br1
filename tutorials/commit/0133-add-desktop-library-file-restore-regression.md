# 背景

前一刀把桌面 reader 窗口几何基线先稳定下来之后，还差一条更贴近真实使用的自动化回归：

- 不是随便打开一本 EPUB
- 而是从 `library` 里点击一本已经带有 `progressLocation` 的书
- 然后确认它在独立 reader 窗口里恢复到一个真实可见的位置

这条路径更接近你平时的实际使用方式，也更容易抓出：

- `library-file` 打开链路问题
- `progressLocation` 恢复问题
- 恢复后正文虽然有了，但掉到错误区域的问题

所以这次不改 reader 逻辑，只补桌面回归。

# 主要目标

- 为 `library-file + progressLocation` 增加一条独立桌面回归
- 让测试直接从书库选择“可恢复”的 EPUB，而不是手工指定单一本书
- 继续复用已经验证过的几何判据，确认恢复后的正文落在 reader 主舞台中

# 改动概览

- [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts)
  - 新增 `openRestorableReaderBook()`
  - 它会在书库中自动寻找带 `location` 参数的 EPUB 打开入口
  - 新增 `readReaderGeometry()`，把几何读取逻辑抽成复用 helper
  - 在原有“正文留在主舞台里”的用例中复用这个 helper
  - 新增桌面用例：
    - `restores a library-file epub into a visible reading position inside the reader stage`
  - 这条用例会验证：
    - reader 没有 stage error
    - 恢复后存在有效 `cfi`
    - 恢复后的 `cfi` 不再只是原始 query 里的 `location` 字符串
    - 可见正文矩形仍然落在主阅读区里

# 关键知识

## 1. 更好的回归不是“更多测试”，而是“更像真实路径”

如果测试只会：

- 打开一本临时书
- 看看页面没报错

那它很难覆盖用户真正每天会走的流程。

这次补的路径更真实：

- 从书库进入
- 走 `library-file`
- 带 `progressLocation`
- 在独立 reader 窗口里恢复

这比“任意打开一本 EPUB”更接近真实风险点。

## 2. 选择测试样本时，优先用“满足条件的现有数据”

这次没有把书名写死，而是直接从书库入口里找：

- 是 EPUB
- 且 href 里带 `location`

这样测试的耦合更低，也更符合桌面应用的真实状态。  
如果用户后面继续导入、迁移更多书，这条用例仍然能用现有书库里的“可恢复样本”跑起来。

## 3. 恢复位置测试不能只看 `cfi` 存不存在

只判断：

```ts
details.cfi !== null
```

是不够的，因为：

- reader 可能拿到了某个位置
- 但内容还是落错区域
- 用户看到的仍然是“像没恢复好”

所以这次仍然把几何验证一起带上：

- 先确认 reader 恢复成功
- 再确认可见正文矩形真的落在主舞台里

这才更接近用户感知。

# 验证

- `pnpm check` (PASS)
- `git diff --check` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'restores a library-file epub into a visible reading position inside the reader stage'"` (PASS)

# 未覆盖项

- 这次没有新增 PDF 恢复位置回归
- 这次没有继续修改 reader 运行逻辑，只是补自动化基线
- 这次仍依赖当前本地书库中存在至少一本带 `progressLocation` 的 EPUB

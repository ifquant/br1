# 背景

上一条自动化基线已经把 `library-file + EPUB + progressLocation` 的桌面恢复路径锁住了，但 reader 真实使用里还有另一条主线：

- 从书库点击一本 PDF
- 在独立 reader 窗口里打开
- 按上次阅读进度恢复

如果只测 EPUB，不测 PDF，就会留下一个空洞：

- EPUB 正常，不代表 PDF 正常
- PDF 的恢复信号也不完全等于 EPUB

所以这次不改 reader 逻辑，只补一条 PDF 的桌面回归。

# 主要目标

- 为 `library-file + PDF` 增加一条独立桌面回归
- 优先复用现有书库里的真实 PDF，而不是硬编码某一本固定文件
- 验证 PDF 重开后：
  - 没有 `stage-error`
  - 有真实的恢复进度信号
  - 渲染表面仍然落在 reader 主舞台里

# 改动概览

- [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts)
  - 新增 `openRestorablePdfBook()`
  - 它会从书库入口里自动寻找：
    - `path` 是 `.pdf`
    - 且带 `location` 或 `fraction` 的可恢复 PDF
  - 扩展 `readReaderDetails()`
    - 读取 footer 里的 `progressLabel`
    - 读取 footer 里的 `locationLabel`
  - 新增桌面用例：
    - `reopens a library-file pdf with restored progress inside the reader stage`

# 关键知识

## 1. PDF 回归不要机械照搬 EPUB 的断言

EPUB 比较适合看：

- `cfi`
- 章节 href
- 可见正文文本矩形

但 PDF 不一定稳定暴露出完全相同的信号，尤其是：

- 某些恢复位置不一定对应清晰的章节语义
- 某些情况下文字层未必像 EPUB iframe 文本那样好抓

所以这次 PDF 回归换成更稳的一组条件：

- 没有报错
- 标题已恢复
- footer 里的进度/位置已经不是初始态
- 渲染表面仍在主舞台里

这比强行要求 PDF 必须像 EPUB 一样给出某个 `cfi` 更稳。

## 2. 桌面自动化里，优先读“用户真的能看到的信号”

这次扩展 `readReaderDetails()` 时，没有只盯内部对象，而是把 footer 里的显示信息也读进来：

- `progressLabel`
- `locationLabel`

这是个很实用的思路：

- 内部状态适合判断技术上有没有加载
- UI 上的显示值适合判断用户看到的是不是合理

两者结合，回归会更像真实使用。

## 3. 自动找样本比写死一本 PDF 更耐用

这次不是把某本 PDF 文件名直接写死在测试里，而是动态找：

- 书库里存在
- 能打开
- 带恢复信息

这样做的好处是：

- 降低和当前个人书库的强绑定
- 减少因为某本文件被删掉、改名而导致的无意义失败

对于桌面应用，尤其是依赖本地真实数据的回归，这种“按条件选样本”通常比硬编码更实用。

# 验证

- `pnpm check` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'reopens a library-file pdf with restored progress inside the reader stage'"` (PASS)

# 未覆盖项

- 这次没有修改 PDF reader 运行逻辑，只是补自动化基线
- 这次没有要求 PDF 一定出现可抓取的正文文本矩形
- 这次仍依赖当前本地书库里至少存在一本带恢复信息的 PDF

# 0195: 稳定 PDF 恢复回归，并把 PDF 打开协议收紧到 fraction-only

本次切片解决的是 `04-02` 里最具体的一条阻塞：  
桌面回归 `reopens a library-file pdf with restored progress inside the reader stage` 一直不稳定，有时超时，有时在窗口切换时把整个 webdriver 会话带崩。

这次没有继续扩 PDF 功能，而是先把“如何稳定验证 PDF 恢复”这条线修通。

## 这次改了什么

### 1. PDF 的 library reader target 不再带 `location`

文件：`src/lib/services/libraryPersistence.ts`

之前 `toLibraryReaderTarget()` 会把所有格式都带上：

- `restoreFraction`
- `restoreLocation`

但本地 PDF 记录里常出现像 `epubcfi(/6/2)` 这样的值。  
这类值明显更像 EPUB 的恢复标记，不适合继续当 PDF 的恢复输入。

所以这次改成：

- EPUB 等格式，保留 `progressLocation`
- PDF，只传 `progressFraction`

也就是说，PDF 的 reopen 协议现在更干净：

- `fraction` 是恢复依据
- `location` 不再混进来

这能减少“把错误恢复信号再喂回 reader”这种问题。

### 2. PDF 回归改成自举一本文库里的干净 PDF

文件：`e2e/app.e2e.ts`

之前测试会优先复用本地已经有恢复状态的 PDF。  
这有两个问题：

- 历史记录里有不少从 Readest 导入的 PDF，状态不一定干净
- 某些书打开后会立刻离开当前 section，测试容易因为选择器太窄找不到它

现在回归逻辑改成：

1. 从 `library.json` 里找“还没有恢复状态”的 shelf PDF
2. 优先挑更小、非 `Reader sample` 的 PDF
3. 打开后如果还停在 `0%`，主动翻一页，种出一个可恢复的 `progressFraction`
4. 关闭 reader
5. 回到 library，等待这本书的 reader href 出现 `fraction`
6. 再从 library 重新打开，验证它真的能恢复进 reader stage

这样测试不再依赖历史脏数据，而是自己制造一条干净的恢复链路。

### 3. library 打开入口的测试 helper 不再只认书架卡片

文件：`e2e/app.e2e.ts`

之前 helper 只匹配：

- `aria-label="Open ... in reader"`

这其实只覆盖主书架卡片。  
但一本书一旦被打开，它可能会跑到：

- `继续阅读`
- `最近阅读`

这些区域的链接结构不同，所以第二次打开时测试会误判“找不到这本书”。

这次改成统一扫描所有：

- `pathname === /reader`
- `source in ['asset', 'library-file']`

的链接。

这更接近产品真实语义：

- 只要它是 library 里能进 reader 的入口
- 测试就应该把它当成“可打开书籍”

### 4. 失败 cleanup 改成“先恢复 library 窗口”，不再盲关当前窗口

文件：`e2e/app.e2e.ts`

之前一旦 PDF 打开失败，测试会直接：

- `browser.closeWindow()`
- 再 `switchToWindow(libraryHandle)`

问题是如果当前上下文其实已经回到 library，或者 reader 窗口已经自己没了，  
这一步就可能把主窗口也关掉，导致后面只看到 `ECONNREFUSED`，真实错误被吃掉。

这次加了：

- `recoverLibraryWindow()`
- `cleanupReaderAttempt()`

原则是：

- 只有当前真的是 reader 且还有其它窗口时，才关当前窗口
- 然后恢复到 library 窗口

这让失败时的报错终于能指向真实步骤，而不是“整个会话死了”。

## 为什么这次修复有效

因为这次不是单纯“把 timeout 调大”，而是把之前混在一起的 3 类问题拆开了：

1. **产品输入问题**：PDF 不该继续消费 EPUB 风格的 `location`
2. **测试数据问题**：历史 PDF 记录不稳定，应该自己种恢复状态
3. **测试基础设施问题**：失败 cleanup 不能把主窗口一起关掉

拆开之后，focused regression 就从“随机超时/掉线”变成了一条稳定通过的链路。

## 这次顺手能学到的知识

### 知识点 1：`精确恢复信号` 和 `兼容恢复信号` 要分开

像 EPUB 的 `CFI`，和 PDF 的 `fraction/page progress`，本质不是同一种定位系统。

工程上最怕的是：

- 存的时候混着存
- 读的时候又混着读

短期看起来“都能恢复”，长期就会出现：

- 错格式
- 错状态
- 错回归

更稳的做法是：

- 每种格式只消费自己可信的恢复信号
- 兼容字段可以保留，但不要继续回灌进主路径

### 知识点 2：E2E 回归最怕“依赖脏环境”

一个常见坏味道是：

- 测试默认假设本地已经有某些数据
- 这些数据是历史会话留下来的

这样你一换机器、一清缓存，测试就变脆。

更稳的 E2E 思路通常是：

- 先自己造数据
- 再验证行为

也就是这次 PDF 回归做的“self-seeding”。

## 相关文件

- `src/lib/services/libraryPersistence.ts`
- `e2e/app.e2e.ts`

## 本次验证

- `pnpm check` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'reopens a library-file pdf with restored progress inside the reader stage' --mochaOpts.timeout 120000"`  
  目标 spec PASS，包装脚本 teardown 仍返回 `ELIFECYCLE`

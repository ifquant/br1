# 0211: 给 FB2 / MOBI / AZW3 / CBZ 补 desktop `library-file` 回归

上一提交已经给这四种格式补了仓库内的 web asset 打开证据，但那还不够。

`P0-1` 真正要验证的不是：

- 浏览器里能不能通过 `/reader?source=asset` 打开一个样本

而是：

- 这些格式进入本地书库后，能不能走 `library-file -> 独立 reader window` 这条真实桌面链路

这次提交就是把这条更接近产品的路径补成 focused regression。

## 为什么不能只满足于 web asset 测试

web asset 测试只能说明：

- `ReaderViewport`
- `foliate-js`
- 样本文件本身

在一条非常直接的 reader 路径里能跑起来。

但本地阅读器真正会经过的桌面路径还多了几层：

- `library.json`
- library surface 的链接生成
- `toLibraryReaderTarget()`
- `source=library-file`
- 独立 reader window 打开
- 再从窗口里真正加载对应文件

如果这一整条链没有证据，`Multi-Format Support` 还是会停在一个很虚的状态。

## 这次具体做了什么

### 1. 给 webdriver 补了最小的 sample-library seed helper

在 `e2e/app.e2e.ts` 里新增了一组 helper：

- `saveLibraryRecordsOnDisk()`
- `ensureDesktopSampleLibraryRecords()`

它们的职责很单纯：

- 把 `static/samples/` 里的 `FB2 / MOBI / AZW3 / CBZ` 样本写进 `library.json`
- 让 library surface 真实生成对应的 `library-file` reader 链接

这里没有绕开 reader 打开逻辑，只是为了避免把这条回归绑死在桌面导入 UI 上。

也就是说，这次验证的仍然是：

**书库记录 -> library surface -> library-file reader target -> 独立 reader window**

而不是“手工直接 open 一个 File”。

### 2. 扩展 `readReaderDetails()`，把 `layoutLabel` 也读出来

之前桌面 helper 只读取：

- `formatLabel`
- `locationLabel`
- `progressFraction`

这次多补了 `layoutLabel`，因为：

- `CBZ` 应该是 `FIXED`
- `FB2 / MOBI / AZW3` 应该是 `PAGINATED`

如果不把这层也读出来，这条回归只能证明“打开了某个 reader”，还不能证明“走对了该格式的布局语义”。

### 3. 新增 focused regression

新增用例：

- `opens FB2, MOBI, AZW3, and CBZ library-file samples in separate reader windows`

它会：

1. 把样本记录种进 `library.json`
2. 刷新 library surface
3. 对每种格式逐个：
   - 从 library surface 找到对应书
   - 点开独立 reader window
   - 等待 reader 稳定
   - 断言：
     - 没有 `stageError`
     - `formatLabel` 正确
     - `layoutLabel` 正确
     - 不再停留在 `Opening book`

这说明：

- `FB2 / MOBI / AZW3 / CBZ`

现在都已经有了一条**桌面书库工作流内的真实可验证打开路径**。

## 为什么这次仍然不把 Multi-Format Support 改成 Completed

因为这次关闭的是“缺少 library-file 证据”的问题，不是整行 feature 已经做完。

还没完成的仍然包括：

- 真正的桌面导入 UI 路径覆盖
- `open with` / OS file association
- 更丰富的多格式 metadata / progress / restore 语义
- `AZW3` 的 KF8 专项 fixture

所以 `FEATURE-PARITY-AUDIT.md` 里只是把证据补强成：

- web asset path 已验证
- desktop `library-file` path 已验证

但状态依然保持 `Partial`。

这是更诚实的写法。

## 这次验证了什么

实际跑过：

```bash
pnpm check
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'opens FB2, MOBI, AZW3, and CBZ library-file samples in separate reader windows' --mochaOpts.timeout 120000"
git diff --check
```

结果：

- `pnpm check` PASS
- focused desktop webdriver regression PASS
- `git diff --check` PASS

## 这次没有处理什么

这次没有继续处理：

- 真实桌面导入对话框的自动化
- `FB2/MOBI/AZW3/CBZ` 的恢复位置语义
- `AZW3` 的 KF8 专项样本
- 多格式 cover / metadata / search / annotation parity

所以这次提交的正确理解是：

**把多格式支持从“只有 web 样本证据”推进到“桌面书库链路也有证据”，但不夸大成整行 feature 已完成。**

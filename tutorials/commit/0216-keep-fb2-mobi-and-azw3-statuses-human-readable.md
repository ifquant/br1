# 0216: 保持 FB2、MOBI、AZW3 的 status 可读

这次提交继续收多格式 metadata 线，但范围仍然刻意压窄：  
不碰所有字段，只处理 `FB2 / MOBI / AZW3` 在 reader 往返后，`status` 容易退化成低质量章节标签的问题。

## 问题是什么

`CBZ` 那条线之前已经修掉了：

- 不再把带时间戳的存储文件名写回 `title`
- 不再把 `002-page.svg` 这种内部页面资源名写回 `status`

但 `FB2 / MOBI / AZW3` 这三种 reflowable 格式还有另一类问题：

- reader 回来的 `chapterLabel` 有时是正常章节名
- 但有时它其实只是 `title` 的变体
- 例如 `AZW3` 样本会回出一个去掉空格的标题式标签：`Around theWorld in 28Languages`

这种值虽然不是内部文件名，但对用户也没意义。  
把它直接当 library 的 `status`，结果会像是：

- `title = Around the World in 28 Languages`
- `status = Around theWorld in 28Languages`

这依然是糟糕的产品输出。

## 做了什么

### 1. 在 Rust 持久化层加入“标题变体”识别

在 [`src-tauri/src/commands/library.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/library.rs) 里补了：

- `normalize_status_key()`
- `status_looks_like_title()`

它做的事情很简单：

- 去掉空白和标点
- 做小写归一化
- 如果 `chapterLabel` 归一化后和 `title` 一样，就不把它当成真正的阅读状态

这条规则接进 `derive_library_status()` 之后，就得到新的语义：

- 真章节名：保留
- 内部资源名：收成 `继续阅读`
- 标题变体：也收成 `继续阅读`

### 2. 新增 focused desktop regression

在 [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts) 里新增：

- `keeps fb2 mobi and azw3 library statuses human-readable after reader round-trips`

这条回归会分别导入并打开：

- `FB2`
- `MOBI`
- `AZW3`

然后推进一次阅读状态，返回 library，再直接读 `library.json` 断言：

- `FB2`
  - `title = Bridge Reader Sample FB2`
  - `status = Chapter 1`
- `MOBI`
  - `title = libmobi ncx test`
  - `status = Test chapter 2`
- `AZW3`
  - `title = Around the World in 28 Languages`
  - `status = 继续阅读`

这刚好锁住了我们要的产品语义：

- 真章节名保留
- 假章节名收掉

## 为什么这样做

这一步的重点不是“metadata 更丰富”，而是“metadata 不要骗人”。

对用户来说，一个 `status` 至少应该满足这两个条件之一：

- 告诉我你现在大概读到哪里
- 或者至少别重复标题、别暴露内部实现

`AZW3` 之前那种标题变体型 `status` 两个条件都不满足，所以必须先收。

## 验证

本次实际运行：

```bash
cargo check --manifest-path src-tauri/Cargo.toml
pnpm check
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'keeps fb2 mobi and azw3 library statuses human-readable after reader round-trips' --mochaOpts.timeout 120000"
git diff --check
```

## 还没解决

这次仍然没有把多格式 metadata 全部收完。后面还差：

- `author` 仍然大量是 `Unknown author`
- `progress` 文案仍然比较粗
- 其它格式的 title/status 仍可能有更多边角问题

所以这次只是把 “标题变体不应当作为 status 展示” 这条规则先锁住。

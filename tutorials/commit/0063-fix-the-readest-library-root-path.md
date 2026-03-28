# 0063：修正 Readest 书库根目录推导错误

这次的 bug 很典型，看起来像“迁移功能没做完”，其实是**路径算错了**。

`br1` 原来在推导 `Readest` 书库目录时，多往上退了一层目录。结果它去找的是：

- `/Users/dev/Library/com.bilingify.readest/Readest/Books`

但真实目录是：

- `/Users/dev/Library/Application Support/com.bilingify.readest/Readest/Books`

所以程序当然会说“没找到 Readest 书库”。

## 改了什么

- 在 `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`
  - 修正 `readest_books_root()` 的路径推导
  - 从 `app_data_dir.parent().parent()` 改成只退一层到 `Application Support`
- 在 `/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte`
  - 空书库状态里补了显式的 `Readest` 导入按钮
  - 这样即使自动迁移没跑到，用户也能直接点

## 这次值得学的两个知识点

### 1. 路径 bug 很容易伪装成“功能没生效”

尤其桌面应用里，很多能力的前提都是：

- 先找到正确目录
- 再读文件

如果目录一开始就算错，后面所有检测逻辑都可能变成：

- `available = false`
- `count = 0`
- “没发现书库”

看起来像高层逻辑判断错了，其实只是路径错了一个 `parent()`

### 2. 调试路径问题时，直接把“程序以为的路径”和“真实存在的路径”打印出来

这次最有效的验证不是继续看 UI，而是直接在 shell 里做了这个对照：

- 当前代码推导出的路径是什么
- 正确路径应该是什么
- 哪个 `exists() == True`

这是查路径 bug 很笨但很有效的方法。通常几秒钟就能把“猜测”变成“坐实”。

## 我怎么验证

实际跑过：

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` `PASS`
- `cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml` `PASS`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` `PASS`
- 本地路径对照：
  - 错误路径不存在 `PASS`
  - 正确 `Readest` 路径存在 `PASS`

## 还没做什么

- 还没有给迁移链加运行时 toast 或进度反馈
- 还需要你重启一次 `tauri dev`，让新的路径逻辑在桌面进程里生效

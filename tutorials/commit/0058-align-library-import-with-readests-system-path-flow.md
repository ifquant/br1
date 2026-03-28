# 0058: 把 library 导入链改成更接近 Readest 的系统路径导入

这次提交是把 `br1` 的导入链从“能跑”推进到“更像 `Readest`”。

前一版虽然已经有最小持久化方向了，但还有一个明显偏差：

- 前端先拿到 `File`
- 再把整本书的字节数组传给 Rust

这能工作，但不够像 `Readest`。

`Readest` 在桌面端的做法更像：

1. `library` 发起系统文件选择
2. 拿到的是**文件路径**
3. 然后把路径交给导入层
4. 导入层再把文件复制进自己的 `Books` 目录，并更新书库索引

这次提交就是把 `br1` 往这个模型靠。

## 这次改了什么

1. 前端导入从 `File bytes` 改成 `系统文件路径`

新增了 [libraryPersistence.ts](/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts)：

- `selectSystemBookPaths()`
- `importLibraryBooks(filePaths)`
- `loadPersistedLibraryBooks()`
- `toReaderAssetHref(...)`

其中桌面端现在通过 `@tauri-apps/plugin-dialog` 拿到系统文件路径，再交给 Rust 命令。

这样做的好处是：

- 前端不用搬运整本书的字节
- Rust 导入层更接近真正“导入文件”的语义
- 结构更像 `Readest`

2. Rust 侧改成按路径导入多本书

在 [src-tauri/src/lib.rs](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs)：

- `import_library_book(...)` 改成 `import_library_books(...)`
- 支持一次导入多个文件路径
- 每本书会被复制进 app data 下的 `library/books/`
- 书目索引会写进 `library/library.json`

而且现在记录里也会保存：

- `filePath`
- `sourcePath`

这比只存一个临时 object URL 更接近真正书库。

3. library 页面接回这条新链

在 [library/+page.svelte](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)：

- Tauri 桌面端优先走系统路径导入
- Web fallback 仍然保留临时 `File -> object URL`
- 导入完成后立即刷新 `importedBooks`
- 并自动打开第一本刚导入的书

也就是说，现在 `library` 不只是“能选文件”，而是真的开始像一个有持久化的书架入口。

4. 补齐了 Tauri dialog 插件

这次新增了：

- 前端：`@tauri-apps/plugin-dialog`
- Rust：`tauri-plugin-dialog`

这样 `br1` 才能像 `Readest` 那样在桌面端走系统文件对话框。

## 你可以学到的具体知识

### 1. 桌面端导入和浏览器上传，最好不要混成同一种模型

在浏览器里，`File` 对象很自然。  
但在桌面端，尤其是 Tauri 里，很多时候更合适的是：

- 先拿文件路径
- 再让 Rust 或底层服务负责真正的文件操作

原因很实际：

- 路径更贴近“系统文件”的真实来源
- 不需要前端把大文件整块搬来搬去
- 底层更容易做复制、落盘、索引、去重

这也是为什么 `Readest` 的桌面导入更像“路径导入”，而不是“浏览器上传一本书”。

### 2. “导入” 和 “打开” 最好分成两层

这次结构里我们故意把这两件事拆开了：

1. `importLibraryBooks()` 负责把系统文件变成书库记录
2. `toReaderAssetHref()` 负责把记录翻译成 reader 能打开的目标

这比把“导入并立刻乱跳路由”全塞在一个函数里更稳。

一个很常见的坏味道是：

- 选择文件
- 落盘
- 拼路由
- 更新列表
- 直接跳 reader

全部糊在一个组件里。

现在 `br1` 还没做到特别完美，但至少已经开始拆出：

- 持久化层
- 路由层
- 书架展示层

这就是往真正产品代码走的方向。

## 这次怎么验证

我实际跑了：

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

结果：

- `pnpm check` 通过
- `cargo check` 通过
- `git diff --check` 通过

中间还碰到一次 `ENOSPC`，是磁盘空间满了，不是代码错误。  
我先清掉了：

- `src-tauri/target`
- `node_modules/.vite-temp`

之后再重新验证，才通过。

## 还没包括什么

- 这还不是 `Readest` 那种完整的 `BookService + LibraryService + metadata/cover/config` 体系
- 现在没有做 hash / metaHash 去重
- 也还没有把封面提取、作者解析、阅读进度持久化一起补上

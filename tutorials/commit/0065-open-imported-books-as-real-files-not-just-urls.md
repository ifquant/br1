# 0065：把已导入书籍按真实 File 打开，而不是只传一个 URL

这次修的是一个很关键但不容易一眼看出来的问题：

- `library` 里已经有书
- 点击后也确实打开了 `reader` 窗口
- 但书还是打不开

根因不是窗口路由错了，而是**传给阅读器的东西不对**。

之前 `br1` 对已导入书籍走的是：

- `filePath -> convertFileSrc(...) -> /reader?source=asset`

也就是把本地书文件先转成一个 URL，再交给 `foliate-view.open(...)`

但 `Readest` 实际走的模型不是这样。它会先把书真正读成一个 `File`，再交给 `DocumentLoader` 或阅读器。

所以这次把 `br1` 的持久化书库打开链改成：

- `library` 传递本地文件路径
- Rust 读取二进制
- 前端把二进制重建成真实 `File`
- 再把这个 `File` 交给 `foliate-view.open(...)`

## 改了什么

- 在 `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`
  - 新增 `load_library_book_binary`
  - 按本地路径读取书文件，返回：
    - 文件名
    - mime type
    - base64 字节
- 在 `/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts`
  - 新增 `loadLibraryBookFile()`
  - 把 Rust 返回的二进制重建成浏览器侧 `File`
- 在 `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
  - 增加 `source=library-file&path=...`
- 在 `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`
  - 对 `library-file` 控制请求，先拿真实 `File`，再 `open()`

## 这次值得学的两个知识点

### 1. “一个文件的 URL” 和 “一个真实 File 对象” 在阅读器里不是同一种东西

表面上它们都能代表一本书，但很多阅读组件内部会假设自己拿到的是：

- `Blob`
- `File`
- 或自己可控制的可读流

如果你只是给它一个桌面壳协议下的 URL，它未必能像在普通网页里那样稳定处理。

所以当你发现：

- 路由没错
- reader 打开了
- 但内容加载不了

就要开始怀疑“给阅读器的输入类型是不是错了”，而不只是继续调路由。

### 2. 调试桌面文件打开问题时，先模仿成功产品的“输入模型”

这次最重要的不是某一行 API，而是方向：

- `Readest` 打开本地书，走的是 `openFile -> File`
- 那 `br1` 最稳的修法就不是继续补 URL，而是尽量往同一个输入模型靠

这是一个很实用的工程方法：

- 先找成熟参考实现真正喂给核心组件的是什么
- 再让自己的数据链在输入层面对齐

常常比在外面反复补胶水更有效。

## 我怎么验证

实际跑过：

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` `PASS`
- `cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml` `PASS`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` `PASS`

## 还没做什么

- 当前书文件也是按 `base64 -> File` 走的，优先保证能打开，还没做大文件优化
- 还没有加 reader 侧用户可见的加载失败提示

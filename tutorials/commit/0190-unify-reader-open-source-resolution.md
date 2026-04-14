# 0190: 把 reader 的三种打开入口收成同一条预处理链

## 这次改动解决什么

`ReaderViewport` 现在支持三类打开入口：

- `asset`
- `library-file`
- `file`

之前它们虽然最后都会走到 `openBook()`，但在 `applyControlRequest()` 里仍然是三段分支逻辑：

- `asset` 自己拼
- `library-file` 自己先取 fingerprint 和 File
- `file` 自己拼 cache key

这会带来两个问题：

- 打开链路职责分散，后面修 `EPUB` 主路径时要来回追分支
- `library-file` 这条桌面主路径的预处理逻辑没有明确边界

所以这一步的目标很明确：

- 不改行为
- 先把三种打开入口的“预处理阶段”收成同一条链

## 这次具体做了什么

### 1. 新增 `ResolvedReaderOpenSource`

文件：`src/lib/components/reader/ReaderViewport.svelte`

新增了一个内部类型：

- `ResolvedReaderOpenSource`

它统一描述真正送进 `openBook()` 之前需要的那组数据：

- `source`
- `sourceLabel`
- `cacheBookKey`
- `restoreFraction`
- `restoreLocation`

这一步的意义是：  
以后无论来源是 URL、桌面文件路径还是 `File` 对象，进入主打开链路前都先被规范化成同一种形状。

### 2. 新增 `resolveControlOpenSource()`

文件：`src/lib/components/reader/ReaderViewport.svelte`

这个 helper 专门处理三类 reader control：

- `asset`
- `library-file`
- `file`

其中最关键的是 `library-file`：

- 现在会用 `Promise.all()` 并行拿 `fingerprint` 和 `File`
- 再把 restore 信息一起打包回统一结果

这样桌面 `library-file` 这条主路径终于不再是散落在 `applyControlRequest()` 里的特殊案例。

### 3. `applyControlRequest()` 改成单一 open 分支

文件：`src/lib/components/reader/ReaderViewport.svelte`

现在：

- `asset`
- `library-file`
- `file`

都会先走：

- `resolveControlOpenSource(controlRequest)`

再统一调用：

- `openBook(...)`

也就是说，`applyControlRequest()` 现在更多只负责：

- 决定控制类型
- 把真正的打开细节交给预处理 helper

这会让后面继续收 `EPUB` 打开链路时，代码边界更清楚。

## 这次学到的编程知识

### 知识点 1：把“预处理”从主分支里抽出来，能明显降低后续排障成本

以前 `applyControlRequest()` 既要判断：

- 是什么 control

又要处理：

- 文件读取
- cache key 生成
- restore 参数传递

这种函数后面很容易越长越乱。

更稳的做法是把“分发”和“预处理”拆开：

- 分发函数决定走哪条路径
- 预处理函数把数据整理成统一格式

### 知识点 2：同一种业务动作，最好尽快归一成同一种输入

这次三种入口表面不同：

- URL
- 本地路径
- File 对象

但对 reader 来说，它们本质上都是：

- “请打开一个阅读源”

一旦能在边界处归一成统一结构，后续真正的打开主逻辑就会更稳定，也更容易测试。

## 这次没有处理什么

- 没有直接修 `EPUB` 恢复几何问题
- 没有改 `foliate-js` book/document/render 的更深层结构
- 更激进的恢复回归仍未纳入这次验证，这一步只确认基础打开和 metadata 路径没回退

# 0220: 把桌面文件关联打开链路接到主窗口

这一步继续沿着 `P0-1` 的 `File Association and Open With` 主线推进，但目标很明确：

- 不是继续补多格式本身
- 不是去做 packaged installer 验证
- 而是先把“声明了文件关联”推进成“运行中的桌面应用真的能接住关联打开请求，并把书送进 reader window”

## 为什么这一步现在必须做

前面的 `P0-1` 已经补了不少基础：

- desktop import
- library-file reader target
- separate reader window
- open original file
- 多格式 `FB2 / MOBI / AZW3 / CBZ` 的 import/open/return/reopen 回归

但 `File Association and Open With` 还卡着一个很实际的缺口：

- `tauri.conf.json` 里没有正式声明文件关联，系统根本不知道 `br1` 想接什么格式
- 就算以后系统把某个文件交给 `br1`，运行中的主窗口也没有一条稳定的接收路径

也就是说，之前这条能力最多只能算“周边条件差不多了”，还不算真正闭环。

## 这一步要解决什么

目标不是一次把所有 OS 级细节都打透，而是先把核心产品路径建立起来：

1. `br1` bundle 要明确声明自己接哪些书籍文件
2. 如果 `br1` 已经在运行，新的关联打开请求要能进入现有主窗口
3. 主窗口收到请求后，要走和 library 一样的结构化 `library-file` 打开链路
4. 打开的结果应该是一个新的 reader window，而不是在某个中间页面停住

这样后面即使继续做：

- packaged app 验证
- 不同平台安装器验证
- 冷启动文件关联验证

也都是在一条真实产品链路上补证据，而不是补一堆静态配置。

## 改了什么

### 1. 后端新增“待消费的关联打开请求”队列

文件：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/models.rs`
- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/library.rs`

新增了：

- `AssociatedBookOpenRequest`
- `PendingAssociatedBookOpenRequests`

并在 `library.rs` 里补了这套逻辑：

- `queue_associated_book_open_requests_runtime()`
- `queue_associated_book_open_requests`
- `consume_associated_book_open_requests`

这套逻辑做的事情是：

1. 接收一组文件路径
2. 解析相对路径和当前工作目录
3. 过滤掉不存在的文件和不在支持范围内的扩展名
4. 把有效请求塞进内存队列
5. 向主窗口发一个 `br1:associated-book-open-requested` 事件

重点在于：  
**运行时事件和冷启动参数最终都走同一套队列模型。**

这样后面补冷启动回归时，不需要再发明第二条打开链路。

### 2. `single-instance` 插件负责把外部打开请求导入现有实例

文件：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`
- `/Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml`

这里接入了 `tauri-plugin-single-instance`，作用是：

- 如果用户再次用系统文件关联打开一本书，而 `br1` 已经在运行
- 新实例不会各自乱跑
- 而是把 `argv/cwd` 解析成文件路径，排进刚才那条请求队列
- 然后把现有 `main` 窗口唤起并聚焦

同时在 `.setup(...)` 里也补了冷启动参数消费：

- 启动时先检查 `std::env::args()`
- 如果带了文件路径，也照样塞进同一个 pending queue

这一步的价值不在“冷启动已经完全验证”，而在于：

- 冷启动
- 运行中 second-instance

已经共享同一条产品路径了。

### 3. 前端主窗口正式负责消费关联打开请求

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/routes/+layout.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/index.ts`

这里新增了：

- `toExternalLibraryFileReaderTarget(filePath)`

作用是把任意本地文件路径转换成正式的 `library-file` reader target，而不是让 `+layout.svelte` 自己拼一套临时 href。

然后在 `+layout.svelte` 里：

- 只在 Tauri desktop 下启用
- 只让 `main` 窗口消费这类请求
- 启动时主动 `consume_associated_book_open_requests`
- 运行中监听 `br1:associated-book-open-requested`
- 对每个文件优先走 `openReaderTarget(target)`
- 如果打开独立 reader 失败，再回退到 `goto(target.href)`

这一步的重要边界是：

- route 继续只做 reader 页面自己的 orchestration
- 主窗口负责接外部请求
- service 负责把路径转换成结构化 target

没有重新把格式判断散落回页面层。

### 4. bundle 终于正式声明文件关联

文件：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/tauri.conf.json`

这次补进了这些扩展名：

- `epub`
- `pdf`
- `fb2`
- `mobi`
- `azw3`
- `cbz`
- `txt`

这里 `TXT` 虽然还没实现真正阅读，但它仍然属于 `P0-1` 计划内格式，所以 bundle 级别先声明它是合理的。  
真正的用户体验依然由前面已经补过的 planned-format 错误面兜住。

## 为什么主窗口来消费，而不是 reader 页面来兜

因为这类请求的入口语义本来就是：

- “桌面应用收到一个外部文件”

它首先属于应用壳层，不属于某个已经打开的 reader 页面。

如果把消费逻辑塞进 reader route，会有两个问题：

1. 需要假设当前一定已经在 reader 页面
2. 会把窗口调度、target 构建、外部请求监听这些壳层职责重新混进 reader 细节

所以这一步明确把责任线划成：

- **Tauri runtime**：接收和排队外部请求
- **main window**：消费请求并决定如何打开
- **reader target/service**：生成正式打开协议
- **reader page**：只管打开后的阅读行为

这条划分是后面继续做 packaged/open-with 证据时最值钱的基础。

## 测试怎么补的

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

新增 focused regression：

- `opens an associated book request in a separate reader window`

它不是去模拟某个平台安装器，而是直接验证这条现在最核心的产品路径：

1. 在运行中的 library 主窗口里
2. 通过 Tauri command 把一个 `FB2` 样本排进关联打开队列
3. 等待新 reader window 出现
4. 断言：
   - 新窗口确实打开
   - `title` 正确
   - `formatLabel === FB2`
   - URL 带 `mode=window`
   - URL 带 `source=library-file`
   - URL 带正确的 `path`

这条测试的意义在于：

- 它验证的是“运行中的 open with 热路径”
- 而且这条热路径用的就是产品代码，不是测试专用分支

## 这一步完成后，能力状态怎么变

`FEATURE-PARITY-AUDIT.md` 里，`File Association and Open With` 现在可以更硬地写成：

- bundle 已正式声明文件关联
- 运行中的主窗口能消费关联打开请求
- 请求会通过结构化 `library-file` target 打开新的 reader window

但它仍然只能是 `Partial`，因为还差两类证据：

1. **packaged installer 级别的系统注册验证**
2. **冷启动 associated-file launch 的 release-build 证据**

这两个没补之前，不能把这条线说成完全关闭。

## 这一步没有做什么

这次没有做：

- macOS / Windows / Linux 三端 installer 的真实系统注册验证
- 冷启动 packaged app 的端到端自动化
- 更多格式新能力
- reader 内部视觉或版式调整

这一步只做了一件事情：

- 把原来偏“声明型”的 file association 进展，接成了一条真实可运行、可测试、可继续扩证据的桌面打开链路

# 背景

`br1` 现在同时有 library、reader notes、search cache、reader window 这些前端 service。它们都需要在 Tauri 桌面环境里调用后端命令，但之前每个文件都各自复制了一份 `isTauriDesktop()` 和 `import('@tauri-apps/api/core')` 逻辑。

这类重复在项目早期很常见，但继续堆下去会让后续 bridge、reader、library 的边界越来越乱。这个提交先做一层低风险整理：把平台判断和 Tauri `invoke` 入口收拢到一个地方，同时清掉几个明显的模板残留。

# 主要目标

- 把重复的桌面平台守卫收敛到统一 service
- 让 URL 构造函数的签名更符合真实职责
- 清掉 app shell 和 Tauri 模板中的低价值残留

# 改动概览

- 新增 `src/lib/services/platform.ts`，统一导出 `isTauriDesktop()` 和懒加载的 `invokeTauri()`
- `libraryPersistence.ts`、`readerNotes.ts`、`readerSearchCache.ts`、`readerWindow.ts` 改为复用同一个平台 helper
- `toReaderAssetHref()` 和 `toReaderStartHref()` 改为同步函数；library 页同步调整调用方式
- `src/app.html` 的标题改为 `br1`
- 删除 `src/routes/+layout.svelte` 里和 `app.html` 重复的主题初始化逻辑，并同步更新 iOS Web App 标题
- 删除 `src-tauri/src/lib.rs` 里的 `greet` 模板命令

# 关键知识

## 1. 为什么要把平台边界集中到一个文件

`isTauriDesktop()` 这类函数本质上不是“业务逻辑”，而是“运行环境边界”。  
如果它散落在 4 个 service 里，未来你想支持别的宿主环境，比如移动端 WebView、Capacitor、测试 mock 宿主，就要同时改 4 个地方，而且很容易漏。

把它集中到 `platform.ts` 有两个直接收益：

- 业务 service 只表达“我要不要调用桌面能力”，不再关心具体如何判断宿主
- 以后如果平台判断规则变了，只改一个文件

这就是常见的“boundary extraction”做法：先把环境判断抽出来，再让领域代码依赖边界，而不是依赖具体实现细节。

## 2. 为什么 `invokeTauri()` 仍然保留懒加载

这里没有直接顶层 `import { invoke } from '@tauri-apps/api/core'`，而是保留：

```ts
const { invoke } = await import('@tauri-apps/api/core');
```

原因是 `br1` 同时还有 web / SSR / 检查工具链路径。懒加载可以减少宿主 API 在非桌面环境下被过早解析的风险，也让“先判断平台，再调用宿主能力”的顺序更清晰。

简单说：

- 平台判断决定“能不能进桌面分支”
- 懒加载决定“只有进了桌面分支才真的去拿 Tauri API”

这比把宿主依赖直接撒进每个 service 更稳。

## 3. 为什么 `toReaderAssetHref()` 应该是同步函数

`toReaderAssetHref()` 和 `toReaderStartHref()` 只是拼接 URL 参数，并没有异步 IO。  
如果它们声明成 `async`，调用方会被迫写 `await`，读代码的人会误以为这里隐藏了文件系统、网络或宿主调用。

一个简单判断标准：

- 纯字符串拼接、纯数据变换：优先同步
- 真正有 IO、宿主调用、延迟来源：才用异步

让函数签名和真实成本一致，本身就是代码质量的一部分。

# 验证

- `pnpm check` (PASS)
- `cargo check --manifest-path src-tauri/Cargo.toml` (PASS)
- `git diff --check` (PASS)

# 未覆盖项

- 这次没有做 `reader/+page.svelte` controller 拆分
- 这次没有做 library 统一类型整理
- 这次没有做 Rust `lib.rs` 模块拆分
- 现有未提交的 reader 布局排障改动没有并入本次提交

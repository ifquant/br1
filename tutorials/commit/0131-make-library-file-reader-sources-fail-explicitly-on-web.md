# 背景

在继续排 `reader` 的桌面错位问题时，先暴露了一个边界问题：

- `source=library-file` 这条 reader 路径本来就是桌面能力
- 但在纯 Web 环境里，它没有显式拦住
- 结果最终不是得到清晰错误，而是低层直接报 `Cannot read properties of undefined (reading 'invoke')`

这种错误的问题不是“功能坏了”本身，而是它会污染排障信号。  
你明明是在查 reader 布局或 EPUB 恢复位置，结果看到的是一个无意义的底层调用异常。

所以这次先做一个小修：把这条路径明确成 desktop-only，并让错误信息变得可读。

# 主要目标

- 让 `library-file` reader 路径在非 Tauri 环境下显式失败
- 避免出现模糊的 `invoke undefined` 低层错误
- 为后续继续排桌面 reader 问题清理噪音

# 改动概览

- [`src/lib/services/libraryPersistence.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts)
  - `loadLibraryBookFile()` 现在在非 Tauri 环境下直接抛出：
    - `library-file reader sources require the Tauri desktop runtime`
- [`src/lib/services/readerSearchCache.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/services/readerSearchCache.ts)
  - `loadLibraryFileFingerprint()` 现在也在非 Tauri 环境下抛出同样的显式错误

这样 `ReaderViewport` 通过已有的错误捕获路径，就会把问题显示成一个明确的 stage error，而不是让调用栈掉进底层 `invoke` 未定义。

# 关键知识

## 1. 能力边界要尽量在 service 层说清楚

像 `library-file` 这种能力，本质上依赖本地文件系统和宿主调用：

- 要读本地路径
- 要走 Tauri command

这说明它不是“通用 Web 能力”，而是“桌面宿主能力”。

最好的处理方式通常不是：

- 让调用一路冲到很底层才炸

而是：

- 在 service 入口就明确拒绝
- 并给出面向功能语义的错误信息

这样排障时更容易判断：

- 是宿主边界问题
- 还是 reader 本身的内容/布局问题

## 2. “更早失败”比“更深处崩掉”更有诊断价值

`invoke undefined` 这种错误最大的问题是：

- 它描述的是技术细节
- 而不是产品语义

看到它，使用者并不知道到底是哪条能力不支持。  
但如果错误是：

```text
library-file reader sources require the Tauri desktop runtime
```

那就立刻能知道：

- 不是 EPUB 本身坏了
- 不是 reader 布局坏了
- 而是你现在走的是一个只该在桌面里运行的入口

## 3. 排障时，先把噪音错误变成“有意义错误”

真实项目里，很多时间不是花在修 bug 本身，而是花在区分：

- 哪些错误是主问题
- 哪些只是干扰项

这次这个修复的价值就在这里：  
先把一条干扰性的底层异常变成可读边界错误，后面的桌面 reader 排障就会更干净。

# 验证

- `pnpm check` (PASS)
- `git diff --check` (PASS)
- 浏览器脚本访问 `source=library-file` reader URL，错误信息从低层 `invoke` 异常变为显式 desktop-only 提示 (PASS)

# 未覆盖项

- 这次没有让 `library-file` 在 Web 下真正可用，只是让它显式失败
- 这次没有继续处理桌面端 reader 的具体布局/恢复位置问题
- 这次没有改动 Tauri desktop 的 `library-file` 正常路径

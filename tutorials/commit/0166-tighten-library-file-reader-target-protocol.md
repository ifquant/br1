# 0166 收紧 library-file 到 reader 窗口的打开协议

## 这次改动做了什么

这一步执行的是 `01-02`。

核心变化不是“换个函数名”，而是把书库里“这本书怎么被打开到 reader”这件事，从裸 `href` 再往上收了一层，变成显式的 target object。

具体做了这些事：

1. 在 `src/lib/services/libraryPersistence.ts` 里新增 `LibraryReaderTarget`
2. 新增：
   - `toAssetReaderTarget()`
   - `toLibraryReaderTarget()`
3. `importBooksFromDesktopPicker()` / `importBooksFromReadest()` 现在除了返回 `firstReaderHref`，还返回 `firstReaderTarget`
4. `openReaderTarget()` 现在可以接受 `string` 或 `{ href }` 形式的 target
5. `src/routes/library/+page.svelte` 内部改成优先传递 target，而不是只传裸 href
6. 桌面回归里新增了对协议的断言：
   - 打开的目标必须是 `source=library-file`
   - 新窗口 URL 必须带 `mode=window`
   - `path` 要和书库链接里的一致

## 为什么这一步重要

之前虽然也能打开书，但“打开协议”是隐式的：

- route 里拿一个 href
- window service 再把它改成 `mode=window`
- reader route 再去解析 query

这条链路能工作，但没有一个中间对象把它表达出来。

这会有两个问题：

1. 一旦 query 结构改动，library、window、reader 三层都可能一起坏
2. 测试只能断言“最后打开了”，不容易断言“中间协议是不是对的”

现在有了 `LibraryReaderTarget`，就能更清楚地区分：

- 这是 asset 书
- 这是 library-file 书
- 这是从当前位置恢复
- 这是从头开始

## 你可以学到的工程知识

### 1. 裸字符串协议很快就会失控

一开始用字符串很快：

- `'/reader?...'`

但只要协议变复杂，比如加上：

- `source`
- `path`
- `location`
- `fraction`
- `mode`

那裸字符串就会越来越难维护。

更稳的做法是：

- 内部用结构化 target 表达协议
- 在需要落到 URL 的边界再转成 href

这就是这次收紧协议的核心。

### 2. 测试不只验证结果，也要验证协议

如果测试只看：

- 新窗口打开了
- reader stage 存在

那它只能证明“看起来能用”。

但这次回归还验证了：

- 原始书库链接就是 `library-file`
- 新窗口是同一路径，只是额外加了 `mode=window`
- 打开的 `path` 没被改坏

这类断言更接近“协议测试”，能更早发现问题。

## 本次相关文件

- `src/lib/services/libraryPersistence.ts`
- `src/lib/services/index.ts`
- `src/lib/services/readerWindow.ts`
- `src/routes/library/+page.svelte`
- `e2e/app.e2e.ts`

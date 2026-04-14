# 0202 收口 reader route 打开状态，并让 PDF 回归不再依赖时序运气

## 这次改动想解决什么

`reader/+page.svelte` 之前一直自己做这几件事：

- 从 URL 里拆 `source/url/path/label/fraction/location/mode`
- 推导 `readerBookKey`
- 组装 `asset` 或 `library-file` 的 `controlRequest`
- 维护一套 `autoOpenKey`

这些逻辑本身不是 UI，它们属于“reader 打开协议”的一部分。继续把它们留在 route 里，后面做 `Phase 5` 的 layout parity 时，route 还会继续混进格式细节和打开细节，维护成本会越来越高。

这次的另一个现实问题，是 PDF focused regression 虽然产品链路已经稳定，但切回 library 后，测试有时读到的还是旧 DOM，导致它拿不到带恢复进度的 href。这个失败不是 PDF viewer 真坏了，而是测试继续赌窗口事件时序。

所以这次目标是两件事：

- 把 reader route 的打开状态解析收成统一 helper
- 让 PDF restore 回归显式刷新 library，而不是依赖隐式刷新时序

## 做了什么

### 1. 新增 `src/lib/reader/route.ts`

这里新增了两个核心 helper：

- `parseReaderRouteOpenState(url)`
- `toReaderOpenControlRequest(target, nonce)`

前者把 URL 解析成统一的 `ReaderRouteOpenState`：

- `isWindowMode`
- `pickerRequested`
- `bookKey`
- `autoOpenKey`
- `target`

`target` 再细分成：

- `asset`
- `library-file`

这样 route 层不再需要知道每种 query param 如何自己拼成控制请求。

### 2. `reader/+page.svelte` 改成消费 route helper

现在页面只做 orchestration：

- 从 `parseReaderRouteOpenState($page.url)` 取 route state
- 根据 `target` 生成 control request
- 把 `bookKey` 用到 notes/search/bookmarks 的持久化 key

这一步很关键，因为它把“URL 解析细节”和“页面行为编排”拆开了。

### 3. PDF restore 回归增加显式 library refresh

在 `openRestorablePdfBook()` 里，关闭 reader 窗口并切回 library 后，现在会：

1. `browser.refresh()`
2. 等 `.library-page` 重新可见
3. 再去读当前书籍对应的 href 是否已经带上恢复进度

这样 focused PDF regression 读到的是当前书库最新状态，而不是某次窗口切换前残留的旧 DOM。

## 验证

实际跑过：

```bash
pnpm check
```

结果：`PASS`

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'opens the first library book in a separate reader window|restores a library-file epub into a visible reading position inside the reader stage|reopens a library-file pdf with restored progress inside the reader stage' --mochaOpts.timeout 120000"
```

结果：3 条桌面关键回归全部 `PASS`

```bash
git diff --check
```

结果：`PASS`

## 这次顺手能学到的编程知识

### 1. Route 不应该一边解析协议，一边做页面编排

当一个页面同时负责：

- 读 URL
- 判 source 类型
- 生成控制命令
- 再 orchestrate 组件状态

它很快就会变成 God object。

更稳的做法是把“协议解析”抽成 helper，让 route 只负责：

- 读 helper 输出
- 调 controller
- 连接组件

这和把网络层 response 先 parse 成 domain model，再交给 UI 是同一个思路。

### 2. 自动化测试最怕“隐式刷新”

`切回窗口之后库应该自己刷新` 这种逻辑，在真实用户手里可能经常成立，但在自动化里容易受：

- focus 事件时序
- visibilitychange 时序
- WebDriver 窗口切换细节

影响。

如果测试的目标是“验证最新持久化状态是否反映到 library”，更稳的方法往往是：

- 显式 refresh
- 等待页面 ready
- 再读你关心的 DOM

这样测试验证的是产品状态，而不是浏览器事件运气。

## 还没有处理什么

- 这一步没有继续扩 reader 视觉和 workspace
- 没有新增新的书籍格式
- 也没有继续做更深的 `ViewMenu` 或 `Reader shell` 对齐

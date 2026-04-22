# Startup Associated-Open Slice

## 背景

`br1` 之前已经有两条和 associated-file 相关的能力：

- 运行中通过 open-with / second-instance 事件把外部书籍请求排进 host queue
- 冷启动时通过 Tauri 启动参数把外部书籍请求排进同一条 host queue

历史教程 [`tutorials/commit/0221-cover-cold-start-associated-file-launches-through-the-same-open-with-pipeline.md`](/Users/dev/workspace2/hc_apps/br1/tutorials/commit/0221-cover-cold-start-associated-file-launches-through-the-same-open-with-pipeline.md) 已经证明过，focused startup case 在显式传入启动参数时可以跑通。

当前缺口不是“startup 参数能不能进来”，而是“哪一个窗口负责消费 startup associated-open queue”。

## 当前稳定主线

当前稳定主线是：

- `c7797a3` 收平了 reader reopen window recovery
- `156acee` 写入了对应教程

在这条主线上，标准 full desktop suite 已经验证通过：

```bash
bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts
```

结果：

- `38 passing / 1 skipped`

唯一被跳过的用例是：

- `opens a startup associated book argument in a separate reader window`

## 这次调查确认的事实

### 1. dedicated startup case 需要独立 reproducer，且结果仍会抖动

下面这条 dedicated 命令可以直接给 Tauri app 传启动书籍参数：

```bash
APP_OPEN_ARGS="/Users/dev/workspace2/hc_apps/br1/static/samples/sample-book.fb2" \
BR1_TEST_ASSOCIATED_FILE_PATH="/Users/dev/workspace2/hc_apps/br1/static/samples/sample-book.fb2" \
bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "opens a startup associated book argument in a separate reader window"
```

为了避免每次手抄这条命令，仓库里现在补了一条 dedicated reproducer：

```bash
pnpm test:e2e:tauri:startup-associated-open
```

但最新调查说明，这条 focused startup case 不是稳定绿灯：

- 有时能直接打开 reader window
- 有时会停在只有 `main -> /library` 的状态

一次实际失败的 startup state 是：

```json
{"handles":["main"],"urls":[{"handle":"main","url":"http://localhost:1420/library"}],"matchedHandle":null}
```

这说明即便专门给 startup case 单独起一条 harness，queue 仍然可能没有被消费。

### 2. broad 方式放宽 queue consumer 会污染标准 full

调查期间尝试过放宽 [`src/routes/+layout.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/+layout.svelte) 里这条限制：

- 之前只有 `currentWindow.label === 'main'` 的窗口能 `consume_associated_book_open_requests`

为了让 dedicated startup case 接住启动参数，曾试过把“没有 main window 的 library-like window”也视为 queue owner。结果是 dedicated startup case 更稳了，但标准 full 又被重新污染。

当时的标准 full 结果退回到：

- `34 passing / 4 failing / 1 skipped`

失败都重新落在 notes / highlights 的长跑 timeout 上，而不是 startup case 本身。

这说明：

- startup associated-open 的 queue owner 逻辑比看上去更敏感
- 它和标准 full suite 的 library/reopen/window 恢复链共用了一部分启动时序
- 不能用“泛化允许更多窗口消费 queue”的方式直接合并进稳定主线

### 3. 真正的问题是 startup window ownership，不是参数注入

代码路径已经足够明确：

- Rust 侧在 setup / opened / single-instance 回调里把文件路径入队
- 前端在 [`src/routes/+layout.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/+layout.svelte) 的 `flushAssociatedBookOpenRequests()` 里消费队列
- 现在的稳定主线只允许 `main` 窗口做这件事

dedicated startup 失败时，曾观察到只有一个初始窗口，URL 已经是 `/library`，但 Tauri label 不是 `main`。这正是 startup 队列被放着没人消费的最合理解释。

## 为什么这条线要单独切片

这条 startup 问题不适合再作为“顺手把 skipped case 收掉”的尾巴继续混在标准 full harness 里，原因有三条：

1. 它修改的是 app 启动阶段的 queue ownership，而不是单个业务 helper。  
   这类改动天然更容易污染全局窗口时序。

2. 标准 full suite 已经有一条稳定主线。  
   如果为了补 startup case 再把 full 重新打回 notes/highlights/search 长跑不稳定，收益不对称。

3. 当前失败并不是缺少更多等待时间，而是 ownership 判断可能错了。  
   在这个前提下继续放大 waits，只会掩盖真正的启动模型问题。

## 建议的下一步切法

后续应该把 startup associated-open 作为单独 slice 来做，而不是继续直接改稳定主线：

1. 先确认 dedicated startup 时的首个 library window 为什么不是 `main`
2. 再判断问题属于哪一层：
   - Tauri window labeling
   - single-instance / opened / setup 时序
   - queue consumer 所在层级
3. 只在确认 ownership 规则后，再决定是：
   - 改窗口创建策略
   - 改 queue owner 判定
   - 还是做 startup-only harness / entrypoint

## 当前结论

现在最重要的结论不是“startup associated-open 已完成”，而是：

- 它需要 dedicated reproducer 才能稳定调查
- 即便在 dedicated reproducer 下，startup queue 仍然会偶发不被消费
- 而且还没有找到一种不会污染标准 full desktop suite 的合并方式

所以在找到更窄、更准确的 ownership 方案之前，正确做法是保持主线稳定，把这条 startup 能力继续视为独立调查中的 slice。

# 0269: 给 saved highlight selection set 加第一版显式排序

上一刀把 saved selection set 从“只能保存/套用/删除”推进到了：

- 能重命名

但它仍然有一个明显问题：

- 保存集一多，用户没法明确控制它们的顺序

如果继续往 export 或 cross-book workflow 走，
而保存集的顺序还是隐式的，就会很快返工。

所以这一刀先把排序收成一个正式工作面状态：

- `最近保存`
- `最早保存`

并且让这套排序和当前书的 highlights workspace 状态一起持久化。

## 改了什么

### 1. 扩展 workspace state

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`
- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/models.rs`

`ReaderHighlightsWorkspaceState` 现在正式新增：

- `savedSelectionsSort`

Rust host-side 持久化结构也同步加了：

- `savedSelectionsSort`

并把 schema version 往前推了一格，旧状态默认回退到：

- `recent`

也就是“最近保存优先”。

### 2. 在 sidebar 里做第一版显式排序控件

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

`已保存选择集` 面板现在不再只是标题和计数，
而是新增了正式的排序控件：

- `最近保存`
- `最早保存`

同时保存集列表不再直接按原数组渲染，
而是先走：

- `orderedSavedHighlightSelections`

这样排序已经是工作面的一部分，而不是数据结构碰巧长成什么顺序。

### 3. 先锁两条最值钱的证据

#### TXT web

文件：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

这次把 `TXT web` 的 saved-set 链路升级成：

1. 保存并重命名第一组
2. 再保存第二组
3. 验证默认 `最近保存` 时，第二组排在前面
4. 切到 `最早保存`
5. 验证第一组排到前面
6. `reload`
7. 验证 `最早保存` 仍然保留
8. 再继续后面的套用/删除

#### EPUB desktop

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

这次把 `EPUB` desktop 的 saved-set 链路升级成：

1. 保存并重命名第一组
2. 再保存第二组
3. 验证默认 `最近保存` 时，第二组排在前面
4. 切到 `最早保存`
5. 验证第一组排到前面
6. 关闭 reader window
7. 重开同一本书
8. 验证：
   - `savedSelectionsSort = oldest`
   - 第一个 card 仍然是第一组
9. 再继续后面的套用/删除

也就是说，这刀证明的不是“有两个按钮”，而是：

- saved-set 的排序已经进入持久化 workspace state
- `reload` 和 `reopen` 都会把它恢复回来

## 为什么这刀先只锁 TXT web + EPUB desktop

因为这一刀验证的是：

- saved-set ordering 本身
- ordering 的状态持久化

不是再去证明每一种格式都已经支持保存集。

`TXT web` 最适合锁 reload 层证据。  
`EPUB desktop` 最适合锁主 reader reopen 层证据。

先把这两条打透，比再去补一圈 secondary-format 覆盖更值钱。

## 同步文档

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

总账里现在把这层能力从：

- named saved-selection-set flow with rename support

推进成：

- named saved-selection-set flow with rename and explicit sort support

## 验证

- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"` (PASS)
- `cargo check --manifest-path src-tauri/Cargo.toml` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 这刀之后的状态

现在 saved selection set 已经不只是：

- 能保存
- 能重命名
- 能套用
- 能删除

而且第一次有了：

- 显式排序
- 排序状态持久化

下一步如果继续，最自然的上层动作就变成：

- saved-set export
- cross-book workflows
- 或者 saved-set 的更细粒度批量管理

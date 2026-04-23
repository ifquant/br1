# 0512: 给 snapshot substrate 接上第一条真正的远端云同步路径

这次做的是 P2-3.3：不再停留在“本地导出/导入快照”，而是让 `br1` 第一次真的能通过一个远端 provider 做同步。

但这条功能有一个很容易做坏的地方：

- 如果 renderer 每次都能自己传远端 URL，那 Tauri 很快就会退化成通用网络代理
- 如果 push/pull 只是在异常里随便抛错，用户就根本不知道自己遇到的是没配环境、离线、临时失败，还是远端已经分叉

所以这次的重点不是“多打一条 HTTP 请求”，而是把 provider、信任边界和产品状态一起落到代码里。

## 这次做了什么

- `src-tauri/src/commands/remote_sync.rs`
  - 新增第一个远端 sync provider 命令模块。
  - 当前 provider 名字是 `readestCloud`。
  - renderer 传给 Tauri 的只有：
    - provider
    - operation（`push` / `pull`）
    - 已经组装好的本地 snapshot
  - 真正的远端配置全部由 Tauri 自己从本地桌面环境读取：
    - `BR1_READEST_CLOUD_SYNC_BASE_URL`
    - `BR1_READEST_CLOUD_SYNC_LIBRARY_ID`
    - `BR1_READEST_CLOUD_SYNC_TOKEN`
  - Tauri 自己构造固定 endpoint family：
    - `.../v1/libraries/<libraryId>/sync-snapshot`
  - 远端状态不会直接变成 throw，而是归一成产品状态：
    - `missing-config`
    - `offline`
    - `retryable-failure`
    - `conflict`
    - `success`
    - `empty`

- `src/lib/sync/remote.ts`
  - 新增远端 provider 的类型定义。
  - 把 provider、operation、status、返回 snapshot 和 fingerprint 摆成独立 contract。
  - 这样 library surface 不需要猜测 Rust 命令返回了什么字符串，也不用把 notice 逻辑写死在随手的 `catch` 里。

- `src/lib/services/remoteSync.ts`
  - 新增 renderer 侧 facade。
  - 它只负责调用 `run_remote_sync`，不自己构造 URL，不自己拼 auth header。

- `src/lib/library/desktopPage.ts`
  - 在现有 desktop library coordinator 里加了两条最小但真实的用户动作：
    - `推送到 Readest Cloud`
    - `从 Readest Cloud 拉取`
  - 这两条动作都复用现有 snapshot substrate：
    - 先从 library/books/bookmarks/notes/highlights/settings 组装当前 snapshot
    - 再把 snapshot 交给远端 provider 命令
  - `push`
    - 如果云端还没有 snapshot，就上传
    - 如果云端和本地一致，就明确返回“已一致”
    - 如果云端和本地不一致，就返回 `conflict`
    - 这次不会静默覆盖远端
  - `pull`
    - 从远端拿到 snapshot 后，继续走现有的 `prepareSyncSnapshotRestore + applySyncSnapshot`
    - 也就是说，远端 provider 只负责“拿到远端状态”，真正写回本地仍然走已经存在的 snapshot apply 路径

- `src/lib/components/library/LibraryHeader.svelte`
  - 在现有 library header 的“更多操作”菜单里增加云同步入口。
  - 仍然不新建单独 sync 页面，保持这次 slice 的范围可控。

## 为什么 push 故意不覆盖分叉远端

第一条远端 provider 路径最容易犯的错误，是为了“看起来能同步”而偷偷把分叉覆盖掉。

这次没有这么做，而是把 `push` 语义限定成：

- 远端不存在：可以上传
- 远端与本地一致：返回成功
- 远端与本地分叉：返回冲突，提示用户改为 `pull`

这样虽然功能更保守，但它更符合一个真实产品最先应该守住的事：不要在第一版远端同步里悄悄帮用户丢数据。

后面如果要做真正的 merge 或更细的冲突 UI，可以继续往上加；但这次至少先把“分叉是一个明确状态”落稳。

## 为什么 pull 不直接在 Rust 里把本地库全写了

因为这次已经有一条现成、经过验证的本地恢复路径：

- `prepareSyncSnapshotRestore`
- `applySyncSnapshot`

如果远端 provider 再自己发明一套“远端拉取后写回本地”的写盘逻辑，就会制造第二套恢复路径，后面维护会更乱。

所以这次把职责切开：

- 远端 provider：负责和云端通信，返回远端 snapshot 和状态
- 本地 snapshot restore：继续负责把 snapshot 写回 br1 的持久化结构

这是一种很常见的分层方式：先把“传输协议”和“本地落盘协议”分开，后面要换 provider 时就不会顺手复制一整套恢复逻辑。

## 测试这次怎么做

这次没有依赖真实云端服务，而是做了两层回归：

- Rust：
  - `src-tauri/src/commands/remote_sync.rs` 里用本地 TCP fixture server 覆盖：
    - missing config
    - push 首次上传成功
    - push 遇到远端分叉冲突
    - pull 遇到离线
    - pull 遇到可重试服务失败
- TypeScript：
  - `src/lib/sync/remote.test.ts`
  - 覆盖 renderer 侧对 retry/conflict helper 的判断

这样至少能保证：

- provider contract 是真的
- product 状态不是靠人工脑补
- 不需要在线环境也能稳定回归

## 这次没有做什么

- 还没有账号登录 UI
- 还没有自动定时同步
- 还没有远端 snapshot 历史列表
- 还没有双向 merge
- 还没有把书籍二进制文件本身做成云端文件同步

这次只是把第一条“远端 snapshot provider + push/pull + 产品状态”路径落地。

## 新手知识点

“能同步”不等于“遇到分叉也自动帮你处理掉”。

很多同步系统的第一版 bug，都不是“不会联网”，而是“联网之后太自作主张”。例如：

- 本地更新较新，远端较旧，结果被 pull 覆盖
- 两边都改了，系统默默以某一边为准
- 用户只看到一个 generic error，根本不知道其实是冲突

一个更稳的第一步是：

- 先把 transport 打通
- 再把状态分清楚
- 最后才去做 merge / auto-sync / 冲突解决 UI

这次 `readestCloud` 的 push 之所以宁愿先报冲突，也不自动覆盖，就是为了先把这个底线守住。

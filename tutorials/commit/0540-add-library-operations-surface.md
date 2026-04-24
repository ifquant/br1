# 0540 - 增加 library 的桌面操作面

这刀对应新的 `P6-1.1`。

目标不是去重写 library backend，也不是补一个假的“根目录迁移”对话框，而是把已经存在的桌面操作能力收成一个用户能看懂、也敢点的 product surface。

在这刀之前，`br1` 的桌面能力其实已经不少了：

- 本地快照导出 / 恢复
- KOReader 交换文件导出 / 导入
- KOReader 远端进度 push / pull
- Readest Cloud push / pull
- Readest 检测与迁移横幅

但这些入口主要都埋在 header 里的一个通用 `更多操作` 菜单里。功能虽然能用，产品语义却很弱：

- 用户看不出哪些是“桌面支持面”
- backup / restore 这种高价值动作没有显式 affordance
- Readest 迁移虽然有横幅，但和其他桌面操作之间没有被组织成一个完整的操作面

相关文件：

- [`/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopPage.ts)
- [`/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`](/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md)

## 这刀做了什么

1. 把 backup / restore 提升成 header 的可见操作

`LibraryHeader.svelte` 现在在桌面模式下直接显示：

- `备份书库`
- `恢复快照`

这一步的重点不是“多两个按钮”，而是把最重要的桌面安全动作从 overflow menu 里捞出来，让用户一眼知道：

- 我可以先备份
- 我也可以做整库恢复

这比只在菜单里藏一组二级操作更像真实产品。

2. 把旧的“更多操作”收成一个有主题的桌面操作菜单

原来的 menu 更像一个混合抽屉：排序、分组、快照、云同步都在一起，但缺少明确结构。

这次把它改成了一个更 intentional 的 `整理与同步` 面：

- 仍然保留排序 / 分组
- 新增桌面操作总览区
- 明确区分 `本地快照`、`KOReader 交换`、`云同步`
- 给 `Readest 迁移` 一个明确的产品解释位

这样用户会把这块理解成：

- 顶部 header 是 library 的主控制面
- 这里集中放置桌面支持能力

而不是把这些动作当成零散开关。

3. 给 Readest 迁移补上 header/menu 里的上下文

这次没有发明新的 renderer-side 迁移入口。

原因很直接：当前安全、真实存在的迁移动作仍然是由已有的 Readest 检测横幅触发的，文件系统所有权也继续在 Tauri 侧。

所以这刀做的是：

- 在 header/menu 里把 Readest 迁移明确标成桌面操作面的一部分
- 告诉用户迁移入口仍然来自下方横幅
- 在迁移进行中时，把快照 / 交换 / 云同步入口显式锁住

这比假造一个“迁移路径输入框”要正确得多，也符合这条线的 trust-boundary 要求。

4. 给桌面操作加上最基本的并发保护

`desktopPage.ts` 里原先的快照 / KOReader / 远端同步 handler 主要互相避让，但没有把 Readest 迁移中的情况也纳入统一限制。

这次加上的限制是：

- 迁移执行期间，不再允许快照导出 / 恢复
- 迁移执行期间，不再允许 KOReader 交换导入导出
- 迁移执行期间，不再允许 KOReader / Readest Cloud 远端同步
- 快照导入导出或远端同步进行中时，也不会再启动 Readest 迁移

这和新的 header disabled 状态是配套的：

- UI 上看起来被锁住
- handler 侧也真的不会继续执行；如果用户这时从迁移横幅发起 Readest 迁移，会得到一条明确提示，而不是把同步和迁移并发跑起来

所以这刀不是纯视觉整理，也顺手把产品面和行为面重新对齐了。

## 为什么这刀没有加 metadata refresh / root migration

因为这次任务的边界很明确：

- 如果没有已经存在的安全命令路径，就不要发明假行为
- 文件系统所有权必须继续留在 Tauri 侧

当前代码里已经有真实、安全、可复用的，是：

- snapshot restore / export
- KOReader exchange
- KOReader remote sync
- Readest Cloud sync
- Readest detection / migration banner

但没有一个已经暴露好的、同样可信的：

- renderer 可触发 metadata refresh command
- library root migration command

所以这刀选择的是把真实存在的能力 productize，而不是为了凑 checklist 文案去塞一个不可信入口。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`（PASS）

## 没有包含

- 没有新增 renderer 可控的文件路径输入
- 没有发明 metadata refresh / library-root migration 的假入口
- 没有继续做 transfer queue 或其他 `P6-1.2` 的桌面支持面

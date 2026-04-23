# 0491: run P0 exit audit

这一刀把 P0 exit audit 直接落进 `.planning/READEST-ALIGNMENT-CHECKLIST.md`，不再让 P0 状态散在聊天或临时模板里。

审计结论：

- P0 没有 `BLOCKED` 行
- 多格式打开、trusted-open、设置持久化、搜索缓存、标注/书签/进度、书库导入/浏览、书库修复/元数据都给出 `PASS`
- `P0-2.2` 给出 `SHIPPABLE_WITH_CAVEAT`，因为它是 source/static layout certification，没有截图或视觉 e2e 回归

为什么 P0-2.2 不强行写 `PASS`：

P0-2.2 这刀确实修掉了窗口壳体 token 和 sidebar 边距漂移，但没有跑截图对比，也没有新增视觉回归。把它标成 `SHIPPABLE_WITH_CAVEAT` 更准确，后续如果要继续视觉严格对齐 Readest，可以在 P1 前或 P1 中补视觉审计，而不是把当前静态证据夸大成完整视觉认证。

验证结果：

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`，PASS
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`，PASS

没做的事：

- 没有推进 P1 功能
- 没有新增视觉截图回归
- 没有修改 reader 或 library 运行时代码

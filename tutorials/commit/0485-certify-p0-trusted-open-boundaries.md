# 0485 - 认证 P0 可信打开边界证据

这一刀把 `P0-1.2` 需要的 desktop 证据补成了一个可 grep 的回归切片，覆盖：

- [`/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/e2e/app.e2e.ts)
- [`/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.planning/READEST-ALIGNMENT-CHECKLIST.md`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.planning/READEST-ALIGNMENT-CHECKLIST.md)

## 这刀做了什么

1. 新增一个窄回归，集中验证 associated-open 和 trusted-open 的边界

   新测试 `certifies associated-open queue normalization and trusted-open boundaries` 复用了现成 helper，顺着同一条 desktop 流程检查：

   - associated-open 请求的路径归一化
   - 受信 library-file 的 reader 打开结果
   - 未授权 renderer 路径对库资产边界的拒绝

2. 保留既有 startup associated-open 证据

   现有的 `opens a startup associated book argument in a separate reader window` 继续作为 packaged-style open-with intake 的桌面证据点。

## 为什么这么切

`P0-1.2` 的问题不是功能缺失，而是证据散在不同测试里，review 时不够容易一次性确认：

- 打开入口确实走 desktop associated-open
- associated queue 会做归一化
- 只有可信 library-file 才会进 reader
- 运行时不能把 renderer 控制的路径当作可信库源

把这些点收进一个新测试后，后续只要跑一次 targeted desktop/WebDriver smoke，就能把这几个边界一起看完。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec exec playwright test e2e/app.e2e.ts --grep "opens a startup associated book argument in a separate reader window|certifies associated-open queue normalization and trusted-open boundaries"`
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`

## 没有包含

- 没有改实现代码
- 没有动 `tests/e2e/library-smoke.spec.ts`
- 没有把其他 P0 项一起打勾

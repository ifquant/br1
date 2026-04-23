# 0489: certify P0 library repair remove restore cover and metadata

这一刀的目标不是再补一组新能力，而是把 P0-4.2 需要的桌面书库证据链收口成一条可 grep 的认证回归。

这次新增了一个桌面回归：`P0 library repair remove restore cover and metadata`。
它沿着一份带封面资产的样本书，先验证可信封面加载和修复预检，确认这条入口仍然只接受 Tauri 认可的路径。

移除/恢复、修复回流、以及元数据持久化这三条腿没有再重复造轮子，而是继续沿用现有的
`removes an imported shelf book without deleting the original source file and can undo the removal`、
`repairs a broken local library record by reimporting the same source file without duplicating it`，
以及 `edits shelf metadata collection and tags without changing the library file`
作为独立证据。这样 P0-4.2 还是完整的，但不会把同一条链路再写一遍脆弱用例。

同时还沿用了现有的反向安全证据，确认渲染器控制的未授权路径仍然会被 Tauri 拒绝，不会把 cover 或 repair preview 这类入口放开给前端伪造路径。

验证结果：

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`，PASS
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "P0 library repair remove restore cover and metadata"`，PASS
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`，PASS

没做的事：

- 没有推进 P0-2.2 或 P0-0.1
- 没有改书库业务逻辑，这次只补了认证证据和元数据辅助类型

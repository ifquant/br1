# 0488: certify P0 library import migration grouping filtering and sorting

这一刀的目标不是再做一套新书库能力，而是把现有桌面书库的导入、分组、过滤、排序证据链补到可以拿来做 P0-4.1 认证。

这次新增了一个可 greppable 的桌面回归：`P0 library import migration grouping filtering and sorting`。
它先触发样本导入，再从落盘书库记录里读取这批样本的真实 `sourcePath` / `format`，然后按实际记录验证三件事：

- 排序：切到格式排序后，书库里这批样本的路径顺序和 `format` 排序一致
- 分组：切到按格式分组后，格式分组卡片按预期顺序出现，并且能进入 `AZW3` 分组
- 过滤：打开样本书的元数据面板后，用格式筛选按钮把书库收窄，再确认另一种格式的样本被隐藏

Readest 迁移本身这次没有重复做一条新回归，而是沿用现有的
`reports Readest migration outcomes through the library banner and notice flow`
作为迁移证据。这样避免把同一条迁移链路再写一遍脆弱用例。

验证结果：

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`，PASS
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "P0 library import migration grouping filtering and sorting"`，PASS
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`，PASS

没做的事：

- 没有把 P0-4.2 一起推进
- 没有改书库实现逻辑，证据链只补了认证测试

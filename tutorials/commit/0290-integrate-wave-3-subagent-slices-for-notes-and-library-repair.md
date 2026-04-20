# 0290: integrate wave-3 subagent slices for notes and library repair

这次提交是并发执行计划里的第三波集成。

`Wave 3` 不再追求再开一条新的宽 lane，而是收当前 `P0` 里最弱、最容易继续积累产品债的两段：

- `Worker D`: notes / highlights management 收口
- `Worker B`: library repair workflow 收口

这次 orchestrator 的工作仍然不是重做 runtime，而是把两条 worker patch 接到真实产品证据链上：

- 做 integration review
- 把 web smoke 和 desktop regression 改到新状态机
- 更新 parity audit
- 留下 tutorial 和可读提交

## 这一刀实际集成了什么

### 1. Notes workspace 终于能直接删“当前视图”和“当前组”

来自 `Worker D` 的 runtime patch，`笔记` workspace 不再只有逐条删。

现在它多了两层真正可操作的管理面：

- `删除当前视图高亮 / 笔记 / 标注`
  - 会尊重当前 `全部类型 / 高亮 / 笔记` 和 `全部 / 当前章节` 筛选
- `删除本组高亮 / 笔记 / 标注`
  - 直接对某个章节组批量删除

这一步的价值不只是省点击，而是让 `notes` workspace 终于和前面已经做深的 `highlights` workspace 一样，开始有真正的 group/current-view management，而不是只剩单卡操作。

### 2. Library repair 不再靠“重新导入一遍赌运气”

来自 `Worker B` 的 runtime patch，desktop library import 现在会先尝试修复现有坏记录，而不是默认新建一条重复书籍：

- 如果同一本书的 library copy 丢了，但 `sourcePath` 还在：
  - 直接重建副本
  - 保留已有 `progress / progressFraction / progressLocation`
- 如果原文件路径坏了：
  - library 会把书放进 `待修复书籍`
  - row 上给出明确 repair action，而不是继续让它混在普通 continue/recent 里

底层上，这次真正补的是 import contract：

- 先判定现有 record 是否处于 `needs repair`
- 再用 `format + title/source stem + author` 做 repair match
- 命中后复用原 `id/importedAt`
- 清理旧副本和旧 cover
- 用修复后的 record 替换原条目，而不是插入副本

也就是说，这次不是加了个按钮，而是把“破损书籍重新进库”的语义从 `duplicate import` 收成了 `repair existing record`。

## Orchestrator 补了哪些证据

### 1. Web smoke 把 TXT notes path 改成新的 group-delete 语义

更新：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

现在 `TXT` web smoke 不再只验证：

- 选区
- 高亮
- 记笔记
- reopen

它还会继续验证：

- `仅看笔记`
- `删除本组笔记`
- 删除后回到 `全部类型`
- 只剩 `2 高亮 / 0 笔记`
- reload 后不反弹

这让 `Worker D` 的 patch 不只是 sidebar runtime 改动，而是有了 web 侧产品证据。

### 2. Desktop regression 把 TXT annotation path 改到新的最终状态机

更新：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

TXT desktop regression 这次有三处关键收口：

1. 先删掉 `仅看笔记` 下当前视图里的唯一 note
2. 再继续跑 highlights workspace 的 selected-only / saved-set / bulk-delete 链
3. 最后回到 `笔记`，明确断言是 `0 高亮 / 0 笔记`

这里有一个很容易犯错的点：

- 前半段已经主动删掉了 note
- 后半段就不能再保留“bulk delete 高亮后笔记仍在”的旧断言

这次 orchestrator 实际把这条 regression 的状态机整个对齐到了新的 notes-management 语义，而不是只让单个按钮有表面覆盖。

### 3. Desktop regression 新增了“repair without duplicate”证据

同一个文件里还新增了 focused desktop case：

- 先导入 `sample-book.txt`
- 人工把 on-disk record 改成：
  - `filePath` 指向坏副本
  - `sourcePath` 仍然有效
  - 带着已有 progress
- 刷新 library 后，确认这本书进入 `待修复书籍`
- 再次导入同一个 source file
- 断言结果不是多一条重复书，而是原 record 被修好并保留原有进度

这条证据很关键，因为它证明这次 library repair 不只是 UI 提示，而是真的改变了 desktop import 的持久化契约。

## 为什么这次集成是合理切片

`Wave 3` 没有试图宣布：

- `Annotations and Highlighting = Completed`
- `Library Management = Completed`

这仍然不真实。

这次真正完成的是：

- `notes` workspace 有了第一条 current-view/group-level bulk delete 管理面
- library repair 从“模糊 recovery 提示”推进成了“repair existing record instead of duplicate”

这是一刀高价值收口，不是终局宣告。

## 还没做什么

这次仍然没有关闭的东西包括：

- notes/highlights 还缺更深的 grouped management 和更广格式产品面
- library repair 还没有 bulk recovery、明确 relink review、冲突审查面
- packaged `open-with` 的 release-build 证据仍然没收

所以正确结论是：

- `Wave 3` 继续把 `P0-3 / P0-4` 往前推进了一刀
- 但还没有到可以把这些行改成 `Completed`

## 你可以学到什么

### 1. regression 一旦改了前半段状态机，后半段断言必须整条重算

这次 TXT desktop regression 的真实 landmine 是：

- 前面已经删了唯一 note
- 后面却还在等“note 仍然存在”

这种错误不是 flaky test，而是 regression 的状态机已经分叉。正确做法不是加 wait，而是把整条用户路径重新对齐。

### 2. repair workflow 真正值钱的是“复用旧 record”，不是“让用户少点一次按钮”

如果 repair 最终只是再 import 一次、再插一条新 record，那 recovery UI 再好看也没意义。

这次真正补上的，是：

- 复用旧 id
- 保留旧 progress
- 清理旧副本
- 避免 duplicate rows

这才是 library management 真正需要的 repair contract。

## 验证

实际跑过：

```bash
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --grep "reader supports txt notes through selection, persistence, and note reopen in web mode" --reporter=line
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists txt highlights and notes separately through the desktop reader store|repairs a broken local library record by reimporting the same source file without duplicating it' --mochaOpts.timeout 240000"
pnpm check
cargo check --manifest-path src-tauri/Cargo.toml
git diff --check
```

结果：

- PASS

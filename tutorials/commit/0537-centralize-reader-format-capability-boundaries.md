# 0537 - 收拢 reader 的格式能力边界

这刀对应 `P4-1.1`。目标不是新增 TXT 搜索，而是先把 reader 里已经存在的“支持 / 不支持”产品边界收成一个共享 contract。

之前这块有个很典型的问题：

- `ReaderSidebar` 已经通过 [`formats.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts) 统一处理“当前格式是否支持正文批注”
- 但 `ReaderViewport` 里对 TXT 搜索的 unsupported 提示还是单独硬编码

这会带来两个直接后果：

- 同一个 reader 的格式能力边界分散在不同组件里
- 下一轮如果继续对齐 Readest 的 reader 搜索 / sidebar 语义，很容易再次出现“一个面板已经改了，另一个地方还保留旧判断”的漂移

相关文件：

- [`/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte)
- [`/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts)
- [`/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`](/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md)

## 这刀做了什么

1. 在 `formats.ts` 里把搜索能力也变成格式表的一部分

`ReaderFormatCapability` 现在除了：

- `textAnnotatable`

还多了：

- `searchable`

于是 reader 的格式能力表不再只管“能不能做正文批注”，也开始负责“能不能做全文搜索”。

当前这刀只把已有事实显式化：

- `txt` 标记为 `searchable: false`

没有顺手扩新格式支持。

2. 新增共享 helper，和批注 helper 放在同一层

这次新增了两个 helper：

- `supportsSearchForFormat(...)`
- `getSearchSupportMessage(...)`

这样 reader 里关于搜索能力的判断也开始有稳定出口，而不是继续把字符串散落在组件内部。

同时 [`index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts) 也把它们重新导出，避免后续组件直接绕过 reader barrel 去深链具体模块。

3. `ReaderViewport` 不再自己硬编码 TXT 搜索报错

[`ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte) 的 `runSearch(...)` 现在先做两步：

- 先统一 trim query
- 再通过共享 helper 判断当前格式是否支持搜索

如果不支持，就发出统一的 unsupported search state：

- `status: 'error'`
- `error: getSearchSupportMessage(currentFormatLabel)`

这一步很重要，因为这意味着：

- viewport 不再自己知道“TXT 要报什么错”
- 它只知道“去问共享能力表”

后面如果继续做 reader parity，就不会再从 viewport 里到处找硬编码字符串。

4. 补一条 focused smoke，锁住当前真实 contract

这刀新增的 smoke 不是大而全 reader 回归，而是一条很聚焦的产品约束：

- 打开 TXT 样例
- 切到 `搜索`
- 输入 query
- 断言当前仍然展示 `TXT 书籍暂不支持全文搜索。`

这条测试的价值不在于“证明 TXT 能搜索”，而在于锁住：

- 现在确实还不支持
- 这个 unsupported state 是用户可见的正式产品行为，不是某个组件里的偶然分支

## 为什么这刀值得先做

因为 `P3` 已经把 library 面收完了。下一条 parity 主线如果进入 reader，却还保留这种分散的能力判断，后面每一刀都会越来越难收口。

先把“格式能力边界”变成共享 contract，后面才能继续做：

- search surface 的产品化
- notes / bookmarks / highlights 的统一能力提示
- 非 EPUB / PDF 格式在 reader 里的行为对齐

这是一刀典型的“先把边界收正，再谈功能扩张”。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`（PASS）
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows txt search capability boundary messaging in web mode"`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`（PASS）

## 没有包含

- 没有新增 TXT 全文搜索能力
- 没有改 EPUB / PDF 搜索结果结构
- 没有继续改 notes / bookmarks / highlights 的 sidebar hierarchy

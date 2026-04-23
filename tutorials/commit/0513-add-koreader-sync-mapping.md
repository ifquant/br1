# 0513: 给 sync substrate 补第一版 KOReader mapping adapter

这一刀完成 `P2-4.1 Add KOReader import/export mapping`，但只做 adapter，不做 workflow。

目标很窄：

- 让 KOReader 风格的 progress / annotation 数据可以进出我们现在的 sync substrate
- 不把 KOReader 的字段直接抬成新的 core model
- 先把 round-trip 和 fixture 证据做扎实，再去做 `P2-4.2` 的可见导入导出流程

## 1. 为什么这一刀不能直接做 UI

清单里已经把 `P2-4.1` 和 `P2-4.2` 分开了：

- `P2-4.1` 只负责 mapping
- `P2-4.2` 才负责 visible workflow

这是对的，因为 KOReader 的数据形状和我们现在的 substrate 并不完全一样。

KOReader 在 Readest 这条线上，本质上传两类东西：

- `config`
  - 书本标识
  - progress
  - xpointer
- `notes`
  - annotation
  - bookmark
  - style / color / page / xpointer 区间

而我们 `br1` 的 substrate 现在只有：

- `reading-state`
- `notes`
- `bookmarks`

如果现在直接把 KOReader 做成新的 core record kind，那就会把“生态兼容层”误升格成“核心模型”。这一步故意不这么做。

## 2. 新模块做了什么

新文件是：

- [koreader.ts](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/sync/koreader.ts)
- [koreader.test.ts](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/sync/koreader.test.ts)

里面新增了三组能力。

### 2.1 KOReader progress -> `reading-state`

`createKoReaderReadingStateSyncRecord(...)` 会把 KOReader book config 映射到现有 `reading-state` record。

这里做了两个关键决定：

1. `xpointer` 直接映射到 `progressLocation`
2. page progress 不新开字段，而是先正规化成 `"[current,total]"` 字符串放进现有 `progress`

这样做的好处是：

- 不用修改当前 snapshot schema
- 仍然能保留 KOReader page progress 的最小信息
- 后续 workflow 可以继续沿这条线走

同时也承认一个事实：

- 我们当前 substrate 没有 KOReader 专属 page-progress 结构
- 所以这一刀只是 best-effort mapping，不是假装已经有完整分页语义

### 2.2 KOReader annotation / bookmark -> `notes` / `bookmarks`

`createKoReaderAnnotationSyncRecords(...)` 会把 KOReader 的两种 annotation 数据拆进现有 substrate：

- `annotation` -> `notes`
- `bookmark` -> `bookmarks`

但 KOReader 自己特有的字段没有被抬成新 core type，而是留在 adapter metadata 里，例如：

- `bookHash`
- `metaHash`
- `xpointer0`
- `xpointer1`
- `page`
- `style`
- `color`
- `updatedAt`

这样后面再导回 KOReader 时，adapter 还能把这些字段重新拼回来。

这就是“兼容 KOReader，但不让 KOReader 成为核心模型”的关键做法。

### 2.3 substrate -> KOReader restore

`restoreKoReaderBookConfigFromSync(...)` 和 `restoreKoReaderAnnotationsFromSync(...)` 负责把现有 substrate record 重新投影回 KOReader 形状。

这里还有一个很重要的边界：

- 已删除的 KOReader entry，这一刀不进 substrate
- round-trip 只覆盖“活的记录”

因为我们当前 sync substrate 还没有 tombstone model。现在硬塞 deleted 语义，只会把 core model 搞脏。

## 3. 为什么用 adapter metadata，而不是改 `ReaderNote`

你会发现这一刀没有去改 reader 的核心类型定义，而是把 KOReader 特有字段塞在 adapter 生成的对象附带 metadata 里，再让现有 sync record 的 spread/JSON 路径把它保留下来。

这样做有两个现实好处：

1. 改动小
   - 不会把 reader UI、reader controller、snapshot service 一起卷进来
2. 边界清楚
   - KOReader 细节只存在于 `sync/koreader.ts`
   - 后续如果要加别的生态 adapter，不会被迫沿用 KOReader 命名

也就是说，这刀更像是在 substrate 外面包了一层 translator，而不是重写 substrate 本身。

## 4. 测试证明了什么

这次新增的 fixture test 覆盖了三件事：

1. KOReader reading config 可以通过 `reading-state` round-trip
2. KOReader annotation + bookmark 可以通过 `notes` / `bookmarks` round-trip
3. page tuple parser 只接受明确的 KOReader page-progress 形状

其中第二条是这次最关键的证据，因为它证明：

- 我们没有引入新的 sync record kind
- 但 KOReader 特有字段也没有在转换过程中被洗掉

## 5. 这一步故意没做什么

这次没有做：

- KOReader 可见导入导出入口
- KOReader sync workflow
- KOReader 凭证或远端服务配置
- tombstone / deleted annotation 同步
- 真正的 xpointer <-> CFI 文档级转换

这些都应该留给 `P2-4.2` 之后的 slice。

如果现在一起做，会把一个“纯 mapping 验证 commit”膨胀成“半个 sync 产品面”，很难审，也很难回归。

## 6. 这刀的收获

到这里，`br1` 已经有了一个很清楚的姿势：

- substrate 继续保持自己的核心形状
- Readest / KOReader 生态兼容通过 adapter 进入
- 可见 workflow 延后到下一刀

这比一开始就把 KOReader 结构直接写进核心模型更稳，也更接近后面继续扩展多生态适配器时需要的形状。

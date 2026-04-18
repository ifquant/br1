# 0219: 从 Kindle 容器导入 AZW3 元数据

这一步继续沿着 `P0-1` 的多格式 metadata 线推进，但范围刻意压得很窄：

- 不去碰新的打开路径
- 不去做更大范围的 `MOBI/AZW3` 解析器
- 只修一个已经有明确证据的问题：`AZW3` 样本容器里明明已经有 `author / language / publisher / description`，导入后 library 却仍然全部是空的

## 为什么做这一刀

前几步已经把多格式链路推进到了：

- 能导入
- 能打开
- 能回流到 library
- 能带 restore 信号
- metadata 不再被回写成难看的 `title/status`

但 `AZW3` 还有一个明显的浪费：

- 样本本身是一个真实 `KF8` 容器
- EXTH 里已经带了完整 metadata
- `br1` 导入时却完全没消费这些字段

也就是说，这不是“未来也许能做”的事情，而是“现成信息已经在文件里，但我们还没拿”。

## 先确认了什么

在动代码前，先直接检查样本容器，确认它的 EXTH 确实有我们要的字段：

- `author = Infogrid Pacific`
- `publisher = Infogrid Pacific`
- `description = Font rendering for multiple languages in a single ePub 3`
- `language = en`
- `title = Around the World in 28 Languages`

这个确认很重要，因为它决定了这一步可以做成“最小确定性解析”，而不是去赌 reader 运行时会不会碰巧拿到这些值。

## 改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/library.rs`

新增：

- `KindleMetadata`
- `decode_kindle_text()`
- `derive_kindle_metadata()`

这套逻辑做的事情很有限：

1. 读取 `mobi/azw3` 文件字节
2. 检查 MOBI header 是否声明带 EXTH
3. 在 header 后面的合理范围里定位 `EXTH`
4. 只解析当前真有价值的记录类型：
   - `100` -> `author`
   - `101` -> `publisher`
   - `103` -> `description`
   - `503` -> `title`
   - `524` -> `language`

然后在导入 `mobi/azw3` 时：

- 用 EXTH `title` 覆盖原本的文件名 stem
- 用 EXTH `author / language / publisher / description` 填充 `LibraryBookRecord`

这一步仍然是“有就提取，没有就保持原来的降级语义”，不会把没有 EXTH 的旧 `.mobi` 样本硬说成支持了完整 metadata。

## 为什么没有顺手把 MOBI 也补成完整 metadata

因为当前 checked-in 的 `sample-book.mobi` 没有同等级的可用 EXTH。

这里要区分两种情况：

- `AZW3/KF8`：样本容器里真有 metadata，可以可靠提取
- 当前这个 `MOBI` 样本：没有同等级证据，继续硬补只会变成猜测

所以这一步的策略是：

- 对 `AZW3` 做真支持
- 对 `MOBI` 保持原来的最小降级

这样证据和实现是对齐的。

## 测试怎么补的

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

新增 focused regression：

- `imports azw3 metadata from the kindle container before any reader round-trip`

它只验证一件事：

- `AZW3` 样本刚导入进 library、还没经过 reader open/round-trip 之前，磁盘上的 `library.json` 就已经带上：
  - `title`
  - `author`
  - `language`
  - `publisher`
  - `description`

这条测试的价值在于把“导入层 metadata 提取”单独锁住，避免未来只能通过 reader round-trip 间接修正标题或作者。

## 这一步的边界

这次没有做：

- `MOBI` 的更深 metadata 提取
- `CBZ` 或 `FB2` 的更多 schema 扩展
- annotation/search 这类更高层产品行为

它只解决当前最明确的一件事：

- `AZW3` 里已经存在的 metadata，必须在导入时就进入 library，而不是继续白白丢掉

# 0224: 在导入阶段直接提取 FB2 的 XML metadata

这次继续沿 `P0-1` 的多格式 metadata 主线往下收，不再继续补已经闭环的打开路径。

上一刀把 `Kindle-family` 的导入契约讲清楚了：

- `MOBI`：导入时至少要拿到它真实带着的 `language`
- `AZW3`：导入时要拿到 richer 的 `author / language / publisher / description`

接下来最自然的下一刀就是 `FB2`。

## 为什么这一步值钱

`FB2` 不是一个“只能打开就算完”的格式。

它本身就是 XML 容器，导入阶段就天然可以拿到：

- `book-title`
- `author`
- `lang`
- `annotation`
- `publish-info / publisher`

如果 importer 不在导入时提这些字段，而是：

- `title` 先退回文件名
- `description / publisher` 一直空着
- 直到 reader 打开一次后才靠运行时 metadata 回写变干净

那 library 层的产品契约就是弱的。

这一步的目标很直接：

- `FB2` 的 library record 要在导入完成时就已经是“像样的书”

## 这次实际做了什么

### 1. 把 FB2 解析从“零碎 helper”升成了正式 metadata 提取

之前 importer 对 `FB2` 只做了两件事：

- 提取 `author`
- 提取 `language`

现在改成统一提取：

- `title`
- `author`
- `language`
- `description`
- `publisher`

来源分别是：

- `title-info / book-title`
- `title-info / author`
- `title-info / lang`
- `title-info / annotation`
- `publish-info / publisher`

这意味着：

- `FB2` 不再默认先落成文件名标题
- `annotation` 不再被白白丢掉
- `publish-info` 也终于开始进 library record

### 2. 把 sample FB2 fixture 补成真正能证明 importer 的样本

之前的 `sample-book.fb2` 太薄，只能证明：

- 标题
- 作者
- 语言

这次把它补成了一个更像真实书籍描述块的 fixture，加入了：

- 两段 `annotation`
- `publish-info / publisher`

这样 focused regression 就不是在测“parser 代码有没有分支”，而是在测：

- library.json 里是不是真的提前得到了 richer metadata

### 3. 增加 import-time focused regression

新的桌面回归直接验证：

- 在 **没有任何 reader round-trip** 的前提下
- 导入 `FB2` 后
- `library.json` 已经带有：
  - `title = Bridge Reader Sample FB2`
  - `author = Bridge Team`
  - `language = en`
  - `publisher = Bridge Reader Lab`
  - `description` 包含 annotation 文本

这让 `FB2` 的 metadata 产品契约终于和前面的 `MOBI/AZW3` 一样，变成了导入阶段就可验证的事实。

## 结果

`P0-1` 的 secondary-format metadata 主线现在又往前收了一大块：

- `FB2`：导入即有 `title/author/language/publisher/description`
- `MOBI`：导入即有真实存在的 `language`，其余字段干净 fallback
- `AZW3`：导入即有 richer `author/language/publisher/description`
- `TXT`：已有真实 plain-text reader surface

这意味着多格式这条线越来越不像“只会打开几种扩展名”，而开始更像真正的 library/import product surface。

## 这一步没有包含

- 没有开始做 `FB2` 的 annotation/highlight 产品能力
- 没有扩第二个 `FB2` fixture 去覆盖更多 XML 变体
- 没有开始做 secondary formats 的统一 annotation consistency

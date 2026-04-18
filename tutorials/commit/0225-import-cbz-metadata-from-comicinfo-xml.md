# 0225: 在导入阶段直接提取 CBZ 的 ComicInfo.xml metadata

这次继续沿 `P0-1` 的 secondary-format metadata 主线往前收，没有再去扩已经闭环的打开路径。

前几刀已经把：

- `FB2` 的 XML metadata
- `MOBI` 的 legacy EXTH language
- `AZW3` 的 richer Kindle metadata

都推进到了“导入即落盘”的层级。

接下来最自然的一刀就是 `CBZ`。

## 为什么这一步值钱

`CBZ` 之前的状态其实很弱：

- 能导入
- 能打开
- reader 往返后不会把 library title 污染成 `002-page.svg`

但它在导入阶段依然只有文件名：

- `title = sample-comic`
- `author = Unknown author`
- `description = None`
- `publisher = None`

这对“多格式支持”来说还是太薄。

如果 `CBZ` 包内已经带了 `ComicInfo.xml`，那 importer 就应该在导入时直接把这些字段拿出来，而不是等 reader 打开后才逐步变干净。

## 这次实际做了什么

### 1. 在 importer 里新增 `CBZ` metadata 解析

这次没有去碰 reader path，而是在 Rust importer 里新增了最小 `ComicInfo.xml` 解析：

- `Title`
- `Writer`
- `LanguageISO`
- `Summary`
- `Publisher`

做法保持克制：

- 先打开 zip
- 找 `ComicInfo.xml`
- 再用现有 `quick-xml` 读最关键字段

这让 `CBZ` 的 library record 终于也能在导入时像“书”，而不是“一个压缩包文件名”。

### 2. 把 sample CBZ fixture 升级成真正能证明 importer 的样本

之前 `sample-comic.cbz` 只有两张页面资源：

- `001-cover.svg`
- `002-page.svg`

这次往里面加了一份最小 `ComicInfo.xml`，让样本明确携带：

- title
- author
- language
- publisher
- description

这样新的 focused regression 测的是真实现象，不是“代码里有这个分支”。

### 3. 增加 import-time focused regression

新的桌面回归直接验证：

- 在 **没有任何 reader round-trip** 的前提下
- `CBZ` 导入后
- `library.json` 已经带有：
  - `title = Bridge Reader Sample Comic`
  - `author = Bridge Team`
  - `language = en`
  - `publisher = Bridge Reader Lab`
  - `description` 包含 sample summary

同时，原来的 round-trip regression 也同步改成了新的导入标题，而不再继续盯着旧的文件名标题。

## 结果

`P0-1` 的导入期 metadata 主线现在已经比较成形：

- `CBZ`：导入即有 `ComicInfo.xml` metadata
- `FB2`：导入即有 XML metadata
- `MOBI`：导入即有 legacy EXTH language + clean fallback
- `AZW3`：导入即有 richer Kindle metadata
- `TXT`：已有真实 plain-text reader surface

这比“多格式只是能打开”更接近真正的 library/import product surface。

## 这一步没有包含

- 没有开始做 `CBZ` 的 annotation/highlight 能力
- 没有覆盖更多 `ComicInfo.xml` 变体字段
- 没有开始做多格式统一 annotation consistency

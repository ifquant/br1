# 0226: 在导入阶段为 CBZ 持久化封面资源

这次继续沿 `P0-1` 的 secondary-format import surface 推进，没有再去扩已经闭环的打开路径。

上一刀把 `CBZ` 的 `ComicInfo.xml` metadata 拉到了导入阶段：

- `title`
- `author`
- `language`
- `publisher`
- `description`

但 `CBZ` 在 library 里仍然缺一块很明显的东西：

- 导入后没有 `coverPath`

这意味着它虽然已经不像“文件名占位符”，但还不像一条真正完整的 comic library record。

## 为什么这一步值钱

`CBZ` 和普通文本书最大的产品差异之一，就是：

- 封面本身就是第一层识别信号

如果 importer 还要等 reader 打开后，甚至根本不给 library 封面，那这个格式的 library 体验就还是半成品。

这一步的目标很直接：

- `CBZ` 导入完成时，就已经有可直接显示的封面资源

## 这次实际做了什么

### 1. 在 importer 里新增 `CBZ` 封面提取

这次没有去碰 reader 行为，而是在 Rust importer 里补了最小 cover 提取：

- 先打开 zip
- 优先找名称里带 `cover` / `front` 的图片资源
- 找不到再退回第一张图片

支持的图片类型是：

- `svg`
- `png`
- `jpg/jpeg`
- `webp`

拿到资源后，直接在 library `books/` 目录旁落盘，并把路径写进 `cover_path`。

### 2. 补齐 `svg` 的封面 MIME

之前 `cover_mime_type()` 只认：

- `png`
- `jpg/jpeg`
- `webp`

这会导致当前这个 `CBZ` 样本里的 `001-cover.svg` 就算被提出来，也会被错误标成 `image/png`。

这次顺手补成了：

- `svg -> image/svg+xml`

这样 `load_library_cover_data_urls` 返回的 data URL 才是真正可用的。

### 3. 把 focused regression 从“有 metadata”推进到“有 metadata + 有封面”

新的 `CBZ` import-time regression 现在不再只要求：

- `title`
- `author`
- `language`
- `publisher`
- `description`

还会继续要求：

- `coverPath` 已经存在
- 通过现有 cover loader 转成的 data URL 以 `data:image/svg+xml;base64,` 开头

也就是说，这次锁定的是一个更完整的导入契约：

- `CBZ` 在进入 library 时，就已经是“有文字元数据 + 有封面资源”的可展示条目

## 结果

`CBZ` 这条线现在已经不只是：

- 能打开
- metadata 不脏

而是进一步变成：

- 导入时就有 `ComicInfo.xml` metadata
- 导入时就有可显示的封面资源
- reader 往返之后 richer 标题不会再被 source stem 压回去

这让 `CBZ` 更接近真正的 comic library support，而不是“压缩包能读”。

## 这一步没有包含

- 没有开始做 `CBZ` 的双页 / 漫画专用导航产品能力
- 没有覆盖更多 `ComicInfo.xml` 变体
- 没有开始做 secondary-format annotation consistency

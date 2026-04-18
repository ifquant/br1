# 0218: 保持 FB2 语言和 library 进度 badge 可读

这一步继续沿着多格式 metadata 线往下收，但目标很窄：

1. `FB2` 既然已经能把作者带进 library，就不该继续把语言丢掉。
2. `MOBI/AZW3` 在 reader 和磁盘里都不再写 `0%` 了，library UI 也不该继续把 tiny progress 圆回 `0%`。

## 问题是什么

上一刀修完之后，磁盘里的多格式 metadata 还有两个残留问题：

- `FB2` 记录的 `language` 仍然是空的，尽管样本文件里已经有 `<lang>en</lang>`。
- `MOBI/AZW3` 的 `progress` 文案已经不是 `上次读到 0%`，但 library 仍会自己根据 `progressFraction` 重新四舍五入，导致书架 badge 继续显示 `0%`。

这会让“持久化语义”和“library 展示语义”重新漂移。

## 改了什么

### 1. `FB2` 导入时直接提取语言

文件：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/library.rs`

新增了：

- `derive_fb2_language(source: &Path) -> Option<String>`

它会用 `quick-xml` 扫描 `title-info > lang`，拿到首个非空值并写入 `LibraryBookRecord.language`。

这样 `FB2` 不再只保留标题和作者，最基础的语言 metadata 也能进入 library。

### 2. library 自己的进度 badge 改成和 reader 一致的最小非零语义

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte`

新增了：

- `formatProgressPercentLabel(fraction)`

逻辑与 reader 侧保持一致：

- `fraction <= 0` 显示 `0%`
- `fraction > 0` 时，最少显示 `1%`

这样 `MOBI/AZW3` 那种 tiny progress 不会在 library 卡片、continue reading 行和详情面板里重新退回 `0%`。

## 测试怎么补的

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

沿用上一刀的 focused regression：

- `keeps fb2 authors and tiny kindle progress labels human-readable after reader round-trips`

这次把断言继续加严：

- `FB2` 除了作者，还必须保留 `language === "en"`
- `MOBI/AZW3` 不只检查磁盘里的 `progress` 文案不为 `上次读到 0%`
- 还会直接检查 library UI 里的 `progress badge !== "0%"`

这样就把：

- 导入层 metadata
- 持久化层 metadata
- library 展示层 metadata

三层一起锁住了。

## 这一步的边界

这次没有做：

- `MOBI/AZW3` 的语言或作者提取
- `publisher / description` 的跨格式补齐
- 更广的 metadata schema 标准化

它只解决当前最明确的两条残留不一致：

- `FB2` 语言缺失
- library 自己把非零 tiny progress 显示回 `0%`

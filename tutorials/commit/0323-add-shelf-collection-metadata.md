# 0323 - 增加书架归类元数据

本次提交把 `Library Management` 的本地管理面再往前推进一小步：书库条目现在可以保存一个轻量的 `书架归类` 字段，用来表达“这本书属于哪个本地书架/专题”。它不是在线目录，也不是完整标签系统，而是一个可持久化、可编辑、可回归的离线 collection 基础能力。

## 改了什么

- 在 Rust 的 `LibraryBookRecord` 上增加 `collection` 字段，并让旧 `library.json` 缺失该字段时自动按空值读取。
- `update_library_book_metadata` 现在可以一起更新 collection，空字符串会被归一化为未归类。
- Svelte library 类型、持久化 service、route 映射和 `BookshelfPreview` metadata panel 全部透传 collection。
- 主书架详情面板显示 `书架归类 / 未归类`，编辑元数据表单新增 `Edit book collection` 输入框。
- 现有 desktop metadata regression 扩展为验证 collection 会写入 `library.json`，并且保存后仍不改变托管书籍文件路径。
- web library smoke 增加了 `书架归类 / 未归类` 的只读面板断言。

## 为什么这样做

Readest parity 的 library 缺口已经不是“能不能导入”，而是书库是否能作为一个长期管理面存在。完整 collections/tags 管理会牵涉筛选、批量操作、迁移和 UI 信息架构，不适合在这个 slice 一次性做完。

所以这里先落一个低风险基础字段：

- 它完全本地化，不碰 P2 的在线目录或同步服务。
- 它复用现有 metadata editor，不新增第二套编辑状态。
- 它已经有桌面持久化证据，后续可以安全扩展为筛选、分组或多标签。

## 实现细节

Rust 侧字段放在 `LibraryBookRecord`：

```rust
#[serde(default, skip_serializing_if = "Option::is_none")]
pub(crate) collection: Option<String>,
```

这里的 `default` 很重要：旧书库文件没有 `collection` 字段时仍能读取。`skip_serializing_if` 则避免把所有未归类记录都写成显式 `null`，保持 `library.json` 比较干净。

前端的更新链路是：

```text
BookshelfPreview form
-> handleUpdateBookMetadata()
-> updateLibraryBookMetadata()
-> update_library_book_metadata
-> library.json
```

这个链路和 title/author/description/language/publisher 共用，所以 collection 不会绕开现有安全合同：只更新书库元数据，不移动文件、不重置进度、不覆盖恢复定位。

## 验证

- `pnpm check`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "edits shelf metadata"`
- `git diff --check`

## 没有包含

- 没有做完整 collections 管理页。
- 没有做多标签、批量归类、collection filter 或 drag-and-drop shelf。
- 没有做 cover editing。
- 没有接入任何在线 catalog 或同步能力。

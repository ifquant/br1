# 0325 - 增加本地标签元数据

这一刀继续收 `Library Management`，把书库 metadata 从单一 `书架归类` 扩展到轻量标签。标签仍然是纯本地能力：只保存在 `library.json`，不会引入在线目录、同步或推荐服务。

## 改了什么

- `LibraryBookRecord` 增加 `tags: Vec<String>`，旧记录默认读成空数组。
- `update_library_book_metadata` 支持更新 tags，并在 Rust 侧去空、去重。
- 前端 `PersistedLibraryBook` / `LibraryShelfBook` / shelf preview 类型全部透传 tags。
- 主书架详情面板显示 `标签`，没有标签时显示 `未标记`。
- metadata editor 新增 `Edit book tags` 输入框，使用逗号分隔多个标签。
- library 搜索 haystack 纳入 tags。
- web smoke 断言样例书的标签展示；desktop metadata regression 断言 tags 会写入 `library.json` 且不改变托管文件路径。

## 为什么这样做

完整 tags 管理页会牵涉批量编辑、过滤语义、重命名、删除确认和迁移行为。现在 P0 的目标是先把本地书库管理面收紧，所以这里先落一个稳定的 metadata 基础：

- 可编辑。
- 可持久化。
- 可搜索。
- 有 web 和 desktop 自动化证据。

后续如果要做完整 tags manager，可以直接复用这个字段，而不是再迁移一轮数据模型。

## 实现细节

Rust 侧使用：

```rust
#[serde(default, skip_serializing_if = "Vec::is_empty")]
pub(crate) tags: Vec<String>,
```

这让旧记录兼容读取，同时避免未标记书籍在 `library.json` 里写出空数组噪音。

编辑表单里仍然只有一个输入框，用户输入：

```text
parity, metadata
```

保存时前端拆成数组，Rust 再做最终归一化。

## 验证

- `pnpm check`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "edits shelf metadata"`
- `git diff --check`

## 没有包含

- 没有做 tag filter。
- 没有做批量打标签、标签重命名或标签管理页。
- 没有做在线 catalog 自动补标签。
- 没有做 cover editing。

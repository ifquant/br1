# 0059：把现有 Readest 书库迁进 br1

这次改动解决的不是样式问题，而是一个更底层的产品问题：`br1` 的 `library` 看不到你在 `Readest` 里已经积累的那批书。原因不是界面没渲染出来，而是两边本来就读的是 **两个不同的应用数据目录**。

`Readest` 的书库在：

- `/Users/dev/Library/Application Support/com.bilingify.readest/Readest/Books/library.json`

`br1` 的书库在：

- `app_data_dir()/library/library.json`

所以这次做的是一条最小迁移链：

- 先检测本机有没有 `Readest` 的 `library.json`
- 再把 `Readest` 的书和封面复制进 `br1` 自己的 `library/books/`
- 最后把它们写进 `br1` 的 `library.json`

这样 `br1` 就不再只显示假书架，而是能把你原来在 `Readest` 里那批书真正带进来。

## 改了什么

- 在 `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs` 新增：
  - `detect_readest_library`
  - `import_readest_library`
- Rust 侧会读取 `Readest` 的 `Books/library.json`，找到每本书在 `Books/<hash>/...` 下的正文文件和 `cover.png`
- 迁移时把正文和封面复制进 `br1` 自己的 `library/books/readest-<hash>/`
- 在 `/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts` 新增：
  - `detectReadestLibrary()`
  - `importReadestLibrary()`
  - `toLibraryCoverUrl()`
- 在 `/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte` 加了一条显式入口：
  - 如果本机发现 `Readest` 书库且 `br1` 书库还是空的，就显示“导入 88 本书”这一类的迁移按钮

## 这次值得学的两个知识点

### 1. “看不到数据”很多时候不是渲染问题，而是数据根本不在同一个存储域里

桌面应用尤其容易这样。两个应用都叫“阅读器”，但只要它们的 app identifier 不同，就会落到不同的应用数据目录。

也就是说：

- `Readest` 有书，不代表 `br1` 自动能看到
- UI 再像，也不会自动共享书库

所以遇到“为什么我的书不见了”，第一步应该先查：

- 数据存在哪
- 入口读的是哪个目录
- 索引文件格式是什么

而不是先怀疑组件没渲染。

### 2. 迁移外部应用数据时，先做“最小可用复制链”，不要一开始就做完整同步系统

这次没有一上来实现：

- 双向同步
- 去重策略
- 哈希校验
- 增量更新

而是先做：

- 能检测到 `Readest`
- 能把已有书迁进来
- 迁完后 `br1` 自己能独立持有这些数据

这是一种很常见也很实用的工程策略：

1. 先做一次性 migration path
2. 再做长期同步或去重

这样更容易先把用户最痛的断点补上。

## 我怎么验证

实际跑过：

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` `PASS`
- `cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml` `PASS`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` `PASS`
- 本机 Readest 书库计数检查：`88` 本

## 还没做什么

- 还没有对齐 `Readest` 的 `hash/metaHash` 去重策略
- 还没有把阅读进度、封面提取、笔记配置完整迁过来
- 目前是“导入已有书库”，不是持续双向同步

# 0336 - 在书架元数据面板显示封面状态

Library Management 的剩余缺口里还有 cover editing。直接做封面替换会牵涉文件选择、资源复制、旧封面清理和持久化迁移；这一轮先补一个安全的前置切片：让 normal shelf metadata panel 明确显示当前书籍是否已有封面。

## 改了什么

- `BookshelfPreview` 的详情面板新增 `封面` 字段。
- 有 `coverUrl` 时显示 `已设置`。
- 没有 `coverUrl` 时显示 `使用标题封面`。
- web smoke 覆盖样例书 `A Theory of Justice` 的封面状态。
- parity audit 把 cover status 纳入已完成的 metadata review surface，同时保留 full cover editing/replacement 缺口。

## 为什么这样做

封面现在已经能导入和显示，但用户在 metadata review 面板里看不到它是否被书库记录识别为封面资产。把状态先显性化，可以为后续 `替换封面 / 清除封面 / 从原文件重建封面` 留一个清楚入口，而不需要这一轮直接扩大到资源写入逻辑。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 没有包含

- 没有做封面替换。
- 没有做封面清除或重建。
- 没有新增 Rust/Tauri cover 写入命令。
- 没有做在线目录或同步能力。

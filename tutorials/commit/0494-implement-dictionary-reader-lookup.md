# 0494: implement dictionary reader lookup through the assistance interface

这一刀把 dictionary lookup 接进了和 Wikipedia 相同的 reader assistance 链路里，没有再开一条单独的词典 UI 路径。用户还是在同一个 assist 面板里输入、复用选区或章节种子，只是可以在 Wikipedia 和词典之间切换 provider。

实现上分了三层：

- Tauri 侧把 `lookup_reader_assistance` 扩成统一入口，按 provider 在服务端构建 `dictionaryapi.dev` 的固定 URL，并把响应解析成和 Wikipedia 一样的 `ready / empty / offline / error` 结果
- renderer 侧的 assistance facade 继续只负责状态翻译，不直接碰 URL，dictionary 也走同一个 `requestReaderAssistance(...)`
- reader sidebar 把 assist 面板收敛成共享输入框 + provider 切换 chips，用户可以用同一段 term/selection/chapter seed 发起词典或百科查找

这里顺手补了几个约束：

- dictionary 现在是英文优先，语言在 renderer 侧会被压成 `en`
- `dictionaryapi.dev` 的响应只取对当前结果有用的字段，body 会被整理成简短可读的词条摘要
- DeepL / Yandex 仍然保持拒绝，不会因为这次改动被误接进 lookup 链

验证结果：

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`，PASS
- `cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml`，PASS
- `cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml --lib`，PASS
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`，PASS

没做的事：

- 没有把 dictionary 做成可独立进入的侧边栏新页面
- 没有扩展到非英语词典语言
- 没有补桌面 e2e lookup 回归，当前仍靠 Rust 单测和 Svelte/Rust 编译检查收口

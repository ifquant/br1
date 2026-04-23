# 0493: implement wikipedia reader lookup

这一刀把 P1-1.2 从“只有领域骨架”推进到真正可用的 Wikipedia lookup：选中文本或当前章节名可以发起查询，侧栏会收到 loading / ready / empty / offline / error 五种状态，而不是再把网络逻辑放在 route 里。

实现上分了三层：

- Tauri 侧新增 `lookup_reader_assistance`，只接收 `provider`、`term`、`language`，并在服务端按 allowlist 组装 MediaWiki Action API URL
- renderer 侧的 `requestReaderAssistance` 只负责状态翻译，不直接碰 URL
- reader sidebar 新增 `assist` 面板和 header 入口，默认用当前选区或章节名预填词条

这里顺手做了两个约束：

- dictionary 和 DeepL / Yandex 仍然保持拒绝，不走假实现
- term 会先做空白压缩和长度限制，避免把原始选区直接原样发给后端

验证结果：

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`，PASS
- `cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml`，PASS
- `cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml --lib`，PASS
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`，PASS

没做的事：

- 没有实现 dictionary lookup
- 没有实现 DeepL / Yandex translation
- 没有把 Wikipedia 结果做成可收藏的独立阅读历史

# 0506: 把 reader 翻译 provider 状态收进 Tauri

这一刀完成 `P2-2.1 Add translation provider configuration`。目标不是马上把 DeepL / Yandex 翻译做通，而是先把“provider 配置在哪里、缺不缺 key、renderer 能看到什么”这条边界收紧到 Tauri 侧。

## 这次加了什么

这次改动分成三层：

- 共享类型层：`src/lib/reader/assistance.ts` 里新增了 `ReaderTranslationProviderStatus`，并补了 DeepL / Yandex 的显示名 helper。
- 前端服务层：`src/lib/services/readerAssistance.ts` 现在可以读取桌面端保存的 provider 状态，非桌面环境会回退到默认的 missing-key 状态。
- Tauri 层：`src-tauri/src/commands/reader_services.rs` 新增了本地 provider 状态文件读写逻辑，并导出 `get_reader_translation_provider_statuses` 和 `save_reader_translation_provider_settings` 两个 command。

reader sidebar 也补了一个很小的只读状态块，直接把 DeepL / Yandex 的状态显示出来。这样用户能看见“缺少 API key”这种状态，但 renderer 本身并不持有长期密钥。

## 状态是怎么存的

这次没有把 service key 放进 renderer，也没有让前端自己写 `localStorage`。

Tauri 侧会把 provider 状态写到桌面应用支持目录里的 JSON 文件，默认路径形如：

```text
~/Library/Application Support/br1/reader-translation-providers.json
```

每个 provider 只保存这些信息：

- provider 名称：`deepl` 或 `yandex`
- 是否已配置：`configured`
- 给 UI 展示的 label
- 更新时间：`updatedAt`

这里没有保存可直接用于网络调用的 secret，所以 renderer 也拿不到它。UI 里看到的只是状态摘要。

## 为什么翻译请求还没有接通

这一刀刻意没有把翻译做成“renderer 传文本，Tauri 代你转发到任意 API”的网络代理。

现在的行为是：

- 如果还在浏览器环境，翻译请求直接回退成 desktop unavailable。
- 如果在桌面端但 provider 还没配置 key，界面会显示 missing-key 状态。
- 如果 provider 已配置，但真正的 DeepL / Yandex bridge 还没有实现，request 仍然会返回明确的未实现错误。

这会让后续的 `P2-2.2` 和 `P2-2.3` 只需要接翻译结果，不需要再重做 provider 配置和状态展示。

## 新手可以先看哪几处代码

如果第一次读这条链路，建议按这个顺序看：

1. `src/lib/reader/assistance.ts`
1. `src/lib/services/readerAssistance.ts`
1. `src/lib/components/reader/ReaderSidebar.svelte`
1. `src/routes/reader/+page.svelte`
1. `src-tauri/src/commands/reader_services.rs`

这样能先看懂 shared type，再看服务 façade，最后看 Tauri 命令和 UI 显示。

## 新手知识点

这次有两个很实用的分层习惯：

- 状态和能力先分开。`provider status` 只是告诉 UI “现在能不能用”，不等于翻译功能已经实现。
- renderer 只读摘要，不读 secret。这样就算后面接 DeepL / Yandex，密钥也不用落到前端状态里。

## 验证

本提交需要通过：

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check
cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml reader_services
cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml
git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check
```

## 没有包含什么

这次没有实现真正的 DeepL / Yandex 翻译返回，也没有做 quota、token refresh、网络失败映射或任意 URL 代理。`P2-2.2` 和 `P2-2.3` 还保持打开，只是前置的 provider 状态边界已经补齐了。

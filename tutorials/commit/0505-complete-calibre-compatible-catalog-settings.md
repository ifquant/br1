# 0505: 补齐 Calibre-compatible catalog 设置流

这一刀完成 `P2-1.3 Add Calibre-compatible catalog flow`。0504 已经让内置 Calibre OPDS fixture 能走 catalog 浏览、搜索和 import intent 流程；0505 补的是用户可管理的 catalog source settings、认证状态和连接状态。

## 这次加了什么

核心入口仍然是 `src-tauri/src/commands/catalogs.rs`。新增了三类能力：

- 用户 catalog source settings 可以通过 Tauri command 保存、删除和列出。
- Calibre OPDS / OPDS-compatible source 可以作为用户配置的 source 出现在同一套 `listCatalogSources()` / `browseCatalogSource()` / `searchCatalogSource()` / `requestCatalogImportIntent()` 流程里。
- 每个 source 都带 `auth` 和 `connectivity` 状态，页面可以区分 available、authRequired、unsupported、offline、invalid，而不是只看到空列表。

对应的 TypeScript facade 在 `src/lib/services/catalogs.ts` 里也补上了：

- `CatalogSourceSettingsInput`
- `CatalogSourceConnectivityState`
- `saveCatalogSourceSettings()`
- `removeCatalogSourceSettings()`
- `normalizeCatalogSourceSettingsInput()`

这样 UI 后续接入设置表单时，不需要自己猜 Tauri command 的 JSON shape。

## 为什么没有直接 fetch 任意 OPDS URL

Catalog 功能很容易被误做成“前端传一个 URL，Rust 帮我请求”。这会把桌面端变成 renderer 可驱动的网络代理，安全边界不清楚。

所以这次的规则是：

- `fixture://calibre/root.xml` 这种 allowlisted bundled fixture 可以被解析和浏览。
- 用户保存的 `https://...` 或 `http://...` Calibre OPDS URL 会被保留成 source metadata。
- 但当前不会发起真实网络请求，而是返回 `unsupported` product-level state。
- 非 source 自己允许的 page href 仍然返回错误页，不会被拿去 fetch。

这让产品层已经能展示“你配置了一个 live Calibre OPDS source，但当前桌面服务还不支持 live fetch”，同时不会突破 0504 建好的安全边界。

## 认证信息怎么处理

`CatalogSourceSettingsInput` 只接收认证类型和元数据：

- `authKind`
- `authConfigured`
- `authRequired`
- `authLabel`

它不接收 password、token 或 cookie secret。测试里也验证了持久化 JSON 只保存 metadata / redacted presence，不保存秘密值。

初学者可以把这里理解成一个常见分层原则：renderer 可以告诉后端“这个 source 需要 Basic Auth，并且凭据已在安全边界里配置过”，但不应该把长期凭据直接留在前端状态里。真正的 keychain / secret-store 接入应该是后续单独的一刀，而不是混进 catalog browse。

## 连接状态不是异常

这次把连接问题建模为产品状态，而不是让命令静默失败：

- live URL 暂不支持：`unsupported`
- 需要认证但没有凭据：`authRequired`
- settings 文件损坏：`invalidSource`
- settings 文件读写失败：`offline`
- 非 allowlisted page href：`invalidSource`

这样 UI 可以展示明确提示，测试也能检查这些失败路径。

## 验证

实际运行过：

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check
cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml catalogs
cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml
git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check
```

## 没有包含什么

这次没有实现真实 live OPDS 网络 fetch，没有实现 keychain / secret-store 写入，也没有做 reader、TTS、translation、sync 相关功能。P2-1.3 的关闭范围只限 catalog source settings/auth/connectivity 这一刀。

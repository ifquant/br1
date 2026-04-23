# 0504: 实现 fixture 驱动的 OPDS 和 Calibre catalog 浏览

这一刀完成 `P2-1.2 Implement OPDS parsing and browsing`，并顺手把 Calibre-compatible fixture 接到同一套 OPDS 模型里。核心目标不是马上接入任意公网书库，而是先把 OPDS fixture 的解析、浏览、搜索和导入意图链路跑通，同时守住 renderer 不能把 Tauri 变成任意网络代理的边界。

## 这次加了什么

Rust 侧的入口仍然在 `src-tauri/src/commands/catalogs.rs`。原来这里只返回一个“未实现”的状态；现在增加了四类能力：

- `list_catalog_sources()`：列出当前桌面端内置的安全 catalog 来源。
- `browse_catalog_source(request)`：按 source id 和可选 page href 浏览 catalog 页面。
- `search_catalog_source(request)`：在 fixture feed 已解析出的条目里做本地搜索过滤。
- `create_catalog_import_intent(request)`：把 catalog entry 转成后续导入流程可以消费的 import intent。

这几个命令都通过 `src-tauri/src/lib.rs` 注册给 Tauri invoke handler。

## 为什么不用 renderer 传 URL

这一刀特意没有做“前端传一个 URL，Rust 帮它 fetch”。原因是 catalog 能力很容易变成一个任意网络代理：

```text
renderer input -> tauri command -> reqwest fetch(any url)
```

如果这样做，页面里任何 bug、注入或不可信状态都可能让桌面端访问本不该访问的地址。现在的实现换成了 allowlist：

```text
sourceId + pageHref -> Rust 检查是否属于内置 fixture -> 读取 bundled XML -> 解析
```

也就是说，renderer 只能请求 Rust 已经认识的 `fixture-opds`、`fixture-calibre` 以及这些来源下已经登记过的 `fixture://...` 页面。传入 `https://example.invalid/catalog.xml` 这类 href 会得到 product-level error page，而不是发起网络请求。

## OPDS parser 做了哪些映射

新增的测试 fixture 放在 `src-tauri/tests/fixtures/catalogs/`：

- `opds-root.xml`
- `opds-next.xml`
- `calibre-root.xml`

解析器读取 Atom / OPDS feed 中的：

- feed title、self / next / previous / search link
- entry id、title、summary、updated、published、language
- author name / uri
- category
- acquisition、thumbnail、image、alternate 等 link

`rel` 会被折叠到前端已经定义好的 `CatalogEntryLinkRel`。例如 `http://opds-spec.org/acquisition` 会映射成 `acquisition`，并且如果 media type 是 EPUB/PDF/FB2/CBZ 这类可导入格式，就会标记 `supportsImport: true`。

## Calibre groundwork 如何复用 OPDS

Calibre 的 OPDS 输出本质上仍然是 Atom / OPDS feed，所以这次没有复制一套 Calibre-only parser。`fixture-calibre` 使用 `CatalogConnectorKind::CalibreOpds`，但进入同一个流程：

```text
list source -> browse page -> parse OPDS -> search entries -> create import intent
```

这样可以验证 Calibre-compatible source kind 和普通 OPDS source kind 在同一套 catalog model 下工作。但这还不等于完成 `P2-1.3`：真正的用户自定义 Calibre 服务地址、认证、连接状态探测，仍然要拆到后续 settings/auth slice 里做。

## TypeScript service facade

`src/lib/services/catalogs.ts` 现在不只提供类型和本地 import-intent helper，还提供桌面端 facade：

- `listCatalogSources()`
- `browseCatalogSource(...)`
- `searchCatalogSource(...)`
- `requestCatalogImportIntent(...)`

这些函数在非 Tauri 环境不会把页面打崩。浏览和搜索会返回带 `error` 的 `CatalogPage`，导入意图会返回 `blocked` 状态。这一点对 UI 很重要：产品层可以展示“桌面端才支持 / 当前 source 不可用”，而不是让异常穿透到页面。

## 新手知识点：为什么测试 parser 比测试 UI 更优先

Catalog 的核心风险在数据边界，而不是按钮摆在哪里。先用 Rust 单元测试锁住 parser 行为，可以更早发现这些问题：

- acquisition link 有没有被识别成可导入。
- next page 是否只接受 allowlist 里的 href。
- Calibre OPDS 是否和普通 OPDS 走同一套模型。
- 搜索是否只是本地过滤，而不是偷偷发起网络请求。

所以这次先加 parser fixture 和命令 facade。真正的大 UI、source settings、账号认证、远程连接探测，后续可以在这个安全底座上继续扩展。

## 验证

本提交需要通过：

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check
cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml catalogs
cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml
git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check
```

这次仍然没有实现任意 OPDS URL 网络 fetch、用户自定义 source settings、Calibre 认证、真实下载或导入执行。因此 checklist 只关闭 `P2-1.2`，`P2-1.3` 保持打开。

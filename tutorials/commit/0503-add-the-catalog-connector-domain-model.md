# 0503: 增加 catalog connector 领域模型

这一刀完成 `P2-1.1 Add the catalog connector domain model`。目标是先把 OPDS / Calibre 这类在线书库连接器需要的核心对象定型，而不是马上开始联网、解析 feed 或改 library UI。

## 这次改了什么

新增的 TypeScript 入口是 `src/lib/services/catalogs.ts`。它定义了后续 catalog 功能会反复用到的几类模型：

- `CatalogSource`：一个书库来源，例如 OPDS 或 Calibre OPDS。
- `CatalogEntry`：书库里的一本书或一个可展示条目。
- `CatalogEntryLink`：条目的链接，包括封面、分页、搜索、下载/导入链接。
- `CatalogPagination`：当前页、上一页、下一页、总数等分页信息。
- `CatalogSearchTemplate` / `CatalogSearchRequest`：搜索模板和搜索请求。
- `CatalogSourceAuthState` / `CatalogAuthChallenge`：认证状态和认证挑战。
- `CatalogErrorState`：产品层能显示的错误状态。
- `CatalogImportIntent`：把远端条目转换为“准备导入”的意图。

这些类型是后续 UI 和 parser 之间的合同。先有合同，后续每一刀才能只填一个明确的缺口。

## renderer-safe facade 是什么

前端现在有两个安全入口：

```ts
getCatalogConnectorStatus()
createCatalogImportIntent(source, entry)
```

`getCatalogConnectorStatus()` 在浏览器或非 Tauri 环境里不会抛异常，而是返回显式的 `unavailable` 状态。这样后续 UI 可以正常展示“桌面端才支持 catalog connector”，不会因为普通能力探测把页面打崩。

在 Tauri 环境里，它调用 Rust 命令 `get_catalog_connector_status`。当前 Rust 命令只返回“命令已注册，但 OPDS/Calibre 浏览还没实现”的 unavailable 状态。

`createCatalogImportIntent()` 只做本地对象转换：从一个 `CatalogEntry` 找出可导入的 acquisition link，生成导入意图。如果条目没有可导入链接，就生成 `blocked` intent，并附上原因。

## Rust 命令模型为什么也要先加

`src-tauri/src/commands/catalogs.rs` 里加入了对应的 serde model，并使用 `camelCase` 序列化。这样 renderer 和 Tauri command 的 JSON 形状提前对齐。

这一刀只注册了一个很小的命令：

```rust
get_catalog_connector_status()
```

它没有网络参数，也不会根据 renderer 传入的 URL 去请求任意地址。这一点很重要：P2 服务线要避免把 Tauri 命令变成任意网络代理。

## 为什么不做 OPDS 解析和联网

OPDS / Calibre 支持至少会拆成几层：

- feed 获取：哪些 URL 允许请求，超时、重试、错误怎么处理。
- XML/Atom/OPDS 解析：entry、link、pagination、search template 怎么映射。
- 认证：basic、bearer、cookie 的配置和安全存储。
- 导入：远端 acquisition link 怎么变成受信任的 library import 流程。

如果这次直接把解析、网络、UI、导入全塞进一个 commit，很容易混淆安全边界，也很难验证到底是哪一层出问题。

所以 P2-1.1 只做领域模型和 facade。P2-1.2 再实现 OPDS fixture 解析和浏览，P2-1.3 再扩到 Calibre-compatible flow。

## 一个新手容易踩的点

`CatalogEntryLink.rel` 里的 `self` 在 Rust 里不能直接当 enum variant 名字，因为 `Self` 是 Rust 关键字相关的特殊标识。这里 Rust 用 `SelfLink` 作为内部名字，再通过 serde rename 输出成 JSON 的 `"self"`。

这类“内部语言名字”和“跨端 JSON 合同名字”不一定相同。关键是 serde 输出和 TypeScript union 对齐，而不是强行让 Rust enum variant 和 TS 字符串一模一样。

## 验证

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check
```

结果：PASS。

```bash
cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml
```

结果：PASS。

```bash
git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check
```

结果：PASS。

## 没有包含什么

这次没有实现 OPDS XML 解析、Calibre 兼容规则、catalog UI、认证配置、网络获取、下载或导入执行。它只建立后续功能共享的类型合同和安全的能力探测入口。

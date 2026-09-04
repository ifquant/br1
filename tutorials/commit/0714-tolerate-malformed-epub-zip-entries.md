# 0714 - 容忍 EPUB ZIP 头与路径大小写错误

## 背景

`S2-R04A` 最初把 18 个 Readest 提交都归为“EPUB-family archive loading”，但逐条解析 Readest 的应用 diff 和 `packages/foliate-js` gitlink 后，只有 8 个直接属于归档读取链。第一小步 `S2-R04A1` 对齐 `234ecc311` 与 `c30a59a9e`，处理可恢复的 ZIP local header 和 EPUB entry 大小写错误。

## 改动

- sibling `foliate-js` 实现提交：`b53bdd27188c9770b7a034a86f07adf0dccb2cb9`。
- sibling `foliate-js` 的 ZIP 初筛从完整 `PK\x03\x04` 收窄为稳定的 `PK\x03` 前缀，完整归档验证仍由既有 ZipReader 负责。
- ZIP entry 查找保持 exact-case 优先，仅对唯一的大小写折叠结果回退；冲突时明确返回未找到。
- 真实 ZipWriter/ZipReader 测试覆盖异常第四字节、普通非 ZIP、精确匹配、唯一回退和冲突拒绝。
- 重新标记 18 个 Readest 提交，并将 Calibre metadata、参考页、contrast、OPDS、固定布局和 EPUB 重导入移回各自 owner。
- 禁止移植 Readest 的第二套 Rust EPUB/MOBI parser；br1 继续复用 foliate 作为格式真源。

## 两个知识点

1. gitlink 更新不是普通依赖升级。必须解析 old/new SHA，再检查嵌套提交，才能知道一个 Readest 外层提交真正修改的是 UI、原生 parser，还是 foliate。
2. 容错不能牺牲确定性。大小写回退只对唯一候选生效，才能避免含冲突 entry 的归档按写入顺序随机打开不同章节。

## 验证

- `node --test /Users/dev/workspace2/hc_apps/foliate-js/tests/view-zip-loader.test.mjs`：PASS（6/6，包括实际读取异常 header 后的 entry）
- `pnpm exec playwright test tests/e2e/foliate-zip-compat.spec.ts --workers=1`：PASS（1/1，真实最小 EPUB 经 `makeBook` 和 `createDocument`）
- `pnpm check`：PASS（0 errors, 0 warnings）
- `pnpm build`：PASS
- 两个仓库 `git diff --check`：PASS
- sibling `foliate-js` 独立 `npm run build`：FAIL；ignored `node_modules` 漂移到 `@zip.js/zip.js 2.9.0`，而 `npm ci` 又被仓库既有的 PDF.js manifest/lockfile 不一致阻塞

## 证据边界

异常归档已经通过 foliate 的真实 `makeBook`、ZipReader 和浏览器 `createDocument` 路径，但没有执行打包后的 Tauri/WebView 手工打开。`S2-R04A2` 继续处理 OPF 裸 ampersand、保留分隔符的百分号路径和未声明封面；MOBI/AZW3 并发与 CBZ 排序留给 `S2-R04A3`。

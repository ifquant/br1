# 0715 - 修复 EPUB 包引用兼容性

## 背景

`S2-R04A2` 对齐 Readest 提交 `403be32d5`、`a97e44bbd` 和 `0e4272e4c`。它们的实际格式修复位于嵌套 foliate-js；br1 因此继续复用 sibling parser，只增加从真实 ZIP 到 `makeBook`、Loader 和封面的浏览器回归。

## 改动

- sibling `foliate-js` 实现提交：`540f1544d27b9c99c3d9e0b40af4ab25a48a5f75`。
- OPF 修复只转义裸 `&`，保留合法命名实体和数字实体。
- ZIP 路径解码普通编码字符，但不把 `%2F` 和 `%23` 变成路径或 fragment 分隔符。
- 缺失 `href` 的 manifest 条目在共享资源入口被排除，避免伪造 `OPS/null` 并保护 Loader 资源替换链。
- manifest 没有封面声明时，按归档顺序发现 `cover` / `couv` 图片，并正确返回 SVG MIME。
- 一个共享测试 helper 构造真实最小 EPUB；五个测试分别覆盖 A1 与 A2 行为，不复制 parser 逻辑。

## 两个知识点

1. gitlink 只说明依赖版本变化，不说明产品行为。必须继续查看嵌套提交，才能把修复放回真正拥有 EPUB 语义的 foliate 层。
2. `createDocument()` 只证明章节 XML 可解析，不能证明阅读器加载成功。含脚本/样式资源的 EPUB 还会经过 Loader 替换，因此缺失资源边界要用 `section.load()` 覆盖。

## 验证

- `pnpm exec playwright test tests/e2e/foliate-zip-compat.spec.ts --grep "ignores a manifest item without href" --workers=1`：PASS（1/1）
- `pnpm exec playwright test tests/e2e/foliate-zip-compat.spec.ts --workers=1`：PASS（5/5）
- `node --test /Users/dev/workspace2/hc_apps/foliate-js/tests/view-zip-loader.test.mjs`：PASS（6/6）
- `pnpm check`：PASS（0 errors, 0 warnings）
- `pnpm build`：PASS
- 两个仓库 `git diff --check`：PASS
- Terra high 修复复审：PASS（无 findings）
- Sol high 架构审查：PASS（无 findings）

## 证据边界

测试覆盖真实 ZIP、`makeBook`、`section.load()`、资源替换、`createDocument()` 与 `getCover()`，但没有执行打包后的 Tauri/WebView 手工导入和阅读。foliate 独立 `npm run build` 未重跑；br1 生产构建已直接打包同一 sibling 源码。下一项是 `S2-R04A3 - Stabilize MOBI/AZW3 and CBZ archive reads`。

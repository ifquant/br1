# 0717 - 稳定 MOBI/AZW3 与 CBZ 归档读取

## 背景

`S2-R04A3` 对齐 Readest 提交 `d326e1c73`、`89821136f` 和 `7e8abebcd`。逐条解析 gitlink 后，实际格式修复位于 sibling foliate-js：MOBI6 自闭合标签规范化、CBZ 分段自然排序，以及 KF8 重叠原始字节读取串行化。

## 改动

- sibling `foliate-js` 实现提交：`758f218f2f6964b7c595906732520fc788c55f23`。
- br1 不增加第二套 MOBI/CBZ parser，只从浏览器回归直接导入 sibling foliate 入口。
- MOBI6 测试证明无属性 `<a/>`、`<div/>`、`<span/>`、`<p/>` 不再吞并后续 sibling 结构。
- CBZ 测试证明基础分卷目录先于 `(2)`、`(3)`、`(10)`，页码按数字而非字符串排序。
- KF8 测试逐字节复制 Readest #5918 的 12 章 AZW3 fixture，用 seeded jitter 模拟相邻章节预加载时 ranged File 乱序完成，并比较 serial/overlapping 的全部章节文本。
- Readest 同一外层提交中的 `RemoteFile` inclusive-end 修复被判定为不适用：br1 桌面路径读取完整二进制并构造原生 `File`，没有同类 range cache。

## 两个知识点

1. gitlink 对齐必须区分外层应用修复和嵌套格式引擎修复。br1 只应移植可复用的 foliate 行为，不能因为一个 Readest commit 同时改了应用层就创造本地不存在的 RemoteFile 抽象。
2. 测试并发 parser 需要控制“完成顺序”而不只是同时发起 Promise。固定 seed 的延迟 File 让乱序可重复，能够稳定击中共享累加器的交错写入。

## 验证

- `pnpm exec playwright test tests/e2e/foliate-mobi-cbz-compat.spec.ts --workers=1`：PASS（3/3）
- fixture：84,908 bytes，SHA-256 `00c3ee3440bbfad6e0aab18931daa1c11f0f390ec02ce2df50b0e04dd37fd61c`
- `node --test /Users/dev/workspace2/hc_apps/foliate-js/tests/view-zip-loader.test.mjs`：PASS（6/6）
- `pnpm check`：PASS（0 errors, 0 warnings）
- `pnpm build`：PASS
- 两个仓库 `git diff --check`：PASS
- 任务级与架构所有权复审：PASS（无 findings）

## 证据边界

测试覆盖真实 AZW3 parser 与重叠章节读取，但不是打包后的 Tauri I/O 运行。MOBI6 使用纯 helper 回归并由静态调用链确认 `createDocument()` 调用它；没有新增二进制 MOBI6 fixture。CBZ 覆盖报告中的 ASCII 分卷及数字页码，不声明所有语言环境的 collation 已验证。下一项是 `S2-R04B - Harden TXT chapter parsing`。

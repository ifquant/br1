# 0726 - 保留脚注摘录与原文的对应关系

## 背景

`S2-R04C8` 涉及选区、书籍位置编码和批注写入，不能一次把按钮都接上。
本次 C8A 先处理基础：弹窗文字经过安全清理后，仍能精确对应原书文本节点。
它不开放新的批注操作，父提交 `631cd6454` 仍标为 `partial`。

## 改动概览

- 把原来的提取范围和安全清理收拢到 `footnoteExcerpt.ts`，生产阅读器
  使用这个唯一入口，保持原有 HTML、纯文本和脚注识别行为。
- 克隆前记录原始文本节点及偏移，清理副本后生成有序对应表；不用搜索
  相同文字来猜位置，不改动原书，也不持久化映射数据。
- 回映前检查预览文字、范围、原文节点顺序和所属范围。原文变更、选区
  越界或跨过被删除的 script/style 文字时返回空结果，不制造锚点。
- XML CDATA 计入全文偏移，但不属于普通 Text 遍历。含 CDATA 的摘录
  保留原有输出，暂不提供映射，避免相同文字掩盖节点错位。

## 关键知识

1. 浏览器文本偏移以 UTF-16 计数，不等于可见字符数；emoji 可能占两个
   单元。显示用的空白压缩也不能用于定位，映射必须保留原始文本偏移。
2. 两处文字完全相同，并不意味着它们属于同一原文或同一弹窗请求。
   节点身份解决来源问题；下一步仍需用书籍、章节和请求身份绑定 UI，
   并实际解析生成的 CFI，检查文本和边界，不能只检查字符串非空。

## 上游核对

Readest `631cd6454` 对应的 Foliate 范围只有 `57c9358ad` 一个提交，
为修改后的第二阅读视图提供提取映射和 CFI 辅助导出。br1 保留原生弹窗，
不引入第二个渲染器或这套坐标重写。审计还发现上游写入前未做完整 CFI
回读验证，以及旧弹窗视图迟到覆盖的问题；这些不能作为可复制的正确行为。

## 验证

- `pnpm exec playwright test tests/e2e/footnote-mapping.spec.ts --workers=1`：5/5 PASS，包含重复 CDATA 回归。
- `pnpm exec playwright test tests/e2e/footnote-compat.spec.ts tests/e2e/authored-text-compat.spec.ts --workers=1`：22/22 PASS。
- `library-smoke.spec.ts` 中脚注弹窗、安全清理、TXT 字面文本和代码高亮四项：4/4 PASS。以上共 31 个独立运行用例。
- `pnpm check`：0 errors、0 warnings；`pnpm build`、`git diff --check` 和 678 行对齐账本重算：PASS。
- Terra high 独立任务审查和 CDATA 修复复审：PASS；Astra high 最终整体复审：PASS。
- Astra 初审发现 CDATA 导致同文异节点误映射；增加拒绝映射保护后，重新执行上述全部门槛并通过。

## 未覆盖项

- C8B：真实弹窗选区接入、原始章节 CFI 验证、请求失效控制。
- C8C：操作权限、批注写入与持久化；C8D：批注反向映射、重绘和删除。
- 当前 mapper 由模块测试消费；生产 UI 仍只使用摘录字符串。
- 不宣称打包 Tauri、移动端、Safari 或完整真实手势验收。

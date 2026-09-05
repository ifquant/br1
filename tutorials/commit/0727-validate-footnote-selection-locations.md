# 0727 - 验证脚注选区的原书位置

## 背景

C8A 保留了摘录与原文节点的对应关系。C8B 接入真实脚注弹窗选区，
但不提前开放高亮或笔记写入，避免把尚未确认的选区当成可保存的书籍位置。

## 改动概览

- 弹窗使用浏览器原生选区事件，Stage 只发布独立的
  `footnoteselectionchange`，不触发现有正文批注操作。
- Viewport 先验证显示摘录的映射，再加载目标原始章节并重新定位同一个
  链接目标。复用 Foliate 生成和解析 CFI，要求章节、文字、节点及偏移一致。
- 每次关闭、替换、导航或换书都会作废旧请求；选区本身也有独立版本号。
  异步完成前后都检查身份，不以文字相同作为同一个弹窗的凭据。
- 换书测试发现旧渲染器没有退场。原生 Foliate 的 `open()` 只追加新视图，
  因此在共享书源切换入口和卸载入口调用已有 `close()`，先清除旧文档。

## 关键知识

1. CFI 是书籍位置编码，不是验证结果。字符串非空甚至可以解析，都不
   代表落在用户选择的位置；重复段落必须核对节点身份和起止偏移。
2. 浏览器事件与异步任务可能交错。除了版本号，还要在发布前读取当前
   原生选区，防止尚未派发的 selectionchange 留下旧结果。

## 验证

- `pnpm exec playwright test tests/e2e/footnote-compat.spec.ts --grep C8B --workers=1`：8/8 PASS。
- 完整 `footnote-compat.spec.ts` 和 `authored-text-compat.spec.ts`：30/30 PASS，包含上面的 8 项。
- `footnote-mapping.spec.ts`：5/5 PASS；既有脚注、安全清理、TXT、代码高亮四项：4/4 PASS；PDF 作者元数据检查：1/1 PASS。共 40 项独立运行用例。
- `pnpm check`：0 errors、0 warnings；`pnpm exec vite build`、`git diff --check`、678 行账本重算：PASS。
- Terra high 独立任务审查、Astra high 最终整体静态审查：PASS。
- 测试使用真实组件、浏览器 Selection/Range 和 Foliate 原生 CFI 接口，不用虚构位置或生产测试后门。延迟门必须等任务实际结束后再断言拒绝结果。
- 初轮测试修正了预加载、重复选区事件和过早恢复书籍身份的夹具时序；换书时残留旧渲染器则是实际生产问题，复用原生关闭接口修复后再跑全套。

## 未覆盖项

- C8C 的操作权限、高亮/笔记写入和持久化，C8D 的批注反向映射与重绘。
- 无原文锚点的合成脚注、CDATA 映射以及不能精确对应原始章节的变换文本。
- 不引入上游第二阅读视图，也不修改 Foliate 源码或依赖。
- 不宣称打包 Tauri、移动端或 Safari 已通过运行验收。
- 原生 `close()` 不负责取消尚未完成的 `open()` 或销毁书籍资源，本次不扩大到完整异步打开管理。

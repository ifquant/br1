# 0731 - 对齐阅读方向、翻页语义与重开位置

## 背景

S2-R04C10 对齐三个 Readest 提交及其精确 foliate-js 子提交。br1 的页脚
原本已经调用语义正确的上一页和下一页，本轮无需重新设计控制链。

## 主要目标

让作者正文中的方向决定阅读控件，支持直接子节点上的竖排识别，并验证
RTL 书籍在相邻章节预加载后恢复到保存的文字位置。

## 改动概览

- 底层三个修复留在 sibling foliate-js 的分页器；br1 不复制布局引擎。
- 恢复测试发现本地外层 padding 会额外造成一页偏移，底层改为读取实际
  iframe 尺寸；没有用相同的 CFI 字符串替代文字确实可见的验收。
- 阅读状态增加临时 `rtl`，只从当前章节的已渲染文档计算。不能把预加载
  列表的首项当成当前章节，也不能只用书籍元数据判断。
- 页脚镜像图标，不改变按钮语义、标签和顺序。键盘左右键按方向解析，
  快捷键帮助同步显示；鼠标前进/后退保持原有语义。
- 缺少当前文档、TXT 和固定版式/PDF 使用中性值；不新增持久化设置。
- 补齐旧 TTS 测试的中性方向字段及 ESM 扩展名；修正键盘回归末尾的
  PDF 样例页数断言，实际样例页树一直是 5 页，不改 PDF 实现或资产。

## 关键知识

1. “下一页”是逻辑动作，“向左”是物理方向。把镜像放在按键入口，既能
   适配 RTL，也不会让按钮和鼠标的共享执行器发生第二次反转。
2. 预加载意味着文档数组同时含多个章节。用当前 section index 精确匹配
   文档，才能避免后台加载替前台控件决定方向。

## 验证

- `BR1_PLAYWRIGHT_CHANNEL=chrome pnpm exec playwright test tests/e2e/foliate-directional-flow.spec.ts --project=chromium --workers=1`：5/5 PASS。
- 书库文件路径使用真实 EPUB 和模拟桌面调用，经过两次真实 `/library`
  卸载/重开，并等待每次实例的原生预加载 Promise。非首屏锚点和保存文字
  保持可见，首屏标记不可见，重开后的保存调用全部保留原 CFI。
- 两个已挂载窗格加载真实 RTL/LTR 书籍，验证预览方向独立；第二本书通过
  既有 loader 与公开 view API 打开。这不是新增并行书源路由的验收。
- 六组既有回归 60/60，键盘/TXT/布局补充回归 4/4；合计 69 个独立
  浏览器用例，无跳过。
- `pnpm test:reader-helpers`：99/99 PASS；编译后的 `tts.test.js` 使用
  Node test runner 独立执行：15/15 PASS。
- `pnpm check`：0 errors/0 warnings；`pnpm exec tsc -p tsconfig.json --noEmit`、
  `pnpm exec vite build`、两仓库 `git diff --check`：PASS。
- sibling `node --check paginator.js` 和 ZIP 单元测试（6/6）：PASS。
- Terra high 独立任务审查、Astra high 最终跨仓库审查：PASS，无遗留阻塞项。

## 未覆盖项

- 混合横排/竖排、LTR/RTL 章节的底层方向生命周期单独登记；宿主选文档
  正确不能证明混排引擎完整支持。
- C11 的竖排手势、固定版式方向、加载失败回滚与打开取消不在本轮范围。
- 浏览器及模拟桌面调用边界不等于打包 Tauri、Safari 或原生移动端验收。

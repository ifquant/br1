# 0730 - 验证共享 EPUB 资源生命周期并关闭 C9

## 背景

C9 对齐 Readest `a193cbc35` 及其唯一底层提交 `c1f0c3c55`。问题不在
界面样式，而在多个使用者共享章节时，图片地址是否被过早释放或永不释放。

底层实现：[4b6ecb2](https://github.com/ifquant/foliate-js/commit/4b6ecb21116cf2f5a8da07b50c97ce1d3440b2c6)，
位于 foliate-js 的 `performance` 分支。

## 改动概览

- 修复放在 sibling foliate-js 的 Loader 和分页器；br1 不增加第二套资源管理。
- 使用真实 EPUB、原生视图和浏览器 Blob API 验证引用关系。资源追踪只用于
  测试，仍调用真实创建/释放接口；定位实际章节 Blob，而不是 iframe 的 srcdoc 地址。
- 验证直接加载、重复内容读取、共享 CSS/图片、两个视图共享一本书，以及
  正常跳章和目标加载失败时，其他持有者仍能重新读取和解码图片。
- 验证真实 br1 脚注打开/关闭、独立并行书源关闭、正常书源替换和 SPA 退出。
- 台账和下一项更新到 C10；固定版式释放和导航失败后保留原显示内容单独记录。

## 关键知识

1. `iframe.srcdoc` 的文档地址不是加载器的章节 Blob URL。测试从真实
   URL 创建事件记录对应 Blob，再用章节标识及图片地址定位它，不能为了
   获取地址而多调用一次 `section.load()`，那会改变被测引用计数。
2. 原生分页器在主章节显示后继续预加载。测试复用已有性能计时钩子等待
   真实填充 Promise，避免把仍在进行的加载误判成正常关闭后的泄漏。
3. 目标加载失败不产生成功填充事件。负向测试等待导航尝试结束，检查其他
   持有者和最终释放，不把失败视图的旧显示恢复混入资源计数修复。

## 验证

- C9 浏览器组合测试：5/5 PASS，无跳过；每种分页/滚动模式包含三次直接
  关闭、三次跳章后关闭，以及一次目标加载拒绝。
- 既有脚注、作者文本、映射及 EPUB/MOBI/CBZ 归档回归：55/55 PASS。
  合计 60 个独立浏览器用例；无跳过。
- `pnpm check`：0 errors/0 warnings；`pnpm test:reader-helpers`：99/99 PASS。
- `pnpm exec vite build`、最终 `pnpm exec tsc -p tsconfig.json --noEmit`、
  `git diff --check`：PASS。底层 ZIP 测试另有 6/6 PASS。
- 原始 Loader 和仅修 Loader 后的分页导航都取得失败证据，修复后转绿。
- Terra high 独立任务验收和 Astra high 跨仓库整体终审：PASS，无阻断项。

## 未覆盖项

- 不添加图片查看器或弹窗图片；现有脚注仍是经过清理的文字摘录。
- 固定版式资源释放、完整打开取消和导航失败回滚不是本轮关闭范围。
- 浏览器验证不等于打包 Tauri、Safari 或原生移动端验收。

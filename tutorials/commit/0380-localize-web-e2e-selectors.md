# 0380 - localize web e2e selectors

## 背景

前面的界面本地化已经把书库、阅读器页脚、搜索缓存、笔记和高亮面板的可访问名称切到中文。`pnpm test:e2e` 仍然用旧英文 aria/name 查找这些控件，所以失败并不代表产品回退，而是测试仍停在旧 UI contract 上。

这一提交把 Playwright web-mode smoke 测试对齐当前中文界面，避免为了测试稳定性把产品文案倒回英文。

## 改动

- 将书库搜索、筛选摘要、筛选 chip、元数据面板和导入入口的 selector 更新为当前中文可访问名称。
- 将阅读器页脚、阅读设置菜单、搜索缓存、笔记面板和高亮选择集相关 selector 更新为中文 aria/role。
- 将阅读布局断言从内部枚举值 `PAGINATED` / `SCROLL` / `FIXED` 改成用户看到的 `分页` / `滚动` / `固定版式`。
- 在书库测试中显式展开“筛选 更多”，因为高级筛选摘要现在只在展开状态下暴露。
- 移除搜索历史测试里一次冗余的二次点击，保留“点击有命中历史项会回填搜索框”的核心断言。

## 验证

- `pnpm test:e2e` 通过：11 个 web-mode Playwright 用例全绿。
- `pnpm check` 通过：`svelte-check` 0 errors, 0 warnings。

## 知识点

Playwright 的 role/name selector 是很好的 UI contract，但前提是测试跟真实用户可见语言保持一致。本地化之后，测试应该追随新的可访问名称，而不是继续依赖旧英文内部命名。

# 0723 - 保留空脚注预览的正文出口

## 背景

`S2-R04C5` 对应 Readest `7c0419961`。该提交修复独立 Foliate
弹窗的内容尺寸、过期观察器和纯图片内容显示，不包含依赖 gitlink 变更。
br1 采用原生 Svelte 弹窗，尺寸由 CSS 内容布局和滚动上限决定，
不需要复制上游的观察器和初始高度状态。

## 改动概览

- 以清洗后的内容判断预览是否存在，避免图片移除后留下空标签，
  把“无法预览”的正文跳转入口挡住。
- 预览文本与 HTML 使用同一份清洗结果，避免被删样式的文字又从
  备用文本路径出现。原始书籍 DOM 保持不变。
- 沿已有原生弹窗验证长文本滚动、替换、关闭和过期请求边界。

## 关键知识

1. 非空 HTML 字符串不代表有可读内容。`<p><span></span></p>` 在
   字符串层面有长度，但过滤不支持的媒体后可能只剩结构，必须在清洗
   边界判断剩余文本，不能仅在显示组件中判断字符串真假。
2. HTML 与备用文本应来自同一安全边界。若 HTML 已移除 `style`，
   备用文本却来自原始 `textContent`，被移除的 CSS 文字仍可能显示出来。

## 验证

- 未改生产代码时运行定向 Playwright：3 项中 2 PASS、1 FAIL。
  失败用例明确复现图片过滤后仍出现空 `.footnote-body`，遮挡跳转入口。
- 修复后首轮：定向回归 14/15 PASS，既有脚注/清洗/TXT 回归 4/4 PASS。
  未通过项是长纯文本样例只有 248px、尚未溢出滚动上限，随后增加
  样例长度，保留“实际溢出并滚动到末尾”的断言。
- `pnpm check`：PASS，0 errors / 0 warnings；`pnpm build`：PASS。
  后续仅调整测试样例，生产代码未再改变。
- 最终 `pnpm exec playwright test tests/e2e/footnote-compat.spec.ts tests/e2e/authored-text-compat.spec.ts --workers=1`：PASS，15/15。
- 既有 `library-smoke.spec.ts` 的脚注、清洗、恶意外观 TXT 和代码块
  4 项定向回归：PASS。未因后续仅加长新样例而重复。
- `git diff --check` 与 678 条账本计数：PASS。
- 独立 Terra high 任务审查与 Astra high 最终审查：PASS。

## 未覆盖项

- 不接入第二套弹窗分页器、图片加载观察器或手动尺寸状态。
- 不把图片复制到原生预览；保留原文并沿既有导航入口访问。
- 不宣称打包 Tauri、移动设备或短高度视口的完整布局验收。

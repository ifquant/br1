# 0732 - 对齐竖排书籍的默认即时翻页

## 背景

C11 上游把方向识别、横向拖动和两阶段动画放在同一个分页器提交中。
br1 默认不开启动画，本轮 C11A 先对齐即时阅读路径，C11B 再处理动画
及其取消生命周期。父提交保持 partial。

## 主要目标

作者使用 vertical-rl 时，即使书籍元数据和正文 direction 是 ltr，
也按从右向左的阅读顺序操作；竖排内部的 scrollTop 仍向正方向增长。

## 改动概览

- 底层方向、坐标和即时手势由 sibling foliate-js 负责。
- 宿主只在当前章节的瞬态预览中补齐有效 writing-mode 判断。
- 保留语义上一页/下一页，通过现有预览镜像物理箭头和帮助文本。
- 不新增滚轮、点击区域、动画设置、方向存储或公开库接口。

## 关键知识

1. 阅读顺序不等于浏览器滚动轴。vertical-rl 表示栏从右往左排列，
   但多栏分页在 iframe 内沿垂直轴堆叠，不能把 scrollTop 变成负数。
2. 书籍可能把 writing-mode 放在正文包装节点上。只有 body 为横排或
   未指定时才考虑首个非 CFI-inert 直接子元素，避免局部竖排改变整书控件。

## 验证

- C11A Chrome 浏览器测试 4/4 PASS：原生方向/坐标、可见 CFI 恢复、
  预加载与无预加载跨章、即时与 eink 手势，以及真实宿主控件。
- 既有七组回归 65/65，键盘/TXT/布局补充回归 4/4；合计 73 个
  独立浏览器用例，无跳过。
- `pnpm test:reader-helpers`：99/99 PASS；sibling ZIP 单元测试 6/6 PASS。
- `pnpm check`：0 errors/0 warnings；严格 TypeScript、分页器语法检查、
  `pnpm exec vite build`、两仓 `git diff --check`：PASS。
- Terra high 独立任务审查与 Astra high 最终跨仓库审查：PASS，无遗留阻塞项。

测试先等待初始原生预加载，再通过公开导航进入章内锚点，检查实际页位移
与 CFI 变化，不把一次翻页假定为进入下一章。快捷键检查显式聚焦宿主
阅读区域，不声称覆盖 iframe 内键盘事件转发。触摸输入为浏览器合成事件。

## 未覆盖项

- C11B 的跟手拖动、两阶段横向动画、回弹和取消生命周期。
- 混合方向章节预加载、完整 vertical-lr 滚动布局、固定版式/PDF。
- 打包 Tauri、Safari 和原生移动端验收。

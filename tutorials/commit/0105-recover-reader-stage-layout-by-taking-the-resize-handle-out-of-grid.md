# 0105：把拖拽条移出网格，修回 reader 主舞台

这次修的是一个很典型、也很隐蔽的桌面布局问题：书能打开，但正文没有老老实实待在主阅读区里。

## 这次改动做了什么

- 把 `window-mode` 下的 sidebar resize handle 从 grid flow 里拿出去，改成绝对定位
- 把 `reader workspace` 恢复成真正的两列：
  - 左侧 sidebar
  - 右侧 reading stage
- 把 `ReaderViewport` 的窗口态宿主链改成更接近 Readest 的 fill-parent 结构
- 增加一条桌面 WDIO 回归测试，专门检查“正文不能滑进侧栏”

## 为什么之前会坏

之前我把 resize handle 也当成了 grid item。

结果 `workspace` 实际变成：

1. sidebar 列
2. handle 列
3. reader 列

问题是第二列虽然视觉上只是一条细线，但在真正布局里被撑成了很宽的一列。  
这样右侧真正给 `reader stage` 的宽度就被挤坏了，最后看起来就像：

- 右边大片空白
- 正文跑偏
- 或者正文看起来落在左下方

## 这次的关键修法

不是继续调 `foliate-view` 的 margin，而是先修布局模型：

- `workspace.window-mode` 回到两列
- resize handle 改成 `position: absolute`
- `ReaderViewport` 的窗口态不再依赖那套更像 demo 的 absolute/paper 约束链

这类问题的经验是：

- 如果主舞台几何关系都错了，先修 grid/flex 模型
- 不要先怀疑阅读引擎本身

## 一个具体的调试技巧

这次最有用的不是肉眼截图，而是把桌面自动化测试升级成几何断言：

- 读取 `.reader-stage`
- 读取 `.reader-sidebar`
- 读取 `foliate-view` 或内部渲染节点
- 直接比较它们的 `getBoundingClientRect()`

这样可以很快判断：

- 是内容没加载
- 还是内容加载了，但被错误布局放错位置

## 这次顺手学到的知识

### 1. 细小的拖拽条，不应该默认放进主 grid 里

像 resize handle、overlay border、hit area 这种“交互附属层”，很多时候应该：

- 绝对定位
- 脱离主布局流

否则它们会悄悄参与列宽计算。

### 2. 布局回归最适合用“几何测试”防守

有些 bug：

- DOM 在
- 数据也在
- 只是位置错了

这种时候，最有效的自动化不是只断言 “元素存在”，而是断言：

- 它出现在正确区域
- 它没有跑到不该去的列里


# 0085 把 continue reading 拆成专用 shelf 组件

这次没有再继续堆 `BookshelfPreview` 的条件分支，而是把：

- `继续阅读`

单独拆成了自己的组件。

原因很简单：

- `继续阅读` 是主入口
- `你的书库` 是浏览区

这两个区域的职责已经明显不同了。  
如果继续让它们共用同一个组件，只会让那个组件越来越像“大杂烩”。

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/ContinueReadingShelf.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/index.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte`

### 1. 新建 `ContinueReadingShelf.svelte`

新的组件专门负责“回到上次阅读”这一层体验。

它的结构更像 row：

- 左边封面
- 中间标题 / 作者 / 当前状态
- 右边阅读进度和一个很轻的“继续”提示

### 2. `library` 页面不再用通用 preview 渲染继续阅读

以前：

- `Continue reading` 只是 `BookshelfPreview` 的另一种参数组合

现在：

- `ContinueReadingShelf` 单独渲染

这让页面层级更清楚，也更方便后面继续往 `Readest` 的继续阅读入口靠。

### 3. 通用书架组件回到“浏览区”职责

`BookshelfPreview` 继续服务于：

- `你的书库`

而不是再同时承担主入口区和浏览区两种职责。

## 这次能学到的 2 个编程点

### 知识点 1：当一个区域职责明显不同，就应该考虑拆组件

组件复用不是越多越好。  
如果两个区域只是“长得有点像”，但：

- 交互目标不同
- 信息层级不同
- 后续演化方向不同

那继续硬塞到一个组件里，通常会让结构越来越乱。

### 知识点 2：先按产品职责拆，再按技术细节优化

这里先拆的是：

- 主入口 shelf
- 浏览 shelf

也就是先按“产品角色”拆组件。  
这样后面再补时间信息、快捷动作、排序提示时，就不会不断回头改一个通用组件。

## 这次还没做什么

- `ContinueReadingShelf` 还没有显示上次阅读时间
- 也还没有补更像 `Readest` 的快捷动作，比如继续打开、更多菜单等

这次先把结构职责拆对。

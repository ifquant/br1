# 0086 在 continue reading 里显示上次阅读时间

这次改动让：

- `lastOpenedAt`

不再只是排序字段，而是真正进入 UI，帮助用户理解为什么这本书会出现在 `继续阅读`。

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/ContinueReadingShelf.svelte`

### 1. 把时间戳格式化成展示文案

在 `library/+page.svelte` 里新增了：

- `formatLastOpenedLabel(...)`

它会把时间戳转成：

- `xx 分钟前阅读`
- `xx 小时前阅读`
- `xx 天前阅读`

### 2. 映射书库记录时顺手生成 `lastOpenedLabel`

`ShelfBook` 现在除了原始的：

- `lastOpenedAt`

还会拿到：

- `lastOpenedLabel`

这样显示层组件就不用重复做时间计算。

### 3. `ContinueReadingShelf` 优先显示“上次阅读时间”

继续阅读区现在优先展示：

- `lastOpenedLabel`

如果没有，再退回：

- `status`

这样它就比普通书架更像“恢复入口”，而不是又一组普通书卡。

## 这次能学到的 2 个编程点

### 知识点 1：排序字段和值得展示的字段，通常可以共用同一份源数据

很多时候一个字段先是为了算法存在，比如：

- 排序
- 过滤

但一旦这个字段对用户也有解释价值，就值得把它转成可读文案，进入 UI。

### 知识点 2：格式化逻辑更适合放在投影层，而不是所有组件里重复写

这里没有让 `ContinueReadingShelf` 自己去算分钟、小时、天。  
而是在：

- `PersistedLibraryBook -> ShelfBook`

这层投影里一次性算好。  
这样其它组件以后如果也要复用这个字段，只需要拿现成结果。

## 这次还没做什么

- 目前还是简单中文相对时间，没有做更细的本地化格式
- 还没有把时间同步到完整书库视图

这次只先补继续阅读区最值钱的恢复信号。

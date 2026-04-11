# 0144: 让 reader sidebar 顶部卡片显示真实书库封面

## 这次改了什么

上一刀已经把 reader sidebar 顶部的书籍卡片接上了真实标题、作者、进度和统计信息，但它仍然缺一个很显眼的视觉资产：封面。

这一步只补这一条线：

- 如果当前 reader 是从 `library-file` 打开的
- 就根据 `sourcePath` 找到书库里的对应记录
- 再把已有的 `coverPath -> data URL` 流程复用到 reader sidebar 顶部卡片

这样顶部卡片不再只是“文字信息块”，而是开始接近 Readest 那种“封面 + 元信息”的书籍信息层。

## 为什么这一步不新做 reader cover service

因为项目里封面链路已经存在了：

- `loadPersistedLibraryBooks()`
- `toLibraryCoverUrl()`

这说明：

- 书库记录里已经有封面来源
- library 页面已经验证过封面加载通路

所以这一步最合理的做法不是重新发明 reader 专用接口，而是直接复用已有 library 能力。

这类工作要尽量避免“同一份数据，library 一套读法，reader 再发明一套读法”。

## 这次实现的关键点

### 1. 只在 `library-file` 路径上取封面

不是所有 reader 打开来源都有封面：

- `library-file`：通常能在本地书库里找到封面
- `asset`：可能只是临时文件或样书 URL，不一定有书库记录

所以这次逻辑是：

- 只有 `autoOpenLibraryFile && sourcePath` 时才去查书库记录
- 否则直接清空 `currentCoverUrl`

这样不会把临时打开路径错误地耦合到书库数据。

### 2. sidebar 组件继续保持“只消费数据”

`ReaderSidebar.svelte` 没有去加载封面，也没有感知书库。

它只新增一个简单的输入：

- `coverUrl`

然后根据有无 `coverUrl`：

- 有：显示真实封面图
- 无：继续显示已有 fallback visual

这保持了组件边界：

- route 负责拿数据
- 组件负责渲染

## 这次能学到的编程知识

### 知识点 1：已有稳定通路，优先复用，不要重做

很多重复代码不是因为必须，而是因为写的时候忘了先问一句：

“这个数据以前是不是已经在别处成功拿到过？”

这里封面就是典型例子。既然 library 页面已经能拿到 data URL，reader 最稳的方式通常就是沿用它，而不是重新搞一条 cover loader。

### 知识点 2：同一组件的 fallback 不要删太早

虽然现在已经能显示真实封面，但 fallback 仍然要保留，因为：

- asset 打开路径可能没有封面
- 某些书库记录可能没有 `coverPath`
- 某些封面解析可能失败

真实项目里，“有数据时更好看，没数据时也稳定”通常比“强依赖数据才显示”更重要。

## 还没做的事

- 还没有 book card 的真实 actions 菜单
- 还没有在 reader 里缓存封面查询结果
- asset 打开路径仍然没有封面来源
- 还没有针对 sidebar 封面的专项桌面自动化回归

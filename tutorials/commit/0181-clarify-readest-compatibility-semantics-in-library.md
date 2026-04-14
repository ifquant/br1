# 0181: 在 library 里讲清楚 Readest 兼容语义

## 这次改动解决什么

`br1` 已经可以从 `Readest` 导书，但界面上一直缺少一个关键信号：

- 这本书到底是普通本机导入
- 还是从 `Readest` 兼容进来的
- 如果是兼容进来的，到底保留了什么信息

这会让“同步 Readest 藏书”和“重新导入一个文件”看起来像同一件事。

## 这次具体做了什么

### 1. 给共享书架类型补 `compatibilityLabel`

文件：`src/lib/library/types.ts`

新增了 `compatibilityLabel`，让 library 页和 continue reading / recent reading 这些组件都能消费同一份兼容说明，而不是各自硬编码文案。

### 2. 在 `mapLibraryRecord()` 里明确区分 Readest 兼容条目

文件：`src/routes/library/+page.svelte`

现在会先判断：

- `record.id.startsWith('readest-')`

如果是，就把它标成：

- `sourceLabel = "Readest 兼容"`
- `availabilityLabel = "兼容 Readest 本地藏书"`

同时根据已有字段生成 `compatibilityLabel`，例如：

- 保留封面
- 保留简介
- 保留元数据
- 保留阅读位置

这样一眼就能看出当前兼容面覆盖到了哪里。

### 3. 把 migration banner 的语义从“导入”改成“同步兼容”

文件：`src/routes/library/+page.svelte`

顶部 banner 现在会显示：

- 本机一共有多少本 Readest 藏书
- 当前已经有多少本以兼容方式进入了 `br1`

按钮文案也从：

- `从 Readest 导入`

改成：

- `同步 Readest 藏书`

空书库时的次按钮文案也同步调整了。

### 4. 让书卡和详情面板都能直接看到兼容说明

文件：

- `src/lib/components/library/BookshelfPreview.svelte`
- `src/lib/components/library/ContinueReadingShelf.svelte`

`BookshelfPreview` 现在优先把 `compatibilityLabel` 作为副信息展示；  
`ContinueReadingShelf` 的详情面板则新增了“兼容信息”字段。

这样用户不需要猜，直接能从 UI 看出：

- 这本书是不是 Readest 兼容条目
- 当前保留了哪些本地信息

## 这次学到的编程知识

### 知识点 1：迁移语义和导入语义不要混在一起

“导入”通常意味着：

- 从一个外部文件读进系统
- 由当前系统重新建立自己的状态

但“兼容已有本地藏书”更接近：

- 读取另一个系统已经存在的本地状态
- 尽可能保留它原本的元数据和阅读上下文

如果 UI 不把这两件事区分开，用户就很难理解当前系统到底做了什么。

### 知识点 2：把语义字段提到共享类型里，比分散写文案稳

这次 `compatibilityLabel` 放进共享类型之后：

- 书库卡片
- continue reading
- recent reading
- 详情面板

都可以消费同一份信息。

这样后面如果兼容策略继续变动，就不需要去多个组件里各自找文案再改一遍。

## 这次没有处理什么

- 没有继续补更深层的 Readest 字段兼容审计
- 没有处理在线账号或远端同步
- 没有改 reader 打开链路，只处理了 library 里的兼容语义展示

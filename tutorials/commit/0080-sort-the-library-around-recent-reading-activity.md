# 0080 让书库排序开始围绕最近阅读活动

这次提交补的是 `Readest` 风格书库里另一条很自然的能力：

- 书库不只是按导入顺序摆书
- 真正读过的书，应该更靠前

上一刀已经让 `reader` 会把进度和位置回写到 `library.json`。  
这次继续往前走一步：

- 增加 `lastOpenedAt`
- 每次从 `library` 打开书并产生阅读状态时更新它
- `library` 先按最近阅读排序，再按格式和导入时间兜底

## 这次改了什么

### 1. 书库记录增加 `lastOpenedAt`

文件：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts`

`LibraryBookRecord` / `PersistedLibraryBook` 现在都带：

- `lastOpenedAt?: number | null`

这样书库除了知道：

- 这本书是什么时候导入的

还知道：

- 最近一次真正打开并开始读是什么时候

### 2. 阅读状态回写时顺手更新时间戳

文件：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`

`update_library_reading_state(...)` 现在不只会更新：

- `status`
- `progress`
- `progressFraction`

还会更新：

- `lastOpenedAt = now`

这样 `library` 排序就不需要额外查别的状态源，只靠 `library.json` 自己就能决定顺序。

### 3. `library` 改成先按最近阅读排序

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte`

之前排序更偏“验证链方便”，是：

1. 按格式
2. 再按导入时间

现在改成：

1. 先按 `lastOpenedAt` 倒序
2. 没读过时再按格式
3. 最后按导入时间

这意味着：

- 最近真正读过的书会往前跑
- 没读过的新书仍然有格式和导入顺序兜底

## 这次能学到的 2 个编程点

### 知识点 1：排序字段最好直接存，而不是每次临时推断

很多时候你可以“现场推断”最近阅读，比如从：

- `status`
- `progress`
- URL 参数

这些地方猜。

但这会让排序规则越来越脆弱。  
更稳的办法是：**直接存一个专门为排序服务的字段**。

这里就是：

- `lastOpenedAt`

这让排序逻辑非常简单：

- `right.lastOpenedAt - left.lastOpenedAt`

### 知识点 2：排序通常要分主键和兜底键

真实产品里的排序，往往不只靠一个字段。

如果只按 `lastOpenedAt`：

- 没读过的书会全部并列

所以这次排序是一个典型的多级排序：

1. 主键：最近阅读
2. 第二键：格式优先级
3. 第三键：导入时间

这类多级排序在工程里非常常见，本质就是：

- 先表达产品意图
- 再给未命中的情况一个稳定兜底

## 这次还没做什么

- 还没有把 `继续阅读` 区块单独拆成真正的 bookshelf section
- 还没有单独存“最近阅读列表”
- 还没有做更复杂的权重，比如最近阅读 + 完成度 + pinned books

这次只先补了一个最小但已经很像产品的变化：

`读过的书，开始自然排到书库前面`

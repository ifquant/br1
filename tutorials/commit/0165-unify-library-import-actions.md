# 0165 统一 library 的导入 action

## 这次改动做了什么

这一步开始执行 `01-01`，目标是把 `library` 的输入层从“route 里现写流程”收敛成更明确的 service action。

这次具体做了三件事：

1. 在 `src/lib/services/libraryPersistence.ts` 里新增了 `LibraryImportActionResult`
2. 新增两个 action-oriented API：
   - `importBooksFromDesktopPicker()`
   - `importBooksFromReadest()`
3. 把 `src/routes/library/+page.svelte` 里的桌面导入/迁移分支改成直接消费这两个 action

另外还顺手把 `openLibraryBookPath()` 改成了显式失败，而不是非桌面下静默返回。

## 为什么这一步重要

之前 `library/+page.svelte` 自己要做这些事情：

- 判断是不是桌面环境
- 打开系统选书器
- 判断用户是不是取消了
- 调 `importLibraryBooks()`
- 取第一本书再拼 reader href
- 再决定要不要打开 reader

这意味着 route 不只是页面，还承担了很多输入层编排。

这次把它改成 action 以后，route 只需要关心：

- 用户什么时候触发导入
- 导入成功后怎么更新 UI
- 是否要自动打开第一本书

而“怎么导入”和“取消/成功的契约是什么”被收到了 service 层。

## 你可以学到的工程知识

### 1. service helper 和 action API 不一样

原来的 service 更像底层 helper：

- `selectSystemBookPaths()`
- `importLibraryBooks()`
- `toReaderAssetHref()`

这些函数都没错，但调用方还要自己拼业务流程。

action API 的特点是：

- 它直接代表一次产品动作
- 返回结果已经接近 UI 需要的语义

比如这次的：

- `kind: 'cancelled'`
- `kind: 'imported'`
- `firstReaderHref`

这样 route 层就不用再自己猜“空数组到底是取消还是失败”。

### 2. “静默失败”会让排障越来越难

这次把 `openLibraryBookPath()` 改成了非桌面时直接抛错。

原因不是为了更严格，而是为了让行为更可观察：

- 如果一个动作本来就只能在桌面工作
- 那么在非桌面下静默返回，只会让上层误以为“成功但没反应”

显式失败更适合后续：

- UI 提示
- 测试断言
- 调试排障

## 本次相关文件

- `src/lib/services/libraryPersistence.ts`
- `src/lib/services/index.ts`
- `src/routes/library/+page.svelte`
- `src/routes/reader/+page.svelte`

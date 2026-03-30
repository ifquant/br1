# 0079 从书库记录恢复上次阅读位置

这次提交补的是 `Readest` 风格书库里非常关键的一步：

- `reader` 不只是把进度写回 `library.json`
- 下次从 `library` 再打开同一本书时
- 还要尽量回到上次阅读的位置

这次先用一个最小但很实用的版本：

- 先把 `progressFraction` 存进书库记录
- 再在重新打开时把它带回 `reader`
- 最后让 `foliate-view.goToFraction(...)` 恢复位置

## 这次改了什么

### 1. 书库记录增加 `progressFraction`

文件：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts`

`LibraryBookRecord` / `PersistedLibraryBook` 现在都带上了：

- `progressFraction?: number | null`

这样书库不只是存一段给人看的字符串，比如：

- `上次读到 34%`

还会存一个程序真正能恢复的位置值，比如：

- `0.34`

### 2. 回写阅读状态时一起保存 fraction

文件：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`

上一个提交已经能在 `reader` 里把：

- `title`
- `author`
- `chapterLabel`
- `progressLabel`

写回书库。  
这次继续把：

- `progressFraction`

也存进去。

这样书库记录就不只是“展示状态”，而是开始具备“恢复状态”的能力。

### 3. 从 `library` 跳转到 `reader` 时，把位置带过去

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`

`toReaderAssetHref(...)` 现在会把书的 `progressFraction` 编进 URL：

- `?source=library-file&path=...&label=...&fraction=0.34`

然后 `reader/+page.svelte` 解析它，并把这个值作为 `restoreFraction` 放进 `ReaderControlRequest`。

### 4. `ReaderViewport` 打开书后先跳到恢复位置

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`

`openBook(...)` 现在支持第三个参数：

- `restoreFraction`

打开真实书籍后，不再永远 `goToFraction(0)`，而是：

- 有恢复值时跳到恢复位置
- 没恢复值时再回到开头

## 这次能学到的 2 个编程点

### 知识点 1：展示状态和恢复状态最好分开存

很多时候 UI 上显示的内容并不适合直接作为恢复用的数据。

比如：

- `上次读到 34%`

这个字符串很适合显示给人看，但并不适合直接再喂给阅读器逻辑。  
程序更需要的是：

- `0.34`

这类结构化值。

所以一个很常见的工程做法是：

- 同时保存“展示字段”和“机器字段”

这里就是：

- `progress`
- `progressFraction`

### 知识点 2：先用 fraction 打通，再考虑更精细定位

阅读器最精细的恢复方式，通常会用：

- CFI
- locator
- chapter href + offset

但这类方案更复杂，也更依赖格式和引擎细节。

所以早期工程上一个很务实的顺序是：

1. 先用 `fraction` 打通“能大致回到上次位置”
2. 再逐步升级成更精确的定位方案

这种做法的好处是：

- 很快能验证产品链路
- 改动范围小
- 用户马上就能感知“书库是活的”

## 这次还没做什么

- 还没有用更精细的 CFI / locator 恢复位置
- 还没有单独存 `lastOpenedAt`
- 还没有让 `library` 按最近阅读自动重新排序

这次只先补了最小但真实的一步：

`保存阅读百分比 -> 重新打开时恢复到这个百分比`

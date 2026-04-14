# 0198: PDF 写回 library.json 时，保存人类可读定位而不是 `epubcfi(...)`

这次切片补的是一个产品层面的语义问题。

之前 `reader/+page.svelte` 在把阅读状态写回 `library.json` 时，统一把：

- `preview.progressLocation`

写进持久化层。

这对 EPUB 没问题。  
但对 PDF，会出现很奇怪的结果：

- 书库里保存的是 `epubcfi(/6/2)` 这种值
- library 详情面板也会显示这个值
- 看起来像 PDF 还在用 EPUB 的恢复信号

虽然前一刀已经让 PDF reopen 不再消费这个值，  
但如果持久化层继续把它写进去，用户看到的书库信息还是脏的。

所以这次修的是：

- PDF 持久化时保存“人类能看懂的位置文案”
- 而不是继续保存 EPUB 风格的 CFI 字符串

## 这次改了什么

### 1. `reader/+page.svelte` 在持久化前先按格式归一化定位值

文件：`src/routes/reader/+page.svelte`

新增了一个很小但关键的逻辑：

- 如果当前格式是 `PDF`
  - 持久化时优先写 `locationLabel`
  - 但会过滤掉占位态：
    - `Opening book`
    - `Not opened`
- 其它格式
  - 继续写 `preview.progressLocation`

也就是说：

- EPUB 继续保存 CFI
- PDF 改为保存更像页码/位置描述的文案

这个改动很稳，因为前面已经把 `toLibraryReaderTarget()` 改成：

- PDF reopen 只用 `fraction`
- 不再读 `location`

所以现在 `progressLocation` 对 PDF 主要承担：

- library 详情展示
- 持久化审计

不再承担 reader reopen 输入。

### 2. PDF restore spec 现在直接锁这个持久化语义

文件：`e2e/app.e2e.ts`

这次没有只改产品逻辑，还把它锁进了现有 focused regression。

`openRestorablePdfBook()` 现在会把 seeding 后磁盘上的：

- `record.progressLocation`

一并带出来。

随后测试会显式断言：

- `persistedLocation` 必须存在
- `persistedLocation` 不能以 `epubcfi(` 开头

这意味着以后如果有人又把 PDF 持久化写回 CFI 风格的值，  
这条桌面回归会第一时间红。

## 为什么这次修复有效

因为这次 finally 把 3 层语义分开了：

1. **EPUB 精确恢复信号**
   - `CFI`
2. **PDF 恢复输入**
   - `fraction`
3. **PDF 书库展示定位**
   - `locationLabel`

之前的问题是第 1 层的信号泄露进了第 3 层。  
结果就是：

- reader reopen 逻辑看起来怪
- library 详情看起来也怪

现在分开之后：

- 输入更干净
- 展示也更像人话
- 回归还能持续盯住这条约束

## 这次顺手能学到的知识

### 知识点 1：同一个字段名，不一定应该跨格式共用同一种语义

`progressLocation` 这个名字看起来通用。  
但不同格式里的“位置”其实可能完全不是一回事：

- EPUB 是 CFI / href / section position
- PDF 更像页码、页段、视口进度

如果你强行复用同一个内部表示，  
很容易出现“技术上能存，产品上很怪”的状态。

更稳的思路通常是：

- 字段名可以共用
- 但写入策略按格式分流

### 知识点 2：只修代码不锁回归，等于没修完

如果这次只改：

- `reader/+page.svelte`

那过几天别人一改，又可能把 PDF 写回 `epubcfi(...)`。

所以真正完整的修法应该是：

1. 改产品代码
2. 在已有 focused regression 里补上断言

这才叫闭环。

## 相关文件

- `src/routes/reader/+page.svelte`
- `e2e/app.e2e.ts`

## 本次验证

- `pnpm check` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'reopens a library-file pdf with restored progress inside the reader stage' --mochaOpts.timeout 120000"` (PASS)
- `git diff --check` (PASS)

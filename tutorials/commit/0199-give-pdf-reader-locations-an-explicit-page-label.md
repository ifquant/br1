# 0199: 给 PDF 的 reader/library 定位文案补上明确的 `Page` 语义

这次切片是在前一刀基础上继续收产品语义。

前一刀已经把 PDF 写回 `library.json` 的定位值，从：

- `epubcfi(...)`

改成了人类可读的位置文案。

但那时这个文案还是纯数字：

- `12 / 175`

它虽然比 `epubcfi(...)` 好很多，  
但还不够清楚，因为这串数字到底表示：

- 页码
- section
- 还是别的定位单位

用户并不能一眼看明白。

所以这次继续收一小步：

- PDF 的 `locationLabel` 明确变成 `Page x / y`

这样 reader footer、sidebar、library 持久化、library 详情，都会共享同一套页码语义。

## 这次改了什么

### 1. `ReaderViewport` 给 PDF 单独格式化位置文案

文件：`src/lib/components/reader/ReaderViewport.svelte`

新增了一个小 helper：

- `formatReaderLocationLabel(formatLabel, lastLocation)`

规则很直接：

- 如果没有 `current/total`，返回 `Opening book`
- 如果是 `PDF`，返回 `Page ${current} / ${total}`
- 其它格式，仍然返回 `${current} / ${total}`

然后 `emitReaderState()` 不再自己内联拼 `locationLabel`，统一走这个 helper。

这样一来：

- PDF footer 里显示 `Page 3 / 25`
- PDF sidebar 里也显示 `Page 3 / 25`
- 因为前一刀已经让 PDF 持久化写 `locationLabel`
- 所以 library.json 里保存的也会是 `Page 3 / 25`

### 2. focused PDF restore regression 直接锁住这个语义

文件：`e2e/app.e2e.ts`

现在这条 PDF restore 用例除了断言：

- 持久化值不是 `epubcfi(...)`

还会继续断言：

- `persistedLocation.startsWith('Page ') === true`
- reader 当前 `locationLabel` 也必须以 `Page ` 开头

也就是说，这次不是“看起来像 Page”，而是明确把它变成一个回归契约。

以后如果有人把 PDF 位置文案改回模糊数字，或者又混回 EPUB 风格信号，这条用例会直接红。

## 为什么这次修复有效

因为现在 PDF 的“位置”终于在所有层里说的是同一种语言：

1. reader 内部状态
2. footer / sidebar 展示
3. library.json 持久化
4. library 详情展示
5. e2e 回归断言

之前的问题不是功能坏，而是语义不统一：

- 有的地方是 `epubcfi(...)`
- 有的地方是 `12 / 175`
- 用户和测试都得自己猜这是什么意思

现在统一成：

- `Page x / y`

这就干净很多。

## 这次顺手能学到的知识

### 知识点 1：人类可读，不等于语义完整

把：

- `epubcfi(/6/2)`

改成：

- `12 / 175`

已经更像人话了。

但严格说，这还只是“可读”，不等于“语义完整”。  
因为用户还是要自己猜：

- 这是页码吗？
- 是章节吗？

真正好的展示通常要再补一层单位词：

- `Page 12 / 175`
- `Section 3 / 14`

这样才不需要猜。

### 知识点 2：格式化 helper 很适合承接“跨格式但不完全同构”的展示逻辑

像 `locationLabel` 这种字段，很容易一开始写成：

```ts
`${current} / ${total}`
```

然后所有格式都共用。

短期方便，长期就容易越写越乱。

更稳的做法是：

- 抽成一个很小的 helper
- 把“不同格式的展示差异”集中到一个地方

这样以后你要继续细化也容易，比如：

- PDF: `Page 3 / 25`
- EPUB: `193 / 220`
- fixed-layout comic: `Spread 4 / 18`

## 相关文件

- `src/lib/components/reader/ReaderViewport.svelte`
- `e2e/app.e2e.ts`

## 本次验证

- `pnpm check` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'reopens a library-file pdf with restored progress inside the reader stage' --mochaOpts.timeout 120000"` (PASS)
- `git diff --check` (PASS)

# 0071 去掉样书分支，让 reader 只围绕真实书籍状态运转

这次改动不是为了“加新功能”，而是为了把 `reader` 的状态机从开发期样书逻辑里解开。

问题已经很明显了：

- 现在我们主要用真实书籍调试
- 入口也已经主要来自 `library-file / asset / file`
- 但 reader 里还保留着一整套 `sample` 路径
- 于是打开真实 `epub` 时，界面底下还会写出 `OPENING SAMPLE`

这会带来两个坏处：

1. 状态名和真实行为对不上，读代码时很容易误判  
2. UI 文案会误导你，以为现在走的还是样书链路

所以这一步做的事情很直接：

- 删除 `sample` 控制请求类型
- 删除 `source=sample` 这条 reader 自动打开路径
- 删除 `Open sample` 相关按钮和文案
- 把 `sampleStatus` 收口成通用的 `openStatus`
- 把空态、加载态、错误态都改成“真实书籍”语义

## 改动点

- 在 [types.ts](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts) 里删除 `ReaderControlRequest` 的 `sample` 分支
- 在 [foliate.ts](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/foliate.ts) 里删掉 `SAMPLE_READER_BOOK_URL`
- 在 [reader/+page.svelte](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 里删除 `source=sample` 自动打开逻辑
- 在 [ReaderStage.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte) 和 [ReaderWorkspace.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderWorkspace.svelte) 里移除 `autoOpenSample`
- 在 [ReaderViewport.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte) 里：
  - 把 `sampleStatus` 改成 `openStatus`
  - 去掉 `Open sample` UI
  - 把加载态和错误态文案改成真实书籍语义
  - 顺手把 `lastLocation.location` 的运行时结构补进本地类型理解

## 这次顺手能学到的知识

### 1. 临时开发路径如果继续留在主状态机里，会慢慢变成真实 bug 的噪音源

开发时加一条 `sample` 路径很常见，因为它能帮你更快把 reader 跑起来。

但一旦产品开始接真实入口，比如：

- library 导入
- 本地文件打开
- 持久化书库恢复

这个临时分支就该尽快退场。否则你会遇到这种情况：

- 真正的书已经在打开
- 但日志、文案、状态名都还在说 “sample”

这会让调试越来越难。

### 2. 状态名应该描述“用户真实经历了什么”，而不是“开发阶段从哪条捷径进来的”

`sampleStatus` 这个名字在最开始是合理的，因为当时 reader 真的是靠样书驱动。

但后来入口已经变成真实书籍，它就不再是好名字了。此时更合理的命名应该是：

- `openStatus`
- `loadStatus`
- `readerStatus`

也就是描述“书有没有打开”，而不是描述“当初为了开发方便加的那条入口”。

好的状态名会直接降低后续的维护成本。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` `PASS`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` `PASS`

## 还没包含

- 这一步没有修完 `epub` 正文为什么视觉上仍像空白，只是先把状态机和文案去样书化
- 那批仍在实验中的 `pdf` 调试改动没有混进来
